// /blogs: the companies' own engineering blogs, newest first, each row straight to the original. A toggle
// keeps the posts other outlets picked up (热议); a picker chooses companies (a popover on desktop, a sheet
// on phones). The filters live in the address; older posts load below without leaving the page.
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { beijingDate, beijingTime } from "@aihot/contracts/time";
import { cachedPage, loadOr404 } from "@aihot/web/lib/api.server";
import type { LoaderArgs } from "@aihot/web/lib/route-types";
import { listPath, pageMeta } from "@aihot/web/lib/seo";
import { monthDay, weekdayShort } from "@aihot/web/lib/format";
import { Badge } from "@aihot/web/components/ui/Badge";
import { Kicker } from "@aihot/web/components/ui/Kicker";
import { EmptyState } from "@aihot/web/components/ui/Page";
import { Presence } from "@aihot/web/components/ui/Presence";
import { Sheet } from "@aihot/web/components/ui/Sheet";
import { SourceAvatar } from "@aihot/web/components/ui/SourceAvatar";
import { IconChevronDown, IconClose, IconExternal, IconFilter, IconFlame, IconSearch } from "@aihot/web/components/icons";
import { BarButton, PhoneBar } from "@aihot/web/components/shell/PhoneBar";
import { isPhone, type Screen } from "@aihot/web/components/shell/screens";
import type { BlogItem, BlogOrgCount, BlogsAnswer } from "../types.ts";
import { ICONS } from "./icons.ts";

export const handle: Screen = { home: "me", name: "官方博客" };
export { pageHeaders as headers } from "@aihot/web/lib/api.server";

/** The filters an address asks for, as /api/blogs takes them. */
function readQuery(params: URLSearchParams) {
  return { org: params.get("org")?.trim() || null, hot: params.get("hot") === "1" ? "1" : null };
}

export async function loader({ request }: LoaderArgs) {
  const q = readQuery(new URL(request.url).searchParams);
  // The page's time, read once here so the server and the browser name the same days.
  return cachedPage(60, { data: await loadOr404<BlogsAnswer>(listPath("/api/blogs", q), { signal: request.signal }), now: Date.now() });
}

export function meta({ location }: { location: { search: string } }) {
  const q = readQuery(new URLSearchParams(location.search));
  return pageMeta({
    title: "官方博客",
    description: "一线科技公司官方工程博客的最新文章，按时间倒序，点开直接读原文；可按公司筛选，或只看被其他媒体跟进的文章。",
    path: listPath("/blogs", q),
    noindex: !!(q.org || q.hot),
  });
}

/** A company's mark: its bundled icon on a quiet tile, else its source's own icon or initial. */
/** `size` in px, or a class that sizes it per breakpoint (its avatar then takes `size`'s proportion of the larger). */
function OrgMark({ org, size, round = false, className }: { org: BlogOrgCount | undefined; size: number; round?: boolean; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const svg = org?.icon ? ICONS[org.icon] : undefined;
  const shape = round ? "rounded-full" : size >= 36 ? "rounded-tile" : "rounded-[7px]";
  const box = className ? { className } : { style: { width: size, height: size } };
  if (!svg) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-bg-sunk ring-1 ring-inset ring-line-soft ${shape} ${box.className ?? ""}`} style={box.style}>
        <SourceAvatar name={org?.name ?? "?"} iconUrl={org?.iconUrl} size={Math.round(size * 0.62)} />
      </span>
    );
  }
  return (
    <span
      title={org!.name}
      className={`inline-flex shrink-0 items-center justify-center bg-bg-sunk text-ink ring-1 ring-inset ring-line-soft [&>svg]:size-[58%] ${shape} ${box.className ?? ""}`}
      style={box.style}
      // Bundled with the page (icons.ts), never from a request.
      dangerouslySetInnerHTML={{ __html: svg.replaceAll("__ID__", id) }}
    />
  );
}

function Row({ item, org }: { item: BlogItem; org: BlogOrgCount | undefined }) {
  return (
    <li className="group relative grid min-h-16 grid-cols-[36px_minmax(0,1fr)] items-start gap-3 px-3.5 py-3 transition-colors hover:bg-bg-sunk lg:grid-cols-[40px_minmax(0,1fr)_auto] lg:items-center lg:gap-3.5 lg:px-4">
      <span className="mt-0.5 lg:mt-0">
        <OrgMark org={org} size={40} className="size-9 lg:size-10" />
      </span>
      <span className="min-w-0">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-[15px] font-semibold leading-[1.5] text-ink after:absolute after:inset-0 after:content-[''] group-hover:text-accent lg:line-clamp-1 lg:text-[15.5px]">
          {item.title}
        </a>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-4">
          {org?.name ?? item.org}
          <time dateTime={item.publishedAt} className="mono lg:hidden">· {beijingTime(item.publishedAt)}</time>
          {item.reportCount > 0 && <Badge tone="hot">{item.reportCount} 家报道</Badge>}
          {item.itemPath && <SelectedLink to={item.itemPath} className="lg:hidden" />}
        </span>
      </span>
      <span className="hidden items-center gap-2.5 lg:flex">
        {item.itemPath && <SelectedLink to={item.itemPath} />}
        <time dateTime={item.publishedAt} className="mono whitespace-nowrap text-[12px] text-ink-4">{beijingTime(item.publishedAt)}</time>
        <IconExternal size={14} className="text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
    </li>
  );
}

/** 精选: the site's Chinese write-up, above the row's link to the original. */
function SelectedLink({ to, className = "" }: { to: string; className?: string }) {
  return (
    <Link to={to} title="查看本站的中文解读" className={`relative z-[1] ${className}`}>
      <Badge tone="selected" dot>精选</Badge>
    </Link>
  );
}

function dayHeading(date: string, now: number) {
  const today = beijingDate(now);
  const yesterday = beijingDate(now - 86_400_000);
  return date === today ? "今天" : date === yesterday ? "昨天" : monthDay(date);
}

function Days({ items, orgs, now }: { items: BlogItem[]; orgs: Map<string, BlogOrgCount>; now: number }) {
  const days: Array<[string, BlogItem[]]> = [];
  for (const item of items) {
    const date = beijingDate(item.publishedAt);
    const last = days.at(-1);
    if (last?.[0] === date) last[1].push(item);
    else days.push([date, [item]]);
  }
  return (
    <div className="space-y-5">
      {days.map(([date, list]) => (
        <section key={date} aria-label={dayHeading(date, now)}>
          <h2 className="mb-2 flex items-baseline gap-2 px-1 text-[12.5px] font-semibold text-ink-3">
            {dayHeading(date, now)}
            <span className="font-normal text-ink-4">
              {dayHeading(date, now) === monthDay(date) ? "" : `${monthDay(date)} `}{weekdayShort(date)} · {list.length} 篇
            </span>
          </h2>
          <ul className="card divide-y divide-line-soft overflow-hidden">
            {list.map((item) => <Row key={item.id} item={item} org={orgs.get(item.org)} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The companies to choose from, with search; 完成 applies the picks, closing it otherwise keeps the current filter. */
function OrgPicker({ orgs, chosen, onDone }: { orgs: BlogOrgCount[]; chosen: string[]; onDone: (keys: string[]) => void }) {
  const [picked, setPicked] = useState(chosen);
  const [q, setQ] = useState("");
  const shown = orgs.filter((o) => !q.trim() || o.name.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (key: string) => setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  return (
    <div className="flex max-h-[min(460px,70dvh)] flex-col">
      <label className="mx-3 mb-2 mt-3 flex h-[34px] items-center gap-1.5 rounded-control bg-field px-2.5 text-ink-4">
        <IconSearch size={15} />
        <input id="blogs-org-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索公司" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
      </label>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
        {shown.length === 0 && <p className="px-3 py-6 text-center text-[13px] text-ink-4">没有叫这个名字的公司</p>}
        {shown.map((o) => (
          <label key={o.key} className="grid min-h-10 cursor-pointer grid-cols-[18px_28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-control px-2 py-1 hover:bg-bg-sunk">
            <input type="checkbox" checked={picked.includes(o.key)} onChange={() => toggle(o.key)} className="size-4 accent-[var(--accent)]" />
            <OrgMark org={o} size={28} />
            <span className="truncate text-[14px] text-ink-2">{o.name}</span>
            <span className="mono text-[12px] text-ink-4">{o.count}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-between gap-2 border-t border-line-soft px-3 py-2.5">
        <button type="button" onClick={() => setPicked([])} className="h-8 rounded-full border border-line px-3.5 text-[13px] text-ink-3 hover:text-ink">清除</button>
        <button type="button" onClick={() => onDone(picked)} className="h-8 rounded-full bg-accent px-3.5 text-[13px] font-semibold text-accent-contrast">完成</button>
      </div>
    </div>
  );
}

export default function BlogsPage() {
  const { data, now } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = readQuery(params);
  const chosen = q.org ? q.org.split(",") : [];
  const hot = q.hot === "1";
  const orgs = new Map(data.orgs.map((o) => [o.key, o]));

  // Older pages appended in place; a new answer (other filters) starts over.
  const [more, setMore] = useState<{ items: BlogItem[]; cursor: string | null }>({ items: [], cursor: data.nextCursor });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // A page still loading for the previous filters is dropped, never appended to the new list.
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort();
    setLoading(false);
    setFailed(false);
    setMore({ items: [], cursor: data.nextCursor });
  }, [data]);
  const loadMore = async () => {
    if (!more.cursor || loading) return;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(listPath("/api/blogs", { ...q, cursor: more.cursor }), { signal: controller.signal });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as BlogsAnswer;
      setMore((m) => ({ items: [...m.items, ...next.items], cursor: next.nextCursor }));
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const go = (next: { org?: string[]; hot?: boolean }) => {
    const org = next.org ?? chosen;
    navigate(listPath("/blogs", { org: org.length ? org.join(",") : null, hot: (next.hot ?? hot) ? "1" : null }), { preventScrollReset: true });
  };
  const [picking, setPicking] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!picking || isPhone()) return;
    const onDown = (e: PointerEvent) => pickerRef.current && !pickerRef.current.contains(e.target as Node) && setPicking(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicking(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [picking]);
  const done = (keys: string[]) => {
    setPicking(false);
    go({ org: keys });
  };

  const items = [...data.items, ...more.items];
  const stack = (chosen.length ? chosen.map((k) => orgs.get(k)) : data.orgs.filter((o) => o.icon).slice(0, 4)).slice(0, 4);
  const filtered = chosen.length > 0 || hot;

  return (
    <div className="mx-auto max-w-[880px] pb-14 pt-3 lg:pt-6">
      <PhoneBar
        title="官方博客"
        actions={
          <BarButton label={filtered ? "筛选（已选）" : "筛选"} on={filtered} onClick={() => setPicking(true)}>
            <IconFilter size={21} />
            {filtered && <span aria-hidden="true" className="absolute right-[9px] top-[9px] size-[7px] rounded-full bg-accent ring-2 ring-bg" />}
          </BarButton>
        }
      />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pb-4 lg:pb-5">
        <div>
          <Kicker>一手来源</Kicker>
          <h1 data-page-title="" className="mt-1.5 hidden text-[26px] font-bold leading-[1.3] tracking-[-0.01em] text-ink lg:block">官方博客</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">各家科技公司自己发的工程文章，按时间倒序，点开直接读原文。</p>
        </div>
        <p className="hidden text-[12px] text-ink-4 lg:block">
          <span className="mono">{data.orgs.length}</span> 家公司
          {data.updatedAt && <> · <span className="mono">{beijingTime(data.updatedAt)}</span> 更新</>}
        </p>
      </header>

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          aria-pressed={hot}
          onClick={() => go({ hot: !hot })}
          title="只看被其他媒体跟进报道的文章"
          className={`inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors ${hot ? "border-transparent bg-hot-soft font-semibold text-hot" : "border-line bg-surface text-ink-3 hover:border-line-strong hover:text-ink"}`}
        >
          <IconFlame size={15} />
          只看热议
        </button>
        {chosen.map((key) => (
          <button key={key} type="button" onClick={() => go({ org: chosen.filter((k) => k !== key) })} aria-label={`移除 ${orgs.get(key)?.name ?? key}`}
            className="inline-flex h-[26px] items-center gap-1 rounded-full bg-accent-soft pl-2.5 pr-1.5 text-[12px] text-accent">
            {orgs.get(key)?.name ?? key}
            <IconClose size={13} />
          </button>
        ))}
        <div ref={pickerRef} className="relative ml-auto hidden lg:block">
          <button type="button" onClick={() => setPicking(!picking)} aria-haspopup="dialog" aria-expanded={picking} aria-label="按公司筛选"
            className={`inline-flex h-[34px] items-center gap-2 rounded-full border bg-surface pl-1.5 pr-2 text-[13px] transition-colors hover:border-line-strong hover:text-ink ${chosen.length ? "border-accent text-ink" : "border-line text-ink-3"}`}>
            <span className="flex">
              {stack.map((o, i) => (
                <span key={o?.key ?? i} className={i ? "-ml-1.5" : ""}>
                  <span className="block rounded-full ring-2 ring-surface"><OrgMark org={o} size={24} round /></span>
                </span>
              ))}
            </span>
            <span className="text-[12px] text-ink-4">{chosen.length ? `已选 ${chosen.length}` : `+${Math.max(0, data.orgs.length - stack.length)}`}</span>
            <IconChevronDown size={14} />
          </button>
          <Presence show={picking} enter="anim-drop-in" exit="anim-drop-out" duration={140}>
            <div role="dialog" aria-label="按公司筛选" className="absolute right-0 top-11 z-50 w-[300px] origin-top-right overflow-hidden rounded-sheet border border-line bg-raised shadow-[var(--shadow-pop)]">
              <OrgPicker orgs={data.orgs} chosen={chosen} onDone={done} />
            </div>
          </Presence>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState title={filtered ? "没有符合条件的文章" : "还没有文章"}>
            {filtered ? "换几家公司，或者关掉“只看热议”。" : "信源采集到的第一篇文章会出现在这里。"}
          </EmptyState>
        </div>
      ) : (
        <Days items={items} orgs={orgs} now={now} />
      )}

      {more.cursor && (
        <div className="flex flex-col items-center gap-2 pt-5">
          <button type="button" onClick={loadMore} disabled={loading}
            className="h-9 rounded-full border border-line bg-surface px-[18px] text-[13.5px] text-ink-3 transition-colors hover:text-ink disabled:opacity-60">
            {loading ? "正在加载…" : "加载更早的文章"}
          </button>
          {failed && <p className="text-[12.5px] text-hot">没有加载出来，再点一次试试。</p>}
        </div>
      )}

      <Sheet open={picking && isPhone()} onClose={() => setPicking(false)} title="按公司筛选">
        <div className="-mx-4 flex flex-col gap-2">
          <button type="button" aria-pressed={hot} onClick={() => go({ hot: !hot })}
            className={`mx-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-control border text-[14px] ${hot ? "border-transparent bg-hot-soft font-semibold text-hot" : "border-line text-ink-3"}`}>
            <IconFlame size={16} />
            只看热议
          </button>
          <OrgPicker orgs={data.orgs} chosen={chosen} onDone={done} />
        </div>
      </Sheet>
    </div>
  );
}
