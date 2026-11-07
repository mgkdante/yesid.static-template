import type { SiteEntry } from '#lib/content/registry.ts';
export interface ListingProps {
  page: { title: string; body?: string };
  items: { entry: SiteEntry; path: string }[];
}
