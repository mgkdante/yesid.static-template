import { expect, test } from 'bun:test';
import { z } from 'zod';
import { date, group, line, list, paragraph } from '@yesid/content-contract';
import { createCatalog } from '../src/lib/collection-catalog.ts';
import { site, type SiteSettings } from '../src/lib/config/site.ts';
import { defineCollection, loadCollections } from '../src/lib/content/collections.ts';

const settings: SiteSettings = {
  ...site,
  defaultLanguage: 'fr',
  languages: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }]
};
const resources = defineCollection({
  name: 'resources', label: 'Resources', listing: 'resources',
  contract: z.strictObject({ name: line('Name'), summary: paragraph('Summary') }),
  metadata: (data) => ({ title: data.name, description: data.summary }),
  present: (data) => data
});

test('a new collection keeps its own shape without blog fields', () => {
  const entries = loadCollections([resources], {
    './resources/manual.fr.md': '---\nname: Guide\nsummary: Help\n---\n',
    './resources/manual.en.md': '---\nname: Manual\nsummary: Help\n---\n'
  }, ['fr', 'en']);
  expect(entries).toHaveLength(2);
  expect(entries[0].id).toBe('resources:manual');
  expect(entries[0].content).toEqual({ name: 'Manual', summary: 'Help' });
  expect(entries[0].collection).toBe('resources');
});

test('collection create, edit and delete update listings, routes and translations', () => {
  const pages = [{ id: 'resources', kind: 'fixed' as const, slugs: { fr: 'guides', en: 'resources', es: 'recursos' } }];
  const source = (name: string) => `---\nname: ${name}\nsummary: Help\n---\n`;
  const sources = { './resources/manual.fr.md': source('Guide'), './resources/manual.en.md': source('Manual') };
  const created = createCatalog(settings, pages, [resources], sources);
  expect(created.map.path('resources:manual', 'en')).toBe('/en/resources/manual/');
  expect(created.listing('resources', 'fr')?.entries).toHaveLength(1);
  expect(created.map.alternates('resources:manual')).toHaveLength(2);
  expect(created.map.path('resources:manual', 'es')).toBeUndefined();
  const edited = createCatalog(settings, pages, [resources], { ...sources, './resources/manual.en.md': source('Handbook') });
  expect(edited.map.resolve('/en/resources/manual/')).toBeUndefined();
  expect(edited.map.switchTarget('/guides/guide/', 'en')).toBe('/en/resources/handbook/');
  const removed = createCatalog(settings, pages, [resources], {});
  expect(removed.listing('resources', 'fr')?.entries).toHaveLength(0);
  expect(removed.map.find('resources:manual', 'fr')).toBeUndefined();
});

test('shared rules come from each contract, including nested lists', () => {
  const collection = defineCollection({
    name: 'events', label: 'Events', listing: 'events',
    contract: z.strictObject({
      label: line('Label'), summary: paragraph('Summary'),
      details: group('Details', { dates: list('Dates', date('Date', { shared: true })) })
    }),
    metadata: (data) => ({ title: data.label, description: data.summary }), present: (data) => data
  });
  const source = (label: string, date: string) => `---\nlabel: ${label}\nsummary: Help\ndetails:\n  dates: ['${date}']\n---\n`;
  const sources = { './events/one.fr.md': source('Un', '2026-01-01'), './events/one.en.md': source('One', '2026-01-02') };
  expect(() => loadCollections([collection], sources, ['fr', 'en'])).toThrow('Shared fields differ');
});

test('unknown collections and language files fail with their source path', () => {
  expect(() => loadCollections([resources], { './unknown/entry.fr.md': '' }, ['fr'])).toThrow('Unregistered collection file');
  expect(() => loadCollections([resources], { './resources/entry.zz.md': '' }, ['fr'])).toThrow('Invalid collection file');
});

test('entries that share a title get their own addresses, whatever the Owner writes', () => {
  const pages = [{ id: 'resources', kind: 'fixed' as const, slugs: { fr: 'guides', en: 'resources', es: 'recursos' } }];
  const source = (name: string) => `---\nname: ${name}\nsummary: Help\n---\n`;
  const paths = (sources: Record<string, string>) => {
    const { entries, map } = createCatalog(settings, pages, [resources], sources);
    return Object.fromEntries(entries.map(({ id, language }) => [`${id.split(':')[1]}.${language}`, map.path(id, language)]));
  };
  // The existing post keeps its address when a newer one takes the same title.
  expect(paths({ './resources/nouvelles.fr.md': source('Nouvelles'), './resources/nouvelles-1.fr.md': source('Nouvelles') }))
    .toEqual({ 'nouvelles.fr': '/guides/nouvelles/', 'nouvelles-1.fr': '/guides/nouvelles-1/' });
  // Titles that differ only by accent or case, with the hashed file names a collection without `title` gets.
  expect(paths({ './resources/52cb.fr.md': source('Été'), './resources/aa57.fr.md': source('ete') }))
    .toEqual({ '52cb.fr': '/guides/ete/', 'aa57.fr': '/guides/ete-aa57/' });
  expect(paths({ './resources/a~b.fr.md': source('Un'), './resources/c.fr.md': source('Un') }))
    .toEqual({ 'a~b.fr': '/guides/un/', 'c.fr': '/guides/un-c/' });
  // Sharing a title across languages is normal and needs nothing.
  expect(paths({ './resources/one.fr.md': source('Same'), './resources/one.en.md': source('Same') }))
    .toEqual({ 'one.en': '/en/resources/same/', 'one.fr': '/guides/same/' });
});

test('an entry listed on the home page keeps out of the addresses the site already uses', () => {
  const definition = { ...resources, listing: 'home' };
  const pages = [
    { id: 'home', kind: 'fixed' as const, slugs: { fr: '', en: '', es: '' } },
    { id: 'about', kind: 'fixed' as const, slugs: { fr: 'a-propos', en: 'about', es: 'acerca-de' } }
  ];
  const source = (name: string) => `---\nname: ${name}\nsummary: Help\n---\n`;
  const titles = { './resources/one.fr.md': source('À propos'), './resources/two.fr.md': source('admin'), './resources/three.fr.md': source('EN') };
  const catalog = createCatalog(settings, pages, [definition], titles);
  expect(catalog.map.path('resources:one', 'fr')).toBe('/a-propos-one/');
  expect(catalog.map.path('resources:two', 'fr')).toBe('/admin-two/');
  expect(catalog.map.path('resources:three', 'fr')).toBe('/en-three/');
});

test('collection identities stay separate', () => {
  const other = defineCollection({
    name: 'other', label: 'Other', listing: 'other', contract: resources.cms.contract,
    metadata: (data) => ({ title: String(data.name), description: String(data.summary) }), present: (data) => data
  });
  const source = '---\nname: One\nsummary: Help\n---\n';
  const entries = loadCollections([resources, other], { './resources/same.fr.md': source, './other/same.fr.md': source }, ['fr']);
  expect(new Set(entries.map(({ id }) => id)).size).toBe(2);
});

test('a collection can list its entries on each language home', () => {
  const definition = { ...resources, listing: 'home' };
  const pages = [{ id: 'home', kind: 'fixed' as const, slugs: { fr: '', en: '', es: '' } }];
  const sources = {
    './resources/manual.fr.md': '---\nname: Guide\nsummary: Help\n---\n',
    './resources/manual.en.md': '---\nname: Manual\nsummary: Help\n---\n'
  };
  const catalog = createCatalog(settings, pages, [definition], sources);
  expect(catalog.map.path('resources:manual', 'fr')).toBe('/guide/');
  expect(catalog.map.path('resources:manual', 'en')).toBe('/en/manual/');
  expect(catalog.listing('home', 'fr')?.entries).toHaveLength(1);
});
