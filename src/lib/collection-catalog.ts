import type { SiteSettings } from './config/site.ts';
import { createSiteMap, type PageDefinition } from './site-map.ts';
import { entrySlug, loadCollections, type CollectionDefinition, type Entry } from './content/collections.ts';

/** Addresses the site's own routes and language prefixes already use. */
const reservedRoots = (settings: SiteSettings) => ['admin', '404', ...settings.languages.map(({ code }) => code)];

/**
 * Titles are the Owner's wording, so two entries may share one and neither may stop the site from publishing.
 * An entry whose file name matches its title claims the plain address first, so a newer twin can't move it.
 * Any other adds its file name.
 */
function entryPaths(entries: readonly Entry[], parentOf: (entry: Entry) => string, settings: SiteSettings, pages: readonly PageDefinition[]) {
  const taken = new Set(settings.languages.flatMap(({ code }) => [
    ...pages.flatMap(({ slugs }) => slugs[code] === undefined ? [] : [`${code}:${slugs[code]}`]),
    ...reservedRoots(settings).map((root) => `${code}:${root}`)
  ]));
  const fileSlugOf = (entry: Entry) => {
    const key = entry.id.slice(entry.collection.length + 1);
    return entrySlug(key, key);
  };
  const claimsFirst = (entry: Entry) => Number(fileSlugOf(entry) === entry.slug);
  const ordered = [...entries].sort((a, b) => claimsFirst(b) - claimsFirst(a));
  return new Map(ordered.map((entry) => {
    const fileSlug = fileSlugOf(entry);
    const pathFor = (slug: string) => [parentOf(entry), slug].filter(Boolean).join('/');
    const isTaken = (slug: string) => taken.has(`${entry.language}:${pathFor(slug)}`);
    let slug = entry.slug;
    // A title's own slug never holds `--`, so a later title can't land on an address made here and move this entry.
    if (isTaken(slug)) slug = fileSlug.startsWith(slug) ? fileSlug : `${slug}--${fileSlug}`;
    while (isTaken(slug)) slug = `${slug}--${fileSlug}`;
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
