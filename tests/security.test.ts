import { expect, test } from 'bun:test';
import { z } from 'zod';
import { line } from '@yesid/content-contract';
import { defineCollection } from '../src/lib/content/collections.ts';
import { renderMarkdown } from '../src/lib/content/markdown.ts';
import { businessJsonLd, safeJson } from '../src/lib/seo.ts';
import { site } from '../src/lib/config/site.ts';

test('Markdown removes executable HTML and dangerous links', () => {
  const html = renderMarkdown('## Heading\n\n**Text** <script>alert(1)</script><img src="x" onerror="alert(2)"> [link](javascript:alert%281%29) <iframe src="https://evil.invalid"></iframe>');
  expect(html).toContain('<strong>Text</strong>');
  expect(html).not.toMatch(/<script|onerror|javascript:|<iframe/i);
  expect(renderMarkdown('`<script>`')).toContain('&lt;script&gt;');
  expect(renderMarkdown('Text <span>inline</span>')).not.toContain('<span>');
});
test('a malformed link keeps its text and loses the address the build could not read', () => {
  for (const href of ['/%', '/%ZZ', '/#%', 'http://[']) {
    const html = renderMarkdown(`[mon lien](${href})`);
    expect(html).toContain('mon lien');
    expect(html).not.toContain('href');
  }
  expect(renderMarkdown('![photo](/%ZZ)')).not.toContain('src=');
  expect(renderMarkdown('[bon](/a-propos/#equipe)')).toContain('href="/a-propos/#equipe"');
  expect(renderMarkdown('[été](/%C3%A9t%C3%A9/)')).toContain('href="/%C3%A9t%C3%A9/"');
  expect(renderMarkdown('![photo](/images/uploads/a~b.webp)')).toContain('src="/images/uploads/a~b.webp"');
});
test('JSON-LD contains only provided business facts', () => {
  const minimal = businessJsonLd({ name: site.business.name });
  expect(minimal).toEqual({ '@context': 'https://schema.org', '@type': 'Organization', name: site.business.name });
  expect(businessJsonLd(site.business).name).toBe(site.business.name);
  for (const key of ['address', 'aggregateRating', 'priceRange']) expect(businessJsonLd(site.business)).not.toHaveProperty(key);
});
test('JSON embedded in head cannot close its script', () => {
  const value = { name: '</script><script>alert(1)</script>' };
  expect(safeJson(value)).not.toContain('<');
  expect(JSON.parse(safeJson(value))).toEqual(value);
});
test('a symbolic title remains valid wording, and a symbolic file name still gets a usable path', () => {
  const pages = defineCollection({
    name: 'notes', label: 'Notes', listing: 'notes',
    contract: z.strictObject({ title: line('Title') }),
    metadata: (data) => ({ title: data.title, description: data.title }),
    present: (data) => data
  });
  const post = pages.parse('entry.fr.md', "---\ntitle: '✨'\n---\n", ['fr']);
  expect(post.content.title).toBe('✨');
  expect(post.slug).toBe('entry');
  expect(pages.parse('✨.fr.md', "---\ntitle: '✨'\n---\n", ['fr']).slug).toMatch(/^entry-/);
});
