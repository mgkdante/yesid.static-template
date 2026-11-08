import { cmsConfig, type ContentFile, type ContentFileGroup } from '@yesid/content-contract';
import { collections } from './registry.ts';
import { site } from '../config/site.ts';
import { errorContract, footerContract, menuContract, pageContract } from './contract.ts';

const contentFile = (name: string, label: string, contract: ContentFile['contract']): ContentFile => ({
  name,
  label,
  file: `src/lib/content/${name}.{{locale}}.json`,
  contract
});

/** Laid out like the site, so people find text where they see it. Every content file is listed here. */
export const contentGroups: readonly ContentFileGroup[] = [
  {
    name: 'pages',
    label: 'Pages',
    icon: 'web',
    files: [
      contentFile('home', 'Accueil', pageContract),
      contentFile('about', 'À propos', pageContract),
      contentFile('blog', 'Page du blog', pageContract),
      contentFile('projects', 'Page des projets', pageContract)
    ]
  },
  {
    name: 'everywhere',
    label: 'Partout sur le site',
    icon: 'public',
    files: [
      contentFile('menu', 'Menu', menuContract),
      contentFile('footer', 'Pied de page', footerContract),
      contentFile('error', 'Page d’erreur', errorContract)
    ]
  },
  {
    name: 'legal',
    label: 'Textes légaux',
    icon: 'gavel',
    files: [contentFile('privacy', 'Confidentialité', pageContract), contentFile('terms', 'Conditions d’utilisation', pageContract)]
  }
];

export function createCmsConfig() {
  const config = cmsConfig({
    repo: site.repository,
    loginOrigin: 'https://login.yesid.dev',
    siteSlug: site.slug,
    locales: site.languages.map(({ code }) => code),
    defaultLocale: site.defaultLanguage,
    fileGroups: contentGroups,
    collections: collections.map(({ cms }) => cms)
  });
  // The released contract package doesn't set it yet. A new entry's file name, and so its address, comes from this field.
  const identifiers = new Map(collections.map(({ cms }) => [cms.name, 'identifierField' in cms ? cms.identifierField : undefined]));
  if (!config.collections) return config;
  return {
    ...config,
    collections: config.collections.map((collection) => {
      const field = identifiers.get(collection.name);
      return field ? { ...collection, identifier_field: field } : collection;
    })
  };
}
