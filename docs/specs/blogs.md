# 官方博客页（blogs 模块）

状态：ready-for-agent

## Problem Statement

读者想看一线科技公司自己写的工程文章，但站里现有的入口都不合适：「精选」和「全部动态」只收模型判为 AI 相关、并且写好中文标题和摘要的报道，Uber、Stripe、Netflix 这类公司的工程博客基本进不来；就算进来了，也和媒体报道、X 帖子混在一起，找不到「某家公司最近发了什么」。techxiv.dev 这样的站点证明了一张「只列公司官方博客、按时间倒序、点开就是原文」的清单很有用，本站没有对应的入口。

## Solution

在桌面侧栏「内容」分组的最后加一个「官方博客」入口，打开 `/blogs`：一张按天分组、按时间倒序的列表，只列 23 家公司官方工程博客的文章。每行显示机构图标、文章原标题、机构名和时间，点开直接去原文。工具栏有「只看热议」开关（被其他来源跟进报道的文章）和按机构多选的筛选器。文章被本站精选过的，行内有「精选」标记，点它进入本站的中文解读页。手机上从「我的」页进入，筛选器改成底部弹出的面板。

这 23 家博客作为普通信源接入，照常经过模型分析：与 AI 相关的文章照旧进入精选和全部动态，并参与归组和热度；博客页本身不看模型的判定结果，全部展示。

收录的机构（与 techxiv.dev 一致）：Amazon、Anthropic、Cloudflare、Cursor、Datadog、DeepMind、Discord、Dropbox、Figma、Fly.io、GitHub、Jane Street、LinkedIn、Meta、Netflix、Notion、OpenAI、Shopify、Slack、Spotify、Stripe、Uber、Vercel。

## User Stories

1. As a 读者, I want a「官方博客」entry in the desktop sidebar under「内容」, so that I can find the page without knowing its address.
2. As a 读者, I want the entry to sit after「收藏」and look like the other sidebar entries, so that it feels like part of the site.
3. As a 手机读者, I want to reach the page from the「我的」page, so that I can use it without the desktop sidebar.
4. As a 读者, I want the page to list articles from the 23 companies' official engineering blogs only, so that media reports and social posts don't dilute it.
5. As a 读者, I want articles newest first, so that I see what was published recently.
6. As a 读者, I want articles grouped by day with「今天」「昨天」and dated headings, so that I can tell how fresh each one is.
7. As a 读者, I want each day heading to show the weekday and the number of articles that day, so that I can skim the rhythm of publishing.
8. As a 读者, I want each row to show the company's icon, the article title, the company name and the publication time, so that I can decide at a glance whether to open it.
9. As a 读者, I want to see the article's original title, so that the list reads the same as the source and nothing is lost in translation.
10. As a 读者, I want clicking a row to open the original article in a new tab, so that I read it where it was published.
11. As a 读者, I want articles the site has selected to carry a「精选」mark, so that I know the site has a Chinese write-up of it.
12. As a 读者, I want clicking「精选」to open the site's item page, so that I can read the Chinese summary when I prefer it.
13. As a 读者, I want articles other outlets have picked up to show「N 家报道」, so that I can spot the posts people are talking about.
14. As a 读者, I want a「只看热议」toggle, so that I can see only the articles others have followed up on.
15. As a 读者, I want to filter by one or more companies, so that I can follow just the blogs I care about.
16. As a 读者, I want the company filter to show each company's icon and article count, so that I can pick quickly.
17. As a 读者, I want to search inside the company filter, so that I can find a company in a list of 23.
18. As a 读者, I want each chosen company to appear as a removable chip, so that I can see and undo my filter.
19. As a 读者, I want a「清除」action, so that I can drop all company filters at once.
20. As a 读者, I want the filter state in the address (query string), so that I can bookmark or share a filtered view and the back button works.
21. As a 读者, I want a「加载更早的文章」button, so that I can go back further than the first page.
22. As a 读者, I want a clear empty state when filters match nothing, so that I know to change the filters rather than think the page is broken.
23. As a 读者, I want the page to look right in light and dark themes, so that it matches the rest of the site.
24. As a 手机读者, I want titles to wrap to two lines and the time to sit beside the company name, so that rows stay readable on a narrow screen.
25. As a 手机读者, I want the company filter as a bottom sheet with a dot on the filter button when filters are on, so that I know a filter is active.
26. As a 读者, I want company icons that are recognizable, so that I can scan the list by logo.
27. As a 读者, I want a company without a bundled icon to still show a sensible mark, so that no row looks broken.
28. As a 读者, I want withdrawn or blocked articles never to appear, so that the page respects the site's editorial decisions.
29. As a 读者, I want articles to appear soon after the blog publishes them, so that the page is current.
30. As a 读者, I want the page to load fast and be cacheable, so that it feels like the other list pages.
31. As a 搜索引擎, I want the page to have a proper title, description and canonical address, so that it can be indexed like the site's other lists.
32. As a 站长, I want the 23 blogs configured as ordinary sources, so that I can pause, edit or add one in the admin like any other source.
33. As a 站长, I want the blogs page to be driven by a source tag, so that adding a blog later only means creating a source with that tag (and, optionally, an icon mapping).
34. As a 站长, I want AI-relevant posts from these blogs to keep entering 精选 and 全部动态, so that the main feed still benefits from them.
35. As a 站长, I want no extra paid calls beyond the normal per-article analysis, so that the feature stays cheap.
36. As a 站长, I want the feature as a module, so that merging upstream framework updates doesn't conflict with it.
37. As a 站长, I want the page to keep working when no blog source exists yet, so that a fresh install shows an empty state instead of an error.
38. As a 运维, I want broken list-page selectors to show up in source health alerts, so that I notice when a blog redesign stops collection.

## Implementation Decisions

- **Shape**: a new site module `@aihot/blogs` under the modules directory, listed in the site's three module lists (addresses, server, web) and in the site package's dependencies (and the Dockerfile copy line). No framework code changes; if a needed socket is missing, add a general socket rather than special-casing blogs.
- **Sources**: 23 sources added to the industry's seed sources, all `participation_mode: editorial`, `tier: T1`, tagged `工程博客`, `site_fulltext` and `syndicate_fulltext` off. OpenAI News and Google DeepMind already exist and only gain the tag. 15 are RSS (Vercel limited to `/blog/` by URL prefix; Datadog and GitHub use their engineering feeds). 8 use `web_list` against the engineering list page: Anthropic, Cursor, Discord, Figma, LinkedIn, Notion, Uber; Anthropic, Discord, Notion and Uber fill missing dates from the detail page, LinkedIn takes its title from the detail page because list titles are truncated. RSS polls every 180 minutes, list pages every 360. Selectors were checked against live pages with the project's list parser on 2026-10-09; they must be checked again with 预览抓取 when the sources are created. `owner_entity_id` is set only where the entity exists in the taxonomy (amazon, anthropic, cursor, meta, openai, google).
- **Organizations**: the module owns a fixed map from source id to organization `{ key, name, icon }`. The blogs page groups and filters by this organization key, not by `owner_entity_id`, because most of these companies are outside the AI taxonomy.
- **Icons**: LobeHub Icons (`@lobehub/icons-static-svg`, MIT), bundled into the module for the 11 companies it covers: Amazon (aws), Anthropic, Cloudflare, Cursor, DeepMind, Figma, GitHub, Meta, Notion, OpenAI, Vercel. Colour variants where they exist, mono marks take the ink colour so they follow the theme. The other 12 fall back to the source's collected icon, then to the site's tinted-initial avatar. Icons sit on a quiet tile; no ring or colour border for 精选 or 热议.
- **Which articles are listed**: every article from a `工程博客`-tagged source that has a public publication row and is released, regardless of relevance, eligibility or selection. Articles still waiting for analysis are not listed yet. Withdrawn articles and articles blocked by the safety boundary are never listed. The public-scope predicates come from the publication read layer's scope module, never re-spelled in the module.
- **Read layer**: the module's query lives in the module's server code but composes the publication layer's scope predicates; it is the only reader for this page. Readers opening the page trigger no model calls.
- **Title**: the article's original title (the source's own wording). The row links to the original URL. A selected article additionally exposes its site item page for the「精选」mark.
- **热议**: an article is 热议 when it belongs to a story that has public reports from at least 2 other sources (not counting the article's own source and counting each owner entity once). The count shown is that number of other sources. Articles judged not AI-relevant are never grouped, so they are never 热议; this is accepted.
- **API contract**: `GET /api/blogs` (declared in the module's api paths), anonymous, the same answer for admin and visitor.
  - Query: `org` (comma-separated organization keys), `hot=1`, `cursor` (opaque, from the previous answer), `limit` (default 30, max 60). Unknown or repeated parameters and unknown values → 400 with the API's problem format.
  - Answer: `{ items: [{ id, title, url, publishedAt, org, selected, itemPath | null, reportCount }], orgs: [{ key, name, icon, iconUrl, count }], nextCursor | null, updatedAt }`. `orgs` lists the configured organizations that have a tagged source (then any other tagged source under its public name), on the first page only, with its count under the current 热议 filter and ignoring the company filter, so the picker can show counts. `icon` names a bundled LobeHub icon; `iconUrl` is the source's own icon (proxied) for a company without one.
  - Ordered by timeline time descending with a stable tiebreak; cursor pagination like the existing timeline.
  - Cache: public, 60 s, with an ETag, matching the site's other list endpoints.
- **Web**: a `/blogs` page registered by the module, using the site's shell, tokens and components (card, badge, kicker header, pill toggles, sheet on phones, site avatar fallback). Sidebar item via the module's `sidebar` socket in section「内容」; on phones an entry on the「我的」page. Filters live in the query string and are read by the loader; the page talks to the API only over HTTP. Day grouping uses Beijing time. Page meta: title「官方博客」, a description, canonical without cursor.
- **Visual reference**: the approved mockup (desktop + phone, light + dark): kicker「一手来源」, title, one-line lede, a stamp with organization count and update time; toolbar with「只看热议」, chosen-company chips and the stacked-avatar company picker; day-grouped cards; empty state「没有符合条件的文章」.
- **No schema change**: the query is served by existing publication and source columns; add an index only if the query plan on real data shows a need, following the online-migration rules.

## Testing Decisions

- One seam: the module's HTTP endpoint, exercised through the API app with the module installed, against a seeded test database. Tests assert only what a caller sees (which items, in what order, which flags and counts, status codes and cache headers), never SQL or internal helpers.
- Cases:
  - lists articles from tagged sources only, newest first, including articles that are neither eligible nor selected;
  - excludes withdrawn, blocked, unreleased and untagged-source articles;
  - `selected` and `itemPath` are set only for selected, released articles;
  - `reportCount` counts other sources on the same story, one per owner entity; `hot=1` keeps only articles with at least 2;
  - `org` filters by one or several organizations; `orgs` counts follow the 热议 filter;
  - cursor pagination returns every article exactly once across pages;
  - invalid `org`, `limit`, `cursor` or unknown parameters → 400;
  - empty database → 200 with empty items and no organizations;
  - a page boundary inside one millisecond loses no article (cursor keeps microseconds);
  - public cache headers and ETag / 304.
- The module's tests live in the module's tests directory and run with `npm test`.
- Prior art: the agent public API tests (build the app, `inject`, assert status, body and headers) and the publication tests for seeding articles, publications, facts and stories.
- The web page is covered by typecheck, the web build and the smoke script; no separate web seam.

## Out of Scope

- Measuring virality on X (paid search per article); 热议 is the stand-in.
- Skipping model analysis for these sources or a new participation mode.
- Jev or any other new model provider.
- An RSS feed, public v1 API, Agent Markdown or MCP tool for the blogs list.
- Translating titles for the list, summaries in the list, full text.
- Admin UI for the organization map; editing it is a code change in the module.
- Icons for the 12 companies LobeHub does not cover beyond the fallback.

## Further Notes

- Selectors for Uber and Figma depend on generated class names or test ids and may break on redesign; source health alerts are the safety net.
- Discord's detail date is written like「Jun 11, 2026」in JSON-LD; confirm it parses with 预览抓取 before enabling the source.
- Stripe only has a whole-blog feed, so product announcements will appear too.
- Cursor's list page only exposes its latest few posts; older ones won't be backfilled.
- Brand icons are trademarks used to identify the source of each article.
