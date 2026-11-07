import { error } from '@sveltejs/kit';
import { content, posts, siteMap } from '#lib/content/index.ts';
import { site } from '#lib/config/site.ts';
import type { FixedPageId } from '#lib/content/contract.ts';
import type { PageServerLoad } from './$types';

export const entries = () => siteMap.rows.map(({ path, language }) => ({
  lang: language === site.defaultLanguage ? undefined : language,
  path: path.split('/').filter(Boolean).slice(language === site.defaultLanguage ? 0 : 1).join('/')
}));
export const load: PageServerLoad = ({ url }) => {
  const row = siteMap.resolve(url.pathname);
  if (!row) error(404);
  const localized = content[row.language];
  const post = posts.find(({ id, language }) => id === row.id && language === row.language);
  const page = post ?? localized.pages[row.id as FixedPageId];
  return { row, page, html: post?.html, text: localized.text,
    alternates: siteMap.alternates(row.id),
    navigation: siteMap.navigation(row.language).map((item) => ({ ...item, title: localized.pages[item.id as FixedPageId].title })),
    posts: row.id === 'blog' ? posts.filter(({ language }) => language === row.language).map((item) => ({
      title: item.title, date: item.date, path: siteMap.path(item.id, item.language)!
    })) : [] };
};
