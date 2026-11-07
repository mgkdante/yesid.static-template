import { readFileSync, readdirSync } from 'node:fs';
import { site } from '../src/lib/config/site.ts';
import { parsePost } from '../src/lib/content/posts.ts';
export const read = (path: string) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
export const samplePosts = () => readdirSync('src/lib/content/posts').filter((file) => file.endsWith('.md')).map((file) =>
  parsePost(file, read(`src/lib/content/posts/${file}`), site.languages.map(({ code }) => code)));
