// The blogs module on the web: its entry at the top of the sidebar's 内容 section and on the phone's 我的 page.
import type { WebModule } from "@aihot/web/modules";

/** A newspaper page: the companies' own blogs. */
export function IconBlogs({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5h12.5v13a1.5 1.5 0 01-1.5 1.5H5.5A1.5 1.5 0 014 18.5z" />
      <path d="M16.5 9H20v9.5a1.5 1.5 0 01-3 0" />
      <path d="M7 9h6.5M7 12.5h6.5M7 16h4" />
    </svg>
  );
}

export const blogsWeb: WebModule = {
  name: "blogs",
  sidebar: { section: "内容", first: true, items: [{ to: "/blogs", label: "官方博客", icon: IconBlogs }] },
  tools: [{ to: "/blogs", label: "官方博客", icon: <IconBlogs size={20} /> }],
};
