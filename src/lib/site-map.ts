import { site, type SiteSettings } from './config/site.ts';
import type { FixedPageId } from './content/contract.ts';

export interface PageDefinition {
  readonly id: string;
  readonly kind: 'fixed' | 'entry';
  readonly slugs: Readonly<Record<string, string>>;
  /** Fixed Pages reached from the footer rather than the menu, such as legal pages. */
  readonly inFooter?: boolean;
}
export const fixedPages: readonly (PageDefinition & { id: FixedPageId })[] = [
  { id: 'home', kind: 'fixed', slugs: { fr: '', en: '', es: '' } },
  { id: 'about', kind: 'fixed', slugs: { fr: 'a-propos', en: 'about', es: 'acerca-de' } },
  { id: 'projects', kind: 'fixed', slugs: { fr: 'projets', en: 'projects', es: 'proyectos' } },
  { id: 'blog', kind: 'fixed', slugs: { fr: 'blog', en: 'blog', es: 'blog' } },
  { id: 'privacy', kind: 'fixed', inFooter: true, slugs: { fr: 'confidentialite', en: 'privacy', es: 'privacidad' } },
  { id: 'terms', kind: 'fixed', inFooter: true, slugs: { fr: 'conditions', en: 'terms', es: 'terminos' } }
];
export function createSiteMap(settings: SiteSettings, definitions: readonly PageDefinition[]) {
  const languages = settings.languages.map(({ code }) => code);
  if (!languages.includes(settings.defaultLanguage) || new Set(languages).size !== languages.length) {
    throw new Error('Languages must be unique and include the default');
  }
  const rows = definitions.flatMap((page) => languages.flatMap((language) => {
    const slug = page.slugs[language];
    if (slug === undefined) {
      if (page.kind === 'fixed') throw new Error(`Missing fixed slug: ${page.id}/${language}`);
      return [];
    }
    if (slug && !/^[\p{L}\p{N}-]+(?:\/[\p{L}\p{N}-]+)*$/u.test(slug)) throw new Error(`Invalid slug: ${slug}`);
    // Each segment becomes a folder name in the build, and file systems refuse long ones.
    if (slug.split('/').some((segment) => new TextEncoder().encode(segment).length > 80)) throw new Error(`Slug segment over 80 bytes: ${slug}`);
    const prefix = language === settings.defaultLanguage ? '' : `${language}/`;
    const path = `/${prefix}${slug ? `${slug.split('/').map(encodeURIComponent).join('/')}/` : ''}`;
    return [{ id: page.id, kind: page.kind, inFooter: page.inFooter ?? false, language, path, url: new URL(path, settings.origin).href }];
  }));
  if (new Set(rows.map(({ path }) => path)).size !== rows.length) throw new Error('Duplicate page path');
  if (new Set(definitions.map(({ id }) => id)).size !== definitions.length) throw new Error('Duplicate page identity');
  const find = (id: string, language: string) => rows.find((row) => row.id === id && row.language === language);
  return {
    rows,
    find,
    path: (id: string, language: string) => find(id, language)?.path,
    resolve: (path: string) => rows.find((row) => row.path === path),
    alternates: (id: string) => rows.filter((row) => row.id === id),
    switchTarget: (path: string, language: string) => {
      const current = rows.find((row) => row.path === path);
      return current ? find(current.id, language)?.path : undefined;
    },
    navigation: (language: string) => rows.filter((row) => row.language === language && row.kind === 'fixed' && !row.inFooter),
    footerLinks: (language: string) => rows.filter((row) => row.language === language && row.inFooter)
  };
}
export type SiteMap = ReturnType<typeof createSiteMap>;
export const baseSiteMap = createSiteMap(site, fixedPages);
