import type { SiteSettings } from './config/site.ts';
import { createSiteMap, type PageDefinition } from './site-map.ts';
import { loadCollections, type CollectionDefinition } from './content/collections.ts';

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
  const entryPages: PageDefinition[] = [...new Set(entries.map(({ id }) => id))].map((id) => ({
    id, kind: 'entry', slugs: Object.fromEntries(entries.filter((entry) => entry.id === id).map((entry) => {
      const definition = definitions.find(({ name }) => name === entry.collection)!;
      const parent = pages.find((page) => page.id === definition.listing)?.slugs[entry.language];
      if (!parent) throw new Error(`Missing collection path: ${entry.collection}/${entry.language}`);
      return [entry.language, `${parent}/${entry.slug}`];
    }))
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
