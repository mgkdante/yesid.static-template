import { expect, test } from 'bun:test';
import { canonicalJson } from '@yesid/content-contract';
import { site } from '../src/lib/config/site.ts';
import { readdirSync } from 'node:fs';
import { menuContract } from '../src/lib/content/contract.ts';
import { contentGroups, createCmsConfig } from '../src/lib/content/cms.ts';
import { loadCollections } from '../src/lib/content/collections.ts';
import { collections } from '../src/lib/content/registry.ts';
import { read, sampleSources } from './helpers.ts';

const contentFiles = contentGroups.flatMap((group) => group.files);
for (const { code } of site.languages) {
  for (const { name, contract } of contentFiles) {
    test(`${name}.${code}.json satisfies the contract and canonical ordering`, () => {
      const source = read(`src/lib/content/${name}.${code}.json`);
      expect(contract.safeParse(JSON.parse(source)).success).toBe(true);
      expect(source).toBe(canonicalJson(contract, source));
    });
  }
}
test('every content file on disk can be edited, and every editable file exists', () => {
  const expected = site.languages.flatMap(({ code }) => contentFiles.map(({ name }) => `${name}.${code}.json`)).sort();
  const onDisk = readdirSync(new URL('../src/lib/content/', import.meta.url)).filter((name) => name.endsWith('.json')).sort();
  expect(onDisk).toEqual(expected);
});
test('the editor is laid out like the site, with the groups before the blog', () => {
  expect(contentGroups.map(({ label, files }) => [label, files.map(({ name }) => name)])).toEqual([
    ['Pages', ['home', 'about', 'blog', 'projects']],
    ['Partout sur le site', ['menu', 'footer', 'error']],
    ['Textes légaux', ['privacy', 'terms']]
  ]);
  expect(createCmsConfig().collections?.map(({ name }) => name)).toEqual(['pages', 'everywhere', 'legal', 'posts', 'projects']);
});
test('structure is checked while owner wording stays unrestricted', () => {
  const source = JSON.parse(read(`src/lib/content/menu.${site.defaultLanguage}.json`));
  expect(menuContract.safeParse({ ...source, skip: 'A'.repeat(10000) }).success).toBe(true);
  expect(menuContract.safeParse({ ...source, skip: ' ' }).success).toBe(false);
  expect(menuContract.safeParse({ ...source, typo: 'x' }).success).toBe(false);
  const { skip, ...missing } = source;
  expect(menuContract.safeParse(missing).success).toBe(false);
});
test('committed CMS config equals the contract output', () => {
  const config = createCmsConfig();
  expect(Bun.YAML.parse(read('cms/config.yml'))).toEqual(config);
  expect(config.backend.repo).toBe(`mgkdante/${site.slug}`);
  const posts = config.collections?.find(({ name }) => name === 'posts');
  if (!posts || !('fields' in posts)) throw new Error('no blog folder');
  expect(posts.folder).toBe('src/lib/content/posts');
  expect(config.media_folder).toBe('static/images/uploads');
  expect(config.public_folder).toBe('/images/uploads');
  const { fields } = posts;
  expect(fields.find((field) => field.name === 'date')?.i18n).toBe('duplicate');
  expect(fields.find((field) => field.name === 'photo')?.i18n).toBe('duplicate');
});
test('all collections validate their contracts and shared fields', () => {
  const sources = sampleSources();
  const languages = site.languages.map(({ code }) => code);
  expect(() => loadCollections(collections, sources, languages)).not.toThrow();
  const fixture = (date: string) => `---\ntitle: Example\ndescription: Example\ndate: '${date}'\nphoto: ''\nphotoAlt: Example\n---\nBody`;
  const invalid = {
    './posts/fixture.fr.md': fixture('2026-01-01'),
    './posts/fixture.en.md': fixture('2026-01-02')
  };
  expect(() => loadCollections(collections, invalid, languages)).toThrow('Shared fields differ');
});
