import { cmsConfig, type ContentFile, type ContentFileGroup } from '@yesid/content-contract';
import { collections } from './registry.ts';
import { site } from '../config/site.ts';
import { pageContract, siteTextContract } from './contract.ts';

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
      contentFile('about', 'Page fixe', pageContract),
      contentFile('blog', 'Page du blog', pageContract),
      contentFile('projects', 'Page des projets', pageContract)
    ]
  },
  {
    name: 'everywhere',
    label: 'Partout sur le site',
    icon: 'public',
    files: [contentFile('shared', 'Textes communs', siteTextContract)]
  },
  {
    name: 'legal',
    label: 'Textes légaux',
    icon: 'gavel',
    files: [contentFile('legal', 'Mentions légales', pageContract)]
  }
];

export const createCmsConfig = () => cmsConfig({
  repo: `mgkdante/${site.slug}`,
  loginOrigin: 'https://login.yesid.dev',
  siteSlug: site.slug,
  locales: site.languages.map(({ code }) => code),
  defaultLocale: site.defaultLanguage,
  fileGroups: contentGroups,
  collections: collections.map(({ cms }) => cms)
});
