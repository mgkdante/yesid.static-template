import { cmsConfig } from '@yesid/content-contract';
import { site } from '../config/site.ts';
import { pagesContract, postContract, siteTextContract } from './contract.ts';

export const createCmsConfig = () => cmsConfig({
  repo: `mgkdante/${site.slug}`,
  loginOrigin: 'https://login.yesid.dev',
  siteSlug: site.slug,
  locales: site.languages.map(({ code }) => code),
  defaultLocale: site.defaultLanguage,
  singletons: [
    { name: 'site-text', label: 'Texte du site', file: 'src/lib/content/{{locale}}.json', contract: siteTextContract },
    { name: 'pages', label: 'Pages fixes', file: 'src/lib/content/pages.{{locale}}.json', contract: pagesContract }
  ],
  collections: [{ name: 'posts', label: 'Blog', folder: 'src/lib/content/posts', contract: postContract }]
});
