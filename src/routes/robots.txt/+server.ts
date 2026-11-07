import { site } from '#lib/config/site.ts';
export const prerender = true;
// /admin/ stays crawlable: it says noindex itself, and a blocked page's noindex can't be read.
export const GET = () => new Response(`User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
