import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalJson } from '@yesid/content-contract';
import { site } from '../src/lib/config/site.ts';
import { pagesContract, siteTextContract } from '../src/lib/content/contract.ts';
for (const { code } of site.languages) {
  for (const [file, contract] of [[`${code}.json`, siteTextContract], [`pages.${code}.json`, pagesContract]] as const) {
    const path = `src/lib/content/${file}`;
    writeFileSync(path, canonicalJson(contract, readFileSync(path, 'utf8')));
  }
}
