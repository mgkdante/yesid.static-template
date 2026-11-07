import { assertPublishable, site, workerName, type SiteSettings } from '../src/lib/config/site.ts';

type Run = (command: string[]) => { readonly exitCode: number | null };

export function publish(settings: Pick<SiteSettings, 'origin' | 'slug'>, run: Run): void {
  assertPublishable(settings);
  // Explicit name prevents this script from targeting another Worker by config drift.
  const { exitCode } = run(['node', 'node_modules/wrangler/bin/wrangler.js', 'deploy',
    '--config', 'wrangler.jsonc', '--name', workerName(settings.slug)]);
  if (exitCode !== 0) throw new Error(`Worker upload failed (${exitCode})`);
}

if (import.meta.main) publish(site, (command) => Bun.spawnSync(command, { stdout: 'inherit', stderr: 'inherit' }));
