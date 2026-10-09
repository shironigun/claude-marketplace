import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas/index.ts';
import { stableStringify } from '../src/util/write.ts';
import { readText } from '../src/util/read.ts';

const dir = fileURLToPath(new URL('../../schemas/', import.meta.url));

test('committed JSON schemas match their TypeScript sources', () => {
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    assert.equal(readText(join(dir, `${name}.schema.json`)), stableStringify(schema), `${name}.schema.json is stale — run npm run schemas`);
  }
});
