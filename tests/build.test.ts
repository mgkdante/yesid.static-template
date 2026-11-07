import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { loginUrl, site, workerName } from '../src/lib/config/site.ts';
import { escapeXml } from '../src/lib/seo.ts';
import { read, sampleCatalog } from './helpers.ts';
const map = sampleCatalog().map;

for (const row of map.rows) {
  test(`built ${row.path} is complete HTML with correct SEO and languages`, () => {
    const html = read(`build${row.path}index.html`);
    expect(html).toContain(`<html lang="${row.language}">`);
    expect(html).toContain(`<link rel="canonical" href="${row.url}"`);
    expect(html).toContain('<h1>');
    expect(html).toContain('property="og:url"');
    expect(html).not.toContain('type="module"');
    for (const alternate of map.alternates(row.id)) {
      expect(html).toContain(`hreflang="${alternate.language}" href="${alternate.url}"`);
      expect(html).toContain(`href="${alternate.path}" hreflang="${alternate.language}"`);
    }
  });
}
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
test('admin uses a noindex meta refresh and visible login link', () => {
  const html = read('build/admin/index.html');
  expect(html).toContain('http-equiv="refresh"');
  expect(html).toContain(`content="0;url=${loginUrl}"`);
  expect(html).toContain(`href="${loginUrl}"`);
  expect(html).toContain('content="noindex"');
});
test('deployment settings target the Worker derived from site slug', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  expect(config.name).toBe(workerName(site.slug));
  expect(config.assets).toEqual({ directory: './build', not_found_handling: '404-page' });
});

test('available collection entries use their distinct detail markup', () => {
  const catalog = sampleCatalog();
  for (const entry of catalog.entries) {
    const path = catalog.map.path(entry.id, entry.language)!;
    const html = read(`build${path}index.html`);
    expect(html).toContain('<article>');
    if (entry.collection === 'posts') expect(html).toContain(`<time datetime="${entry.content.date}">`);
    if (entry.collection === 'projects') {
      expect(html).not.toContain('<time');
      expect(html).toContain('<ul>');
    }
  }
});
