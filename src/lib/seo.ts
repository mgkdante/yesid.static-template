import type { BusinessFacts, BusinessHours, SiteSettings } from './config/site.ts';
import type { SiteMap } from './site-map.ts';

const SHARE_CARD = { width: 1200, height: 630 } as const;

export const escapeXml = (text: string) => text.replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
export const safeJson = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');

const openingHours = (hours: readonly BusinessHours[]) => hours.map(({ days, opens, closes }) =>
  ({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes }));

export interface BusinessPage {
  readonly url?: string;
  readonly description?: string;
  readonly image?: string;
}
export function businessJsonLd(facts: BusinessFacts, { url, description, image }: BusinessPage = {}) {
  return { '@context': 'https://schema.org', '@type': facts.type ?? 'Organization', name: facts.name,
    ...(url ? { '@id': `${url}#business`, url } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(facts.phone ? { telephone: facts.phone } : {}),
    ...(facts.email ? { email: facts.email } : {}),
    ...(facts.serviceArea ? { areaServed: facts.serviceArea } : {}),
    ...(facts.hours?.length ? { openingHoursSpecification: openingHours(facts.hours) } : {}) };
}

export interface PageSeoInput {
  readonly language: string;
  readonly alternates: readonly { readonly language: string; readonly url: string }[];
  /** This page's own image, such as a post's cover. Replaces the language's share card. */
  readonly image?: string;
}
export interface PageSeo {
  readonly xDefault?: string;
  readonly ogLocale?: string;
  readonly ogLocaleAlternates: readonly string[];
  readonly image?: { readonly url: string; readonly width?: number; readonly height?: number };
}
/** What a page tells crawlers and link previews beyond its own text. */
export function pageSeo({ language, alternates, image }: PageSeoInput, settings: SiteSettings): PageSeo {
  const current = settings.languages.find(({ code }) => code === language);
  const absolute = (path: string) => new URL(path, settings.origin).href;
  const card = current?.shareImage ? { url: absolute(current.shareImage), ...SHARE_CARD } : undefined;
  return {
    xDefault: alternates.find((alternate) => alternate.language === settings.defaultLanguage)?.url,
    ogLocale: current?.ogLocale,
    ogLocaleAlternates: settings.languages
      .filter(({ code }) => code !== language && alternates.some((alternate) => alternate.language === code))
      .flatMap(({ ogLocale }) => ogLocale ?? []),
    image: image ? { url: absolute(image) } : card
  };
}

export function sitemapXml(map: SiteMap, settings: SiteSettings): string {
  const entries = map.rows.map((row) => {
    const links = map.alternates(row.id).map((alt) => `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.language)}" href="${escapeXml(alt.url)}"/>`);
    const fallback = map.find(row.id, settings.defaultLanguage);
    const xDefault = fallback ? `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(fallback.url)}"/>` : '';
    return `<url><loc>${escapeXml(row.url)}</loc>${links.join('')}${xDefault}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}

export interface LlmsPage {
  readonly language: string;
  readonly title: string;
  readonly description: string;
  readonly url: string;
}
/** Keeps the Owner's wording literal in a Markdown file, on one line. */
const literal = (text: string) => text.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]<>]/g, '\\$&');
const contactLines = ({ phone, email, serviceArea }: BusinessFacts) => [
  ...(phone ? [`- Phone: ${literal(phone)}`] : []),
  ...(email ? [`- Email: ${literal(email)}`] : []),
  ...(serviceArea ? [`- Service area: ${literal(serviceArea)}`] : [])
];
export function llmsText(settings: SiteSettings, pages: readonly LlmsPage[]): string {
  const sections = settings.languages.flatMap(({ code, label }) => {
    const lines = pages.filter(({ language }) => language === code).map(({ title, description, url }) =>
      `- [${literal(title)}](${url}): ${literal(description)}`);
    return lines.length ? [[`## ${label}`, ...lines].join('\n')] : [];
  });
  const contact = contactLines(settings.business);
  return [`# ${literal(settings.business.name)}`, ...sections, ...(contact.length ? [['## Contact', ...contact].join('\n')] : [])].join('\n\n') + '\n';
}
