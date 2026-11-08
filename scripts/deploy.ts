import { readFileSync } from 'node:fs';
import { assertPublishable, site, workerName, type SiteSettings } from '../src/lib/config/site.ts';
import { assertOwnMark, MARK } from './mark.ts';

type Run = (command: string[]) => { readonly exitCode: number | null };

/** `mark` is the site's favicon.svg; the sample one is refused, so no client publishes the placeholder icon. */
export function publish(settings: Pick<SiteSettings, 'origin' | 'slug'>, run: Run, mark: string): void {
  assertPublishable(settings);
  assertOwnMark(mark);
  // Explicit name prevents this script from targeting another Worker by config drift.
  const { exitCode } = run(['node', 'node_modules/wrangler/bin/wrangler.js', 'deploy',
    '--config', 'wrangler.jsonc', '--name', workerName(settings.slug)]);
  if (exitCode !== 0) throw new Error(`Worker upload failed (${exitCode})`);
}

if (import.meta.main) {
  publish(site, (command) => Bun.spawnSync(command, { stdout: 'inherit', stderr: 'inherit' }), readFileSync(MARK, 'utf8'));
}
