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
  name: 'resources', label: 'Resources', listing: 'resources', identifierField: 'name',
  contract: z.strictObject({ name: line('Name'), summary: paragraph('Summary') }),
  metadata: (data) => ({ title: data.name, description: data.summary }),
  present: (data) => data
});
const resourcePages = [{ id: 'resources', kind: 'fixed' as const, slugs: { fr: 'guides', en: 'resources', es: 'recursos' } }];
const source = (name: string) => `---\nname: ${name}\nsummary: Help\n---\n`;
const pathsOf = (sources: Record<string, string>, pages: Parameters<typeof createCatalog>[1] = resourcePages, definition = resources) => {
  const { entries, map } = createCatalog(settings, pages, [definition], sources);
  return Object.fromEntries(entries.map(({ id, language }) => [`${id.split(':')[1]}.${language}`, map.path(id, language)]));
};

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

test('a collection names the field its file names come from, so they are never random codes', () => {
  const contract = z.strictObject({ name: line('Name'), summary: paragraph('Summary') });
  const base = { label: 'X', listing: 'x', contract, metadata: () => ({ title: 'x', description: 'x' }), present: () => ({}) };
  expect(() => defineCollection({ ...base, name: 'nameless' })).toThrow('needs identifierField');
  expect(resources.cms.identifierField).toBe('name');
  const titled = defineCollection({ ...base, name: 'titled', contract: z.strictObject({ title: line('Title') }) });
  expect('identifierField' in titled.cms).toBe(false);
});

test('collection create, edit and delete update listings, routes and translations', () => {
  const sources = { './resources/manual.fr.md': source('Guide'), './resources/manual.en.md': source('Manual') };
  const created = createCatalog(settings, resourcePages, [resources], sources);
  expect(created.map.path('resources:manual', 'en')).toBe('/en/resources/manual/');
  expect(created.listing('resources', 'fr')?.entries).toHaveLength(1);
  expect(created.map.alternates('resources:manual')).toHaveLength(2);
  expect(created.map.path('resources:manual', 'es')).toBeUndefined();
  const edited = createCatalog(settings, resourcePages, [resources], { ...sources, './resources/manual.en.md': source('Handbook') });
  expect(edited.find('resources:manual', 'en')?.metadata.title).toBe('Handbook');
  expect(edited.map.switchTarget('/guides/manual/', 'en')).toBe('/en/resources/manual/');
  const removed = createCatalog(settings, resourcePages, [resources], {});
  expect(removed.listing('resources', 'fr')?.entries).toHaveLength(0);
  expect(removed.map.find('resources:manual', 'fr')).toBeUndefined();
});

test('shared rules come from each contract, including nested lists', () => {
  const collection = defineCollection({
    name: 'events', label: 'Events', listing: 'events', identifierField: 'label',
    contract: z.strictObject({
      label: line('Label'), summary: paragraph('Summary'),
      details: group('Details', { dates: list('Dates', date('Date', { shared: true })) })
    }),
    metadata: (data) => ({ title: data.label, description: data.summary }), present: (data) => data
  });
  const event = (label: string, day: string) => `---\nlabel: ${label}\nsummary: Help\ndetails:\n  dates: ['${day}']\n---\n`;
  const sources = { './events/one.fr.md': event('Un', '2026-01-01'), './events/one.en.md': event('One', '2026-01-02') };
  expect(() => loadCollections([collection], sources, ['fr', 'en'])).toThrow('Shared fields differ');
});

test('unknown collections and language files fail with their source path', () => {
  expect(() => loadCollections([resources], { './unknown/entry.fr.md': '' }, ['fr'])).toThrow('Unregistered collection file');
  expect(() => loadCollections([resources], { './resources/entry.zz.md': '' }, ['fr'])).toThrow('Invalid collection file');
});

test('an address comes from the file name, so a title edit or a new twin never moves a published one', () => {
  const before = pathsOf({ './resources/welcome.fr.md': source('Première note') });
  expect(before).toEqual({ 'welcome.fr': '/guides/welcome/' });
  // The editor names a new entry after its title. A twin of an older entry's title gets its own address.
  const after = pathsOf({ './resources/welcome.fr.md': source('Première note'), './resources/premiere-note.fr.md': source('Première note') });
  expect(after).toEqual({ 'welcome.fr': '/guides/welcome/', 'premiere-note.fr': '/guides/premiere-note/' });
  // The editor's own collision names (nouvelles, nouvelles-1) stay apart and stay put.
  expect(pathsOf({ './resources/nouvelles.fr.md': source('Nouvelles'), './resources/nouvelles-1.fr.md': source('Nouvelles') }))
    .toEqual({ 'nouvelles.fr': '/guides/nouvelles/', 'nouvelles-1.fr': '/guides/nouvelles-1/' });
  expect(pathsOf({ './resources/one.fr.md': source('Same'), './resources/one.en.md': source('Same') }))
    .toEqual({ 'one.en': '/en/resources/one/', 'one.fr': '/guides/one/' });
});

test('a file name that lands on a taken address gets a short code of its own, which other entries never change', () => {
  const home = { ...resources, listing: 'home' };
  const pages = [
    { id: 'home', kind: 'fixed' as const, slugs: { fr: '', en: '', es: '' } },
    { id: 'about', kind: 'fixed' as const, slugs: { fr: 'a-propos', en: 'about', es: 'acerca-de' } }
  ];
  const sources = { './resources/a-propos.fr.md': source('À propos'), './resources/admin.fr.md': source('admin'), './resources/en.fr.md': source('EN') };
  const paths = pathsOf(sources, pages, home);
  for (const [key, path] of Object.entries(paths)) expect(path).toMatch(new RegExp(`^/${key.split('.')[0]}--[0-9a-f]{8}/$`));
  // A plain file name the editor makes keeps its address; a name with capitals that normalizes onto it gets a code instead.
  const capitals = pathsOf({ './resources/ete.fr.md': source('Été'), './resources/Ete.fr.md': source('Été') });
  expect(capitals['ete.fr']).toBe('/guides/ete/');
  expect(capitals['Ete.fr']).toMatch(/^\/guides\/ete--[0-9a-f]{8}\/$/);
  // Adding or removing other entries doesn't change those codes.
  expect(pathsOf({ ...sources, './resources/autre.fr.md': source('Autre') }, pages, home)).toMatchObject(paths);
});

test('every address stays short enough to be a folder name, twins included', () => {
  const bytes = (text: string) => new TextEncoder().encode(text).length;
  const long = Object.fromEntries([1, 2, 3, 4].map((n) => [`./resources/${'b'.repeat(80)}${n}.fr.md`, source('a'.repeat(80))]));
  const paths = Object.values(pathsOf(long)) as string[];
  expect(new Set(paths).size).toBe(4);
  for (const path of paths) expect(bytes(path.split('/').at(-2)!)).toBeLessThanOrEqual(80);
  const unicode = pathsOf({ [`./resources/${'日本語'.repeat(100)}.fr.md`]: source('x') })[`${'日本語'.repeat(100)}.fr`]!;
  const segment = decodeURIComponent(unicode.split('/').at(-2)!);
  expect(bytes(segment)).toBeLessThanOrEqual(80);
  expect(segment.at(-1)).not.toBe('�');
  expect(createCatalog(settings, resourcePages, [resources], { './resources/one.fr.md': source('a'.repeat(300)) }).entries[0].content)
    .toMatchObject({ name: 'a'.repeat(300) });
});

test('collection identities stay separate', () => {
  const other = defineCollection({
    name: 'other', label: 'Other', listing: 'other', contract: resources.cms.contract, identifierField: 'name',
    metadata: (data) => ({ title: String(data.name), description: String(data.summary) }), present: (data) => data
  });
  const same = '---\nname: One\nsummary: Help\n---\n';
  const entries = loadCollections([resources, other], { './resources/same.fr.md': same, './other/same.fr.md': same }, ['fr']);
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
  expect(catalog.map.path('resources:manual', 'fr')).toBe('/manual/');
  expect(catalog.map.path('resources:manual', 'en')).toBe('/en/manual/');
  expect(catalog.listing('home', 'fr')?.entries).toHaveLength(1);
});
