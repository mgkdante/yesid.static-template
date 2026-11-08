/** The site's mark, the source of every icon file. Kept apart from the renderer so publishing doesn't load it. */
export const MARK = 'static/favicon.svg';
/** Carried by the sample mark only. Publishing refuses it, as it refuses the sample address. */
export const PLACEHOLDER = 'placeholder-mark';

export function assertOwnMark(svg: string): void {
  if (svg.includes(PLACEHOLDER)) throw new Error(`Replace the sample mark in ${MARK} with the client's, then run bun run icons`);
}
