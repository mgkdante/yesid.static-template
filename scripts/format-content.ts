import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalJson } from '@yesid/content-contract';
import { site } from '../src/lib/config/site.ts';
import { contentGroups } from '../src/lib/content/cms.ts';

for (const { file, contract } of contentGroups.flatMap((group) => group.files)) {
  for (const { code } of site.languages) {
    const path = file.replace('{{locale}}', code);
    writeFileSync(path, canonicalJson(contract, readFileSync(path, 'utf8')));
  }
}
