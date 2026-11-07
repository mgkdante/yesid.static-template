import type { Handle } from '@sveltejs/kit/hooks';
import { languageFromPath } from './lib/config/site.ts';
export const handle: Handle = ({ event, resolve }) => resolve(event, {
  transformPageChunk: ({ html }) => html.replace('%site.lang%', languageFromPath(event.url.pathname))
});
