import { expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import { parse as parseHtml } from 'parse5';
import { parse } from 'svelte/compiler';
import { assertPublishable, loginUrl, site, workerName } from '../src/lib/config/site.ts';
import { escapeXml } from '../src/lib/seo.ts';
import { fixedPages } from '../src/lib/site-map.ts';
import { read, sampleCatalog } from './helpers.ts';
const map = sampleCatalog().map;

interface HtmlNode {
  readonly tagName?: string;
  readonly attrs?: readonly { name: string; value: string }[];
  readonly childNodes?: readonly HtmlNode[];
  readonly content?: HtmlNode;
}
/**
 * Elements in built HTML as a browser builds them, by parse5, which follows the HTML standard's parsing rules:
 * entities decoded, the first of duplicate attributes kept, nothing in comments, scripts or styles taken for a tag.
 * Template contents and SVG are included, so the checks below err on the strict side there.
 */
function htmlElements(html: string) {
  const found: { name: string; attributes: Record<string, string> }[] = [];
  const visit = (node: HtmlNode): void => {
    if (node.tagName) found.push({ name: node.tagName, attributes: Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value])) });
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(parseHtml(html) as unknown as HtmlNode);
  return found;
}
const modulePreloads = (html: string) => htmlElements(html).filter(({ name, attributes }) =>
  name === 'link' && (attributes.rel ?? '').toLowerCase().split(/[\t\n\f\r ]+/).includes('modulepreload'));
/** Every script except inline JSON-LD, which carries data and never runs. */
const scriptsIn = (html: string) => htmlElements(html).filter(({ name, attributes }) =>
  name === 'script' && !(attributes.type === 'application/ld+json' && attributes.src === undefined));

/**
 * Static `href` and `src` values written in a Svelte file's markup, read from Svelte's own parse tree:
 * only attributes made of plain text count. Script, module and style blocks and expressions are never read.
 */
function staticLinks(source: string): string[] {
  const links: string[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const current = node as Record<string, unknown>;
    const elements = ['RegularElement', 'SvelteElement', 'Component', 'SvelteComponent', 'SvelteSelf'];
    if (elements.includes(String(current.type)) && Array.isArray(current.attributes)) {
      for (const attribute of current.attributes as Record<string, unknown>[]) {
        if (attribute.type !== 'Attribute' || !['href', 'src'].includes(String(attribute.name).toLowerCase())) continue;
        const parts = Array.isArray(attribute.value) ? attribute.value : [attribute.value];
        const texts = parts.filter((part): part is { type: 'Text'; data: string } => (part as { type?: string })?.type === 'Text');
        if (texts.length === parts.length) links.push(texts.map(({ data }) => data).join(''));
      }
    }
    for (const [key, value] of Object.entries(current)) if (key !== 'metadata') visit(value);
  };
  visit((parse(source, { modern: true }) as unknown as { fragment: unknown }).fragment);
  return links;
}

test('the link and preload checks read real tags, not code or text', () => {
  const svelte = [
    `<script lang="ts">const src = '/a-variable/'; let x = '/b/';</script>`,
    `<!-- <a href="/a-note/"> -->`,
    `<a href="/a/">a</a><a href='/b/'>b</a><a href=/c/ >c</a><a href={x}>d</a><a href="/e/{x}">e</a>`,
    `<a data-test={1 > 0} href="/after-expression/">f</a>`,
    `<p>href="/text/"</p><p>{'<a href="/inside-an-expression/">x</a>'}</p>`,
    `{#if x}<img src="/in-a-block.webp" alt="" /><svelte:self href="/self/" />{/if}`,
    `<svelte:component this={x} href="/dynamic-component/">g</svelte:component><svelte:element this="a" href="/element/">h</svelte:element>`,
    `<style>a::after { content: '<a href="/in-css/">'; }</style>`
  ].join('\n');
  expect(staticLinks(svelte)).toEqual(['/a/', '/b/', '/c/', '/after-expression/', '/in-a-block.webp', '/self/', '/dynamic-component/', '/element/']);
  // An HTML-context CDATA marker opens a bogus comment that ends at the first `>`, so what follows is real markup.
  const cdata = '<![CDATA[><script>alert(1)</script><link rel="modulepreload" href="/x.js">]]>';
  expect(scriptsIn(cdata)).toHaveLength(1);
  expect(modulePreloads(cdata)).toHaveLength(1);
  expect(scriptsIn('<script type="application/ld+json">{"a":"</p>"}</script>')).toHaveLength(0);
  expect(modulePreloads('<link rel = "modulepreload" href="/x.js">')).toHaveLength(1);
  expect(modulePreloads("<link REL='preload ModulePreload' href=/x.js>")).toHaveLength(1);
  expect(modulePreloads('<link rel="module&#112;reload" href="/x.js">')).toHaveLength(1);
  expect(modulePreloads('<link rel="modulepreload" rel="stylesheet" href="/x.js">')).toHaveLength(1);
  expect(modulePreloads('<p>Ajoutez rel=&quot;modulepreload&quot; ici. rel="modulepreload"</p>')).toHaveLength(0);
  expect(modulePreloads('<!-- <link rel="modulepreload" href="/x.js"> -->')).toHaveLength(0);
  expect(modulePreloads('<style>p::after { content: \'<link rel="modulepreload">\'; }</style>')).toHaveLength(0);
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
    // Real elements only, read by an HTML parser. Owner text is escaped, so its words never form a tag.
    expect({ file, scripts: scriptsIn(html) }).toEqual({ file, scripts: [] });
    expect({ file, preloads: modulePreloads(html) }).toEqual({ file, preloads: [] });
  }
});
test('every link written in the site\'s own code leads to a built page', () => {
  // Reads the code, not the pages: a link an Owner wrote may go dead, and must never fail this test.
  const code = (readdirSync('src', { recursive: true }) as string[]).filter((file) => file.endsWith('.svelte'));
  expect(code.length).toBeGreaterThan(0);
  // Static href and src attributes in markup, from Svelte's parse tree. A value built in an expression isn't read.
  for (const file of code) {
    for (const value of staticLinks(read(`src/${file}`))) {
      const local = value.startsWith(site.origin) ? value.slice(site.origin.length) : value;
      if (!local.startsWith('/') || local.startsWith('//')) continue;
      const path = local.replace(/[?#].*$/, '');
      // Built folders carry decoded names, so a percent-encoded link is checked against its decoded path.
      let onDisk = path;
      try { onDisk = decodeURI(path); } catch { /* malformed encoding: checked as written, and it won't exist */ }
      expect({ file, path, built: existsSync(`build${onDisk}${onDisk.endsWith('/') ? 'index.html' : ''}`) }).toEqual({ file, path, built: true });
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
