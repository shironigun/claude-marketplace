import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas/index.ts';
import { stableStringify } from '../src/util/write.ts';

const outDir = fileURLToPath(new URL('../../schemas/', import.meta.url));
mkdirSync(outDir, { recursive: true });
for (const [name, schema] of Object.entries(SCHEMAS)) writeFileSync(join(outDir, `${name}.schema.json`), stableStringify(schema));
console.log(`wrote ${Object.keys(SCHEMAS).length} schema(s) to ${outDir}`);
