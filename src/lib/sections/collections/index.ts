import type { Component } from 'svelte';
import type { CollectionName, SiteEntry } from '#lib/content/registry.ts';
import type { ListingProps } from './types.ts';
import BlogEntry from './BlogEntry.svelte';
import BlogList from './BlogList.svelte';
import ProjectEntry from './ProjectEntry.svelte';
import ProjectList from './ProjectList.svelte';

export const collectionViews: Record<CollectionName, {
  detail: Component<{ entry: SiteEntry }>;
  listing: Component<ListingProps>;
}> = {
  posts: { detail: BlogEntry, listing: BlogList },
  projects: { detail: ProjectEntry, listing: ProjectList }
};
