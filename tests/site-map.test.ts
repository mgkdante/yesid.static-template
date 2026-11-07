import { expect, test } from 'bun:test';
import { z } from 'zod';
import { line, paragraph } from '@yesid/content-contract';
import { createCatalog } from '../src/lib/collection-catalog.ts';
import { site, type SiteSettings } from '../src/lib/config/site.ts';
import { defineCollection } from '../src/lib/content/collections.ts';
import { createSiteMap, type PageDefinition } from '../src/lib/site-map.ts';

const settings: SiteSettings = {
  ...site,
  origin: 'https://client.example.test',
  defaultLanguage: 'fr',
  languages: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }]
};
const pages: readonly PageDefinition[] = [
  { id: 'home', kind: 'fixed', slugs: { fr: '', en: '' } },
  { id: 'about', kind: 'fixed', slugs: { fr: 'a-propos', en: 'about' } },
  { id: 'news', kind: 'fixed', slugs: { fr: 'nouvelles', en: 'news' } },
  { id: 'terms', kind: 'fixed', inFooter: true, slugs: { fr: 'conditions', en: 'terms' } }
];
const news = defineCollection({
  name: 'news', label: 'News', listing: 'news',
  contract: z.strictObject({ title: line('Title'), summary: paragraph('Summary') }),
  metadata: (data) => ({ title: data.title, description: data.summary }),
  present: (data) => data
});

test('translated slugs resolve and switch the same page', () => {
  const map = createSiteMap(settings, pages);
  expect(map.path('home', 'fr')).toBe('/');
  expect(map.path('about', 'fr')).toBe('/a-propos/');
  expect(map.path('about', 'en')).toBe('/en/about/');
  expect(map.switchTarget('/a-propos/', 'en')).toBe('/en/about/');
  expect(map.resolve('/en/about/')?.id).toBe('about');
  expect(map.resolve('/en/a-propos/')).toBeUndefined();
  expect(map.path('missing', 'en')).toBeUndefined();
});
test('footer pages leave the menu', () => {
  const map = createSiteMap(settings, pages);
  expect(map.navigation('fr').map(({ id }) => id)).toEqual(['home', 'about', 'news']);
  expect(map.footerLinks('fr').map(({ id }) => id)).toEqual(['terms']);
});
test('another language needs only settings and translated slugs', () => {
  const more = { ...settings, languages: [...settings.languages, { code: 'de', label: 'Deutsch' }] };
  const translated = pages.map((page) => ({ ...page, slugs: { ...page.slugs, de: page.id === 'home' ? '' : `seite-${page.id}` } }));
  const map = createSiteMap(more, translated);
  expect(map.path('home', 'de')).toBe('/de/');
  expect(map.switchTarget('/en/about/', 'de')).toBe('/de/seite-about/');
  expect(map.alternates('about')).toHaveLength(3);
  expect([...map.navigation('de'), ...map.footerLinks('de')]).toHaveLength(translated.length);
  expect(() => createSiteMap(more, pages)).toThrow('Missing fixed slug');
});
test('an untranslated entry never advertises a missing target', () => {
  const catalog = createCatalog(settings, pages, [news], { './news/fixture.fr.md': '---\ntitle: Entry\nsummary: Example\n---\n' });
  const [first] = catalog.entries;
  const path = catalog.map.path(first.id, first.language)!;
  expect(catalog.map.alternates(first.id)).toHaveLength(1);
  expect(catalog.map.switchTarget(path, 'en')).toBeUndefined();
  expect(catalog.map.find(first.id, 'en')).toBeUndefined();
});
test('ambiguous paths and identities fail before publication', () => {
  expect(() => createSiteMap(settings, [...pages, pages[0]])).toThrow();
  expect(() => createSiteMap(settings, [{ id: 'x', kind: 'entry', slugs: { fr: '../admin' } }])).toThrow('Invalid slug');
});
test('non-Latin slugs resolve from a real URL pathname', () => {
  const map = createSiteMap(settings, [{ id: 'unicode', kind: 'entry', slugs: { fr: 'blog/東京' } }]);
  const row = map.find('unicode', 'fr')!;
  expect(map.resolve(new URL(row.url).pathname)?.id).toBe('unicode');
  expect(map.switchTarget(new URL(row.url).pathname, 'fr')).toBe(row.path);
});
