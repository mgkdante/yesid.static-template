import { expect, test } from 'bun:test';
import { z } from 'zod';
import { date, group, line, list, paragraph } from '@yesid/content-contract';
import { createCatalog } from '../src/lib/collection-catalog.ts';
import { site } from '../src/lib/config/site.ts';
import { defineCollection, loadCollections } from '../src/lib/content/collections.ts';

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
  const created = createCatalog(site, pages, [resources], sources);
  expect(created.map.path('resources:manual', 'en')).toBe('/en/resources/manual/');
  expect(created.listing('resources', 'fr')?.entries).toHaveLength(1);
  expect(created.map.alternates('resources:manual')).toHaveLength(2);
  expect(created.map.path('resources:manual', 'es')).toBeUndefined();
  const edited = createCatalog(site, pages, [resources], { ...sources, './resources/manual.en.md': source('Handbook') });
  expect(edited.map.resolve('/en/resources/manual/')).toBeUndefined();
  expect(edited.map.switchTarget('/guides/guide/', 'en')).toBe('/en/resources/handbook/');
  const removed = createCatalog(site, pages, [resources], {});
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

test('collection identities stay separate and path collisions fail', () => {
  const other = defineCollection({
    name: 'other', label: 'Other', listing: 'other', contract: resources.cms.contract,
    metadata: (data) => ({ title: String(data.name), description: String(data.summary) }), present: (data) => data
  });
  const source = '---\nname: One\nsummary: Help\n---\n';
  const entries = loadCollections([resources, other], { './resources/same.fr.md': source, './other/same.fr.md': source }, ['fr']);
  expect(new Set(entries.map(({ id }) => id)).size).toBe(2);
  const pages = [{ id: 'resources', kind: 'fixed' as const, slugs: { fr: 'guides', en: 'resources', es: 'recursos' } }];
  expect(() => createCatalog(site, pages, [resources], { './resources/a.fr.md': source, './resources/b.fr.md': source })).toThrow('Duplicate page path');
});

test('a collection can list its entries on each language home', () => {
  const definition = { ...resources, listing: 'home' };
  const pages = [{ id: 'home', kind: 'fixed' as const, slugs: { fr: '', en: '', es: '' } }];
  const sources = {
    './resources/manual.fr.md': '---\nname: Guide\nsummary: Help\n---\n',
    './resources/manual.en.md': '---\nname: Manual\nsummary: Help\n---\n'
  };
  const catalog = createCatalog(site, pages, [definition], sources);
  expect(catalog.map.path('resources:manual', 'fr')).toBe('/guide/');
  expect(catalog.map.path('resources:manual', 'en')).toBe('/en/manual/');
  expect(catalog.listing('home', 'fr')?.entries).toHaveLength(1);
});
