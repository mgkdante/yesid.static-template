// favicon.ico from the site's mark, static/favicon.svg. Icon services, and Plausible's site list through them,
// read only the root favicon.ico, so every site serves one beside its SVG icon.
// `bun run icons` writes it; `bun run icons --check` fails if it doesn't match the mark.
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ICO, MARK } from './mark.ts';

const ICO_SIZES = [16, 32, 48] as const;

/**
 * Resvg runs here with no fonts and no files beside the mark, so the same mark gives the same bytes on every
 * machine. Text and linked images would render as nothing, so they are refused instead of shipped blank.
 */
function assertSelfContained(svg: string): void {
  if (/<(?:text|tspan|textPath)\b/.test(svg)) throw new Error(`${MARK} has text. Convert it to paths, then run bun run icons`);
  for (const [, href] of svg.matchAll(/<(?:image|feImage)\b[^>]*?\s(?:xlink:)?href\s*=\s*["']([^"']*)["']/g)) {
    if (!href.startsWith('data:')) throw new Error(`${MARK} links to ${href}. Embed the image as a data URI, then run bun run icons`);
  }
}

/** Sizes the mark's root to a square canvas, so a wide or tall mark is centred with transparent space, never cropped. */
function squared(svg: string, size: number): string {
  return svg.replace(/<svg\b[^>]*>/, (root) => {
    const attribute = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`).exec(root)?.[1];
    let tag = root.replace(/\s(?:width|height)\s*=\s*["'][^"']*["']/g, '');
    if (!attribute('viewBox')) {
      const [width, height] = [attribute('width'), attribute('height')].map((value) => Number.parseFloat(value ?? ''));
      if (!(width > 0 && height > 0)) throw new Error(`${MARK} needs a viewBox`);
      tag = tag.replace(/^<svg/, `<svg viewBox="0 0 ${width} ${height}"`);
    }
    return tag.replace(/^<svg/, `<svg width="${size}" height="${size}"`);
  });
}

function png(svg: string, size: number): Buffer {
  const rendered = new Resvg(squared(svg, size), { font: { loadSystemFonts: false } }).render();
  const pixels = rendered.pixels;
  if (!pixels.some((value, index) => index % 4 === 3 && value > 0)) throw new Error(`${MARK} renders blank at ${size} px`);
  return Buffer.from(rendered.asPng());
}

/** PNG images packed in an ICO: a 6-byte header, one 16-byte entry per image, then the PNGs. */
export function faviconIco(svg: string): Buffer {
  assertSelfContained(svg);
  const pngs = ICO_SIZES.map((size) => png(svg, size));
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((image, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(ICO_SIZES[index], entry);
    header.writeUInt8(ICO_SIZES[index], entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  return Buffer.concat([header, ...pngs]);
}

if (import.meta.main) {
  const ico = faviconIco(readFileSync(MARK, 'utf8'));
  if (process.argv.includes('--check')) {
    if (!existsSync(ICO) || !readFileSync(ICO).equals(ico)) throw new Error(`${ICO} doesn't match ${MARK}. Run bun run icons`);
  } else {
    writeFileSync(ICO, ico);
  }
}
