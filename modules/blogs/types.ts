// What GET /api/blogs answers (backend/list.ts), read by the page (web/page.tsx).

export interface BlogItem {
  id: string;
  /** The source's own title. */
  title: string;
  url: string;
  publishedAt: string;
  /** A company key from the answer's orgs. */
  org: string;
  /** The site selected it: its item page has the Chinese write-up. */
  selected: boolean;
  itemPath: string | null;
  /** Other outlets with a public report on the same story, one per company. */
  reportCount: number;
}

export interface BlogOrgCount {
  key: string;
  name: string;
  /** A bundled LobeHub icon (web/icons.ts). */
  icon: string | null;
  /** The source's own icon, for a company without a bundled one. */
  iconUrl: string | null;
  /** Its articles under the 热议 filter, whatever companies are chosen. */
  count: number;
}

export interface BlogsAnswer {
  items: BlogItem[];
  /** The companies with a tagged source; the first page only (empty with a cursor). */
  orgs: BlogOrgCount[];
  nextCursor: string | null;
  /** The newest listed article's time; the first page only. */
  updatedAt: string | null;
}
