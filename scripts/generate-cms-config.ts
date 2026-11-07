import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCmsConfig } from '../src/lib/content/cms.ts';
mkdirSync(resolve('cms'), { recursive: true });
writeFileSync(resolve('cms/config.yml'), Bun.YAML.stringify(createCmsConfig(), null, 2) + '\n');
