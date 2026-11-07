import { expect, test } from 'bun:test';
import { canonicalJson } from '@yesid/content-contract';
import { site } from '../src/lib/config/site.ts';
import { readdirSync } from 'node:fs';
import { fixedPageIds, menuContract } from '../src/lib/content/contract.ts';
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
test('every Fixed Page has its editor entry, and the groups come before the folders', () => {
  const inEditor = contentGroups.flatMap(({ files }) => files.map(({ name }) => name));
  for (const id of fixedPageIds) expect(inEditor).toContain(id);
  expect(createCmsConfig().collections?.map(({ name }) => name)).toEqual([...contentGroups, ...collections].map(({ name }) => name));
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
  expect(config.media_folder).toBe('static/images/uploads');
  expect(config.public_folder).toBe('/images/uploads');
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
