// The companies whose engineering blogs the page lists, and which of the site's sources each one writes.
// A source tagged BLOG_TAG that is missing here is listed under its own name, without a bundled icon.

/** The source tag that puts a source on the page. */
export const BLOG_TAG = "工程博客";

export interface BlogOrg {
  key: string;
  name: string;
  /** A LobeHub icon bundled with the page (web/icons.ts); without one, the source's own icon. */
  icon: string | null;
  sources: string[];
}

export const BLOG_ORGS: readonly BlogOrg[] = [
  { key: "amazon", name: "Amazon", icon: "aws-color", sources: ["rss-amazon-science"] },
  { key: "anthropic", name: "Anthropic", icon: "anthropic", sources: ["web-anthropic-engineering"] },
  { key: "cloudflare", name: "Cloudflare", icon: "cloudflare-color", sources: ["rss-cloudflare-blog"] },
  { key: "cursor", name: "Cursor", icon: "cursor", sources: ["web-cursor-blog"] },
  { key: "datadog", name: "Datadog", icon: null, sources: ["rss-datadog-engineering"] },
  { key: "deepmind", name: "DeepMind", icon: "deepmind-color", sources: ["rss-google-deepmind"] },
  { key: "dropbox", name: "Dropbox", icon: null, sources: ["rss-dropbox-tech"] },
  { key: "figma", name: "Figma", icon: "figma-color", sources: ["web-figma-engineering"] },
  { key: "flyio", name: "Fly.io", icon: null, sources: ["rss-fly-io"] },
  { key: "github", name: "GitHub", icon: "github", sources: ["rss-github-engineering"] },
  { key: "jane-street", name: "Jane Street", icon: null, sources: ["rss-jane-street"] },
  { key: "linkedin", name: "LinkedIn", icon: null, sources: ["web-linkedin-engineering"] },
  { key: "meta", name: "Meta", icon: "meta-color", sources: ["rss-meta-engineering"] },
  { key: "netflix", name: "Netflix", icon: null, sources: ["rss-netflix-tech"] },
  { key: "notion", name: "Notion", icon: "notion", sources: ["web-notion-tech"] },
  { key: "openai", name: "OpenAI", icon: "openai", sources: ["rss-openai-news"] },
  { key: "shopify", name: "Shopify", icon: null, sources: ["rss-shopify-engineering"] },
  { key: "slack", name: "Slack", icon: null, sources: ["rss-slack-engineering"] },
  { key: "spotify", name: "Spotify", icon: null, sources: ["rss-spotify-engineering"] },
  { key: "stripe", name: "Stripe", icon: null, sources: ["rss-stripe-blog"] },
  { key: "uber", name: "Uber", icon: null, sources: ["web-uber-engineering"] },
  { key: "vercel", name: "Vercel", icon: "vercel", sources: ["rss-vercel-blog"] },
];
