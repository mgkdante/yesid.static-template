import type { SiteSettings } from './config/site.ts';
import { createSiteMap, type PageDefinition } from './site-map.ts';
import { byteLength, loadCollections, MAX_SLUG_BYTES, shorten, type CollectionDefinition, type Entry } from './content/collections.ts';

/** Addresses the site's own routes and language prefixes already use. */
const reservedRoots = (settings: SiteSettings) => ['admin', '404', ...settings.languages.map(({ code }) => code)];

/** FNV-1a: a short code that depends only on its input, so it never changes when other entries come and go. */
function shortCode(text: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

/**
 * An address comes from the entry's file name, which the editor sets once when the entry is first saved.
 * A plain file name, the kind the editor makes, is its own address, so it claims that address first and never moves.
 * Anything else that lands on a taken address, such as a Fixed Page's slug or a file name with capitals,
 * adds a short code from its own identity. The result stays within the folder-name limit.
 */
function entryPaths(entries: readonly Entry[], parentOf: (entry: Entry) => string, settings: SiteSettings, pages: readonly PageDefinition[]) {
  const taken = new Set(settings.languages.flatMap(({ code }) => [
    ...pages.flatMap(({ slugs }) => slugs[code] === undefined ? [] : [`${code}:${slugs[code]}`]),
    ...reservedRoots(settings).map((root) => `${code}:${root}`)
  ]));
  const keyOf = (entry: Entry) => entry.id.slice(entry.collection.length + 1);
  const rank = (entry: Entry) => Number(entry.slug !== keyOf(entry));
  const ordered = [...entries].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return new Map(ordered.map((entry) => {
    const pathFor = (slug: string) => [parentOf(entry), slug].filter(Boolean).join('/');
    const isTaken = (slug: string) => taken.has(`${entry.language}:${pathFor(slug)}`);
    let slug = entry.slug;
    for (let attempt = 0; isTaken(slug); attempt += 1) {
      const suffix = `--${shortCode(`${entry.id}#${attempt}`)}`;
      slug = `${shorten(entry.slug, MAX_SLUG_BYTES - byteLength(suffix))}${suffix}`;
    }
    taken.add(`${entry.language}:${pathFor(slug)}`);
    return [`${entry.id}/${entry.language}`, pathFor(slug)];
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
  const parentOf = (entry: Entry) => {
    const definition = definitions.find(({ name }) => name === entry.collection)!;
    const parent = pages.find((page) => page.id === definition.listing)?.slugs[entry.language];
    if (parent === undefined) throw new Error(`Missing collection path: ${entry.collection}/${entry.language}`);
    return parent;
  };
  const paths = entryPaths(entries, parentOf, settings, pages);
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
