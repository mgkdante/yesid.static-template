import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { site, type SiteSettings } from '../src/lib/config/site.ts';
import { businessJsonLd, llmsText, pageSeo, sitemapXml } from '../src/lib/seo.ts';
import { createSiteMap, fixedPages } from '../src/lib/site-map.ts';
import { read } from './helpers.ts';

const settings: SiteSettings = {
  ...site,
  origin: 'https://client.example.test',
  languages: [
    { code: 'fr', label: 'Français', ogLocale: 'fr_CA', shareImage: '/images/share-fr.jpg' },
    { code: 'en', label: 'English', ogLocale: 'en_CA' }
  ]
};
const alternates = [
  { language: 'fr', url: 'https://client.example.test/' },
  { language: 'en', url: 'https://client.example.test/en/' }
];

test('a page offers its other languages to crawlers, with the default as x-default', () => {
  const seo = pageSeo({ language: 'en', alternates }, settings);
  expect(seo.xDefault).toBe('https://client.example.test/');
  expect(seo.ogLocale).toBe('en_CA');
  expect(seo.ogLocaleAlternates).toEqual(['fr_CA']);
});
test('a post missing from the default language has no x-default', () => {
  expect(pageSeo({ language: 'en', alternates: [alternates[1]] }, settings).xDefault).toBeUndefined();
});
test('the language share card has its size stated, and a page image replaces it', () => {
  expect(pageSeo({ language: 'fr', alternates }, settings).image).toEqual({ url: 'https://client.example.test/images/share-fr.jpg', width: 1200, height: 630 });
  expect(pageSeo({ language: 'fr', alternates, image: '/images/uploads/cover.webp' }, settings).image).toEqual({ url: 'https://client.example.test/images/uploads/cover.webp' });
  expect(pageSeo({ language: 'en', alternates }, settings).image).toBeUndefined();
});
test('structured data states only the facts it was given', () => {
  const facts = { name: 'Client', type: 'Plumber', hours: [{ days: ['Monday', 'Tuesday'], opens: '09:00', closes: '17:00' }] };
  const data = businessJsonLd(facts, { url: 'https://client.example.test/', description: 'Text' });
  expect(data['@type']).toBe('Plumber');
  expect(data['@id']).toBe('https://client.example.test/#business');
  expect(data.openingHoursSpecification).toEqual([{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday'], opens: '09:00', closes: '17:00' }]);
  expect(businessJsonLd({ name: 'Client' })).toEqual({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Client' });
});
test('the sitemap names x-default on every translated page', () => {
  const xml = sitemapXml(createSiteMap(site, fixedPages), site);
  expect(xml).toContain(`hreflang="x-default" href="${site.origin}/"`);
});
test('llms.txt lists pages by title and description, under each language, and states the facts', () => {
  const text = llmsText(settings, [{ language: 'fr', title: 'À [propos]', description: 'Une\nligne', url: 'https://client.example.test/a-propos/' }]);
  expect(text).toContain('## Français');
  expect(text).toContain('- [À (propos)](https://client.example.test/a-propos/): Une ligne');
  expect(text).not.toContain('## English');
  expect(text).toContain(`- Email: ${site.business.email}`);
});
test('generated pages carry the social metadata, and crawlers may read the noindex on the admin page', () => {
  const html = read('build/en/index.html');
  expect(html).toContain('hreflang="x-default"');
  expect(html).toContain('property="og:locale" content="en_CA"');
  expect(html).toContain('property="og:locale:alternate" content="fr_CA"');
  expect(html).toContain('name="twitter:card"');
  expect(read('build/robots.txt')).not.toContain('Disallow');
  expect(read('build/llms.txt')).not.toMatch(/\[home \(/);
});
test('pages kept out of search do not advertise a canonical address or business data', () => {
  const html = read('build/404.html');
  expect(html).not.toContain('rel="canonical"');
  expect(html).not.toContain('application/ld+json');
});
test('every configured icon and share card is a real file', () => {
  const files = [...(site.icons ?? []).map(({ href }) => href), ...site.languages.flatMap(({ shareImage }) => shareImage ?? [])];
  for (const path of files) expect(existsSync(`static${path}`)).toBe(true);
});
