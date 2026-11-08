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

// Each collection's folder carries its `identifierField`, which the package writes out as `identifier_field`.
export const createCmsConfig = () => cmsConfig({
  repo: site.repository,
  loginOrigin: 'https://login.yesid.dev',
  siteSlug: site.slug,
  locales: site.languages.map(({ code }) => code),
  defaultLocale: site.defaultLanguage,
  fileGroups: contentGroups,
  collections: collections.map(({ cms }) => cms)
});
