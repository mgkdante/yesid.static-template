import { site } from '#lib/config/site.ts';
import { siteMap } from '#lib/content/index.ts';
import { sitemapXml } from '#lib/seo.ts';
export const prerender = true;
export const GET = () => new Response(sitemapXml(siteMap), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
