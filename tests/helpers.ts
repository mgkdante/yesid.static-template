import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { site } from '../src/lib/config/site.ts';
import { createCatalog } from '../src/lib/collection-catalog.ts';
import { fixedPages } from '../src/lib/site-map.ts';
import { collections } from '../src/lib/content/registry.ts';
export const read = (path: string) => readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
export const sampleSources = () => Object.fromEntries(collections.flatMap(({ name, cms }) =>
  (existsSync(cms.folder) ? readdirSync(cms.folder) : []).filter((file) => file.endsWith('.md')).map((file) =>
    [`./${name}/${file}`, read(`${cms.folder}/${file}`)])));
export const sampleCatalog = (sources = sampleSources()) => createCatalog(site, fixedPages, collections, sources);
