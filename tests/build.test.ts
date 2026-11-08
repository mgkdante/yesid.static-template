import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { assertPublishable, loginUrl, site, workerName } from '../src/lib/config/site.ts';
import { escapeXml } from '../src/lib/seo.ts';
import { fixedPages } from '../src/lib/site-map.ts';
import { read, sampleCatalog } from './helpers.ts';
const map = sampleCatalog().map;

/** Start tags with their attributes. Quoted values may hold `>`; names are lowercased, bare values end at a space. */
function startTags(markup: string) {
  return [...markup.matchAll(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)].map(([, name, rest]) => ({
    name: name.toLowerCase(),
    attributes: Object.fromEntries([...rest.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)]
      .map(([, attribute, double, single, bare]) => [attribute.toLowerCase(), double ?? single ?? bare ?? '']))
  }));
}
/** Markup only: script and style bodies and comments are code or notes, not links. */
const markupOf = (svelte: string) => svelte.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->/gi, '');

test('the link and preload checks read real tags, not code or text', () => {
  const svelte = `<script lang="ts">const src = '/a-variable/';</script>\n<!-- <a href="/a-note/"> -->\n<a href="/a/">a</a><a href='/b/'>b</a><a href=/c/>c</a><a href={x}>d</a><p>href="/text/"</p>`;
  const hrefs = startTags(markupOf(svelte)).flatMap(({ attributes }) => attributes.href === undefined ? [] : [attributes.href]);
  expect(hrefs).toEqual(['/a/', '/b/', '/c/', '{x}']);
  const preloads = (html: string) => startTags(html).filter(({ name, attributes }) =>
    name === 'link' && (attributes.rel ?? '').toLowerCase().split(/\s+/).includes('modulepreload')).length;
  expect(preloads('<link rel = "modulepreload" href="/x.js">')).toBe(1);
  expect(preloads("<link REL='preload ModulePreload' href=/x.js>")).toBe(1);
  expect(preloads('<p>Ajoutez rel=&quot;modulepreload&quot; ici. rel="modulepreload"</p>')).toBe(0);
});

for (const row of map.rows) {
  test(`built ${row.path} is complete HTML with correct SEO and languages`, () => {
    // The file on disk has the decoded name, for addresses in any alphabet.
    const html = read(`build${decodeURI(row.path)}index.html`);
    expect(html).toMatch(new RegExp(`<html\\b[^>]*\\blang="${row.language}"`));
    expect(html).toContain(`<link rel="canonical" href="${row.url}"`);
    expect(html).toMatch(/<h1\b/);
    expect(html).toContain('property="og:url"');
    for (const alternate of map.alternates(row.id)) {
      expect(html).toContain(`hreflang="${alternate.language}" href="${alternate.url}"`);
      expect(html).toContain(`href="${alternate.path}"`);
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
    // Real elements only, with `rel` read as the browser does. Owner text is escaped, so its words never form a tag.
    const preloads = startTags(html).filter(({ name, attributes }) =>
      name === 'link' && (attributes.rel ?? '').toLowerCase().split(/\s+/).includes('modulepreload'));
    expect({ file, preloads }).toEqual({ file, preloads: [] });
  }
});
test('every link written in the site\'s own code leads to a built page', () => {
  // Reads the code, not the pages: a link an Owner wrote may go dead, and must never fail this test.
  const code = (readdirSync('src', { recursive: true }) as string[]).filter((file) => file.endsWith('.svelte'));
  expect(code.length).toBeGreaterThan(0);
  // Static href and src attributes in markup, quoted or not. A value built in an expression ({...}) isn't read.
  for (const file of code) {
    for (const { attributes } of startTags(markupOf(read(`src/${file}`)))) {
      for (const value of [attributes.href, attributes.src]) {
        if (value === undefined || value.includes('{')) continue;
        const local = value.startsWith(site.origin) ? value.slice(site.origin.length) : value;
        if (!local.startsWith('/') || local.startsWith('//')) continue;
        const path = local.replace(/[?#].*$/, '');
        expect({ file, path, built: existsSync(`build${path}${path.endsWith('/') ? 'index.html' : ''}`) }).toEqual({ file, path, built: true });
      }
    }
  }
});
test('build includes only real page URLs in its sitemap', () => {
  const xml = read('build/sitemap.xml');
  expect([...xml.matchAll(/<loc>/g)]).toHaveLength(map.rows.length);
  for (const row of map.rows) expect(xml).toContain(`<loc>${escapeXml(row.url)}</loc>`);
  // Only the routes themselves: an Owner's post can be titled "404 erreurs".
  expect(xml).not.toContain(`<loc>${site.origin}/admin/</loc>`);
  expect(xml).not.toContain(`<loc>${site.origin}/404/</loc>`);
  expect(read('build/robots.txt')).toContain(`Sitemap: ${site.origin}/sitemap.xml`);
  expect(read('build/llms.txt')).toContain(site.business.name);
});
test('exact 404 output provides every language home without JS', () => {
  const html = read('build/404.html');
  expect(existsSync('build/404/index.html')).toBe(false);
  expect([...html.matchAll(/<main\b/g)]).toHaveLength(1);
  expect(html).toContain('content="noindex"');
  for (const { code } of site.languages) {
    expect(html).toContain(`lang="${code}"`);
    expect(html).toContain(`href="${map.path('home', code)}"`);
  }
});
test('footer pages are linked from the footer, not the menu', () => {
  const html = read('build/index.html');
  const footerStart = html.indexOf('<footer');
  if (footerStart < 0) return; // A Custom Design may mark up its footer another way.
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
