// Failure modes: an article from a blog left off because the model judged it off-topic, a withdrawn,
// blocked or unreleased article shown, media reports mixed in, 热议 counting the blog itself or one
// company twice, a page boundary dropping or repeating an article, a bad parameter silently widened.
import "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import { blogsServer } from "../server.ts";
import { encodeCursor } from "@aihot/backend/lib/cursor";
import { BLOG_TAG } from "../orgs.ts";

installModules([blogsServer]);
const app = await buildApp();
after(async () => { await app.close(); await closeDb(); });

const DAY = 86_400_000;
const at = (daysAgo: number, hour = 12) => new Date(Date.now() - daysAgo * DAY - (24 - hour) * 3_600_000);
let story = 0;

async function source(id: string, opts: { tags?: string[]; owner?: string | null; mode?: string } = {}) {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, tags, owner_entity_id)
    VALUES (${id}, ${id}, 'rss', 'T1', ${opts.mode ?? "editorial"}, ${opts.tags ?? [BLOG_TAG]}, ${opts.owner ?? null})
    ON CONFLICT (id) DO NOTHING`;
}

async function article(id: string, sourceId: string, time: Date, opts: { visibility?: string; selected?: boolean; visibleAfter?: Date | null; blocked?: boolean; storyId?: number | null; eligible?: boolean } = {}) {
  const url = `https://example.org/${id}`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, processing_state)
    VALUES (${id}, ${sourceId}, ${id}, ${url}, ${`Original ${id}`}, ${time}, ${time}, ${opts.blocked ? "blocked" : "analyzed"})`;
  await sql`INSERT INTO publications (article_id, title, original_title, source_id, channel, url, discovered_at, timeline_at, sort_at,
      visibility, eligible, selected, visible_after, story_id)
    VALUES (${id}, ${`中文 ${id}`}, ${`Original ${id}`}, ${sourceId}, 'news', ${url}, ${time}, ${time}, ${time},
      ${opts.visibility ?? "public"}, ${opts.eligible ?? false}, ${opts.selected ?? false},
      ${opts.selected ? (opts.visibleAfter === undefined ? time : opts.visibleAfter) : null}, ${opts.storyId ?? null})`;
}

async function newStory() {
  const [row] = await sql<{ id: number }[]>`INSERT INTO stories (public_id, title, first_report_at, latest_at)
    VALUES (${randomUUID()}, ${`story ${++story}`}, now(), now()) RETURNING id`;
  return row!.id;
}

type Answer = { items: Array<{ id: string; title: string; url: string; org: string; selected: boolean; itemPath: string | null; reportCount: number }>; orgs: Array<{ key: string; name: string; icon: string | null; count: number }>; nextCursor: string | null };
const get = async (q = "") => {
  const r = await app.inject(`/api/blogs${q}`);
  assert.equal(r.statusCode, 200, r.body);
  return r.json() as Answer;
};

test("an empty site answers with no articles and no companies to pick", async () => {
  const body = await get();
  assert.deepEqual(body.items, []);
  assert.equal(body.nextCursor, null);
  assert.deepEqual(body.orgs, [], "a configured company without a tagged source has nothing to filter");
});

test("seed: blogs, outlets and stories", async () => {
  for (const id of ["rss-cloudflare-blog", "rss-uber-gone"]) await source(id);
  await source("rss-openai-news", { owner: "openai" });
  await source("media-a", { tags: ["媒体"] });
  await source("media-b", { tags: ["媒体"] });
  await source("media-b-mirror", { tags: ["媒体"], owner: "same-owner" });
  await source("media-c", { tags: ["媒体"], owner: "same-owner" });
  await source("signal", { tags: ["媒体"], mode: "hot_signal" });
  const hotStory = await newStory();
  const quiet = await newStory();

  await article("cf-new", "rss-cloudflare-blog", at(0, 10));
  await article("cf-selected", "rss-cloudflare-blog", at(0, 8), { selected: true, eligible: true, storyId: hotStory });
  await article("oa-old", "rss-openai-news", at(2), { storyId: quiet });
  await article("cf-withdrawn", "rss-cloudflare-blog", at(0, 9), { visibility: "withdrawn" });
  await article("cf-blocked", "rss-cloudflare-blog", at(0, 7), { blocked: true });
  await article("cf-unreleased", "rss-cloudflare-blog", at(0, 6), { selected: true, visibleAfter: new Date(Date.now() + DAY) });
  await article("media-report", "media-a", at(0, 11), { eligible: true, storyId: hotStory });
  await article("media-report-b", "media-b", at(0, 5), { eligible: true, storyId: hotStory });
  await article("media-report-c1", "media-b-mirror", at(0, 4), { eligible: true, storyId: hotStory });
  await article("media-report-c2", "media-c", at(0, 3), { eligible: true, storyId: hotStory });
  await article("signal-report", "signal", at(0, 2), { storyId: hotStory });
  await article("media-quiet", "media-a", at(2, 9), { eligible: true, storyId: quiet });
  // The blog's own second report on a story counts once at most, and never for itself.
  await article("oa-follow", "rss-openai-news", at(2, 8), { storyId: quiet });
});

test("lists every released, public article of the tagged blogs, newest first", async () => {
  const body = await get();
  assert.deepEqual(body.items.map((i) => i.id), ["cf-new", "cf-selected", "oa-old", "oa-follow"]);
  const first = body.items[0]!;
  assert.equal(first.title, "Original cf-new", "the source's own title");
  assert.equal(first.url, "https://example.org/cf-new");
  assert.equal(first.org, "cloudflare");
  assert.equal(first.selected, false);
  assert.equal(first.itemPath, null);
  const selected = body.items[1]!;
  assert.equal(selected.selected, true);
  assert.equal(selected.itemPath, "/items/cf-selected");
});

test("a tagged source missing from the company list is listed under its own name", async () => {
  await article("gone-1", "rss-uber-gone", at(3));
  const body = await get();
  assert.ok(body.items.some((i) => i.id === "gone-1" && i.org === "rss-uber-gone"));
  const org = body.orgs.find((o) => o.key === "rss-uber-gone");
  assert.deepEqual(org, { key: "rss-uber-gone", name: "rss-uber-gone", icon: null, iconUrl: null, count: 1 });
  await sql`DELETE FROM publications WHERE article_id = 'gone-1'`;
});

test("热议 counts other public editorial sources on the story, each company once", async () => {
  const body = await get();
  const byId = new Map(body.items.map((i) => [i.id, i]));
  assert.equal(byId.get("cf-selected")!.reportCount, 3, "media-a, media-b and one for the same-owner pair; the signal source does not count");
  assert.equal(byId.get("oa-old")!.reportCount, 1, "its own blog's second report is not another outlet");
  assert.equal(byId.get("cf-new")!.reportCount, 0);

  const hot = await get("?hot=1");
  assert.deepEqual(hot.items.map((i) => i.id), ["cf-selected"]);
  assert.equal(hot.orgs.find((o) => o.key === "cloudflare")!.count, 1);
  assert.equal(hot.orgs.find((o) => o.key === "openai")!.count, 0);
});

test("filters by one or several companies", async () => {
  assert.deepEqual((await get("?org=openai")).items.map((i) => i.id), ["oa-old", "oa-follow"]);
  assert.deepEqual((await get("?org=openai,cloudflare")).items.map((i) => i.id), ["cf-new", "cf-selected", "oa-old", "oa-follow"]);
  const counts = (await get("?org=openai")).orgs;
  assert.equal(counts.find((o) => o.key === "cloudflare")!.count, 2, "counts ignore the company filter so the picker can show every company");
});

test("pages through every article exactly once", async () => {
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const body: Answer = await get(`?limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    seen.push(...body.items.map((i) => i.id));
    cursor = body.nextCursor;
  } while (cursor);
  assert.deepEqual(seen, ["cf-new", "cf-selected", "oa-old", "oa-follow"]);
});

test("a page boundary inside one millisecond keeps both articles", async () => {
  const t = at(5);
  await article("us-a", "rss-cloudflare-blog", t);
  await article("us-b", "rss-cloudflare-blog", t);
  await sql`UPDATE publications SET timeline_at = timeline_at + interval '400 microseconds' WHERE article_id = 'us-a'`;
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const body: Answer = await get(`?org=cloudflare&limit=1${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    seen.push(...body.items.map((i) => i.id));
    if (cursor) assert.deepEqual(body.orgs, [], "later pages leave the picker's counts out");
    cursor = body.nextCursor;
  } while (cursor);
  assert.deepEqual(seen.slice(-2), ["us-a", "us-b"]);
  await sql`DELETE FROM publications WHERE article_id IN ('us-a', 'us-b')`;
});

test("refuses bad parameters instead of widening the list", async () => {
  for (const q of [`?cursor=${encodeCursor("blogs", {})}`, `?cursor=${encodeCursor("blogs", { t: "yesterday", id: "x" })}`, "?org=nobody", "?org=", "?limit=0", "?limit=61", "?limit=x", "?hot=yes", "?cursor=nope", "?other=1", "?org=openai&org=cloudflare"]) {
    const r = await app.inject(`/api/blogs${q}`);
    assert.equal(r.statusCode, 400, q);
    assert.match(String(r.headers["content-type"]), /problem\+json|json/, q);
  }
});

test("answers with public caching and revalidates with its ETag", async () => {
  const r = await app.inject("/api/blogs");
  assert.match(String(r.headers["cache-control"]), /^public/);
  const again = await app.inject({ url: "/api/blogs", headers: { "if-none-match": String(r.headers.etag) } });
  assert.equal(again.statusCode, 304);
});
