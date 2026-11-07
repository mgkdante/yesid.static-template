import { parse } from 'yaml';
import { postContract, type PostContent } from './contract.ts';
import { renderMarkdown } from './markdown.ts';

export interface Post extends PostContent {
  readonly id: string;
  readonly language: string;
  readonly slug: string;
  readonly html: string;
}
export function parsePost(file: string, source: string, languages: readonly string[]): Post {
  const match = /(?:^|\/)([^/]+)\.([^.]+)\.md$/.exec(file);
  const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match || !front || !languages.includes(match[2])) throw new Error(`Invalid post file: ${file}`);
  const content = postContract.parse({ ...parse(front[1]), body: front[2].trim() });
  const titleSlug = content.title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const slug = titleSlug || `post-${Array.from(match[1]).map((char) => char.codePointAt(0)!.toString(16)).join('-')}`;
  return { ...content, id: `post:${match[1]}`, language: match[2], slug, html: renderMarkdown(content.body) };
}
export function validateSharedPosts(posts: readonly Post[]): void {
  for (const post of posts) {
    const variants = posts.filter(({ id }) => id === post.id);
    if (variants.some(({ date, photo }) => date !== post.date || (photo ?? '') !== (post.photo ?? ''))) {
      throw new Error(`Shared date or photo differs: ${post.id}`);
    }
  }
}
