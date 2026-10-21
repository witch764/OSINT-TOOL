import type { Tool } from './types';
// These are explicit research links, never counted as discovered records.
export function researchLinks(mode: string, query: string, tool?: Tool | null) {
  const exact = `"${query.replaceAll('"', '')}"`;
  const q = tool?.site ? `site:${tool.site} ${exact}` : exact;
  const links = [
    { name: 'Search Google', url: `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    { name: 'Search DuckDuckGo', url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  ];
  const profiles: Record<string, string> = { instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/@', telegram: 'https://t.me/', reddit: 'https://www.reddit.com/user/', github: 'https://github.com/' };
  if (tool && profiles[tool.id] && /^[a-zA-Z0-9_.-]{2,39}$/.test(query)) links.unshift({ name: 'Check profile URL (unverified)', url: profiles[tool.id] + encodeURIComponent(query) });
  if (['domain', 'certificate', 'urlscan', 'wayback'].includes(mode)) {
    links.push({ name: 'Check URLScan', url: `https://urlscan.io/search/#domain:${encodeURIComponent(query)}` }, { name: 'Browse archive history', url: `https://web.archive.org/web/*/${encodeURIComponent(query)}` });
  }
  return links;
}
