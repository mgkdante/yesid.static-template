import { defineCollection } from './collections.ts';
import { postContract, projectContract } from './contract.ts';
import { renderMarkdown } from './markdown.ts';

export const collections = [
  defineCollection({
    name: 'posts', label: 'Blog', listing: 'blog', contract: postContract,
    metadata: (data) => ({ title: data.title, description: data.description, image: data.photo || undefined }),
    present: (data) => ({ ...data, html: renderMarkdown(data.body) })
  }),
  defineCollection({
    name: 'projects', label: 'Projets', listing: 'projects', contract: projectContract,
    metadata: (data) => ({ title: data.name, description: data.summary }),
    present: (data) => ({ ...data, html: renderMarkdown(data.body) })
  })
] as const;
export type CollectionName = (typeof collections)[number]['name'];
export type SiteEntry = ReturnType<(typeof collections)[number]['parse']>;
