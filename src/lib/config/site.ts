export interface BusinessHours {
  /** Full English day names, as schema.org reads them. */
  readonly days: readonly string[];
  readonly opens: string;
  readonly closes: string;
}
export interface BusinessFacts {
  readonly name: string;
  /** A schema.org business type, such as Plumber. Defaults to Organization. */
  readonly type?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly serviceArea?: string;
  readonly hours?: readonly BusinessHours[];
}
export interface SiteLanguage {
  readonly code: string;
  readonly label: string;
  /** Open Graph locale, such as fr_CA. */
  readonly ogLocale?: string;
  /** A 1200 x 630 image in static/, with no text an Owner could later change. */
  readonly shareImage?: string;
}
export interface SiteIcon {
  readonly rel: string;
  readonly href: string;
  readonly type?: string;
  readonly sizes?: string;
}
export interface SiteSettings {
  /** This site's name on Login. */
  readonly slug: string;
  /** `owner/name` of this site's GitHub repository. */
  readonly repository: string;
  readonly origin: string;
  readonly languages: readonly SiteLanguage[];
  readonly defaultLanguage: string;
  readonly business: BusinessFacts;
  /** Icon files in static/, part of each client's Custom Design. */
  readonly icons?: readonly SiteIcon[];
}

export const site: SiteSettings = {
  slug: 'yesid.static-template',
  repository: 'mgkdante/yesid.static-template',
  origin: 'https://example.invalid',
  languages: [
    { code: 'fr', label: 'Français', ogLocale: 'fr_CA' },
    { code: 'en', label: 'English', ogLocale: 'en_CA' },
    { code: 'es', label: 'Español', ogLocale: 'es_LA' }
  ],
  defaultLanguage: 'fr',
  business: {
    name: 'Example Business',
    phone: '+1-202-555-0100',
    email: 'hello@example.invalid',
    serviceArea: 'Example Area',
    hours: [{ days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00' }]
  },
  // favicon.ico is generated from favicon.svg by `bun run icons`; keep both.
  icons: [
    { rel: 'icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48' },
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }
  ]
};

export const loginUrl = `https://login.yesid.dev/${site.slug}/`;
export const workerName = (slug: string) => slug.replaceAll('.', '-');
/** The sample address must never reach a real host. */
export function assertPublishable({ origin }: Pick<SiteSettings, 'origin'>): void {
  if (new URL(origin).hostname.endsWith('.invalid')) throw new Error(`Set a real origin in site.ts before publishing, not ${origin}`);
}
export const languageFromPath = (path: string, settings = site) =>
  settings.languages.find(({ code }) => code === path.split('/')[1])?.code ?? settings.defaultLanguage;
