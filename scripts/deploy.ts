import { readFileSync } from 'node:fs';
import { assertPublishable, site, workerName, type SiteSettings } from '../src/lib/config/site.ts';
import { assertOwnMark, ICO } from './mark.ts';

type Run = (command: string[]) => { readonly exitCode: number | null };

/** `ico` is the site's favicon.ico; the starter's placeholder one is refused, so no client publishes it. */
export function publish(settings: Pick<SiteSettings, 'origin' | 'slug'>, run: Run, ico: Uint8Array): void {
  assertPublishable(settings);
  assertOwnMark(ico);
  // Explicit name prevents this script from targeting another Worker by config drift.
  const { exitCode } = run(['node', 'node_modules/wrangler/bin/wrangler.js', 'deploy',
    '--config', 'wrangler.jsonc', '--name', workerName(settings.slug)]);
  if (exitCode !== 0) throw new Error(`Worker upload failed (${exitCode})`);
}

if (import.meta.main) {
  publish(site, (command) => Bun.spawnSync(command, { stdout: 'inherit', stderr: 'inherit' }), readFileSync(ICO));
}
