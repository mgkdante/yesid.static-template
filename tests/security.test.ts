import { expect, test } from 'bun:test';
import { renderMarkdown } from '../src/lib/content/markdown.ts';
import { businessJsonLd, safeJson } from '../src/lib/seo.ts';
import { site } from '../src/lib/config/site.ts';

test('Markdown removes executable HTML and dangerous links', () => {
  const html = renderMarkdown('## Heading\n\n**Text** <script>alert(1)</script><img src="x" onerror="alert(2)"> [link](javascript:alert%281%29) <iframe src="https://evil.invalid"></iframe>');
  expect(html).toContain('<strong>Text</strong>');
  expect(html).not.toMatch(/<script|onerror|javascript:|<iframe/i);
  expect(renderMarkdown('`<script>`')).toContain('&lt;script&gt;');
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
