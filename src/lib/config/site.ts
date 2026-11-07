export interface BusinessFacts {
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly serviceArea?: string;
}
export interface SiteSettings {
  readonly slug: string;
  readonly origin: string;
  readonly languages: readonly { readonly code: string; readonly label: string }[];
  readonly defaultLanguage: string;
  readonly business: BusinessFacts;
}

export const site: SiteSettings = {
  slug: 'yesid.static-template',
  origin: 'https://example.invalid',
  languages: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }],
  defaultLanguage: 'fr',
  business: {
    name: 'Example Business',
    phone: '+1-202-555-0100',
    email: 'hello@example.invalid',
    serviceArea: 'Example Area'
  }
};

export const loginUrl = `https://login.yesid.dev/${site.slug}/`;
export const workerName = (slug: string) => slug.replaceAll('.', '-');
export const languageFromPath = (path: string, settings = site) =>
  settings.languages.find(({ code }) => code === path.split('/')[1])?.code ?? settings.defaultLanguage;
