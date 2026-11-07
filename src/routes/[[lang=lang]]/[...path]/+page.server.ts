import { error } from '@sveltejs/kit';
import { catalog, content, siteMap } from '#lib/content/index.ts';
import { site } from '#lib/config/site.ts';
import type { FixedPageId } from '#lib/content/contract.ts';
import type { PageServerLoad } from './$types';

export const entries = () => siteMap.rows.map(({ path, language }) => ({
  lang: language === site.defaultLanguage ? undefined : language,
  path: path.split('/').filter(Boolean).slice(language === site.defaultLanguage ? 0 : 1).map(decodeURIComponent).join('/')
}));
export const load: PageServerLoad = ({ url }) => {
  const row = siteMap.resolve(url.pathname);
  if (!row) error(404);
  const localized = content[row.language];
  const entry = catalog.find(row.id, row.language);
  const listing = catalog.listing(row.id, row.language);
  const page = entry ? { ...entry.metadata, body: undefined } : localized.pages[row.id as FixedPageId];
  const items = listing?.entries.map((item) => ({ entry: item, path: siteMap.path(item.id, item.language)! })) ?? [];
  return { row, page, entry, listing, items, text: localized.text,
    alternates: siteMap.alternates(row.id),
    navigation: siteMap.navigation(row.language).map((item) => ({ ...item, title: localized.pages[item.id as FixedPageId].title })) };
};
