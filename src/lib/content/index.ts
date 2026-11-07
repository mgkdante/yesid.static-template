import { site } from '../config/site.ts';
import { createCatalog } from '../collection-catalog.ts';
import { fixedPages } from '../site-map.ts';
import { collections } from './registry.ts';
import { errorContract, fixedPageIds, footerContract, menuContract, pageContract, type Pages } from './contract.ts';

const files = import.meta.glob('./*.json', { eager: true, import: 'default' });
export const content = Object.fromEntries(site.languages.map(({ code }) => [code, {
  menu: menuContract.parse(files[`./menu.${code}.json`]),
  footer: footerContract.parse(files[`./footer.${code}.json`]),
  error: errorContract.parse(files[`./error.${code}.json`]),
  pages: Object.fromEntries(fixedPageIds.map((id) => [id, pageContract.parse(files[`./${id}.${code}.json`])])) as Pages
}]));
const sources = import.meta.glob<string>('./*/*.md', { eager: true, query: '?raw', import: 'default' });
export const catalog = createCatalog(site, fixedPages, collections, sources);
export const siteMap = catalog.map;
