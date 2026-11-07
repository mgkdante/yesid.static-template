import { expect, test } from 'bun:test';
import { site } from '../src/lib/config/site.ts';
import { contentGroups } from '../src/lib/content/cms.ts';
import { loadCollections } from '../src/lib/content/collections.ts';
import { collections } from '../src/lib/content/registry.ts';

// Mirrors CONTENT_FILES in the Login Site's src/sites.ts. A path outside these rules can't be saved.
const loginRules = [
  /^src\/lib\/content\/[\w.-]+\.json$/,
  /^src\/lib\/content\/posts\/[\w.-]+\.md$/,
  /^static\/images\/uploads\/[\w-]+\.(webp|png|jpe?g|avif)$/
];
const canSave = (path: string) => loginRules.some((rule) => rule.test(path));

// Collection folders the Login Site doesn't allow yet. Their entries show in the editor but can't save.
const waitingOnLoginSite = ['projects'];

const languages = site.languages.map(({ code }) => code);

test('every content file can be saved in every language', () => {
  for (const { file } of contentGroups.flatMap((group) => group.files)) {
    for (const language of languages) expect(canSave(file.replace('{{locale}}', language))).toBe(true);
  }
});
test('every collection can be saved, apart from those waiting on the Login Site', () => {
  const refused: string[] = collections.filter(({ cms }) => !canSave(`${cms.folder}/ete-a-montreal.${site.defaultLanguage}.md`)).map(({ name }) => name);
  expect(refused).toEqual(waitingOnLoginSite);
});
test('an upload the editor renames and converts can be saved', () => {
  expect(canSave('static/images/uploads/mon-ete-photo.webp')).toBe(true);
  expect(canSave('static/images/uploads/Mon Été Photo.JPG')).toBe(false);
});
test('a post saved by the editor in one language, with no photo or description, builds', () => {
  // The exact shape Sveltia CMS 0.261.0 wrote in a real editor run: unquoted date, empty optional fields.
  const saved = "---\ntitle: Été à Montréal\ndescription: Résumé\ndate: 2026-11-07\nphoto: ''\nphotoAlt: ''\n---\n\nCorps\n";
  const [post] = loadCollections(collections, { [`./posts/ete-a-montreal.${site.defaultLanguage}.md`]: saved }, languages);
  expect(post.slug).toBe('ete-a-montreal');
  expect(post.language).toBe(site.defaultLanguage);
});
