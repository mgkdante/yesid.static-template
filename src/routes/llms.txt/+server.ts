import { site } from '#lib/config/site.ts';
import type { FixedPageId } from '#lib/content/contract.ts';
import { catalog, content, siteMap } from '#lib/content/index.ts';
import { llmsText } from '#lib/seo.ts';
export const prerender = true;
const pages = siteMap.rows.map((row) => {
  const { title, description } = catalog.find(row.id, row.language)?.metadata ?? content[row.language].pages[row.id as FixedPageId];
  return { language: row.language, title, description, url: row.url };
});
export const GET = () => new Response(llmsText(site, pages), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
