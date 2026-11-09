import { expect, test } from 'bun:test';
import { site } from '../src/lib/config/site.ts';
import { contentGroups } from '../src/lib/content/cms.ts';
import { loadCollections } from '../src/lib/content/collections.ts';
import { collections } from '../src/lib/content/registry.ts';

// A hand-kept copy of CONTENT_FILES in Login's src/sites.ts, whose repository this one can't read.
// It can't notice when those rules change, so update it by hand when they do.
const loginRules = [
  /^src\/lib\/content\/[\w.-]+\.json$/,
  /^src\/lib\/content\/[a-z][a-z0-9-]*\/[\w.~-]+\.md$/,
  /^static\/images\/uploads\/[\w~-]+\.(webp|png|jpe?g|avif)$/
];
const canSave = (path: string) => loginRules.some((rule) => rule.test(path));

const languages = site.languages.map(({ code }) => code);

test('every content file can be saved in every language', () => {
  for (const { file } of contentGroups.flatMap((group) => group.files)) {
    for (const language of languages) expect(canSave(file.replace('{{locale}}', language))).toBe(true);
  }
});
test('every registered collection can be saved', () => {
  for (const { cms } of collections) {
    expect(canSave(`${cms.folder}/ete-a-montreal.${site.defaultLanguage}.md`)).toBe(true);
    expect(canSave(`${cms.folder}/a~b.${site.defaultLanguage}.md`)).toBe(true);
  }
});
test('a new collection can be saved without a Login change, and only one level deep', () => {
  expect(canSave('src/lib/content/case-studies/entry.fr.md')).toBe(true);
  expect(canSave('src/lib/content/case-studies/deep/entry.fr.md')).toBe(false);
  expect(canSave('src/lib/content/Case-Studies/entry.fr.md')).toBe(false);
  expect(canSave('src/lib/content/case-studies/entry.fr.txt')).toBe(false);
});
test('an upload the editor renames and converts can be saved', () => {
  expect(canSave('static/images/uploads/mon-ete-photo.webp')).toBe(true);
  expect(canSave('static/images/uploads/a~b.webp')).toBe(true);
  expect(canSave('static/images/uploads/Mon Été Photo.JPG')).toBe(false);
  expect(canSave('static/images/uploads/logo.svg')).toBe(false);
});
test.if(collections.some(({ name }) => name === 'posts'))('a post saved by the editor in one language, with no photo or description, builds', () => {
  // The exact shape Sveltia CMS 0.261.0 wrote in a real editor run: unquoted date, empty optional fields.
  const saved = "---\ntitle: Été à Montréal\ndescription: Résumé\ndate: 2026-11-07\nphoto: ''\nphotoAlt: ''\n---\n\nCorps\n";
  const [post] = loadCollections(collections, { [`./posts/ete-a-montreal.${site.defaultLanguage}.md`]: saved }, languages);
  expect(post.slug).toBe('ete-a-montreal');
  expect(post.language).toBe(site.defaultLanguage);
});
