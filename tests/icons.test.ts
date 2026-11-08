import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { faviconIco } from '../scripts/build-icons.ts';
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
const sizedAsListed = [16, 32, 48].map((px) => ({ listed: [px, px], png: true, size: [px, px] }));

// The built site, served by Wrangler's local Workers runtime, the way a client's Worker serves it.
// It runs under Node: under Bun, Wrangler can't forward requests to the Worker.
let server: ChildProcess | undefined;
let origin = '';
beforeAll(async () => {
  server = spawn('node', ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', '0'],
    { env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
  origin = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Wrangler didn't start:\n${output}`)), 60_000);
    const listen = (chunk: Buffer) => {
      output += chunk.toString();
      const ready = /Ready on (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
      if (ready) { clearTimeout(timer); resolve(ready[1]); }
    };
    server!.stdout!.on('data', listen);
    server!.stderr!.on('data', listen);
    server!.on('exit', (code) => reject(new Error(`Wrangler exited (${code}):\n${output}`)));
  });
}, 70_000);
afterAll(() => {
  if (!server?.pid) return;
  // Wrangler starts its own runtime process, so stop the whole tree.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f']);
  else server.kill('SIGINT');
});

test('GET /favicon.ico on the built site returns 200 with 16, 32 and 48 pixel images', async () => {
  // Icon services, and Plausible's site list through them, read only this file.
  const response = await fetch(`${origin}/favicon.ico`);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toMatch(/icon/);
  expect(icoImages(Buffer.from(await response.arrayBuffer()))).toEqual(sizedAsListed);
});

test('pages point to the icon files alongside the root favicon.ico', () => {
  const html = read('build/index.html');
  expect(html).toContain('href="/favicon.ico"');
  expect(html).toContain('href="/favicon.svg"');
});

test('favicon.ico is generated from the mark, so replacing the mark replaces it', () => {
  expect(Buffer.compare(faviconIco(read('static/favicon.svg')), readFileSync('static/favicon.ico'))).toBe(0);
});

test('a wide or tall mark is centred in square images, never stretched or cropped', () => {
  for (const viewBox of ['0 0 100 40', '0 0 40 100']) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect width="100" height="100" fill="#0a7"/></svg>`;
    expect(icoImages(faviconIco(svg))).toEqual(sizedAsListed);
  }
  const sizedOnly = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#0a7"/></svg>';
  expect(icoImages(faviconIco(sizedOnly))).toEqual(sizedAsListed);
});

test('a mark that would render blank is refused with what to change', () => {
  const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${body}</svg>`;
  expect(() => faviconIco(wrap('<text x="1" y="9">A</text>'))).toThrow('Convert it to paths');
  expect(() => faviconIco(wrap('<image href="logo.png" width="10" height="10"/>'))).toThrow('Embed the image');
  expect(() => faviconIco(wrap('<rect width="10" height="10" fill="none"/>'))).toThrow('renders blank');
  expect(() => faviconIco(wrap('<image href="data:image/png;base64,iVBORw0KGgo=" width="1" height="1"/><rect width="10" height="10"/>'))).not.toThrow();
});
