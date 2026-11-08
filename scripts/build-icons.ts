// favicon.ico from the site's mark, static/favicon.svg. Icon services, and Plausible's site list through them,
// read only the root favicon.ico, so every site serves one beside its SVG icon.
// `bun run icons` writes it; `bun run icons --check` fails if it doesn't match the mark.
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { MARK } from './mark.ts';

export const ICO = 'static/favicon.ico';
const ICO_SIZES = [16, 32, 48] as const;

const png = (svg: string, size: number) => Buffer.from(new Resvg(svg, {
  fitTo: { mode: 'width', value: size },
  // No system fonts, so the same mark renders the same bytes on every machine.
  font: { loadSystemFonts: false }
}).render().asPng());

/** PNG images packed in an ICO: a 6-byte header, one 16-byte entry per image, then the PNGs. */
export function faviconIco(svg: string): Buffer {
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
