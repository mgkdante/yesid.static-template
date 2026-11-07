import { site } from '#lib/config/site.ts';
import { siteMap } from '#lib/content/index.ts';
import { sitemapXml } from '#lib/seo.ts';
export const prerender = true;
export const GET = () => new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${site.origin}/sitemap.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
