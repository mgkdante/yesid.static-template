import type { BusinessFacts } from './config/site.ts';
import type { SiteMap } from './site-map.ts';
export const escapeXml = (text: string) => text.replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
export function businessJsonLd(facts: BusinessFacts) {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: facts.name,
    ...(facts.phone ? { telephone: facts.phone } : {}),
    ...(facts.email ? { email: facts.email } : {}),
    ...(facts.serviceArea ? { areaServed: facts.serviceArea } : {}) };
}
export const safeJson = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
export function sitemapXml(map: SiteMap): string {
  const entries = map.rows.map((row) => `<url><loc>${escapeXml(row.url)}</loc>${map.alternates(row.id).map((alt) =>
    `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.language)}" href="${escapeXml(alt.url)}"/>`).join('')}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;
}
