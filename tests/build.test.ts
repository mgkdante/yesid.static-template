import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { assertPublishable, loginUrl, site, workerName } from '../src/lib/config/site.ts';
import { escapeXml } from '../src/lib/seo.ts';
import { fixedPages } from '../src/lib/site-map.ts';
import { read, sampleCatalog } from './helpers.ts';
const map = sampleCatalog().map;

for (const row of map.rows) {
  test(`built ${row.path} is complete HTML with correct SEO and languages`, () => {
    const html = read(`build${row.path}index.html`);
    expect(html).toContain(`<html lang="${row.language}">`);
    expect(html).toContain(`<link rel="canonical" href="${row.url}"`);
    expect(html).toContain('<h1>');
    expect(html).toContain('property="og:url"');
    for (const alternate of map.alternates(row.id)) {
      expect(html).toContain(`hreflang="${alternate.language}" href="${alternate.url}"`);
      expect(html).toContain(`href="${alternate.path}" hreflang="${alternate.language}"`);
    }
  });
}
test('no built page runs JavaScript', () => {
  // A Custom Design that needs JavaScript turns on `csr` in src/routes/+layout.ts and changes this test on purpose.
  const pages = (readdirSync('build', { recursive: true }) as string[]).filter((file) => file.endsWith('.html'));
  expect(pages.length).toBeGreaterThanOrEqual(map.rows.length);
  for (const file of pages) {
    const html = read(`build/${file}`);
    const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(([tag]) => tag).filter((tag) => tag !== '<script type="application/ld+json">');
    expect({ file, scripts }).toEqual({ file, scripts: [] });
    expect(html).not.toContain('rel="modulepreload"');
  }
});
test('every link the site itself writes leads to a built page', () => {
  // Links an Owner wrote in their content may go dead without blocking a publish. The site's own may not.
  for (const row of map.rows) {
    const html = read(`build${row.path}index.html`);
    const own = [...html.matchAll(/<(header|footer)\b[\s\S]*?<\/\1>/g)].map(([block]) => block).join('');
    expect(own).not.toBe('');
    for (const [, href] of own.matchAll(/href="(\/[^"#?]*)/g)) {
      const path = decodeURIComponent(href);
      expect({ page: row.path, link: path, built: existsSync(`build${path}${path.endsWith('/') ? 'index.html' : ''}`) })
        .toEqual({ page: row.path, link: path, built: true });
    }
  }
});
test('build includes only real page URLs in its sitemap', () => {
  const xml = read('build/sitemap.xml');
  expect([...xml.matchAll(/<loc>/g)]).toHaveLength(map.rows.length);
  for (const row of map.rows) expect(xml).toContain(`<loc>${escapeXml(row.url)}</loc>`);
  expect(xml).not.toMatch(/admin|404/);
  expect(read('build/robots.txt')).toContain(`Sitemap: ${site.origin}/sitemap.xml`);
  expect(read('build/llms.txt')).toContain(site.business.name);
});
test('exact 404 output provides every language home without JS', () => {
  const html = read('build/404.html');
  expect(existsSync('build/404/index.html')).toBe(false);
  expect([...html.matchAll(/<main id="main">/g)]).toHaveLength(1);
  expect(html).toContain('content="noindex"');
  for (const { code } of site.languages) {
    expect(html).toContain(`lang="${code}"`);
    expect(html).toContain(`href="${map.path('home', code)}"`);
  }
});
test('footer pages are linked from the footer, not the menu', () => {
  const html = read('build/index.html');
  const footerStart = html.indexOf('<footer');
  for (const { id } of fixedPages.filter(({ inFooter }) => inFooter)) {
    const link = `href="${map.path(id, site.defaultLanguage)}"`;
    expect(html.slice(footerStart)).toContain(link);
    expect(html.slice(0, footerStart)).not.toContain(link);
  }
});
test('admin uses a noindex meta refresh and visible login link', () => {
  const html = read('build/admin/index.html');
  expect(html).toContain('http-equiv="refresh"');
  expect(html).toContain(`content="0;url=${loginUrl}"`);
  expect(html).toContain(`href="${loginUrl}"`);
  expect(html).toContain('content="noindex"');
});
test('the sample address cannot be published', () => {
  expect(() => assertPublishable({ origin: 'https://example.invalid' })).toThrow('real origin');
  expect(() => assertPublishable({ origin: 'https://client.example.test' })).not.toThrow();
});
test('the Foundation carries no design system', () => {
  const { dependencies, devDependencies } = JSON.parse(read('package.json'));
  const yesid = Object.keys({ ...dependencies, ...devDependencies }).filter((name) => name.startsWith('@yesid/'));
  expect(yesid).toEqual(['@yesid/content-contract']);
});
test('deployment settings target the Worker derived from site slug', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  expect(config.name).toBe(workerName(site.slug));
  expect(config.assets).toEqual({ directory: './build', not_found_handling: '404-page' });
});
