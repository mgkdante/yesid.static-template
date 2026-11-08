import type { SiteSettings } from './config/site.ts';
import { createSiteMap, type PageDefinition } from './site-map.ts';
import { byteLength, loadCollections, MAX_SLUG_BYTES, shorten, type CollectionDefinition, type Entry } from './content/collections.ts';

/** Addresses the site's own routes and language prefixes already use. */
const reservedRoots = (settings: SiteSettings) => ['admin', '404', ...settings.languages.map(({ code }) => code)];

/** 64-bit FNV-1a of an entry's identity. It depends on nothing else, so other entries can never change it. */
function identityCode(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(text)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}
const coded = (base: string, id: string) => {
  const suffix = `--${identityCode(id)}`;
  return `${shorten(base, MAX_SLUG_BYTES - byteLength(suffix))}${suffix}`;
};

/**
 * An entry's address is a function of its own file name and the site's settings, never of the other entries,
 * so adding, editing, renaming or deleting one entry can't move another.
 * - A plain file name, the kind the editor makes (lowercase, no `--`, at most 80 bytes), is its own address.
 * - Any other file name always gets `--` and a code from its identity. Plain names never contain `--`, so the two can't meet.
 * - A plain name that a Fixed Page or the site's own routes use, in any language, gets the code in every language.
 * A collection with a `slug` callback chose addresses from its content instead. Those move when content changes,
 * and entries whose callback addresses collide all get codes.
 */
function entryPaths(entries: readonly Entry[], parentFor: (collection: string, language: string) => string, settings: SiteSettings, pages: readonly PageDefinition[]) {
  const languages = settings.languages.map(({ code }) => code);
  const pathOf = (parent: string, slug: string) => [parent, slug].filter(Boolean).join('/');
  const configPaths = new Set([
    ...languages.flatMap((code) => pages.flatMap(({ slugs }) => slugs[code] === undefined ? [] : [slugs[code]])),
    ...reservedRoots(settings)
  ]);
  const usedBySite = (entry: Entry, slug: string) => languages.some((code) => configPaths.has(pathOf(parentFor(entry.collection, code), slug)));
  const keyOf = (entry: Entry) => entry.id.slice(entry.collection.length + 1);
  const plainName = (entry: Entry) => entry.slug === keyOf(entry) && !keyOf(entry).includes('--');
  const callbackSlugs = new Map<string, number>();
  for (const entry of entries) {
    if (entry.fromFileName) continue;
    const where = `${entry.collection}/${entry.language}/${shorten(entry.slug)}`;
    callbackSlugs.set(where, (callbackSlugs.get(where) ?? 0) + 1);
  }
  return new Map(entries.map((entry) => {
    let slug: string;
    if (entry.fromFileName) {
      slug = plainName(entry) && !usedBySite(entry, entry.slug) ? entry.slug : coded(entry.slug, entry.id);
    } else {
      const own = shorten(entry.slug);
      const shared = (callbackSlugs.get(`${entry.collection}/${entry.language}/${own}`) ?? 0) > 1;
      slug = shared || usedBySite(entry, own) ? coded(own, entry.id) : own;
    }
    return [`${entry.id}/${entry.language}`, pathOf(parentFor(entry.collection, entry.language), slug)];
  }));
}

export function createCatalog<const Definitions extends readonly CollectionDefinition[]>(
  settings: SiteSettings, pages: readonly PageDefinition[], definitions: Definitions,
  sources: Readonly<Record<string, string>>
) {
  const entries = loadCollections(definitions, sources, settings.languages.map(({ code }) => code));
  const listings = definitions.map(({ listing }) => listing);
  if (new Set(listings).size !== listings.length) throw new Error('Collections must have distinct listing pages');
  for (const definition of definitions) {
    if (!pages.some((page) => page.id === definition.listing && page.kind === 'fixed')) {
      throw new Error(`Missing collection listing: ${definition.name}`);
    }
  }
  const parentFor = (collection: string, language: string) => {
    const definition = definitions.find(({ name }) => name === collection)!;
    const parent = pages.find((page) => page.id === definition.listing)?.slugs[language];
    if (parent === undefined) throw new Error(`Missing collection path: ${collection}/${language}`);
    return parent;
  };
  const paths = entryPaths(entries, parentFor, settings, pages);
  const entryPages: PageDefinition[] = [...new Set(entries.map(({ id }) => id))].map((id) => ({
    id, kind: 'entry', slugs: Object.fromEntries(entries.filter((entry) => entry.id === id).map((entry) =>
      [entry.language, paths.get(`${entry.id}/${entry.language}`)!]))
  }));
  const map = createSiteMap(settings, [...pages, ...entryPages]);
  return {
    entries, map,
    find: (id: string, language: string) => entries.find((entry) => entry.id === id && entry.language === language),
    listing: (pageId: string, language: string) => {
      const definition = definitions.find(({ listing }) => listing === pageId);
      return definition ? {
        collection: definition.name as Definitions[number]['name'],
        entries: entries.filter((entry) => entry.collection === definition.name && entry.language === language)
      } : undefined;
    }
  };
}
