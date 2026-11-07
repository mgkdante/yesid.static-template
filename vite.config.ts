import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { site } from './src/lib/config/site.ts';
import { prerenderPolicy } from './src/lib/prerender.ts';

export default defineConfig({
  ssr: { noExternal: ['@yesid/content-contract'] },
  plugins: [sveltekit({
    adapter: adapter({ strict: true }),
    paths: { origin: site.origin, relative: false },
    prerender: {
      entries: ['*', '/404', '/robots.txt', '/sitemap.xml', '/llms.txt'],
      ...prerenderPolicy
    }
  })]
});
