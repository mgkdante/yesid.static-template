import { expect, test } from 'bun:test';
import { site } from '../src/lib/config/site.ts';
import { createSiteMap, fixedPages } from '../src/lib/site-map.ts';
import { sampleCatalog, sampleSources } from './helpers.ts';

test('translated slugs resolve and switch the same page', () => {
  const map = createSiteMap(site, fixedPages);
  expect(map.path('home', site.defaultLanguage)).toBe('/');
  expect(map.path('about', 'fr')).toBe('/a-propos/');
  expect(map.path('about', 'en')).toBe('/en/about/');
  expect(map.switchTarget('/a-propos/', 'en')).toBe('/en/about/');
  expect(map.resolve('/en/about/')?.id).toBe('about');
  expect(map.resolve('/en/a-propos/')).toBeUndefined();
  expect(map.path('missing', 'en')).toBeUndefined();
});
test('another language needs only settings and translated slugs', () => {
  const settings = { ...site, languages: [...site.languages, { code: 'de', label: 'Deutsch' }] };
  const pages = fixedPages.map((page) => ({ ...page, slugs: { ...page.slugs, de: page.id === 'home' ? '' : `seite-${page.id}` } }));
  const map = createSiteMap(settings, pages);
  expect(map.path('home', 'de')).toBe('/de/');
  expect(map.switchTarget('/en/about/', 'de')).toBe('/de/seite-about/');
  expect(map.alternates('about')).toHaveLength(4);
  expect(map.navigation('de')).toHaveLength(pages.length);
  expect(() => createSiteMap(settings, fixedPages)).toThrow('Missing fixed slug');
});
test('an untranslated post never advertises a missing target', () => {
  const sources = Object.fromEntries(Object.entries(sampleSources()).filter(([file]) => file.endsWith(`.${site.defaultLanguage}.md`)));
  const catalog = sampleCatalog(sources);
  const map = catalog.map;
  const first = catalog.entries[0];
  const path = map.path(first.id, first.language)!;
  expect(map.alternates(first.id)).toHaveLength(1);
  expect(map.switchTarget(path, 'en')).toBeUndefined();
  expect(map.find(first.id, 'en')).toBeUndefined();
});
test('ambiguous paths and identities fail before publication', () => {
  expect(() => createSiteMap(site, [...fixedPages, fixedPages[0]])).toThrow();
  expect(() => createSiteMap(site, [{ id: 'x', kind: 'entry', slugs: { fr: '../admin' } }])).toThrow('Invalid slug');
});

test('non-Latin slugs resolve from a real URL pathname', () => {
  const map = createSiteMap(site, [{ id: 'unicode', kind: 'entry', slugs: { [site.defaultLanguage]: 'blog/東京' } }]);
  const row = map.find('unicode', site.defaultLanguage)!;
  expect(map.resolve(new URL(row.url).pathname)?.id).toBe('unicode');
  expect(map.switchTarget(new URL(row.url).pathname, site.defaultLanguage)).toBe(row.path);
});
