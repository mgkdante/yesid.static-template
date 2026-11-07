import { site } from '../config/site.ts';
import { mapWithPosts } from '../post-map.ts';
import { pagesContract, siteTextContract } from './contract.ts';
import { parsePost, validateSharedPosts } from './posts.ts';

const files = import.meta.glob('./*.json', { eager: true, import: 'default' });
export const content = Object.fromEntries(site.languages.map(({ code }) => [code, {
  text: siteTextContract.parse(files[`./${code}.json`]),
  pages: pagesContract.parse(files[`./pages.${code}.json`])
}]));
const sources = import.meta.glob('./posts/*.md', { eager: true, query: '?raw', import: 'default' });
export const posts = Object.entries(sources).map(([file, source]) =>
  parsePost(file, String(source), site.languages.map(({ code }) => code)));
validateSharedPosts(posts);
export const siteMap = mapWithPosts(posts);
