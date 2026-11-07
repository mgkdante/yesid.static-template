import { site } from '../config/site.ts';
import { mapWithPosts } from '../post-map.ts';
import { fixedPageIds, pageContract, siteTextContract, type Pages } from './contract.ts';
import { parsePost, validateSharedPosts } from './posts.ts';

const files = import.meta.glob('./*.json', { eager: true, import: 'default' });
export const content = Object.fromEntries(site.languages.map(({ code }) => [code, {
  text: siteTextContract.parse(files[`./shared.${code}.json`]),
  pages: Object.fromEntries(fixedPageIds.map((id) => [id, pageContract.parse(files[`./${id}.${code}.json`])])) as Pages
}]));
const sources = import.meta.glob('./posts/*.md', { eager: true, query: '?raw', import: 'default' });
export const posts = Object.entries(sources).map(([file, source]) =>
  parsePost(file, String(source), site.languages.map(({ code }) => code)));
validateSharedPosts(posts);
export const siteMap = mapWithPosts(posts);
