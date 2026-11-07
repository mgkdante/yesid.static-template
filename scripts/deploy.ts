import { assertPublishable, site, workerName } from '../src/lib/config/site.ts';
assertPublishable(site);
// Explicit name prevents this script from targeting another Worker by config drift.
const result = Bun.spawnSync(['node', 'node_modules/wrangler/bin/wrangler.js', 'deploy',
  '--config', 'wrangler.jsonc', '--name', workerName(site.slug)], { stdout: 'inherit', stderr: 'inherit' });
if (result.exitCode !== 0) throw new Error(`Worker upload failed (${result.exitCode})`);
