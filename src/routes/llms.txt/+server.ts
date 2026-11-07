import { site } from '#lib/config/site.ts';
import { siteMap } from '#lib/content/index.ts';
import { sitemapXml } from '#lib/seo.ts';
export const prerender = true;
export const GET = () => new Response(`# ${site.business.name}\n\n${siteMap.rows.map((row) => `- [${row.id} (${row.language})](${row.url})`).join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
