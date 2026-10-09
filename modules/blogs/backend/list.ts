// The blogs page's list: every public, released article of the sources tagged BLOG_TAG, whatever the
// model judged it, newest first. 热议 is the number of other outlets with a public report on the same
// story, one per company. Scope comes from the publication layer (scope.ts), as on every public surface.
import { sql } from "@aihot/backend/db";
import { decodeCursor, encodeCursor, InvalidCursorError } from "@aihot/backend/lib/cursor";
import { proxiedImage } from "@aihot/backend/media/imgproxy";
import { publicSourceName } from "@aihot/backend/publication/rules";
import { selectedCondition, storyReportCondition } from "@aihot/backend/publication/scope";
import { BLOG_ORGS, BLOG_TAG } from "../orgs.ts";
import type { BlogsAnswer } from "../types.ts";

/** Articles with at least this many other outlets on their story are 热议. */
export const HOT_REPORTS = 2;
export const MAX_LIMIT = 60;

export interface BlogsQuery {
  orgs: string[];
  hot: boolean;
  cursor: string | null;
  limit: number;
}

export class UnknownOrgError extends Error {}

interface Source { id: string; name: string; icon_url: string | null }

/** The companies on the page: the configured ones that have a tagged source, then any other tagged source under its own name. */
async function companies() {
  const sources = await sql<Source[]>`
    SELECT id, name, icon_url FROM sources WHERE tags @> ${[BLOG_TAG]}::text[] AND participation_mode = 'editorial' ORDER BY id`;
  const byId = new Map(sources.map((s) => [s.id, s]));
  const known = new Set(BLOG_ORGS.flatMap((o) => o.sources));
  const list = [
    ...BLOG_ORGS.map((o) => ({ key: o.key, name: o.name, icon: o.icon, sources: o.sources.filter((id) => byId.has(id)) })).filter((o) => o.sources.length),
    ...sources.filter((s) => !known.has(s.id)).map((s) => ({ key: s.id, name: publicSourceName(s.name), icon: null, sources: [s.id] })),
  ];
  return list.map((c) => {
    const own = c.sources.map((id) => byId.get(id)!.icon_url).find(Boolean) ?? null;
    return { ...c, iconUrl: c.icon ? null : proxiedImage(own, "avatar") };
  });
}

export async function loadBlogs(q: BlogsQuery, now = new Date()): Promise<BlogsAnswer> {
  const all = await companies();
  for (const key of q.orgs) if (!all.some((c) => c.key === key)) throw new UnknownOrgError(`unknown org: ${key}`);
  const orgOf = new Map(all.flatMap((c) => c.sources.map((id) => [id, c.key] as const)));
  const tagged = [...orgOf.keys()];
  const chosen = q.orgs.length ? all.filter((c) => q.orgs.includes(c.key)).flatMap((c) => c.sources) : tagged;
  const after = q.cursor ? readCursor(q.cursor) : null;

  // Outlets are counted in an inner scope that reuses the p/s aliases the scope predicates name.
  const listed = sql`
    SELECT p.article_id, coalesce(p.original_title, p.title) AS title, p.url, p.timeline_at, p.source_id,
      to_char(p.timeline_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at_exact,
      (${selectedCondition(now)}) AS selected,
      CASE WHEN p.story_id IS NULL THEN 0 ELSE (
        SELECT count(DISTINCT coalesce(s.owner_entity_id, s.id))::int FROM publications p JOIN sources s ON s.id = p.source_id
        WHERE p.story_id = b.story_id AND coalesce(s.owner_entity_id, s.id) <> b.owner AND ${storyReportCondition(now)}
      ) END AS reports
    FROM (
      SELECT p.*, coalesce(s.owner_entity_id, s.id) AS owner FROM publications p
      JOIN sources s ON s.id = p.source_id JOIN articles a ON a.id = p.article_id
      WHERE p.source_id = ANY(${tagged}::text[]) AND ${storyReportCondition(now)} AND a.processing_state <> 'blocked'
    ) p, LATERAL (SELECT p.story_id, p.owner) b`;
  const hot = q.hot ? sql`AND l.reports >= ${HOT_REPORTS}` : sql``;

  // The companies' counts are for the picker, which only the first page draws.
  const [rows, counts] = await Promise.all([
    sql<{ article_id: string; title: string; url: string; timeline_at: Date; at_exact: string; source_id: string; selected: boolean; reports: number }[]>`
      SELECT * FROM (${listed}) l
      WHERE l.source_id = ANY(${chosen}::text[]) ${hot}
        ${after ? sql`AND (l.timeline_at, l.article_id) < ((${after.t}::text)::timestamptz, ${after.id})` : sql``}
      ORDER BY l.timeline_at DESC, l.article_id DESC LIMIT ${q.limit + 1}`,
    after ? [] : sql<{ source_id: string; n: number; latest: Date }[]>`
      SELECT l.source_id, count(*)::int AS n, max(l.timeline_at) AS latest FROM (${listed}) l WHERE true ${hot} GROUP BY l.source_id`,
  ]);

  const page = rows.slice(0, q.limit);
  const last = page.at(-1);
  const bySource = new Map(counts.map((c) => [c.source_id, c.n]));
  const latest = counts.reduce<Date | null>((m, c) => (!m || c.latest > m ? c.latest : m), null);
  return {
    items: page.map((r) => ({
      id: r.article_id, title: r.title, url: r.url, publishedAt: r.timeline_at.toISOString(), org: orgOf.get(r.source_id)!,
      selected: r.selected, itemPath: r.selected ? `/items/${r.article_id}` : null, reportCount: r.reports,
    })),
    orgs: after ? [] : all.map((c) => ({ key: c.key, name: c.name, icon: c.icon, iconUrl: c.iconUrl, count: c.sources.reduce((n, id) => n + (bySource.get(id) ?? 0), 0) })),
    nextCursor: rows.length > q.limit && last ? encodeCursor("blogs", { t: last.at_exact, id: last.article_id }) : null,
    updatedAt: latest?.toISOString() ?? null,
  };
}

/** A cursor this endpoint wrote: the last row's exact time (microseconds, as stored; sent as text, since a
 * timestamptz parameter goes through a Date and loses them) and id. */
function readCursor(cursor: string): { t: string; id: string } {
  const c = decodeCursor<{ t?: unknown; id?: unknown }>("blogs", cursor);
  if (typeof c.t !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(c.t) || !Number.isFinite(Date.parse(c.t)) || typeof c.id !== "string" || !c.id) {
    throw new InvalidCursorError("malformed cursor");
  }
  return { t: c.t, id: c.id };
}
