import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { read } from './helpers.ts';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** An ICO is a 6-byte header, one 16-byte entry per image, then the images. */
function icoImages(bytes: Buffer) {
  expect({ reserved: bytes.readUInt16LE(0), type: bytes.readUInt16LE(2) }).toEqual({ reserved: 0, type: 1 });
  return Array.from({ length: bytes.readUInt16LE(4) }, (_, index) => {
    const entry = 6 + index * 16;
    const length = bytes.readUInt32LE(entry + 8);
    const offset = bytes.readUInt32LE(entry + 12);
    const image = bytes.subarray(offset, offset + length);
    return {
      listed: [bytes[entry] || 256, bytes[entry + 1] || 256],
      png: [...image.subarray(0, 8)].every((byte, at) => byte === PNG_SIGNATURE[at]),
      // A PNG states its own size in its header chunk, which starts right after the signature.
      size: image.length >= 24 ? [image.readUInt32BE(16), image.readUInt32BE(20)] : []
    };
  });
}

test('the built site serves /favicon.ico with 16, 32 and 48 pixel images', () => {
  // Icon services, and Plausible's site list through them, read only this file.
  expect(existsSync('build/favicon.ico')).toBe(true);
  expect(icoImages(readFileSync('build/favicon.ico'))).toEqual([16, 32, 48].map((px) =>
    ({ listed: [px, px], png: true, size: [px, px] })));
});

test('favicon.ico is generated from the mark, so replacing the mark replaces it', async () => {
  const { faviconIco } = await import('../scripts/build-icons.ts');
  expect(Buffer.compare(faviconIco(read('static/favicon.svg')), readFileSync('static/favicon.ico'))).toBe(0);
});

test('pages point to the icon files alongside the root favicon.ico', () => {
  const html = read('build/index.html');
  expect(html).toContain('href="/favicon.ico"');
  expect(html).toContain('href="/favicon.svg"');
});
