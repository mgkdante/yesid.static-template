import { createHash } from 'node:crypto';

/** The site's mark, the source of every icon file. Kept apart from the renderer so publishing doesn't load it. */
export const MARK = 'static/favicon.svg';
export const ICO = 'static/favicon.ico';
/**
 * The starter's placeholder artwork, known by the favicon.ico it generates. Comments, formatting and an
 * optimizer can't change that, and a client's own mark can never match it by accident.
 */
export const PLACEHOLDER_ICO_SHA256 = '9e18822d13f0607ce4209c539e18af1815fd069fca9603c78ce3514f46c9b483';

export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export function assertOwnMark(ico: Uint8Array): void {
  if (sha256(ico) === PLACEHOLDER_ICO_SHA256) {
    throw new Error(`Replace the sample mark in ${MARK} with the client's, then run bun run icons`);
  }
}
