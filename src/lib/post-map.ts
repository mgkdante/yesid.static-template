import { site } from './config/site.ts';
import { createSiteMap, fixedPages, type PageDefinition } from './site-map.ts';
import type { Post } from './content/posts.ts';
export function mapWithPosts(posts: readonly Post[]) {
const postPages: PageDefinition[] = [...new Set(posts.map(({ id }) => id))].map((id) => ({
  id, kind: 'post', slugs: Object.fromEntries(posts.filter((post) => post.id === id).map((post) => {
    const blog = fixedPages.find((page) => page.id === 'blog')?.slugs[post.language];
    if (!blog) throw new Error(`Missing blog slug: ${post.language}`);
    return [post.language, `${blog}/${post.slug}`];
  }))
}));
return createSiteMap(site, [...fixedPages, ...postPages]);
}
