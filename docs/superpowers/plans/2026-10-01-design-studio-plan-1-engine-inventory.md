# design-studio Plan 1 — Engine and `inventory` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the design-studio engine — a bundled, dependency-free Node CLI — and its `detect` and `inventory` commands, which measure any React + MUI codebase and write a deterministic interface inventory (component registry, style samples, report).

**Architecture:** TypeScript sources (erasable syntax only, run directly by Node's type stripping in tests) under `plugins/design-studio/engine/src`, bundled by esbuild into one committed `dist/cli.mjs`. Parsing uses `@babel/parser`; a small walker, a static-value evaluator and a React + MUI adapter turn every style value into px with its unit context. Inventory = file walk → parse → module info + components + style samples + file facts → import graph → atomic classifier → duplicate families → module scorecard → registry/report. Scripts measure; nothing guesses.

**Tech Stack:** Node ≥ 22.18 for development (local: 24.16), Node ≥ 20 for the bundle; TypeScript 5.9 (type-check only); `@babel/parser` 7; `ajv` 8 (JSON Schema 2020-12); `picomatch` 4; esbuild 0.25; `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-29-design-studio-design.md` — this plan implements §4.1 (engine, schemas, fixtures), §5.6 (config), §5.7 (inventory registry), §6.2 (inventory, steps 1–8 and 10–12; step 10 without accessibility density), §7 (`detect`, `scan`, `graph`, `classify`, `families`, `scorecard`), §8 (react-mui adapter: detection, value extraction and unit rules, static theme facts) and §12 (unit tests, fixture, determinism). Step 9 (the runtime theme and its diff against measured usage), a `validate` command and a samples.jsonl row schema move to Plan 2.

## Global Constraints

- Work on the claude-marketplace branch **`dev`**. Never push. Never touch `main`.
- All commands run from `plugins/design-studio/engine/` unless a step says "from the repo root". Commit commands run from the repo root.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (pass it as a second `-m`).
- Engine source is TypeScript with **erasable syntax only**: no `enum`, no `namespace`, no constructor parameter properties. Relative imports include the `.ts` extension. Type-only imports use `import type` or inline `type`.
- Node ≥ 22.18 to develop and test (type stripping); the bundle `dist/cli.mjs` targets Node ≥ 20 and needs **no `npm install`** to run. `dist/` is committed.
- Outputs use **app-relative POSIX paths**. JSON is written with `stableStringify` (sorted keys, 2-space indent, trailing newline). **No timestamps in JSON.** Same inputs → byte-identical outputs.
- Source files are read with `readText` (strips BOM, CRLF/CR → LF) so results don't depend on git line-ending settings.
- The engine is **read-only on product repos**: `inventory` writes only to `--out` or to `<config dir>/inventory/`.
- Everything under `plugins/design-studio/` is **product-neutral**: no pilot-product names, paths or values. The fixture is a generic "Mini CRM".
- Evidence vocabulary: a classification with `confidence: high` is `CONFIRMED`; anything else is `INFERRED`.

---

## File map

```
plugins/design-studio/
  schemas/                         generated JSON Schemas (config, registry) — never hand-edited
  fixtures/mini-crm/               generic React + MUI app with planted problems (Task 16)
  engine/
    package.json  package-lock.json  tsconfig.json  build.mjs  .gitignore
    dist/cli.mjs                   bundled CLI (Task 17)
    scripts/write-schemas.ts       writes ../schemas/*.schema.json from src/schemas
    scripts/update-golden.ts       regenerates test/golden/mini-crm.registry.json
    src/
      version.ts  cli-types.ts  cli.ts  commands.ts
      commands/detect.ts  commands/inventory.ts
      util/paths.ts  util/hash.ts  util/read.ts  util/write.ts  util/fs-walk.ts
      schemas/validate.ts  schemas/config.ts  schemas/registry.ts  schemas/index.ts
      config/config.ts
      parse/parse.ts  parse/walk.ts  parse/jsx.ts  parse/literal.ts  parse/imports.ts  parse/css.ts
      adapters/react-mui/units.ts  collector.ts  extract.ts  extract-nonjsx.ts  theme-static.ts  primitives.ts
      detect/detect.ts
      inventory/resolve.ts  module-info.ts  components.ts  modules.ts  graph.ts  classify.ts
      inventory/file-facts.ts  families.ts  scorecard.ts  registry.ts  report.ts  run.ts
    test/
      helpers.ts  parse-helpers.ts  pipeline-helpers.ts
      *.test.ts  golden/mini-crm.registry.json
```

---

### Task 1: Engine package and CLI skeleton

**Files:**
- Create: `plugins/design-studio/engine/package.json`, `tsconfig.json`, `build.mjs`, `.gitignore`
- Create: `plugins/design-studio/engine/src/version.ts`, `src/cli-types.ts`, `src/commands.ts`, `src/cli.ts`
- Test: `plugins/design-studio/engine/test/cli.test.ts`

**Interfaces:**
- Produces: `main(argv: string[], io: CliIO): Promise<number>`, `parseArgs(args: string[]): Args`, `USAGE: string`; types `CliIO`, `Args`, `Command`; `COMMANDS: Record<string, Command>` (later tasks register commands here); `VERSION = '0.1.0'`.

- [ ] **Step 1: Create the package files**

`plugins/design-studio/engine/package.json`:
```json
{
  "name": "design-studio-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.18" },
  "scripts": {
    "test": "node --test \"test/**/*.test.ts\"",
    "typecheck": "tsc -p tsconfig.json",
    "build": "node build.mjs",
    "schemas": "node scripts/write-schemas.ts",
    "golden": "node scripts/update-golden.ts"
  },
  "dependencies": {
    "@babel/parser": "^7.28.0",
    "ajv": "^8.17.1",
    "picomatch": "^4.0.2"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/picomatch": ">=3.0.0",
    "esbuild": "^0.25.0",
    "typescript": "^5.9.2"
  }
}
```

`plugins/design-studio/engine/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "test", "scripts"]
}
```

`plugins/design-studio/engine/build.mjs`:
```js
import { build } from 'esbuild';

await build({
  entryPoints: ['src/cli.ts'],
  outfile: 'dist/cli.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
  banner: { js: "import { createRequire as __dsCreateRequire } from 'node:module'; const require = __dsCreateRequire(import.meta.url);" },
  logLevel: 'info',
});
```

`plugins/design-studio/engine/.gitignore`:
```
node_modules/
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules/` and `package-lock.json` created, no errors.

- [ ] **Step 3: Write the failing test**

`test/cli.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main, parseArgs } from '../src/cli.ts';

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return { out, err, io: { out: (s: string) => { out.push(s); }, err: (s: string) => { err.push(s); } } };
}

test('--version prints the engine version', async () => {
  const c = capture();
  assert.equal(await main(['--version'], c.io), 0);
  assert.deepEqual(c.out, ['0.1.0']);
});

test('no command prints usage and exits 2', async () => {
  const c = capture();
  assert.equal(await main([], c.io), 2);
  assert.match(c.out[0], /Usage:/);
});

test('an unknown command exits 2 with a message', async () => {
  const c = capture();
  assert.equal(await main(['nope'], c.io), 2);
  assert.equal(c.err[0], 'Unknown command: nope');
});

test('parseArgs reads values and boolean flags', () => {
  assert.deepEqual(parseArgs(['--app', 'x', '--no-git', '--out', 'y']), { app: 'x', 'no-git': true, out: 'y' });
  assert.throws(() => parseArgs(['stray']), /Unexpected argument: stray/);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/cli.ts'`.

- [ ] **Step 5: Implement the CLI skeleton**

`src/version.ts`:
```ts
export const VERSION = '0.1.0';
```

`src/cli-types.ts`:
```ts
export interface CliIO { out: (line: string) => void; err: (line: string) => void }
export type Args = Record<string, string | boolean>;
export type Command = (args: Args, io: CliIO) => Promise<number>;
```

`src/commands.ts`:
```ts
import type { Command } from './cli-types.ts';

export const COMMANDS: Record<string, Command> = {};
```

`src/cli.ts`:
```ts
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from './version.ts';
import { COMMANDS } from './commands.ts';
import type { Args, CliIO } from './cli-types.ts';

export const USAGE = `design-studio engine ${VERSION}

Usage:
  cli.mjs --version
  cli.mjs detect --app <dir>
  cli.mjs inventory --app <dir> [--config <file>] [--out <dir>] [--no-git]`;

export function parseArgs(args: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`);
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}

export async function main(argv: string[], io: CliIO): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === '--version') { io.out(VERSION); return 0; }
  if (!cmd || cmd === '--help' || cmd === 'help') { io.out(USAGE); return cmd ? 0 : 2; }
  const handler = COMMANDS[cmd];
  if (!handler) { io.err(`Unknown command: ${cmd}`); io.err(USAGE); return 2; }
  try {
    return await handler(parseArgs(rest), io);
  } catch (e) {
    io.err(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

function invokedDirectly(): boolean {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  const entry = resolve(process.argv[1]);
  return process.platform === 'win32' ? self.toLowerCase() === entry.toLowerCase() : self === entry;
}

if (invokedDirectly()) {
  main(process.argv.slice(2), {
    out: (s) => { process.stdout.write(s + '\n'); },
    err: (s) => { process.stderr.write(s + '\n'); },
  }).then((code) => { process.exitCode = code; });
}
```

- [ ] **Step 6: Run tests and type-check**

Run: `npm test` → Expected: 4 tests PASS.
Run: `npm run typecheck` → Expected: no output, exit 0.

- [ ] **Step 7: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): scaffold engine package and CLI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Deterministic utilities

**Files:**
- Create: `src/util/paths.ts`, `src/util/hash.ts`, `src/util/read.ts`, `src/util/write.ts`, `src/util/fs-walk.ts`
- Create: `test/helpers.ts`
- Test: `test/util.test.ts`

**Interfaces:**
- Produces: `toPosix(p)`, `relPosix(fromAbs, toAbs)`; `sha1(text): string`; `readText(path): string`; `sortKeysDeep(v)`, `stableStringify(v): string`, `writeText(path, text)`, `writeJson(path, v)`, `writeJsonl(path, rows)`; `walkFiles(rootAbs, { include, exclude? }): string[]` (sorted, app-relative POSIX); test helpers `tmpDir()`, `writeTree(root, files)`.

- [ ] **Step 1: Write the test helpers**

`test/helpers.ts`:
```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'design-studio-'));
}

export function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
}
```

- [ ] **Step 2: Write the failing test**

`test/util.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { sha1 } from '../src/util/hash.ts';
import { readText } from '../src/util/read.ts';
import { sortKeysDeep, stableStringify } from '../src/util/write.ts';
import { walkFiles } from '../src/util/fs-walk.ts';
import { tmpDir, writeTree } from './helpers.ts';

test('sha1 matches the known digest', () => {
  assert.equal(sha1('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
});

test('stableStringify sorts keys at every depth and drops undefined', () => {
  assert.equal(
    stableStringify({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } }),
    '{\n  "a": {\n    "d": [\n      3,\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n',
  );
});

test('sortKeysDeep refuses Maps so nothing is silently lost', () => {
  assert.throws(() => sortKeysDeep({ m: new Map() }), /convert Map\/Set/);
});

test('readText strips a BOM and normalises line endings', () => {
  const f = join(tmpDir(), 'a.txt');
  writeFileSync(f, '﻿one\r\ntwo\rthree');
  assert.equal(readText(f), 'one\ntwo\nthree');
});

test('walkFiles returns sorted app-relative POSIX paths and skips dependencies', () => {
  const root = tmpDir();
  writeTree(root, { 'src/b/c.ts': '', 'src/a.tsx': '', 'src/b/c.test.ts': '', 'src/d.css': '', 'node_modules/x/y.ts': '', '.cache/z.ts': '' });
  assert.deepEqual(walkFiles(root, { include: ['src/**/*.{ts,tsx}'], exclude: ['**/*.test.*'] }), ['src/a.tsx', 'src/b/c.ts']);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `../src/util/hash.ts`.

- [ ] **Step 4: Implement the utilities**

`src/util/paths.ts`:
```ts
import { relative, sep } from 'node:path';

export function toPosix(p: string): string {
  return p.split(sep).join('/');
}

export function relPosix(fromAbs: string, toAbs: string): string {
  return toPosix(relative(fromAbs, toAbs));
}
```

`src/util/hash.ts`:
```ts
import { createHash } from 'node:crypto';

export function sha1(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}
```

`src/util/read.ts`:
```ts
import { readFileSync } from 'node:fs';

export function readText(path: string): string {
  return readFileSync(path, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}
```

`src/util/write.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value instanceof Map || value instanceof Set) throw new Error('sortKeysDeep: convert Map/Set to plain data before serialising');
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeysDeep(v);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2) + '\n';
}

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
}

export function writeJson(path: string, value: unknown): void {
  writeText(path, stableStringify(value));
}

export function writeJsonl(path: string, rows: readonly unknown[]): void {
  writeText(path, rows.map((r) => JSON.stringify(sortKeysDeep(r))).join('\n') + (rows.length ? '\n' : ''));
}
```

`src/util/fs-walk.ts`:
```ts
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import picomatch from 'picomatch';
import { relPosix } from './paths.ts';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'storybook-static']);

export interface WalkOptions { include: string[]; exclude?: string[] }

export function walkFiles(rootAbs: string, opts: WalkOptions): string[] {
  const isIncluded = picomatch(opts.include);
  const isExcluded = opts.exclude && opts.exclude.length > 0 ? picomatch(opts.exclude) : () => false;
  const out: string[] = [];
  const visit = (dirAbs: string): void => {
    for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        visit(join(dirAbs, entry.name));
      } else if (entry.isFile()) {
        const rel = relPosix(rootAbs, join(dirAbs, entry.name));
        if (isIncluded(rel) && !isExcluded(rel)) out.push(rel);
      }
    }
  };
  visit(rootAbs);
  return out.sort();
}
```

- [ ] **Step 5: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): add deterministic file and JSON utilities" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Product config, schema validation and generated schemas

**Files:**
- Create: `src/schemas/validate.ts`, `src/schemas/config.ts`, `src/schemas/index.ts`, `scripts/write-schemas.ts`, `src/config/config.ts`
- Create (generated): `plugins/design-studio/schemas/config.schema.json`
- Modify: `docs/superpowers/specs/2026-09-29-design-studio-design.md` §5.6 (add `modules`)
- Test: `test/config.test.ts`, `test/schemas.test.ts`

**Interfaces:**
- Produces: `makeValidator(schema): (data) => string[]` (cached per schema object); `configSchema`; `SCHEMAS: Record<string, object>`; `AppConfig`, `LoadedConfig`, `CONFIG_DIR = 'design-system'`, `CONFIG_FILE = 'design-studio.config.json'`, `DEFAULT_EXCLUDE`, `withDefaults(partial): AppConfig`, `validateConfig(data): string[]`, `configPathFor(appRootAbs): string`, `loadConfig(configPath): LoadedConfig`.
- `AppConfig.appRoot` is resolved relative to the folder that contains `design-system/` (i.e. `dirname(dirname(configPath))`) unless absolute.

- [ ] **Step 1: Write the failing tests**

`test/config.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { DEFAULT_EXCLUDE, configPathFor, loadConfig, validateConfig, withDefaults } from '../src/config/config.ts';
import { tmpDir, writeTree } from './helpers.ts';

const valid = {
  product: 'Example App',
  appRoot: '.',
  adapter: 'react-mui',
  sources: ['src/**/*.tsx'],
  libraryHome: 'src/components/shared',
  modules: { roots: ['src/components'], shared: ['src/components/shared'] },
};

test('a minimal config is valid', () => {
  assert.deepEqual(validateConfig(valid), []);
});

test('a missing required field is reported', () => {
  const { product: _omit, ...rest } = valid;
  assert.ok(validateConfig(rest).some((e) => e.includes('product')));
});

test('unknown fields are rejected', () => {
  assert.ok(validateConfig({ ...valid, colour: 'red' }).some((e) => /additional properties/.test(e)));
});

test('withDefaults fills optional fields', () => {
  const c = withDefaults(valid as Parameters<typeof withDefaults>[0]);
  assert.deepEqual(c.exclude, DEFAULT_EXCLUDE);
  assert.equal(c.enforcement, 'advisory');
  assert.equal(c.density.default, 'comfortable');
});

test('loadConfig resolves appRoot from the folder that contains design-system/', () => {
  const root = tmpDir();
  const app = join(root, 'app');
  writeTree(app, { 'design-system/design-studio.config.json': JSON.stringify(valid) });
  const loaded = loadConfig(configPathFor(app));
  assert.equal(loaded.appRootAbs, app);
  assert.equal(loaded.config.product, 'Example App');
});

test('loadConfig names the file when the config is invalid', () => {
  const app = tmpDir();
  writeTree(app, { 'design-system/design-studio.config.json': '{"product": ""}' });
  assert.throws(() => loadConfig(configPathFor(app)), /Invalid config .*design-studio\.config\.json/);
});
```

`test/schemas.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test` → Expected: FAIL — cannot find `../src/config/config.ts`.

- [ ] **Step 3: Implement validation, the config schema and the loader**

`src/schemas/validate.ts`:
```ts
import AjvModule from 'ajv/dist/2020.js';

type ValidateFn = ((data: unknown) => boolean) & { errors?: Array<{ instancePath: string; message?: string }> | null };
type AjvInstance = { compile: (schema: object) => ValidateFn };
type AjvCtor = new (opts: Record<string, unknown>) => AjvInstance;

const Ajv2020 = ((AjvModule as unknown as { default?: AjvCtor }).default ?? (AjvModule as unknown as AjvCtor));
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const cache = new WeakMap<object, ValidateFn>();

export function makeValidator(schema: object): (data: unknown) => string[] {
  let fn = cache.get(schema);
  if (!fn) { fn = ajv.compile(schema); cache.set(schema, fn); }
  const validate = fn;
  return (data) => (validate(data) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`));
}
```

`src/schemas/config.ts`:
```ts
const strArr = { type: 'array', items: { type: 'string' } } as const;

export const configSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/shironigun/claude-marketplace/plugins/design-studio/schemas/config.schema.json',
  title: 'design-studio product config',
  type: 'object',
  additionalProperties: false,
  required: ['product', 'appRoot', 'adapter', 'sources', 'libraryHome', 'modules'],
  properties: {
    $schema: { type: 'string' },
    product: { type: 'string', minLength: 1 },
    appRoot: { type: 'string', minLength: 1 },
    adapter: { enum: ['react-mui'] },
    sources: { type: 'array', items: { type: 'string' }, minItems: 1 },
    exclude: strArr,
    legacy: strArr,
    libraryHome: { type: 'string', minLength: 1 },
    themeEntry: { type: ['string', 'null'] },
    providersEntry: { type: ['string', 'null'] },
    locales: strArr,
    density: { type: 'object', additionalProperties: false, properties: { default: { enum: ['compact', 'comfortable'] } } },
    enforcement: { enum: ['advisory', 'ratchet'] },
    protectedPaths: strArr,
    modules: {
      type: 'object',
      additionalProperties: false,
      required: ['roots', 'shared'],
      properties: { roots: strArr, shared: strArr },
    },
    storybook: {
      type: 'object',
      additionalProperties: false,
      properties: {
        port: { type: 'integer', minimum: 1, maximum: 65535 },
        enableManifests: { type: 'boolean' },
        enableMcp: { type: 'boolean' },
      },
    },
  },
} as const;
```

`src/schemas/index.ts`:
```ts
import { configSchema } from './config.ts';

export const SCHEMAS: Record<string, object> = { config: configSchema };
```

`scripts/write-schemas.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from '../src/schemas/index.ts';
import { stableStringify } from '../src/util/write.ts';

const outDir = fileURLToPath(new URL('../../schemas/', import.meta.url));
mkdirSync(outDir, { recursive: true });
for (const [name, schema] of Object.entries(SCHEMAS)) writeFileSync(join(outDir, `${name}.schema.json`), stableStringify(schema));
console.log(`wrote ${Object.keys(SCHEMAS).length} schema(s) to ${outDir}`);
```

`src/config/config.ts`:
```ts
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { readText } from '../util/read.ts';
import { configSchema } from '../schemas/config.ts';
import { makeValidator } from '../schemas/validate.ts';

export interface AppConfig {
  product: string;
  appRoot: string;
  adapter: 'react-mui';
  sources: string[];
  exclude: string[];
  legacy: string[];
  libraryHome: string;
  themeEntry: string | null;
  providersEntry: string | null;
  locales: string[];
  density: { default: 'compact' | 'comfortable' };
  enforcement: 'advisory' | 'ratchet';
  protectedPaths: string[];
  modules: { roots: string[]; shared: string[] };
  storybook: { port: number; enableManifests: boolean; enableMcp: boolean };
}

export interface LoadedConfig { config: AppConfig; appRootAbs: string; configPath: string | null }

export const CONFIG_DIR = 'design-system';
export const CONFIG_FILE = 'design-studio.config.json';
export const DEFAULT_EXCLUDE = ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/__mocks__/**', '**/*.stories.*', '**/*.d.ts'];

type Required = Pick<AppConfig, 'product' | 'appRoot' | 'sources' | 'libraryHome' | 'modules'>;

export function withDefaults(c: Partial<AppConfig> & Required): AppConfig {
  return {
    adapter: 'react-mui',
    exclude: DEFAULT_EXCLUDE,
    legacy: [],
    themeEntry: null,
    providersEntry: null,
    locales: ['en'],
    density: { default: 'comfortable' },
    enforcement: 'advisory',
    protectedPaths: [],
    storybook: { port: 6006, enableManifests: true, enableMcp: true },
    ...c,
  };
}

const validate = makeValidator(configSchema);

export function validateConfig(data: unknown): string[] {
  return validate(data);
}

export function configPathFor(appRootAbs: string): string {
  return join(appRootAbs, CONFIG_DIR, CONFIG_FILE);
}

export function loadConfig(configPath: string): LoadedConfig {
  const abs = resolve(configPath);
  let data: unknown;
  try {
    data = JSON.parse(readText(abs));
  } catch (e) {
    throw new Error(`Cannot read config ${abs}: ${(e as Error).message}`);
  }
  const errors = validateConfig(data);
  if (errors.length) throw new Error(`Invalid config ${abs}:\n  ${errors.join('\n  ')}`);
  const config = withDefaults(data as AppConfig);
  const base = dirname(dirname(abs));
  const appRootAbs = isAbsolute(config.appRoot) ? config.appRoot : resolve(base, config.appRoot);
  return { config, appRootAbs, configPath: abs };
}
```

- [ ] **Step 4: Generate the committed schema**

Run: `npm run schemas`
Expected: `wrote 1 schema(s) to .../plugins/design-studio/schemas/` and the file `plugins/design-studio/schemas/config.schema.json` exists.

- [ ] **Step 5: Amend the spec's config section**

In `docs/superpowers/specs/2026-09-29-design-studio-design.md` §5.6, add `"modules"` to the example (after `"themeEntry"` / `"providersEntry"` lines):
```json
  "modules": { "roots": ["src/components"], "shared": ["src/components/shared"] },
```
and add this sentence after the paragraph that explains `enforcement`:
```markdown
`modules.roots` are folders whose immediate sub-folders are feature modules; `modules.shared` are
shared-component folders (the library home is normally one of them). Both drive reach, duplication
and scorecard grouping.
```

- [ ] **Step 6: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 7: Commit** (from the repo root)

```bash
git add plugins/design-studio docs/superpowers/specs/2026-09-29-design-studio-design.md
git commit -m "feat(design-studio): add product config, schema validation and generated schemas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Parser, walker, JSX helpers and static-value evaluator

**Files:**
- Create: `src/parse/parse.ts`, `src/parse/walk.ts`, `src/parse/jsx.ts`, `src/parse/literal.ts`
- Create: `test/parse-helpers.ts`
- Test: `test/parse.test.ts`

**Interfaces:**
- Produces: `type N` (loose Babel node); `parseSource(code, file): N` (TS for `.ts`, TS+JSX for `.tsx`, JSX for `.js/.jsx`, `errorRecovery`); `walk(root, visit)` where `visit(node, parents) => void | 'skip'`; `lineOf(n)`, `endLineOf(n)`, `textOf(n, src)`, `unwrap(n)` (strips TS assertions/parentheses), `containsJsx(n)`, `returnedExpr(fn)`; `jsxName(nameNode)`, `jsxAttr(opening, name)`, `jsxAttrExpr(attr)`, `jsxAttrString(opening, name)` (`'true'` for boolean attributes, `'{expr}'` for non-literal expressions, `null` if absent); `type SV`, `keyName(prop)`, `evalStatic(node, src): SV`.

- [ ] **Step 1: Write the test helpers and the failing test**

`test/parse-helpers.ts`:
```ts
import { parseSource, type N } from '../src/parse/parse.ts';

export function expr(code: string): { node: N; src: string } {
  const src = `const __value = ${code};`;
  const ast = parseSource(src, 'expr.tsx');
  return { node: ast.program.body[0].declarations[0].init, src };
}

export function file(src: string, name = 'file.tsx'): N {
  return parseSource(src, name);
}
```

`test/parse.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSource } from '../src/parse/parse.ts';
import { walk, containsJsx } from '../src/parse/walk.ts';
import { jsxName, jsxAttrString } from '../src/parse/jsx.ts';
import { evalStatic, type SV } from '../src/parse/literal.ts';
import { expr, file } from './parse-helpers.ts';

const ev = (code: string): SV => { const { node, src } = expr(code); return evalStatic(node, src); };

test('parseSource handles TSX with generics, type-only imports and JSX', () => {
  const ast = file(`import type { FC } from 'react';\nexport const B: FC<{ a: number }> = ({ a }) => <div>{a}</div>;\nfunction id<T,>(x: T): T { return x; }`);
  assert.equal(ast.program.body.length, 3);
});

test('parseSource parses .ts files without the JSX plugin', () => {
  const ast = parseSource('const x = <number>y;', 'a.ts');
  assert.equal(ast.program.body[0].declarations[0].init.type, 'TSTypeAssertion');
});

test('walk visits depth-first with parents and honours skip', () => {
  const seen: string[] = [];
  walk(file('const a = { b: { c: 1 } };'), (n, parents) => {
    if (n.type !== 'ObjectProperty') return;
    seen.push(`${n.key.name}@${parents.length}`);
    if (n.key.name === 'b') return 'skip';
  });
  assert.deepEqual(seen, ['b@5']);
});

test('containsJsx finds JSX anywhere in a subtree', () => {
  assert.equal(containsJsx(expr('() => cond ? <a /> : null').node), true);
  assert.equal(containsJsx(expr('() => 1').node), false);
});

test('jsxName and jsxAttrString read element names and attributes', () => {
  const opening = expr('<Mui.Button size="small" disabled count={2} label={"a"} />').node.openingElement;
  assert.equal(jsxName(opening.name), 'Mui.Button');
  assert.equal(jsxAttrString(opening, 'size'), 'small');
  assert.equal(jsxAttrString(opening, 'disabled'), 'true');
  assert.equal(jsxAttrString(opening, 'count'), '{expr}');
  assert.equal(jsxAttrString(opening, 'label'), 'a');
  assert.equal(jsxAttrString(opening, 'missing'), null);
});

test('evalStatic reads literals', () => {
  assert.deepEqual(ev('2'), { k: 'num', v: 2 });
  assert.deepEqual(ev('-1.5'), { k: 'num', v: -1.5 });
  assert.deepEqual(ev("'8px 16px'"), { k: 'str', v: '8px 16px' });
  assert.deepEqual(ev('`12px`'), { k: 'str', v: '12px' });
});

test('evalStatic recognises theme.spacing calls and theme references', () => {
  assert.deepEqual(ev('theme.spacing(1, 2)'), { k: 'spacing', args: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('theme.palette.primary.main'), { k: 'themeRef', path: 'theme.palette.primary.main' });
  assert.deepEqual(ev('(theme) => theme.spacing(3)'), { k: 'spacing', args: [{ k: 'num', v: 3 }] });
});

test('evalStatic expands responsive and conditional values', () => {
  assert.deepEqual(ev('{ xs: 1, md: 2 }'), { k: 'resp', items: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('[1, 2]'), { k: 'resp', items: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('open ? 1 : 2'), { k: 'cond', items: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('dense && 0.5'), { k: 'cond', items: [{ k: 'num', v: 0.5 }] });
});

test('evalStatic keeps template parts and reports unknowns', () => {
  assert.equal(ev('`${theme.spacing(2)} 4px`').k, 'tpl');
  assert.deepEqual(ev('size'), { k: 'unknown', text: 'size' });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `../src/parse/parse.ts`.

- [ ] **Step 3: Implement the parser and helpers**

`src/parse/parse.ts`:
```ts
import { parse, type ParserPlugin } from '@babel/parser';

export type N = {
  type: string;
  start?: number | null;
  end?: number | null;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  [key: string]: any;
};

export function parseSource(code: string, file: string): N {
  const ts = /\.(ts|tsx|mts|cts)$/i.test(file);
  const jsx = /\.(tsx|jsx|js|mjs|cjs)$/i.test(file);
  const plugins: ParserPlugin[] = ['decorators-legacy'];
  if (ts) plugins.push('typescript');
  if (jsx) plugins.push('jsx');
  return parse(code, { sourceType: 'module', errorRecovery: true, plugins }) as unknown as N;
}
```

`src/parse/walk.ts`:
```ts
import type { N } from './parse.ts';

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'range', 'errors']);

export type Visitor = (node: N, parents: readonly N[]) => void | 'skip';

export function walk(root: N, visit: Visitor): void {
  const parents: N[] = [];
  const go = (node: N): void => {
    if (visit(node, parents) === 'skip') return;
    parents.push(node);
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child === 'object' && typeof child.type === 'string') go(child);
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        go(value);
      }
    }
    parents.pop();
  };
  go(root);
}

export function lineOf(node: N): number {
  return node.loc?.start.line ?? 0;
}

export function endLineOf(node: N): number {
  return node.loc?.end.line ?? lineOf(node);
}

export function textOf(node: N, src: string): string {
  return src.slice(node.start ?? 0, node.end ?? 0);
}

const WRAPPED = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'ParenthesizedExpression', 'TSTypeAssertion']);

export function unwrap(node: N | null | undefined): N | null {
  let n = node ?? null;
  while (n && WRAPPED.has(n.type)) n = n.expression;
  return n;
}

export function containsJsx(node: N): boolean {
  let found = false;
  walk(node, (n) => {
    if (found) return 'skip';
    if (n.type === 'JSXElement' || n.type === 'JSXFragment') { found = true; return 'skip'; }
  });
  return found;
}

export function returnedExpr(fn: N): N | null {
  if (!fn.body) return null;
  if (fn.body.type !== 'BlockStatement') return fn.body;
  for (const s of fn.body.body) if (s.type === 'ReturnStatement') return s.argument ?? null;
  return null;
}
```

`src/parse/jsx.ts`:
```ts
import type { N } from './parse.ts';
import { unwrap } from './walk.ts';

export function jsxName(name: N): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${jsxName(name.object)}.${name.property.name}`;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return '?';
}

export function jsxAttr(opening: N, attrName: string): N | null {
  for (const a of opening.attributes ?? []) {
    if (a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === attrName) return a;
  }
  return null;
}

export function jsxAttrExpr(attr: N | null): N | null {
  const v = attr?.value;
  if (!v) return null;
  if (v.type === 'StringLiteral') return v;
  if (v.type === 'JSXExpressionContainer') return v.expression.type === 'JSXEmptyExpression' ? null : unwrap(v.expression);
  if (v.type === 'JSXElement' || v.type === 'JSXFragment') return v;
  return null;
}

export function jsxAttrString(opening: N, attrName: string): string | null {
  const attr = jsxAttr(opening, attrName);
  if (!attr) return null;
  if (attr.value === null || attr.value === undefined) return 'true';
  const v = jsxAttrExpr(attr);
  if (!v) return null;
  if (v.type === 'StringLiteral') return v.value;
  if (v.type === 'TemplateLiteral' && v.expressions.length === 0) return v.quasis[0]?.value.cooked ?? '';
  return '{expr}';
}
```

`src/parse/literal.ts`:
```ts
import type { N } from './parse.ts';
import { textOf, unwrap } from './walk.ts';

export type SV =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'spacing'; args: SV[] }
  | { k: 'themeRef'; path: string }
  | { k: 'resp'; items: SV[] }
  | { k: 'cond'; items: SV[] }
  | { k: 'tpl'; parts: SV[]; statics: string }
  | { k: 'unknown'; text: string };

const BREAKPOINTS = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const THEME_ROOT = /^(theme|t|muiTheme)\.(palette|typography|shape|shadows|zIndex|spacing|breakpoints|transitions|vars)\b/;

export function keyName(prop: N): string | null {
  if (prop.computed) return null;
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'StringLiteral') return prop.key.value;
  if (prop.key.type === 'NumericLiteral') return String(prop.key.value);
  return null;
}

export function evalStatic(input: N | null | undefined, src: string): SV {
  const node = unwrap(input);
  if (!node) return { k: 'unknown', text: '' };
  switch (node.type) {
    case 'NumericLiteral':
      return { k: 'num', v: node.value };
    case 'StringLiteral':
      return { k: 'str', v: node.value };
    case 'UnaryExpression': {
      const arg = unwrap(node.argument);
      if ((node.operator === '-' || node.operator === '+') && arg?.type === 'NumericLiteral') {
        return { k: 'num', v: node.operator === '-' ? -arg.value : arg.value };
      }
      break;
    }
    case 'TemplateLiteral': {
      if (node.expressions.length === 0) return { k: 'str', v: node.quasis[0]?.value.cooked ?? '' };
      const statics = node.quasis.map((q: N) => q.value.cooked ?? '').join(' ');
      return { k: 'tpl', parts: node.expressions.map((e: N) => evalStatic(e, src)), statics };
    }
    case 'CallExpression': {
      const callee = unwrap(node.callee);
      const isSpacing =
        (callee?.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.property.name === 'spacing') ||
        (callee?.type === 'Identifier' && callee.name === 'spacing');
      if (isSpacing) return { k: 'spacing', args: node.arguments.map((a: N) => evalStatic(a, src)) };
      break;
    }
    case 'MemberExpression':
    case 'OptionalMemberExpression': {
      const text = textOf(node, src);
      if (THEME_ROOT.test(text)) return { k: 'themeRef', path: text };
      break;
    }
    case 'ObjectExpression': {
      const props = node.properties;
      if (props.length > 0 && props.every((p: N) => p.type === 'ObjectProperty' && BREAKPOINTS.has(keyName(p) ?? ''))) {
        return { k: 'resp', items: props.map((p: N) => evalStatic(p.value, src)) };
      }
      break;
    }
    case 'ArrayExpression':
      return { k: 'resp', items: node.elements.filter((e: N | null) => e !== null).map((e: N) => evalStatic(e, src)) };
    case 'ConditionalExpression':
      return { k: 'cond', items: [evalStatic(node.consequent, src), evalStatic(node.alternate, src)] };
    case 'LogicalExpression':
      return { k: 'cond', items: node.operator === '&&' ? [evalStatic(node.right, src)] : [evalStatic(node.left, src), evalStatic(node.right, src)] };
    case 'ArrowFunctionExpression':
      if (node.body.type !== 'BlockStatement') return evalStatic(node.body, src);
      break;
  }
  return { k: 'unknown', text: textOf(node, src).slice(0, 120) };
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): add parser, walker, JSX helpers and static evaluator" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Unit-context conversion (react-mui adapter)

**Files:**
- Create: `src/adapters/react-mui/units.ts`
- Test: `test/units.test.ts`

**Interfaces:**
- Consumes: `SV` (Task 4).
- Produces: types `Ctx` (`'sx' | 'system-prop' | 'style' | 'makeStyles' | 'styled' | 'css' | 'literal' | 'unknown'`), `Kind`, `ValueClass`, `Atom { cls, px, raw, conditional, responsive }`, `Flags`, `ThemeFacts { spacingUnit, radiusUnit, source }`; `DEFAULT_THEME = { spacingUnit: 8, radiusUnit: 4, source: 'default' }`; `SPACING_PROPS`; `kindOf(prop): Kind`; `isColorLiteral(s)`; `normalizeColor(s)`; `toAtoms(ctx, prop, value: SV, theme, flags?): Atom[]` (px rounded to 3 decimals).
- Unit rules (MUI semantics): in `sx` and MUI system props, spacing numbers × `spacingUnit`, `borderRadius` numbers × `radiusUnit`, sizes `0 < n ≤ 1` are percentages, `boxShadow` numbers are `theme-ref` `shadows[n]`; in `style`, `makeStyles`, `styled` and CSS, numbers are px. `theme.spacing(n)` is always `theme`. Palette paths like `primary.main` in `sx` are `theme-ref`.

- [ ] **Step 1: Write the failing test**

`test/units.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME as T, kindOf, toAtoms, type Atom } from '../src/adapters/react-mui/units.ts';
import type { SV } from '../src/parse/literal.ts';

const num = (v: number): SV => ({ k: 'num', v });
const str = (v: string): SV => ({ k: 'str', v });
const pick = (atoms: Atom[]) => atoms.map((a) => [a.cls, a.px, a.raw]);

test('sx spacing numbers are theme units', () => {
  assert.deepEqual(pick(toAtoms('sx', 'p', num(2), T)), [['theme', 16, '2']]);
  assert.deepEqual(pick(toAtoms('sx', 'mt', num(0.6), T)), [['theme', 4.8, '0.6']]);
});

test('style, makeStyles and styled numbers are px', () => {
  for (const ctx of ['style', 'makeStyles', 'styled'] as const) assert.deepEqual(pick(toAtoms(ctx, 'padding', num(5), T)), [['px', 5, '5']]);
});

test('sx borderRadius multiplies by the theme radius unit', () => {
  assert.deepEqual(pick(toAtoms('sx', 'borderRadius', num(2), T)), [['theme', 8, '2']]);
  assert.deepEqual(pick(toAtoms('style', 'borderRadius', num(2), T)), [['px', 2, '2']]);
});

test('sx sizes at or below 1 are percentages', () => {
  assert.deepEqual(pick(toAtoms('sx', 'width', num(0.5), T)), [['pct', null, '0.5']]);
  assert.deepEqual(pick(toAtoms('sx', 'width', num(300), T)), [['px', 300, '300']]);
});

test('strings split into one atom per token', () => {
  assert.deepEqual(pick(toAtoms('sx', 'padding', str('8px 1rem'), T)), [['px', 8, '8px'], ['rem', 16, '1rem']]);
  assert.deepEqual(pick(toAtoms('sx', 'm', str('0 auto'), T)), [['zero', 0, '0'], ['keyword', null, 'auto']]);
});

test('responsive and conditional values keep their flags', () => {
  const resp = toAtoms('sx', 'mt', { k: 'resp', items: [num(1), num(2)] }, T);
  assert.deepEqual(resp.map((a) => [a.px, a.responsive]), [[8, true], [16, true]]);
  assert.equal(toAtoms('sx', 'p', { k: 'cond', items: [num(1)] }, T)[0].conditional, true);
});

test('theme.spacing calls are theme values in any context', () => {
  assert.deepEqual(pick(toAtoms('makeStyles', 'padding', { k: 'spacing', args: [num(1), num(2)] }, T)), [['theme', 8, 'spacing(1)'], ['theme', 16, 'spacing(2)']]);
});

test('template literals keep spacing parts and px statics', () => {
  assert.deepEqual(pick(toAtoms('sx', 'padding', { k: 'tpl', parts: [{ k: 'spacing', args: [num(2)] }], statics: '  4px' }, T)), [['theme', 16, 'spacing(2)'], ['px', 4, '4px']]);
});

test('colours: literals are raw, palette paths in sx are theme references', () => {
  assert.deepEqual(pick(toAtoms('sx', 'color', str('#FFF'), T)), [['raw-color', null, '#ffffff']]);
  assert.deepEqual(pick(toAtoms('sx', 'bgcolor', str('primary.main'), T)), [['theme-ref', null, 'primary.main']]);
  assert.deepEqual(pick(toAtoms('style', 'color', str('rgba(0, 0, 0, .5)'), T)), [['raw-color', null, 'rgba(0,0,0,.5)']]);
  assert.deepEqual(pick(toAtoms('sx', 'color', str('inherit'), T)), [['keyword', null, 'inherit']]);
});

test('type, shadow and calc values', () => {
  assert.deepEqual(pick(toAtoms('sx', 'fontSize', num(11.5), T)), [['px', 11.5, '11.5']]);
  assert.deepEqual(pick(toAtoms('sx', 'fontSize', str('0.75rem'), T)), [['rem', 12, '0.75rem']]);
  assert.deepEqual(pick(toAtoms('sx', 'fontWeight', str('fontWeightBold'), T)), [['theme-ref', null, 'fontWeightBold']]);
  assert.deepEqual(pick(toAtoms('sx', 'boxShadow', num(2), T)), [['theme-ref', null, 'shadows[2]']]);
  assert.deepEqual(pick(toAtoms('sx', 'boxShadow', str('0 1px  2px rgba(0,0,0,.2)'), T)), [['literal', null, '0 1px 2px rgba(0,0,0,.2)']]);
  assert.deepEqual(pick(toAtoms('sx', 'height', str('calc(100vh - 48px)'), T)), [['calc', null, 'calc(100vh - 48px)']]);
});

test('properties that are not style values produce nothing', () => {
  assert.deepEqual(toAtoms('sx', 'display', str('flex'), T), []);
});

test('kindOf classifies style properties', () => {
  assert.equal(kindOf('px'), 'spacing');
  assert.equal(kindOf('borderTopLeftRadius'), 'radius');
  assert.equal(kindOf('bgcolor'), 'color');
  assert.equal(kindOf('display'), 'other');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `units.ts`.

- [ ] **Step 3: Implement `units.ts`**

`src/adapters/react-mui/units.ts`:
```ts
import type { SV } from '../../parse/literal.ts';

export type Ctx = 'sx' | 'system-prop' | 'style' | 'makeStyles' | 'styled' | 'css' | 'literal' | 'unknown';
export type Kind = 'spacing' | 'radius' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'size' | 'position' | 'border' | 'shadow' | 'zIndex' | 'color' | 'other';
export type ValueClass = 'theme' | 'theme-ref' | 'px' | 'rem' | 'em' | 'pct' | 'viewport' | 'calc' | 'keyword' | 'var' | 'zero' | 'raw-color' | 'unitless' | 'literal' | 'unknown';
export interface Atom { cls: ValueClass; px: number | null; raw: string; conditional: boolean; responsive: boolean }
export interface Flags { conditional: boolean; responsive: boolean }
export interface ThemeFacts { spacingUnit: number; radiusUnit: number; source: 'static' | 'default' }

export const DEFAULT_THEME: ThemeFacts = { spacingUnit: 8, radiusUnit: 4, source: 'default' };

export const SPACING_PROPS = new Set([
  'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'marginX', 'marginY',
  'marginInline', 'marginInlineStart', 'marginInlineEnd', 'marginBlock', 'marginBlockStart', 'marginBlockEnd',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingX', 'paddingY',
  'paddingInline', 'paddingInlineStart', 'paddingInlineEnd', 'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd',
  'gap', 'rowGap', 'columnGap', 'gridGap', 'spacing', 'rowSpacing', 'columnSpacing',
]);
const SIZE_PROPS = new Set(['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'flexBasis']);
const POSITION_PROPS = new Set(['top', 'right', 'bottom', 'left', 'inset']);
const BORDER_PROPS = new Set(['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'outline']);
const COLOR_PROPS = new Set(['color', 'bgcolor', 'backgroundColor', 'background', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke', 'caretColor', 'textDecorationColor']);

export function kindOf(prop: string): Kind {
  if (SPACING_PROPS.has(prop)) return 'spacing';
  if (prop === 'borderRadius' || /^border(Top|Bottom)(Left|Right)Radius$/.test(prop)) return 'radius';
  if (prop === 'fontSize') return 'fontSize';
  if (prop === 'fontWeight') return 'fontWeight';
  if (prop === 'lineHeight') return 'lineHeight';
  if (prop === 'letterSpacing') return 'letterSpacing';
  if (SIZE_PROPS.has(prop)) return 'size';
  if (POSITION_PROPS.has(prop)) return 'position';
  if (BORDER_PROPS.has(prop)) return 'border';
  if (prop === 'boxShadow' || prop === 'textShadow') return 'shadow';
  if (prop === 'zIndex') return 'zIndex';
  if (COLOR_PROPS.has(prop)) return 'color';
  return 'other';
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FN = /^(?:rgba?|hsla?)\(/i;
const NAMED_COLORS = new Set(['black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'silver', 'gold', 'navy', 'teal', 'maroon', 'olive', 'lime', 'aqua', 'cyan', 'magenta', 'violet', 'indigo', 'crimson', 'coral', 'salmon', 'tomato', 'khaki', 'beige', 'ivory', 'lavender', 'turquoise', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey', 'whitesmoke', 'gainsboro', 'dimgray', 'dimgrey']);
const COLOR_KEYWORDS = new Set(['transparent', 'inherit', 'initial', 'unset', 'currentcolor', 'none']);
const KEYWORDS = new Set(['auto', 'inherit', 'initial', 'unset', 'none', 'normal', 'revert', 'fit-content', 'max-content', 'min-content']);
const NUM = /^-?(?:\d+\.?\d*|\.\d+)$/;

export function isColorLiteral(s: string): boolean {
  const t = s.trim();
  return HEX.test(t) || COLOR_FN.test(t) || NAMED_COLORS.has(t.toLowerCase());
}

export function normalizeColor(s: string): string {
  const t = s.trim().toLowerCase();
  if (HEX.test(t) && (t.length === 4 || t.length === 5)) return '#' + t.slice(1).split('').map((c) => c + c).join('');
  return t.replace(/\s+/g, '');
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

function mk(cls: ValueClass, px: number | null, raw: string, flags: Flags): Atom {
  return { cls, px: px === null ? null : r3(px), raw, conditional: flags.conditional, responsive: flags.responsive };
}

function tokenAtom(tok: string, flags: Flags): Atom {
  if (tok === '0' || tok === '0px' || tok === '-0') return mk('zero', 0, tok, flags);
  let m: RegExpMatchArray | null;
  if ((m = tok.match(/^(-?(?:\d+\.?\d*|\.\d+))px$/))) return mk('px', Number(m[1]), tok, flags);
  if ((m = tok.match(/^(-?(?:\d+\.?\d*|\.\d+))rem$/))) return mk('rem', Number(m[1]) * 16, tok, flags);
  if ((m = tok.match(/^(-?(?:\d+\.?\d*|\.\d+))em$/))) return mk('em', Number(m[1]) * 16, tok, flags);
  if (tok.endsWith('%')) return mk('pct', null, tok, flags);
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:vh|vw|dvh|svh|lvh|vmin|vmax|ch|ex)$/.test(tok)) return mk('viewport', null, tok, flags);
  if (NUM.test(tok)) return mk('unitless', null, tok, flags);
  if (KEYWORDS.has(tok.toLowerCase())) return mk('keyword', null, tok, flags);
  return mk('unknown', null, tok, flags);
}

function stringAtoms(kind: Kind, ctx: Ctx, value: string, flags: Flags): Atom[] {
  const v = value.replace(/!important/g, '').trim();
  if (v === '') return [];
  const sxLike = ctx === 'sx' || ctx === 'system-prop';
  if (/\bcalc\(/i.test(v)) return [mk('calc', null, v, flags)];
  if (/^var\(/i.test(v)) return [mk('var', null, v, flags)];
  if (kind === 'color') {
    if (isColorLiteral(v)) return [mk('raw-color', null, normalizeColor(v), flags)];
    if (COLOR_KEYWORDS.has(v.toLowerCase())) return [mk('keyword', null, v, flags)];
    if (sxLike && /^[a-zA-Z]+(\.[a-zA-Z0-9]+)+$/.test(v)) return [mk('theme-ref', null, v, flags)];
    return [mk('unknown', null, v, flags)];
  }
  if (kind === 'shadow') return [mk(v.toLowerCase() === 'none' ? 'keyword' : 'literal', null, v.replace(/\s+/g, ' '), flags)];
  if (kind === 'fontWeight') return [mk(/^fontWeight[A-Z]\w*$/.test(v) ? 'theme-ref' : 'unitless', null, v, flags)];
  if (kind === 'fontSize' && sxLike && /^(h[1-6]|subtitle[12]|body[12]|caption|button|overline)$/.test(v)) return [mk('theme-ref', null, v, flags)];
  if (kind === 'border') {
    const m = v.match(/(-?(?:\d+\.?\d*|\.\d+))px/);
    if (m) return [mk('px', Number(m[1]), v, flags)];
    return [mk(v.toLowerCase() === 'none' || v === '0' ? 'keyword' : 'unknown', null, v, flags)];
  }
  return v.split(/\s+/).map((t) => tokenAtom(t, flags));
}

function numberAtom(kind: Kind, ctx: Ctx, n: number, theme: ThemeFacts, flags: Flags): Atom {
  const raw = String(n);
  const sxLike = ctx === 'sx' || ctx === 'system-prop';
  if (n === 0 && (kind === 'spacing' || kind === 'radius' || kind === 'size' || kind === 'position')) return mk('zero', 0, raw, flags);
  switch (kind) {
    case 'spacing': return sxLike ? mk('theme', n * theme.spacingUnit, raw, flags) : mk('px', n, raw, flags);
    case 'radius': return sxLike ? mk('theme', n * theme.radiusUnit, raw, flags) : mk('px', n, raw, flags);
    case 'size': return sxLike && n > 0 && n <= 1 ? mk('pct', null, raw, flags) : mk('px', n, raw, flags);
    case 'fontSize': case 'position': case 'letterSpacing': case 'border': return mk('px', n, raw, flags);
    case 'shadow': return sxLike ? mk('theme-ref', null, `shadows[${n}]`, flags) : mk('literal', null, raw, flags);
    case 'fontWeight': case 'lineHeight': case 'zIndex': return mk('unitless', null, raw, flags);
    default: return mk('unknown', null, raw, flags);
  }
}

export function toAtoms(ctx: Ctx, prop: string, value: SV, theme: ThemeFacts, flags: Flags = { conditional: false, responsive: false }): Atom[] {
  const kind = kindOf(prop);
  if (kind === 'other') return [];
  switch (value.k) {
    case 'num':
      return [numberAtom(kind, ctx, value.v, theme, flags)];
    case 'str':
      return stringAtoms(kind, ctx, value.v, flags);
    case 'spacing':
      return value.args.flatMap((a) =>
        a.k === 'num' ? [mk('theme', a.v * theme.spacingUnit, `spacing(${a.v})`, flags)]
          : a.k === 'str' ? stringAtoms(kind, ctx, a.v, flags)
            : [mk('var', null, 'spacing(?)', flags)]);
    case 'themeRef':
      return [mk('theme-ref', null, value.path, flags)];
    case 'resp':
      return value.items.flatMap((i) => toAtoms(ctx, prop, i, theme, { ...flags, responsive: true }));
    case 'cond':
      return value.items.flatMap((i) => toAtoms(ctx, prop, i, theme, { ...flags, conditional: true }));
    case 'tpl': {
      if (/\bcalc\(/i.test(value.statics)) return [mk('calc', null, value.statics.trim(), flags)];
      const fromParts = value.parts.flatMap((p) => (p.k === 'spacing' || p.k === 'themeRef' ? toAtoms(ctx, prop, p, theme, flags) : []));
      const pxs = [...value.statics.matchAll(/(-?(?:\d+\.?\d*|\.\d+))px/g)].map((m) => mk('px', Number(m[1]), m[0], flags));
      const atoms = [...fromParts, ...pxs];
      return atoms.length ? atoms : [mk('var', null, value.statics.trim() || '${…}', flags)];
    }
    case 'unknown':
      return [mk('var', null, value.text, flags)];
  }
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): add MUI unit-context conversion" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Imports and JSX style extraction

**Files:**
- Create: `src/parse/imports.ts`, `src/adapters/react-mui/collector.ts`, `src/adapters/react-mui/extract.ts`
- Test: `test/imports.test.ts`, `test/extract-jsx.test.ts`

**Interfaces:**
- Consumes: Task 4 helpers, Task 5 `toAtoms`/`kindOf`.
- Produces: `ImportBinding { local, imported ('default' | '*' | name), source, typeOnly, line }`, `readImports(ast)`, `libraryOf(source): string | null` (`'mui' | 'icon' | 'router' | <package>`; `null` for relative paths), `muiPrimitiveName(element, importMap): string | null`; `Sample`, `StyleBlock { hash, line, props }`, `StyleRefs { sx: Set<string>; style: Set<string> }`, `Collector` (with `samples`, `blocks`, `consumed`, `pushValue`, `collectObject`, `collectSx`, `pushCss`, `pushColor`), `createCollector(src, file, theme)`; `PrimitiveUse { name, props }`, `FileExtract { samples, primitives, blocks }`, `refsOf(expr)`, `collectJsx(ast, collector, imports)`, `extractStyles(ast, src, file, imports, theme): FileExtract`.

- [ ] **Step 1: Write the failing tests**

`test/imports.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libraryOf, muiPrimitiveName, readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';

test('readImports records default, named, namespace and type-only bindings', () => {
  const ast = file(`import React from 'react';\nimport { Box, type SxProps } from '@mui/material';\nimport * as Icons from '@mui/icons-material';\nimport type { Lead } from '../models/lead';`);
  assert.deepEqual(readImports(ast).map((b) => [b.local, b.imported, b.source, b.typeOnly]), [
    ['React', 'default', 'react', false],
    ['Box', 'Box', '@mui/material', false],
    ['SxProps', 'SxProps', '@mui/material', true],
    ['Icons', '*', '@mui/icons-material', false],
    ['Lead', 'Lead', '../models/lead', true],
  ]);
});

test('libraryOf groups packages', () => {
  assert.equal(libraryOf('@mui/material/Button'), 'mui');
  assert.equal(libraryOf('@mui/x-date-pickers/DatePicker'), 'mui');
  assert.equal(libraryOf('@mui/icons-material/Close'), 'icon');
  assert.equal(libraryOf('react-router-dom'), 'router');
  assert.equal(libraryOf('./local'), null);
  assert.equal(libraryOf('@tanstack/react-query'), '@tanstack/react-query');
});

test('muiPrimitiveName resolves named and default imports', () => {
  const m = new Map(readImports(file(`import Chip from '@mui/material/Chip';\nimport { Button as B } from '@mui/material';\nimport { Foo } from './foo';`)).map((b) => [b.local, b]));
  assert.equal(muiPrimitiveName('Chip', m), 'Chip');
  assert.equal(muiPrimitiveName('B', m), 'Button');
  assert.equal(muiPrimitiveName('Foo', m), null);
  assert.equal(muiPrimitiveName('div', m), null);
});
```

`test/extract-jsx.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractStyles } from '../src/adapters/react-mui/extract.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import { readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';

function run(src: string) {
  const ast = file(src);
  return extractStyles(ast, src, 'src/x.tsx', readImports(ast), DEFAULT_THEME);
}
const rows = (r: ReturnType<typeof run>) => r.samples.map((s) => `${s.ctx}:${s.property}=${s.px ?? s.raw}:${s.cls}`);

test('inline sx objects become samples with px values', () => {
  const r = run(`import { Box } from '@mui/material';\nexport const A = () => <Box sx={{ p: 2, mt: 0.5, color: '#FFF', '&:hover': { bgcolor: 'primary.main' } }} />;`);
  assert.deepEqual(rows(r), ['sx:p=16:theme', 'sx:mt=4:theme', 'sx:color=#ffffff:raw-color', 'sx:bgcolor=primary.main:theme-ref']);
  assert.equal(r.samples[3].selector, true);
});

test('sx arrays, conditionals and theme callbacks are followed', () => {
  const r = run(`export const A = ({ on }) => <div><span sx={[{ p: 1 }, on && { m: 2 }]} /><span sx={(t) => ({ gap: t.spacing(1) })} /></div>;`);
  assert.deepEqual(rows(r), ['sx:p=8:theme', 'sx:m=16:theme', 'sx:gap=8:theme']);
  assert.equal(r.samples[1].conditional, true);
});

test('style attributes use px semantics', () => {
  assert.deepEqual(rows(run(`export const A = () => <div style={{ padding: 5, margin: '4px 8px' }} />;`)), ['style:padding=5:px', 'style:margin=4:px', 'style:margin=8:px']);
});

test('system props on MUI layout hosts are sampled; on other components they are not', () => {
  const r = run(`import { Stack, Typography } from '@mui/material';\nimport { Card } from './card';\nexport const A = () => <Stack spacing={2} p={1}><Typography fontSize={12} color="text.secondary" /><Card p={3} /></Stack>;`);
  assert.deepEqual(rows(r), ['system-prop:spacing=16:theme', 'system-prop:p=8:theme', 'system-prop:fontSize=12:px', 'system-prop:color=text.secondary:theme-ref']);
});

test('sx and style inside *Props objects are followed', () => {
  assert.deepEqual(rows(run(`import { Drawer } from '@mui/material';\nexport const A = () => <Drawer PaperProps={{ sx: { width: 420 } }} slotProps={{ paper: { style: { padding: 8 } } }} />;`)), ['sx:width=420:px', 'style:padding=8:px']);
});

test('MUI primitives are counted with their variant, size and color', () => {
  const r = run(`import { Button, Chip } from '@mui/material';\nexport const A = () => <><Button variant="contained" size="small">Go</Button><Chip color="success" /></>;`);
  assert.deepEqual(r.primitives, [{ name: 'Button', props: { variant: 'contained', size: 'small' } }, { name: 'Chip', props: { color: 'success' } }]);
});

test('objects with three or more style props are recorded as blocks', () => {
  const r = run(`export const A = () => <div sx={{ p: 1, m: 1, gap: 1 }} />;`);
  assert.equal(r.blocks.length, 1);
  assert.equal(r.blocks[0].props, 3);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test` → Expected: FAIL — cannot find `../src/parse/imports.ts`.

- [ ] **Step 3: Implement imports, the collector and the JSX pass**

`src/parse/imports.ts`:
```ts
import type { N } from './parse.ts';
import { lineOf } from './walk.ts';

export interface ImportBinding { local: string; imported: string; source: string; typeOnly: boolean; line: number }

export function readImports(ast: N): ImportBinding[] {
  const out: ImportBinding[] = [];
  for (const stmt of ast.program.body) {
    if (stmt.type !== 'ImportDeclaration') continue;
    const source: string = stmt.source.value;
    const declType = stmt.importKind === 'type' || stmt.importKind === 'typeof';
    for (const s of stmt.specifiers) {
      const typeOnly = declType || s.importKind === 'type' || s.importKind === 'typeof';
      if (s.type === 'ImportDefaultSpecifier') out.push({ local: s.local.name, imported: 'default', source, typeOnly, line: lineOf(s) });
      else if (s.type === 'ImportNamespaceSpecifier') out.push({ local: s.local.name, imported: '*', source, typeOnly, line: lineOf(s) });
      else if (s.type === 'ImportSpecifier') out.push({ local: s.local.name, imported: s.imported.type === 'Identifier' ? s.imported.name : s.imported.value, source, typeOnly, line: lineOf(s) });
    }
  }
  return out;
}

export function libraryOf(source: string): string | null {
  if (source.startsWith('.') || source.startsWith('/')) return null;
  if (source.startsWith('@mui/icons-material')) return 'icon';
  if (/^@mui\/(material|system|lab|joy|x-[\w-]+)(\/|$)/.test(source)) return 'mui';
  if (source === 'react-router-dom' || source === 'react-router') return 'router';
  return source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0];
}

export function muiPrimitiveName(element: string, imports: ReadonlyMap<string, ImportBinding>): string | null {
  const [base, member] = element.split('.');
  const b = imports.get(base);
  if (!b || libraryOf(b.source) !== 'mui') return null;
  if (member) return member;
  if (b.imported === '*') return null;
  if (b.imported === 'default') return b.source.split('/').pop() ?? b.local;
  return b.imported;
}
```

`src/adapters/react-mui/collector.ts`:
```ts
import type { N } from '../../parse/parse.ts';
import { walk, lineOf, textOf, unwrap, returnedExpr } from '../../parse/walk.ts';
import { evalStatic, keyName } from '../../parse/literal.ts';
import { sha1 } from '../../util/hash.ts';
import { kindOf, toAtoms, type Ctx, type Kind, type ThemeFacts, type ValueClass } from './units.ts';

export interface Sample {
  file: string;
  line: number;
  ctx: Ctx;
  kind: Kind;
  property: string;
  raw: string;
  cls: ValueClass;
  px: number | null;
  element: string | null;
  conditional: boolean;
  responsive: boolean;
  selector: boolean;
}
export interface StyleBlock { hash: string; line: number; props: number }
export interface StyleRefs { sx: Set<string>; style: Set<string> }

export interface Collector {
  readonly samples: Sample[];
  readonly blocks: StyleBlock[];
  readonly consumed: Set<number>;
  pushValue(ctx: Ctx, prop: string, valueNode: N, element: string | null, selector: boolean, conditional: boolean): void;
  collectObject(obj: N, ctx: Ctx, element: string | null, selector?: boolean, conditional?: boolean): void;
  collectSx(expr: N | null, ctx: Ctx, element: string | null, conditional?: boolean): void;
  pushCss(prop: string, value: string, line: number, element: string | null): void;
  pushColor(raw: string, line: number, property: string): void;
}

export function createCollector(src: string, file: string, theme: ThemeFacts): Collector {
  const samples: Sample[] = [];
  const blocks: StyleBlock[] = [];
  const consumed = new Set<number>();

  const pushValue = (ctx: Ctx, prop: string, valueNode: N, element: string | null, selector: boolean, conditional: boolean): void => {
    const atoms = toAtoms(ctx, prop, evalStatic(valueNode, src), theme, { conditional, responsive: false });
    walk(valueNode, (n) => { if (n.type === 'StringLiteral') consumed.add(n.start ?? -1); });
    for (const a of atoms) {
      samples.push({ file, line: lineOf(valueNode), ctx, kind: kindOf(prop), property: prop, raw: a.raw, cls: a.cls, px: a.px, element, conditional: a.conditional, responsive: a.responsive, selector });
    }
  };

  const visitObject = (obj: N, ctx: Ctx, element: string | null, selector: boolean, conditional: boolean, top: boolean): void => {
    let styleProps = 0;
    for (const p of obj.properties) {
      if (p.type !== 'ObjectProperty') continue;
      const value = unwrap(p.value);
      if (!value) continue;
      const key = keyName(p);
      if (key === null || kindOf(key) === 'other') {
        if (value.type === 'ObjectExpression') visitObject(value, ctx, element, true, conditional, false);
        continue;
      }
      styleProps++;
      pushValue(ctx, key, value, element, selector, conditional);
    }
    if (top && styleProps >= 3) blocks.push({ hash: sha1(textOf(obj, src).replace(/\s+/g, '')).slice(0, 12), line: lineOf(obj), props: styleProps });
  };

  const collectObject = (obj: N, ctx: Ctx, element: string | null, selector = false, conditional = false): void => {
    visitObject(obj, ctx, element, selector, conditional, true);
  };

  const collectSx = (expr: N | null, ctx: Ctx, element: string | null, conditional = false): void => {
    const n = unwrap(expr);
    if (!n) return;
    if (n.type === 'ObjectExpression') { collectObject(n, ctx, element, false, conditional); return; }
    if (n.type === 'ArrayExpression') { for (const el of n.elements) if (el) collectSx(el, ctx, element, conditional); return; }
    if (n.type === 'LogicalExpression') { collectSx(n.right, ctx, element, true); return; }
    if (n.type === 'ConditionalExpression') { collectSx(n.consequent, ctx, element, true); collectSx(n.alternate, ctx, element, true); return; }
    if (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') collectSx(returnedExpr(n), ctx, element, conditional);
  };

  const pushCss = (prop: string, value: string, line: number, element: string | null): void => {
    for (const a of toAtoms('css', prop, { k: 'str', v: value }, theme)) {
      samples.push({ file, line, ctx: 'css', kind: kindOf(prop), property: prop, raw: a.raw, cls: a.cls, px: a.px, element, conditional: false, responsive: false, selector: false });
    }
  };

  const pushColor = (raw: string, line: number, property: string): void => {
    samples.push({ file, line, ctx: 'literal', kind: 'color', property, raw, cls: 'raw-color', px: null, element: null, conditional: false, responsive: false, selector: false });
  };

  return { samples, blocks, consumed, pushValue, collectObject, collectSx, pushCss, pushColor };
}
```

`src/adapters/react-mui/extract.ts`:
```ts
import type { N } from '../../parse/parse.ts';
import { walk, unwrap } from '../../parse/walk.ts';
import { jsxName, jsxAttrExpr, jsxAttrString } from '../../parse/jsx.ts';
import { keyName } from '../../parse/literal.ts';
import { muiPrimitiveName, type ImportBinding } from '../../parse/imports.ts';
import { kindOf, type ThemeFacts } from './units.ts';
import { createCollector, type Collector, type Sample, type StyleBlock, type StyleRefs } from './collector.ts';

export interface PrimitiveUse { name: string; props: Record<string, string> }
export interface FileExtract { samples: Sample[]; primitives: PrimitiveUse[]; blocks: StyleBlock[] }

const SYSTEM_PROP_HOSTS = new Set(['Box', 'Stack', 'Grid', 'Grid2', 'Typography', 'Container', 'Link']);
const CENSUS_PROPS = ['variant', 'size', 'color', 'orientation', 'elevation', 'fontSize'];

export function refsOf(expr: N | null): string[] {
  const n = unwrap(expr);
  if (!n) return [];
  if (n.type === 'Identifier') return [n.name];
  if (n.type === 'MemberExpression') {
    let o: N | null = n;
    while (o && o.type === 'MemberExpression') o = unwrap(o.object);
    return o?.type === 'Identifier' ? [o.name] : [];
  }
  if (n.type === 'ArrayExpression') return n.elements.flatMap((e: N | null) => refsOf(e));
  if (n.type === 'ObjectExpression') return n.properties.filter((p: N) => p.type === 'SpreadElement').flatMap((p: N) => refsOf(p.argument));
  if (n.type === 'LogicalExpression') return refsOf(n.right);
  if (n.type === 'ConditionalExpression') return [...refsOf(n.consequent), ...refsOf(n.alternate)];
  return [];
}

function collectNested(c: Collector, obj: N, element: string, depth: number): void {
  for (const p of obj.properties) {
    if (p.type !== 'ObjectProperty') continue;
    const key = keyName(p);
    const value = unwrap(p.value);
    if (key === 'sx') c.collectSx(value, 'sx', element);
    else if (key === 'style') c.collectSx(value, 'style', element);
    else if (value?.type === 'ObjectExpression' && depth < 2) collectNested(c, value, element, depth + 1);
  }
}

export function collectJsx(ast: N, c: Collector, imports: ImportBinding[]): { primitives: PrimitiveUse[]; refs: StyleRefs } {
  const importMap = new Map(imports.map((b) => [b.local, b]));
  const primitives: PrimitiveUse[] = [];
  const refs: StyleRefs = { sx: new Set(), style: new Set() };
  walk(ast, (n) => {
    if (n.type !== 'JSXOpeningElement') return;
    const element = jsxName(n.name);
    const mui = muiPrimitiveName(element, importMap);
    for (const attr of n.attributes) {
      if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
      const name: string = attr.name.name;
      const expr = jsxAttrExpr(attr);
      if (name === 'sx') { c.collectSx(expr, 'sx', element); for (const r of refsOf(expr)) refs.sx.add(r); }
      else if (name === 'style') { c.collectSx(expr, 'style', element); for (const r of refsOf(expr)) refs.style.add(r); }
      else if (name.endsWith('Props') && expr?.type === 'ObjectExpression') collectNested(c, expr, `${element}.${name}`, 0);
      else if (mui && SYSTEM_PROP_HOSTS.has(mui) && expr && kindOf(name) !== 'other') c.pushValue('system-prop', name, expr, element, false, false);
    }
    if (mui) {
      const props: Record<string, string> = {};
      for (const p of CENSUS_PROPS) { const v = jsxAttrString(n, p); if (v !== null) props[p] = v; }
      primitives.push({ name: mui, props });
    }
  });
  return { primitives, refs };
}

export function extractStyles(ast: N, src: string, file: string, imports: ImportBinding[], theme: ThemeFacts): FileExtract {
  const c = createCollector(src, file, theme);
  const { primitives } = collectJsx(ast, c, imports);
  return { samples: c.samples, primitives, blocks: c.blocks };
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): extract sx, style and system-prop values from JSX" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: makeStyles, styled, style constants, colour literals and CSS files

**Files:**
- Create: `src/parse/css.ts`, `src/adapters/react-mui/extract-nonjsx.ts`
- Modify: `src/adapters/react-mui/extract.ts` (the `extractStyles` function)
- Test: `test/extract-nonjsx.test.ts`

**Interfaces:**
- Consumes: `Collector`, `StyleRefs` (Task 6).
- Produces: `CssDecl { property, value, line }`, `parseCssDeclarations(text)`, `kebabToCamel(prop)`; `collectMakeStyles(ast, c)`, `collectStyled(ast, c, src)`, `collectConstObjects(ast, c, src, refs)`, `collectColorLiterals(ast, c)`, `extractCssFile(src, file, theme): Sample[]`. After this task `extractStyles` runs all passes in the order: JSX → makeStyles → styled → constants → colour literals.

- [ ] **Step 1: Write the failing test**

`test/extract-nonjsx.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractStyles } from '../src/adapters/react-mui/extract.ts';
import { extractCssFile } from '../src/adapters/react-mui/extract-nonjsx.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import { parseCssDeclarations } from '../src/parse/css.ts';
import { readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';

function run(src: string) {
  const ast = file(src);
  return extractStyles(ast, src, 'src/x.tsx', readImports(ast), DEFAULT_THEME);
}
const rows = (r: ReturnType<typeof run>) => r.samples.map((s) => `${s.ctx}:${s.property}=${s.px ?? s.raw}:${s.cls}`);

test('tss-react makeStyles classes use px semantics with theme.spacing as theme', () => {
  const r = run(`import { makeStyles } from 'tss-react/mui';\nconst useStyles = makeStyles()((theme) => ({ header: { marginTop: 12, padding: theme.spacing(2), borderRadius: 6 } }));`);
  assert.deepEqual(rows(r), ['makeStyles:marginTop=12:px', 'makeStyles:padding=16:theme', 'makeStyles:borderRadius=6:px']);
  assert.equal(r.samples[0].element, '.header');
});

test('styled() objects and styled tagged templates are sampled', () => {
  const r = run("import { styled } from '@mui/material/styles';\nimport Button from '@mui/material/Button';\nconst A = styled(Button)(({ theme }) => ({ padding: 6, color: '#333' }));\nconst B = styled.div`\n  margin: 10px;\n  font-size: 13px;\n`;");
  assert.deepEqual(rows(r), ['styled:padding=6:px', 'styled:color=#333333:raw-color', 'css:margin=10:px', 'css:fontSize=13:px']);
  assert.equal(r.samples[2].line, 5);
});

test('module-level style constants take their context from their type or their use', () => {
  const r = run(`import type { SxProps } from '@mui/material';\nconst HEAD: SxProps = { fontWeight: 600, py: 1 };\nconst ROW = { px: 2 };\nconst INLINE = { padding: 3 };\nconst UNUSED = { padding: 9 };\nexport const A = () => <div><span sx={ROW} /><span style={INLINE} /></div>;`);
  assert.deepEqual(rows(r), ['sx:fontWeight=600:unitless', 'sx:py=8:theme', 'sx:px=16:theme', 'style:padding=3:px']);
});

test('stray colour literals are kept with their property name', () => {
  const r = run(`const STATUS = { won: '#4CAF50', lost: 'rgb(244, 67, 54)' };\nexport const A = () => <i data-c="#000" sx={{ color: '#111' }} />;`);
  assert.deepEqual(r.samples.filter((s) => s.ctx === 'literal').map((s) => [s.property, s.raw]), [['won', '#4caf50'], ['lost', 'rgb(244,67,54)'], ['data-c', '#000000']]);
});

test('CSS files are parsed declaration by declaration', () => {
  const samples = extractCssFile('.page {\n  padding: 10px;\n  color: #333333;\n}\na:hover { margin: 0 }', 'src/a.css', DEFAULT_THEME);
  assert.deepEqual(samples.map((s) => [s.property, s.px ?? s.raw, s.line]), [['padding', 10, 2], ['color', '#333333', 3], ['margin', 0, 5]]);
});

test('parseCssDeclarations ignores selectors and comments', () => {
  assert.deepEqual(parseCssDeclarations('/* a: b; */ a:hover { font-size: 12px; }'), [{ property: 'fontSize', value: '12px', line: 1 }]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `extract-nonjsx.ts`.

- [ ] **Step 3: Implement CSS parsing and the non-JSX passes**

`src/parse/css.ts`:
```ts
export interface CssDecl { property: string; value: string; line: number }

export function kebabToCamel(prop: string): string {
  return prop.replace(/^-+/, '').replace(/-([a-z])/g, (_m: string, ch: string) => ch.toUpperCase());
}

export function parseCssDeclarations(text: string): CssDecl[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const out: CssDecl[] = [];
  const re = /([a-zA-Z-]+)\s*:\s*([^;{}]+?)\s*(?=[;}])/g;
  let line = 1;
  let last = 0;
  for (const m of clean.matchAll(re)) {
    const idx = m.index ?? 0;
    for (let i = last; i < idx; i++) if (clean.charCodeAt(i) === 10) line++;
    last = idx;
    out.push({ property: kebabToCamel(m[1]), value: m[2].trim(), line });
  }
  return out;
}
```

`src/adapters/react-mui/extract-nonjsx.ts`:
```ts
import type { N } from '../../parse/parse.ts';
import { walk, lineOf, textOf, unwrap, returnedExpr } from '../../parse/walk.ts';
import { keyName } from '../../parse/literal.ts';
import { parseCssDeclarations } from '../../parse/css.ts';
import { kindOf, normalizeColor, type Ctx, type ThemeFacts } from './units.ts';
import { createCollector, type Collector, type Sample, type StyleRefs } from './collector.ts';

function calleeName(call: N): string | null {
  const c = unwrap(call.callee);
  if (c?.type === 'Identifier') return c.name;
  if (c?.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') return c.property.name;
  return null;
}

function styleRoot(arg: N | null | undefined): N | null {
  const a = unwrap(arg);
  if (!a) return null;
  if (a.type === 'ObjectExpression') return a;
  if (a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression') {
    const r = unwrap(returnedExpr(a));
    return r?.type === 'ObjectExpression' ? r : null;
  }
  return null;
}

function targetName(arg: N | null | undefined, src: string): string {
  const a = unwrap(arg);
  if (!a) return '?';
  if (a.type === 'Identifier') return a.name;
  if (a.type === 'StringLiteral') return a.value;
  return textOf(a, src).slice(0, 40);
}

function isStyledRef(n: N | null | undefined): boolean {
  const c = unwrap(n);
  if (!c) return false;
  if (c.type === 'Identifier') return c.name === 'styled';
  return c.type === 'MemberExpression' && unwrap(c.object)?.type === 'Identifier' && unwrap(c.object)?.name === 'styled';
}

export function collectMakeStyles(ast: N, c: Collector): void {
  walk(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const callee = unwrap(n.callee);
    const inner = callee?.type === 'CallExpression' && calleeName(callee) === 'makeStyles';
    const name = calleeName(n);
    const direct = name === 'makeStyles' || name === 'createStyles' || name === 'withStyles';
    if (!inner && !direct) return;
    const root = styleRoot(n.arguments[0]);
    if (!root) return;
    for (const cls of root.properties) {
      if (cls.type !== 'ObjectProperty') continue;
      const value = unwrap(cls.value);
      if (value?.type === 'ObjectExpression') c.collectObject(value, 'makeStyles', `.${keyName(cls) ?? '?'}`);
    }
  });
}

export function collectStyled(ast: N, c: Collector, src: string): void {
  walk(ast, (n) => {
    if (n.type === 'CallExpression') {
      const callee = unwrap(n.callee);
      if (callee?.type === 'CallExpression' && unwrap(callee.callee)?.type === 'Identifier' && isStyledRef(callee.callee)) {
        const root = styleRoot(n.arguments[0]);
        if (root) c.collectObject(root, 'styled', targetName(callee.arguments[0], src));
        return;
      }
      if (callee?.type === 'MemberExpression' && isStyledRef(callee)) {
        const root = styleRoot(n.arguments[0]);
        if (root) c.collectObject(root, 'styled', callee.property.name ?? '?');
      }
      return;
    }
    if (n.type === 'TaggedTemplateExpression') {
      const tag = unwrap(n.tag);
      const styledTag =
        (tag?.type === 'CallExpression' && isStyledRef(tag.callee)) ||
        (tag?.type === 'MemberExpression' && isStyledRef(tag)) ||
        (tag?.type === 'Identifier' && (tag.name === 'css' || tag.name === 'keyframes'));
      if (!styledTag) return;
      const text = n.quasi.quasis.map((q: N) => q.value.cooked ?? '').join(' var(--expr) ');
      const element = tag?.type === 'CallExpression' ? targetName(tag.arguments[0], src) : tag?.type === 'MemberExpression' ? tag.property.name : 'css';
      for (const d of parseCssDeclarations(text)) c.pushCss(d.property, d.value, lineOf(n) + d.line - 1, element);
    }
  });
}

export function collectConstObjects(ast: N, c: Collector, src: string, refs: StyleRefs): void {
  for (const stmt0 of ast.program.body) {
    const stmt = stmt0.type === 'ExportNamedDeclaration' ? stmt0.declaration : stmt0;
    if (!stmt || stmt.type !== 'VariableDeclaration') continue;
    for (const d of stmt.declarations) {
      if (d.id.type !== 'Identifier') continue;
      const name: string = d.id.name;
      const rawInit = d.init;
      const typeNodes = [d.id.typeAnnotation, rawInit?.type === 'TSAsExpression' || rawInit?.type === 'TSSatisfiesExpression' ? rawInit.typeAnnotation : null];
      const typeText = typeNodes.filter((t): t is N => !!t).map((t) => textOf(t, src)).join(' ');
      const init = unwrap(rawInit);
      const obj = init?.type === 'ObjectExpression' ? init : init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') ? unwrap(returnedExpr(init)) : null;
      if (!obj || obj.type !== 'ObjectExpression') continue;
      const ctx: Ctx | null = /SxProps|SystemStyleObject/.test(typeText) ? 'sx' : /CSSProperties/.test(typeText) ? 'style' : refs.sx.has(name) ? 'sx' : refs.style.has(name) ? 'style' : null;
      if (!ctx) continue;
      const direct = obj.properties.some((p: N) => p.type === 'ObjectProperty' && kindOf(keyName(p) ?? '') !== 'other');
      if (direct) { c.collectObject(obj, ctx, name); continue; }
      for (const p of obj.properties) {
        const v = p.type === 'ObjectProperty' ? unwrap(p.value) : null;
        if (v?.type === 'ObjectExpression') c.collectObject(v, ctx, `${name}.${keyName(p) ?? '?'}`);
      }
    }
  }
}

const HEX_OR_FN = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?)\(.*\))$/i;

export function collectColorLiterals(ast: N, c: Collector): void {
  walk(ast, (n, parents) => {
    if (n.type !== 'StringLiteral' || c.consumed.has(n.start ?? -1)) return;
    const value = String(n.value).trim();
    if (!HEX_OR_FN.test(value)) return;
    const parent = parents[parents.length - 1];
    if (!parent || parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration') return;
    const property = parent.type === 'ObjectProperty' ? (keyName(parent) ?? '(value)') : parent.type === 'JSXAttribute' ? String(parent.name.name) : '(value)';
    c.pushColor(normalizeColor(value), lineOf(n), property);
  });
}

export function extractCssFile(src: string, file: string, theme: ThemeFacts): Sample[] {
  const c = createCollector(src, file, theme);
  for (const d of parseCssDeclarations(src)) c.pushCss(d.property, d.value, d.line, null);
  return c.samples;
}
```

- [ ] **Step 4: Wire the passes into `extractStyles`**

In `src/adapters/react-mui/extract.ts`, add this import below the existing imports:
```ts
import { collectColorLiterals, collectConstObjects, collectMakeStyles, collectStyled } from './extract-nonjsx.ts';
```
and replace the whole `extractStyles` function with:
```ts
export function extractStyles(ast: N, src: string, file: string, imports: ImportBinding[], theme: ThemeFacts): FileExtract {
  const c = createCollector(src, file, theme);
  const { primitives, refs } = collectJsx(ast, c, imports);
  collectMakeStyles(ast, c);
  collectStyled(ast, c, src);
  collectConstObjects(ast, c, src, refs);
  collectColorLiterals(ast, c);
  return { samples: c.samples, primitives, blocks: c.blocks };
}
```

- [ ] **Step 5: Run tests and type-check**

Run: `npm test` → Expected: all PASS (including the Task 6 tests). Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 6: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): extract makeStyles, styled, constants, colour literals and CSS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Static theme facts, stack detection and the `detect` command

**Files:**
- Create: `src/adapters/react-mui/theme-static.ts`, `src/detect/detect.ts`, `src/commands/detect.ts`
- Modify: `src/commands.ts`
- Test: `test/detect.test.ts`

**Interfaces:**
- Consumes: `parseSource`, `walk`, `keyName`, `unwrap`, `walkFiles`, `readText`, `withDefaults`, `DEFAULT_EXCLUDE`, `stableStringify`, `DEFAULT_THEME`.
- Produces: `readThemeFacts(appRootAbs, themeEntry | null): ThemeFacts` (reads the first numeric `spacing` and `shape.borderRadius` in the entry file; `source: 'default'` when neither is found); `StackInfo`, `detectStack(appRootAbs)`, `proposeConfig(stack, appRootAbs): AppConfig`; `detectCommand` registered as `detect`.

- [ ] **Step 1: Write the failing test**

`test/detect.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readThemeFacts } from '../src/adapters/react-mui/theme-static.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import { detectStack, proposeConfig } from '../src/detect/detect.ts';
import { main } from '../src/cli.ts';
import { tmpDir, writeTree } from './helpers.ts';

test('readThemeFacts reads spacing and shape.borderRadius from the theme entry', () => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': `import { createTheme } from '@mui/material/styles';\nexport default createTheme({ spacing: 4, shape: { borderRadius: 8 }, components: { MuiButton: { styleOverrides: { root: { borderRadius: 20 } } } } });` });
  assert.deepEqual(readThemeFacts(root, 'src/theme/index.ts'), { spacingUnit: 4, radiusUnit: 8, source: 'static' });
});

test('readThemeFacts falls back to MUI defaults', () => {
  const root = tmpDir();
  writeTree(root, { 'src/theme/index.ts': `export const theme = createTheme({ palette: { primary: { main: '#123456' } } });` });
  assert.deepEqual(readThemeFacts(root, 'src/theme/index.ts'), DEFAULT_THEME);
  assert.deepEqual(readThemeFacts(root, null), DEFAULT_THEME);
  assert.deepEqual(readThemeFacts(root, 'src/missing.ts'), DEFAULT_THEME);
});

function sampleApp(): string {
  const root = tmpDir();
  writeTree(root, {
    'package.json': JSON.stringify({ name: 'sample-app', dependencies: { react: '^19.2.0', '@mui/material': '^7.3.0', 'react-router-dom': '^7.0.0' }, devDependencies: { vitest: '^3.2.0' } }),
    'tsconfig.json': '{}',
    'src/theme/index.ts': `export const theme = createTheme({});`,
    'src/app.tsx': `export const App = () => <ThemeProvider theme={theme}><div /></ThemeProvider>;`,
    'src/components/leads/A.tsx': `export const A = () => <div sx={{ p: 1 }} style={{ margin: 2 }} />;`,
    'src/common/components/B.tsx': `const useStyles = makeStyles()(() => ({}));`,
    'src/routes/index.tsx': `export const R = 1;`,
    'src/x.css': `.a { padding: 1px; }`,
  });
  return root;
}

test('detectStack reads packages, styling mechanisms, entries and folders', () => {
  const root = sampleApp();
  const s = detectStack(root);
  assert.equal(s.packageName, 'sample-app');
  assert.equal(s.mui, '@mui/material@^7.3.0');
  assert.equal(s.router, 'react-router-dom@^7.0.0');
  assert.equal(s.testRunner, 'vitest@^3.2.0');
  assert.equal(s.typescript, true);
  assert.deepEqual(s.styling, { sx: 1, styled: 0, makeStyles: 1, styleProp: 1, cssFiles: 1 });
  assert.equal(s.themeEntry, 'src/theme/index.ts');
  assert.equal(s.providersEntry, 'src/app.tsx');
  assert.deepEqual(s.moduleRoots, ['src/components']);
  assert.deepEqual(s.sharedRoots, ['src/common/components']);
  const cfg = proposeConfig(s, root);
  assert.equal(cfg.libraryHome, 'src/common/components');
  assert.deepEqual(cfg.modules, { roots: ['src/components'], shared: ['src/common/components'] });
  assert.deepEqual(cfg.protectedPaths, ['src/routes/**']);
});

test('the detect command prints the stack and a proposed config as JSON', async () => {
  const out: string[] = [];
  const code = await main(['detect', '--app', sampleApp()], { out: (s) => { out.push(s); }, err: () => {} });
  assert.equal(code, 0);
  const parsed = JSON.parse(out.join('\n'));
  assert.equal(parsed.stack.packageName, 'sample-app');
  assert.equal(parsed.proposedConfig.adapter, 'react-mui');
});

test('the detect command requires --app', async () => {
  const err: string[] = [];
  assert.equal(await main(['detect'], { out: () => {}, err: (s) => { err.push(s); } }), 2);
  assert.match(err[0], /--app/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `theme-static.ts`.

- [ ] **Step 3: Implement theme facts, detection and the command**

`src/adapters/react-mui/theme-static.ts`:
```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../../util/read.ts';
import { parseSource, type N } from '../../parse/parse.ts';
import { walk, unwrap } from '../../parse/walk.ts';
import { keyName } from '../../parse/literal.ts';
import { DEFAULT_THEME, type ThemeFacts } from './units.ts';

export function readThemeFacts(appRootAbs: string, themeEntry: string | null): ThemeFacts {
  if (!themeEntry) return DEFAULT_THEME;
  const abs = join(appRootAbs, themeEntry);
  if (!existsSync(abs)) return DEFAULT_THEME;
  const src = readText(abs);
  let ast: N;
  try { ast = parseSource(src, abs); } catch { return DEFAULT_THEME; }
  const found: { spacing: number | null; radius: number | null } = { spacing: null, radius: null };
  walk(ast, (n, parents) => {
    if (n.type !== 'ObjectProperty') return;
    const key = keyName(n);
    const value = unwrap(n.value);
    if (value?.type !== 'NumericLiteral') return;
    if (key === 'spacing' && found.spacing === null) found.spacing = value.value;
    if (key === 'borderRadius' && found.radius === null) {
      const grand = parents[parents.length - 2];
      if (grand?.type === 'ObjectProperty' && keyName(grand) === 'shape') found.radius = value.value;
    }
  });
  if (found.spacing === null && found.radius === null) return DEFAULT_THEME;
  return { spacingUnit: found.spacing ?? 8, radiusUnit: found.radius ?? 4, source: 'static' };
}
```

`src/detect/detect.ts`:
```ts
import { existsSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readText } from '../util/read.ts';
import { walkFiles } from '../util/fs-walk.ts';
import { DEFAULT_EXCLUDE, withDefaults, type AppConfig } from '../config/config.ts';

export interface StackInfo {
  packageName: string | null;
  react: string | null;
  mui: string | null;
  router: string | null;
  i18n: string | null;
  query: string | null;
  state: string | null;
  testRunner: string | null;
  storybook: string | null;
  typescript: boolean;
  styling: { sx: number; styled: number; makeStyles: number; styleProp: number; cssFiles: number };
  themeEntry: string | null;
  providersEntry: string | null;
  moduleRoots: string[];
  sharedRoots: string[];
}

const MODULE_ROOTS = ['src/components', 'src/features', 'src/modules', 'src/pages', 'src/views'];
const SHARED_ROOTS = ['src/common/components', 'src/components/common', 'src/components/shared', 'src/shared/components', 'src/ui', 'src/components/ui'];
const THEME_CANDIDATES = ['src/theme/index.ts', 'src/theme/index.tsx', 'src/theme.ts', 'src/theme.tsx', 'src/styles/theme.ts'];
const PROVIDER_CANDIDATES = ['src/app.tsx', 'src/App.tsx', 'src/main.tsx', 'src/index.tsx'];

const count = (text: string, re: RegExp): number => (text.match(re) ?? []).length;
const isDir = (p: string): boolean => existsSync(p) && statSync(p).isDirectory();

export function detectStack(appRootAbs: string): StackInfo {
  const pkgPath = join(appRootAbs, 'package.json');
  const pkg: { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = existsSync(pkgPath) ? JSON.parse(readText(pkgPath)) : {};
  const deps: Record<string, string> = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const pick = (...names: string[]): string | null => {
    for (const n of names) if (deps[n]) return `${n}@${deps[n]}`;
    return null;
  };
  const files = walkFiles(appRootAbs, { include: ['src/**/*.{ts,tsx,js,jsx,css,scss,less}'], exclude: DEFAULT_EXCLUDE });
  const styling = { sx: 0, styled: 0, makeStyles: 0, styleProp: 0, cssFiles: 0 };
  const texts = new Map<string, string>();
  for (const f of files) {
    if (/\.(css|scss|less)$/i.test(f)) { styling.cssFiles++; continue; }
    const text = readText(join(appRootAbs, f));
    texts.set(f, text);
    styling.sx += count(text, /\bsx=\{/g);
    styling.styled += count(text, /\bstyled(?:\(|\.\w+`)/g);
    styling.makeStyles += count(text, /\bmakeStyles\b/g);
    styling.styleProp += count(text, /\bstyle=\{\{/g);
  }
  const anyContaining = (re: RegExp): string | null => [...texts.keys()].find((f) => re.test(texts.get(f) ?? '')) ?? null;
  const candidateContaining = (cands: string[], re: RegExp): string | null => cands.find((c) => re.test(texts.get(c) ?? '')) ?? null;
  return {
    packageName: pkg.name ?? null,
    react: pick('react'),
    mui: pick('@mui/material'),
    router: pick('react-router-dom', 'react-router'),
    i18n: pick('react-i18next', 'i18next'),
    query: pick('@tanstack/react-query', 'react-query'),
    state: pick('@reduxjs/toolkit', 'redux', 'zustand'),
    testRunner: pick('vitest', 'jest'),
    storybook: pick('storybook', '@storybook/react-vite', '@storybook/react'),
    typescript: existsSync(join(appRootAbs, 'tsconfig.json')),
    styling,
    themeEntry: THEME_CANDIDATES.find((c) => texts.has(c)) ?? anyContaining(/\bcreateTheme\(/),
    providersEntry: candidateContaining(PROVIDER_CANDIDATES, /<ThemeProvider\b/) ?? anyContaining(/<ThemeProvider\b/),
    moduleRoots: MODULE_ROOTS.filter((r) => isDir(join(appRootAbs, r))),
    sharedRoots: SHARED_ROOTS.filter((r) => isDir(join(appRootAbs, r))),
  };
}

export function proposeConfig(stack: StackInfo, appRootAbs: string): AppConfig {
  return withDefaults({
    product: stack.packageName ?? basename(appRootAbs),
    appRoot: '.',
    sources: ['src/**/*.{ts,tsx,js,jsx}', 'src/**/*.{css,scss,less}'],
    libraryHome: stack.sharedRoots[0] ?? 'src/components/shared',
    themeEntry: stack.themeEntry,
    providersEntry: stack.providersEntry,
    modules: { roots: stack.moduleRoots, shared: stack.sharedRoots },
    protectedPaths: isDir(join(appRootAbs, 'src/routes')) ? ['src/routes/**'] : [],
  });
}
```

`src/commands/detect.ts`:
```ts
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from '../cli-types.ts';
import { detectStack, proposeConfig } from '../detect/detect.ts';
import { stableStringify } from '../util/write.ts';

export const detectCommand: Command = async (args, io) => {
  if (typeof args.app !== 'string') { io.err('detect: --app <dir> is required'); return 2; }
  const app = resolve(args.app);
  if (!existsSync(join(app, 'package.json'))) { io.err(`detect: no package.json in ${app}`); return 1; }
  const stack = detectStack(app);
  io.out(stableStringify({ stack, proposedConfig: proposeConfig(stack, app) }).trimEnd());
  return 0;
};
```

Replace `src/commands.ts` with:
```ts
import type { Command } from './cli-types.ts';
import { detectCommand } from './commands/detect.ts';

export const COMMANDS: Record<string, Command> = { detect: detectCommand };
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): add stack detection, static theme facts and detect command" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Module resolution and export maps

**Files:**
- Create: `src/inventory/resolve.ts`, `src/inventory/module-info.ts`
- Test: `test/resolve.test.ts`, `test/module-info.test.ts`

**Interfaces:**
- Consumes: `readImports`, `ImportBinding`, `walk`, `unwrap`, `keyName`, `readText`, `relPosix`.
- Produces: `Resolver { resolve(fromFile, spec): string | null }` (app-relative file or `null` for external), `stripJsonComments(text)`, `createResolver(appRootAbs, files: ReadonlySet<string>)` (relative paths, `tsconfig` `baseUrl` and `paths`, one relative `extends` chain, extensions `.ts .tsx .js .jsx` and `/index.*`); `ModuleInfo { file, imports, exportsLocal: Map<exported, local>, reexports: {exported, imported, source}[], starExports: string[], lazy: Map<local, {source, imported}> }`, `readModuleInfo(ast, file)`, `resolveExport(modules, resolver, file, name): {file, local} | null` (follows re-exports, `export *` for non-default names, and locals that are themselves imports).

- [ ] **Step 1: Write the failing tests**

`test/resolve.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResolver, stripJsonComments } from '../src/inventory/resolve.ts';
import { tmpDir, writeTree } from './helpers.ts';

test('stripJsonComments removes comments and trailing commas but keeps strings', () => {
  assert.deepEqual(JSON.parse(stripJsonComments('{\n // c\n "a": "http://x", /* b */ "b": [1,],\n}')), { a: 'http://x', b: [1] });
});

test('the resolver handles relative paths, index files, baseUrl and paths', () => {
  const root = tmpDir();
  writeTree(root, { 'tsconfig.json': '{ "compilerOptions": { "baseUrl": "src", "paths": { "@ui/*": ["common/ui/*"] } } }' });
  const r = createResolver(root, new Set(['src/a/x.tsx', 'src/a/y/index.ts', 'src/common/ui/button.tsx', 'src/app/index.ts']));
  assert.equal(r.resolve('src/a/x.tsx', './y'), 'src/a/y/index.ts');
  assert.equal(r.resolve('src/a/y/index.ts', '../x'), 'src/a/x.tsx');
  assert.equal(r.resolve('src/a/x.tsx', 'app'), 'src/app/index.ts');
  assert.equal(r.resolve('src/a/x.tsx', '@ui/button'), 'src/common/ui/button.tsx');
  assert.equal(r.resolve('src/a/x.tsx', 'react'), null);
});

test('the resolver follows a relative extends', () => {
  const root = tmpDir();
  writeTree(root, { 'tsconfig.base.json': '{ "compilerOptions": { "baseUrl": "./src" } }', 'tsconfig.json': '{ "extends": "./tsconfig.base.json" }' });
  assert.equal(createResolver(root, new Set(['src/app/index.ts'])).resolve('src/x.ts', 'app'), 'src/app/index.ts');
});
```

`test/module-info.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readModuleInfo, resolveExport } from '../src/inventory/module-info.ts';
import { createResolver } from '../src/inventory/resolve.ts';
import { file } from './parse-helpers.ts';
import { tmpDir } from './helpers.ts';

test('readModuleInfo records local exports, re-exports, star exports and lazy imports', () => {
  const info = readModuleInfo(file(`import { lazy } from 'react';
import Inner from './inner';
export function A() { return null; }
export const B = 1, C = 2;
const D = 3;
export { D as Dee, Inner };
export default A;
export * from './star';
export { X as Why, default as Zed } from './other';
export type { T } from './types';
const Page = lazy(() => import('./page'));
const Named = lazy(() => import('./named').then((m) => ({ default: m.NamedPage })));`), 'src/index.tsx');
  assert.deepEqual([...info.exportsLocal], [['A', 'A'], ['B', 'B'], ['C', 'C'], ['Dee', 'D'], ['Inner', 'Inner'], ['default', 'A']]);
  assert.deepEqual(info.starExports, ['./star']);
  assert.deepEqual(info.reexports, [{ exported: 'Why', imported: 'X', source: './other' }, { exported: 'Zed', imported: 'default', source: './other' }]);
  assert.deepEqual([...info.lazy], [['Page', { source: './page', imported: 'default' }], ['Named', { source: './named', imported: 'NamedPage' }]]);
});

test('resolveExport follows barrels, default re-exports and imported bindings', () => {
  const sources: Record<string, string> = {
    'src/c/index.ts': `export * from './tag';\nexport { default as Title } from './title';\nimport { Drawer } from './drawer';\nexport { Drawer };`,
    'src/c/tag.tsx': `export function Tag() { return <i />; }`,
    'src/c/title.tsx': `export default function Title() { return <h1 />; }`,
    'src/c/drawer.tsx': `export const Drawer = () => <aside />;`,
  };
  const modules = new Map(Object.entries(sources).map(([f, s]) => [f, readModuleInfo(file(s, f), f)]));
  const resolver = createResolver(tmpDir(), new Set(Object.keys(sources)));
  assert.deepEqual(resolveExport(modules, resolver, 'src/c/index.ts', 'Tag'), { file: 'src/c/tag.tsx', local: 'Tag' });
  assert.deepEqual(resolveExport(modules, resolver, 'src/c/index.ts', 'Title'), { file: 'src/c/title.tsx', local: 'Title' });
  assert.deepEqual(resolveExport(modules, resolver, 'src/c/index.ts', 'Drawer'), { file: 'src/c/drawer.tsx', local: 'Drawer' });
  assert.equal(resolveExport(modules, resolver, 'src/c/index.ts', 'Missing'), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test` → Expected: FAIL — cannot find `resolve.ts`.

- [ ] **Step 3: Implement the resolver and module info**

`src/inventory/resolve.ts`:
```ts
import { existsSync } from 'node:fs';
import { dirname, join, posix, resolve as resolvePath } from 'node:path';
import { readText } from '../util/read.ts';
import { relPosix } from '../util/paths.ts';

export interface Resolver { resolve(fromFile: string, spec: string): string | null }

interface PathRule { prefix: string; suffix: string; wildcard: boolean; targets: string[] }
interface TsPaths { baseUrl: string | null; paths: PathRule[] }

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

export function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') { out += next ?? ''; i++; }
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && next === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && next === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

function readTsPaths(appRootAbs: string): TsPaths {
  const acc: { baseUrlAbs: string | null; paths: Record<string, string[]> | null; pathsBaseAbs: string | null } = { baseUrlAbs: null, paths: null, pathsBaseAbs: null };
  const visit = (abs: string, depth: number): void => {
    if (depth > 4 || !existsSync(abs)) return;
    let json: { extends?: unknown; compilerOptions?: { baseUrl?: unknown; paths?: unknown } };
    try { json = JSON.parse(stripJsonComments(readText(abs))); } catch { return; }
    const dir = dirname(abs);
    if (typeof json.extends === 'string' && json.extends.startsWith('.')) {
      visit(resolvePath(dir, json.extends.endsWith('.json') ? json.extends : `${json.extends}.json`), depth + 1);
    }
    const co = json.compilerOptions ?? {};
    if (typeof co.baseUrl === 'string') acc.baseUrlAbs = resolvePath(dir, co.baseUrl);
    if (co.paths && typeof co.paths === 'object') { acc.paths = co.paths as Record<string, string[]>; acc.pathsBaseAbs = acc.baseUrlAbs ?? dir; }
  };
  visit(join(appRootAbs, 'tsconfig.json'), 0);
  const rel = (abs: string): string => relPosix(appRootAbs, abs) || '.';
  const pathsBase = acc.pathsBaseAbs ? rel(acc.pathsBaseAbs) : '.';
  return {
    baseUrl: acc.baseUrlAbs ? rel(acc.baseUrlAbs) : null,
    paths: Object.entries(acc.paths ?? {}).map(([pattern, targets]) => {
      const star = pattern.indexOf('*');
      return {
        prefix: star >= 0 ? pattern.slice(0, star) : pattern,
        suffix: star >= 0 ? pattern.slice(star + 1) : '',
        wildcard: star >= 0,
        targets: targets.map((t) => posix.normalize(posix.join(pathsBase, t))),
      };
    }),
  };
}

export function createResolver(appRootAbs: string, files: ReadonlySet<string>): Resolver {
  const ts = readTsPaths(appRootAbs);
  const tryBase = (base: string): string | null => {
    const b = posix.normalize(base).replace(/^\.\//, '');
    for (const ext of EXTENSIONS) if (files.has(b + ext)) return b + ext;
    return null;
  };
  return {
    resolve(fromFile, spec) {
      if (spec.startsWith('.')) return tryBase(posix.join(posix.dirname(fromFile), spec));
      for (const p of ts.paths) {
        const match = p.wildcard ? spec.startsWith(p.prefix) && spec.endsWith(p.suffix) : spec === p.prefix;
        if (!match) continue;
        const mid = p.wildcard ? spec.slice(p.prefix.length, spec.length - p.suffix.length) : '';
        for (const t of p.targets) { const r = tryBase(t.replace('*', mid)); if (r) return r; }
      }
      if (ts.baseUrl !== null) return tryBase(posix.join(ts.baseUrl, spec));
      return null;
    },
  };
}
```

`src/inventory/module-info.ts`:
```ts
import type { N } from '../parse/parse.ts';
import { walk, unwrap } from '../parse/walk.ts';
import { keyName } from '../parse/literal.ts';
import { readImports, type ImportBinding } from '../parse/imports.ts';
import type { Resolver } from './resolve.ts';

export interface ModuleInfo {
  file: string;
  imports: ImportBinding[];
  exportsLocal: Map<string, string>;
  reexports: Array<{ exported: string; imported: string; source: string }>;
  starExports: string[];
  lazy: Map<string, { source: string; imported: string }>;
}

const nameOf = (n: N): string => (n.type === 'Identifier' ? n.name : String(n.value));

function firstIdentArg(call: N): string | null {
  const callee = unwrap(call.callee);
  const a = unwrap(call.arguments?.[0]);
  if (a?.type === 'Identifier') return a.name;
  if (a?.type === 'CallExpression') return firstIdentArg(a);
  if (callee?.type === 'CallExpression') return firstIdentArg(callee) ?? null;
  return null;
}

function lazyTarget(init0: N | null | undefined): { source: string; imported: string } | null {
  const init = unwrap(init0);
  if (!init || init.type !== 'CallExpression') return null;
  const callee = unwrap(init.callee);
  const name = callee?.type === 'Identifier' ? callee.name : callee?.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name : '';
  if (!/lazy/i.test(name) || !init.arguments[0]) return null;
  const found: { source: string | null; imported: string } = { source: null, imported: 'default' };
  walk(init.arguments[0], (n) => {
    const isImportCall = (n.type === 'CallExpression' && n.callee.type === 'Import') || n.type === 'ImportExpression';
    if (isImportCall && found.source === null) {
      const s = unwrap(n.type === 'ImportExpression' ? n.source : n.arguments[0]);
      if (s?.type === 'StringLiteral') found.source = s.value;
    }
    if (n.type === 'ObjectProperty' && keyName(n) === 'default') {
      const v = unwrap(n.value);
      if (v?.type === 'MemberExpression' && v.property.type === 'Identifier') found.imported = v.property.name;
    }
  });
  return found.source === null ? null : { source: found.source, imported: found.imported };
}

export function readModuleInfo(ast: N, file: string): ModuleInfo {
  const info: ModuleInfo = { file, imports: readImports(ast), exportsLocal: new Map(), reexports: [], starExports: [], lazy: new Map() };
  for (const stmt of ast.program.body) {
    if (stmt.type === 'ExportNamedDeclaration') {
      if (stmt.exportKind === 'type') continue;
      if (stmt.source) {
        for (const s of stmt.specifiers) {
          if (s.exportKind === 'type') continue;
          if (s.type === 'ExportSpecifier') info.reexports.push({ exported: nameOf(s.exported), imported: nameOf(s.local), source: stmt.source.value });
          else if (s.type === 'ExportNamespaceSpecifier') info.reexports.push({ exported: nameOf(s.exported), imported: '*', source: stmt.source.value });
          else if (s.type === 'ExportDefaultSpecifier') info.reexports.push({ exported: s.exported.name, imported: 'default', source: stmt.source.value });
        }
        continue;
      }
      const d = stmt.declaration;
      if ((d?.type === 'FunctionDeclaration' || d?.type === 'ClassDeclaration') && d.id) info.exportsLocal.set(d.id.name, d.id.name);
      else if (d?.type === 'VariableDeclaration') { for (const v of d.declarations) if (v.id.type === 'Identifier') info.exportsLocal.set(v.id.name, v.id.name); }
      for (const s of stmt.specifiers) if (s.type === 'ExportSpecifier' && s.exportKind !== 'type') info.exportsLocal.set(nameOf(s.exported), nameOf(s.local));
    } else if (stmt.type === 'ExportDefaultDeclaration') {
      const d = unwrap(stmt.declaration);
      if ((d?.type === 'FunctionDeclaration' || d?.type === 'ClassDeclaration') && d.id) info.exportsLocal.set('default', d.id.name);
      else if (d?.type === 'Identifier') info.exportsLocal.set('default', d.name);
      else if (d?.type === 'CallExpression') info.exportsLocal.set('default', firstIdentArg(d) ?? 'default');
      else info.exportsLocal.set('default', 'default');
    } else if (stmt.type === 'ExportAllDeclaration') {
      if (stmt.exportKind === 'type') continue;
      if (stmt.exported) info.reexports.push({ exported: nameOf(stmt.exported), imported: '*', source: stmt.source.value });
      else info.starExports.push(stmt.source.value);
    } else if (stmt.type === 'VariableDeclaration') {
      for (const v of stmt.declarations) {
        if (v.id.type !== 'Identifier') continue;
        const lz = lazyTarget(v.init);
        if (lz) info.lazy.set(v.id.name, lz);
      }
    }
  }
  return info;
}

export function resolveExport(
  modules: ReadonlyMap<string, ModuleInfo>,
  resolver: Resolver,
  file: string,
  name: string,
  seen: Set<string> = new Set(),
): { file: string; local: string } | null {
  const key = `${file}#${name}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const info = modules.get(file);
  if (!info) return null;
  const local = info.exportsLocal.get(name);
  if (local !== undefined) {
    const imp = info.imports.find((i) => i.local === local && !i.typeOnly);
    if (imp && imp.imported !== '*') {
      const target = resolver.resolve(file, imp.source);
      if (target) return resolveExport(modules, resolver, target, imp.imported, seen) ?? { file, local };
    }
    return { file, local };
  }
  for (const r of info.reexports) {
    if (r.exported !== name || r.imported === '*') continue;
    const target = resolver.resolve(file, r.source);
    if (!target) continue;
    const res = resolveExport(modules, resolver, target, r.imported, seen);
    if (res) return res;
  }
  if (name !== 'default') {
    for (const s of info.starExports) {
      const target = resolver.resolve(file, s);
      if (!target) continue;
      const res = resolveExport(modules, resolver, target, name, seen);
      if (res) return res;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): resolve imports through tsconfig paths and barrels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Component definitions and their signals

**Files:**
- Create: `src/inventory/components.ts`
- Test: `test/components.test.ts`

**Interfaces:**
- Consumes: `ModuleInfo` (Task 9), JSX/walk helpers, `muiPrimitiveName`.
- Produces: `RenderedEl { name, line, props }`, `ComponentSignals { data, dataHooks, slots, region, primaryActions, pageArea, domainProps, styledTarget }`, `ComponentDef { id (`file#name`), name, local (binding used for lookups; `'default'` for anonymous default exports), file, line, loc, exportNames, rendered, signals }`, `FindResult { components, aliases: Map<local, target local> }`, `pascalFromFile(file)`, `findComponents(ast, src, file, info): FindResult`. Only module-level components are found: PascalCase function/class/const whose body contains JSX, wrappers `memo`/`forwardRef`/`observer`, `styled(...)` and anonymous default exports.

- [ ] **Step 1: Write the failing test**

`test/components.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findComponents, pascalFromFile } from '../src/inventory/components.ts';
import { readModuleInfo } from '../src/inventory/module-info.ts';
import { file } from './parse-helpers.ts';

function defs(src: string, f = 'src/m/x.tsx') {
  const ast = file(src, f);
  return findComponents(ast, src, f, readModuleInfo(ast, f));
}

test('finds function, arrow, memo, forwardRef, class, styled and anonymous default components', () => {
  const r = defs(`import { memo, forwardRef, Component } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
export function A() { return <div />; }
export const B = () => <span />;
const C = memo(function Inner() { return <p />; });
export const D = forwardRef((p, ref) => <input ref={ref} />);
class E extends Component { render() { return <b />; } }
export const F = styled(Button)({ padding: 4 });
const helper = () => <i />;
export const NotAComponent = 42;
export default memo(() => <em />);`, 'src/m/widget-card.tsx');
  assert.deepEqual(r.components.map((c) => [c.name, c.local, c.exportNames]), [
    ['A', 'A', ['A']], ['B', 'B', ['B']], ['C', 'C', []], ['D', 'D', ['D']], ['E', 'E', []], ['F', 'F', ['F']], ['WidgetCard', 'default', ['default']],
  ]);
  assert.equal(r.components.find((c) => c.name === 'F')?.signals.styledTarget, 'Button');
});

test('signals: data hooks and API imports, slots, region, primary actions, page area and domain props', () => {
  const r = defs(`import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, Button, Container } from '@mui/material';
import { getLeads } from '../api/leads';
import type { Lead } from '../models/lead';
interface Props { title: ReactNode; actions?: ReactNode; renderRow: (l: Lead) => ReactNode; lead: Lead }
export function Page({ title, actions, children }: Props & { children?: ReactNode }) {
  const q = useQuery({ queryKey: ['x'], queryFn: getLeads });
  return <Container maxWidth="lg"><Dialog open>{title}{actions}<Button variant="contained">Save</Button><Button type="submit">Go</Button></Dialog></Container>;
}`);
  const c = r.components[0];
  assert.deepEqual(c.rendered.map((e) => e.name), ['Container', 'Dialog', 'Button', 'Button']);
  assert.deepEqual(c.signals.dataHooks, ['getLeads', 'useQuery']);
  assert.equal(c.signals.data, true);
  assert.equal(c.signals.slots, 4);
  assert.equal(c.signals.region, true);
  assert.equal(c.signals.primaryActions, 2);
  assert.equal(c.signals.pageArea, true);
  assert.equal(c.signals.domainProps, true);
});

test('memo(Foo) aliases are recorded so imports of the alias resolve', () => {
  const r = defs(`import { memo } from 'react';\nfunction Foo() { return <div />; }\nexport const X = memo(Foo);`);
  assert.deepEqual([...r.aliases], [['X', 'Foo']]);
});

test('pascalFromFile names anonymous defaults from the file or folder', () => {
  assert.equal(pascalFromFile('src/a/widget-card.tsx'), 'WidgetCard');
  assert.equal(pascalFromFile('src/lead_row/index.tsx'), 'LeadRow');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `components.ts`.

- [ ] **Step 3: Implement `components.ts`**

`src/inventory/components.ts`:
```ts
import type { N } from '../parse/parse.ts';
import { walk, lineOf, endLineOf, textOf, unwrap, containsJsx } from '../parse/walk.ts';
import { jsxName, jsxAttrString } from '../parse/jsx.ts';
import { keyName } from '../parse/literal.ts';
import { muiPrimitiveName, type ImportBinding } from '../parse/imports.ts';
import type { ModuleInfo } from './module-info.ts';

export interface RenderedEl { name: string; line: number; props: Record<string, string> }
export interface ComponentSignals {
  data: boolean;
  dataHooks: string[];
  slots: number;
  region: boolean;
  primaryActions: number;
  pageArea: boolean;
  domainProps: boolean;
  styledTarget: string | null;
}
export interface ComponentDef {
  id: string;
  name: string;
  local: string;
  file: string;
  line: number;
  loc: number;
  exportNames: string[];
  rendered: RenderedEl[];
  signals: ComponentSignals;
}
export interface FindResult { components: ComponentDef[]; aliases: Map<string, string> }

const PASCAL = /^[A-Z][A-Za-z0-9_]*$/;
const WRAPPERS = new Set(['memo', 'forwardRef', 'observer', 'React.memo', 'React.forwardRef']);
const DATA_CALLS = new Set(['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery', 'useQueries', 'useSelector', 'useAppSelector', 'useDispatch', 'useAppDispatch', 'useParams', 'useSearchParams', 'useNavigate', 'useLoaderData', 'fetch', 'axios']);
const DATA_HOOK_RE = /^use\w+(Query|Mutation|Subscription)$|^use\w*(Socket|SignalR|Hub)\w*$/;
const DATA_SOURCE_RE = /(^|[/.-])(api|apis|service|services|queries|mutations)([/.-]|$)/i;
const DATA_NAME_RE = /(Api|API|Service)$/;
const REGION = new Set(['Dialog', 'Drawer', 'SwipeableDrawer', 'Popover', 'Table', 'TableContainer', 'AppBar', 'nav', 'header', 'aside', 'form']);
const SLOT_TYPE_RE = /ReactNode|ReactElement|JSX\.Element|ReactChild|ReactPortal/;
const DOMAIN_SOURCE_RE = /(^|\/)(models?|types?|interfaces?|entities|dto)(\/|$)/i;
const PAGE_AREA_RE = /\b100d?vh\b|<Outlet\b|<Container\b[^>]*\bmaxWidth/;

export function pascalFromFile(file: string): string {
  const parts = file.split('/');
  let base = parts[parts.length - 1].replace(/\.[^.]+$/, '');
  if (base === 'index' && parts.length > 1) base = parts[parts.length - 2];
  const name = base.split(/[-_.\s]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join('');
  return /^[A-Z]/.test(name) ? name : `C${name}`;
}

function calleeText(n: N | null | undefined): string {
  if (!n) return '';
  if (n.type === 'Identifier') return n.name;
  if (n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier') {
    const o = calleeText(unwrap(n.object));
    return o ? `${o}.${n.property.name}` : '';
  }
  return '';
}

function styledTargetOf(arg: N | null | undefined): string | null {
  const a = unwrap(arg);
  if (!a) return null;
  if (a.type === 'Identifier') return a.name;
  if (a.type === 'StringLiteral') return a.value;
  return calleeText(a) || null;
}

const isStyledRef = (n: N | null | undefined): boolean => { const t = calleeText(n); return t === 'styled' || t.startsWith('styled.'); };

interface Init { fn: N; styledTarget: string | null }

function componentInit(init0: N | null | undefined): Init | null {
  const init = unwrap(init0);
  if (!init) return null;
  if ((init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression' || init.type === 'ClassExpression') && containsJsx(init)) return { fn: init, styledTarget: null };
  if (init.type === 'CallExpression') {
    const callee = unwrap(init.callee);
    if (WRAPPERS.has(calleeText(callee))) return componentInit(init.arguments[0]);
    if (callee?.type === 'CallExpression' && calleeText(unwrap(callee.callee)) === 'styled') return { fn: init, styledTarget: styledTargetOf(callee.arguments[0]) };
    if (callee?.type === 'MemberExpression' && isStyledRef(callee)) return { fn: init, styledTarget: callee.property.name ?? null };
  }
  if (init.type === 'TaggedTemplateExpression') {
    const tag = unwrap(init.tag);
    if (tag?.type === 'CallExpression' && calleeText(unwrap(tag.callee)) === 'styled') return { fn: init, styledTarget: styledTargetOf(tag.arguments[0]) };
    if (tag?.type === 'MemberExpression' && isStyledRef(tag)) return { fn: init, styledTarget: tag.property.name ?? null };
  }
  return null;
}

function typeDecls(ast: N): Map<string, N> {
  const m = new Map<string, N>();
  for (const s0 of ast.program.body) {
    const s = s0.type === 'ExportNamedDeclaration' ? s0.declaration : s0;
    if (s?.type === 'TSInterfaceDeclaration') m.set(s.id.name, s.body);
    else if (s?.type === 'TSTypeAliasDeclaration') m.set(s.id.name, s.typeAnnotation);
  }
  return m;
}

function typeMembers(t: N | null | undefined, decls: Map<string, N>, depth = 0): N[] {
  if (!t || depth > 4) return [];
  if (t.type === 'TSTypeLiteral') return t.members;
  if (t.type === 'TSInterfaceBody') return t.body;
  if (t.type === 'TSIntersectionType') return t.types.flatMap((x: N) => typeMembers(x, decls, depth + 1));
  if (t.type === 'TSTypeReference' && t.typeName.type === 'Identifier') return typeMembers(decls.get(t.typeName.name), decls, depth + 1);
  return [];
}

function propsType(fn: N, declNode: N): N | null {
  const param = Array.isArray(fn.params) ? fn.params[0] : null;
  const own = param?.typeAnnotation?.typeAnnotation;
  if (own) return own;
  const declared = declNode.type === 'VariableDeclarator' ? declNode.id.typeAnnotation?.typeAnnotation : null;
  const args = declared?.typeParameters?.params ?? declared?.typeArguments?.params;
  return args?.[0] ?? null;
}

export function findComponents(ast: N, src: string, file: string, info: ModuleInfo): FindResult {
  const imports = new Map<string, ImportBinding>(info.imports.map((b) => [b.local, b]));
  const exportedAs = new Map<string, string[]>();
  for (const [exported, local] of info.exportsLocal) exportedAs.set(local, [...(exportedAs.get(local) ?? []), exported]);
  const decls = typeDecls(ast);
  const components: ComponentDef[] = [];
  const aliases = new Map<string, string>();
  const usedNames = new Set<string>();

  const isDataImport = (local: string): boolean => {
    const b = imports.get(local);
    return !!b && !b.typeOnly && (DATA_SOURCE_RE.test(b.source) || DATA_NAME_RE.test(b.imported));
  };
  const isRegion = (el: RenderedEl): boolean => {
    const m = muiPrimitiveName(el.name, imports);
    return m ? REGION.has(m) : /^[a-z]/.test(el.name) && REGION.has(el.name);
  };

  const build = (displayName: string, local: string, fn: N, declNode: N, styledTarget: string | null): void => {
    const name = usedNames.has(displayName) ? `${displayName}Default` : displayName;
    usedNames.add(name);
    const rendered: RenderedEl[] = [];
    const called = new Set<string>();
    const referenced = new Set<string>();
    walk(fn, (n, parents) => {
      if (n.type === 'JSXOpeningElement') {
        const props: Record<string, string> = {};
        for (const p of ['variant', 'type', 'size', 'color']) { const v = jsxAttrString(n, p); if (v !== null) props[p] = v; }
        rendered.push({ name: jsxName(n.name), line: lineOf(n), props });
      } else if (n.type === 'CallExpression' || n.type === 'OptionalCallExpression') {
        const c = unwrap(n.callee);
        if (c?.type === 'Identifier') called.add(c.name);
        else if (c?.type === 'MemberExpression' && unwrap(c.object)?.type === 'Identifier') called.add(unwrap(c.object)?.name);
      } else if (n.type === 'Identifier') {
        const parent = parents[parents.length - 1];
        const isKey = !!parent && !parent.computed && ((parent.type === 'ObjectProperty' && parent.key === n) || (parent.type === 'MemberExpression' && parent.property === n));
        if (!isKey) referenced.add(n.name);
      }
    });
    const dataHooks = [...new Set([...[...called].filter((c) => DATA_CALLS.has(c) || DATA_HOOK_RE.test(c)), ...[...referenced].filter(isDataImport)])].sort();
    const typeNode = propsType(fn, declNode);
    const members = typeMembers(typeNode, decls);
    const slotNames = new Set<string>();
    for (const m of members) {
      if (m.type !== 'TSPropertySignature' && m.type !== 'TSMethodSignature') continue;
      const key = m.key?.type === 'Identifier' ? m.key.name : String(m.key?.value);
      const typeText = m.type === 'TSMethodSignature' ? textOf(m, src) : m.typeAnnotation ? textOf(m.typeAnnotation, src) : '';
      if (key === 'children' || SLOT_TYPE_RE.test(typeText)) slotNames.add(key);
    }
    const param = Array.isArray(fn.params) ? fn.params[0] : null;
    if (param?.type === 'ObjectPattern' && param.properties.some((p: N) => p.type === 'ObjectProperty' && keyName(p) === 'children')) slotNames.add('children');
    const typeIdents = new Set<string>();
    const addIdents = (t: N | null | undefined): void => { if (t) walk(t, (n) => { if (n.type === 'Identifier') typeIdents.add(n.name); }); };
    addIdents(typeNode);
    for (const m of members) addIdents(m.typeAnnotation);
    const primitiveOf = (el: RenderedEl): string => muiPrimitiveName(el.name, imports) ?? el.name;
    components.push({
      id: `${file}#${name}`,
      name,
      local,
      file,
      line: lineOf(declNode),
      loc: endLineOf(declNode) - lineOf(declNode) + 1,
      exportNames: [...(exportedAs.get(local) ?? [])].sort(),
      rendered,
      signals: {
        data: dataHooks.length > 0,
        dataHooks,
        slots: slotNames.size,
        region: rendered.some(isRegion),
        primaryActions: rendered.filter((el) => (/(^|\.)(Button|LoadingButton)$/.test(primitiveOf(el)) && el.props.variant === 'contained') || el.props.type === 'submit').length,
        pageArea: PAGE_AREA_RE.test(textOf(fn, src)),
        domainProps: [...typeIdents].some((t) => { const b = imports.get(t); return !!b && DOMAIN_SOURCE_RE.test(b.source); }),
        styledTarget,
      },
    });
  };

  for (const stmt0 of ast.program.body) {
    const isExport = stmt0.type === 'ExportNamedDeclaration' || stmt0.type === 'ExportDefaultDeclaration';
    const stmt = isExport && stmt0.declaration ? stmt0.declaration : stmt0;
    if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration') {
      const display: string = stmt.id?.name ?? pascalFromFile(file);
      const local: string = stmt.id?.name ?? 'default';
      const isComponent = PASCAL.test(display) && (stmt.type === 'FunctionDeclaration' ? containsJsx(stmt.body) : !!stmt.superClass && containsJsx(stmt.body));
      if (isComponent) build(display, local, stmt, stmt0, null);
    } else if (stmt.type === 'VariableDeclaration') {
      for (const d of stmt.declarations) {
        if (d.id.type !== 'Identifier' || !PASCAL.test(d.id.name)) continue;
        const r = componentInit(d.init);
        if (r) { build(d.id.name, d.id.name, r.fn, d, r.styledTarget); continue; }
        const init = unwrap(d.init);
        const arg = init?.type === 'CallExpression' ? unwrap(init.arguments[0]) : null;
        if (init?.type === 'CallExpression' && WRAPPERS.has(calleeText(unwrap(init.callee))) && arg?.type === 'Identifier') aliases.set(d.id.name, arg.name);
      }
    } else if (stmt0.type === 'ExportDefaultDeclaration') {
      const r = componentInit(stmt);
      if (r) build(pascalFromFile(file), 'default', r.fn, stmt0, r.styledTarget);
    }
  }
  return { components, aliases };
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): find components and their classification signals" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Modules, the import/render graph and routes

**Files:**
- Create: `src/inventory/modules.ts`, `src/inventory/graph.ts`
- Create: `test/pipeline-helpers.ts`
- Test: `test/graph.test.ts`

**Interfaces:**
- Consumes: `Resolver`, `ModuleInfo`, `resolveExport`, `ComponentDef`, `libraryOf`, JSX helpers.
- Produces: `sharedRootOf(file, cfg): string | null`, `moduleOf(file, cfg): string | null` (`'shared'` for shared roots; first folder under a module root; `null` otherwise); `FileUnit { file, info, components, aliases, routeRefs }`, `Graph { importers: Map<compId, Set<file>>, renders: Map<compId, Set<compId>>, library: Map<compId, Set<'lib:Name'>>, routes: Set<compId>, crossFeature: {from, to, fromModule, toModule}[] }`, `findRouteRefs(ast): string[]` (route `element` leaves, `component`/`Component`, route objects with `path`/`index`), `buildGraph(units, resolver, cfg): Graph`. Library ids: `mui:Button`, `icon:Close`, `router:Route`, `dom:div`, `<package>:<name>`.
- Test helper produces: `buildUnits(sources)` and `analyse(sources, cfg)` used by Tasks 12–14.

- [ ] **Step 1: Write the pipeline helper and the failing test**

`test/pipeline-helpers.ts`:
```ts
import { withDefaults, type AppConfig } from '../src/config/config.ts';
import { readModuleInfo } from '../src/inventory/module-info.ts';
import { findComponents } from '../src/inventory/components.ts';
import { buildGraph, findRouteRefs, type FileUnit } from '../src/inventory/graph.ts';
import { createResolver } from '../src/inventory/resolve.ts';
import { file } from './parse-helpers.ts';
import { tmpDir } from './helpers.ts';

export const testConfig: AppConfig = withDefaults({
  product: 'Test',
  appRoot: '.',
  sources: ['src/**/*.{ts,tsx}'],
  libraryHome: 'src/shared',
  modules: { roots: ['src/features'], shared: ['src/shared'] },
});

export function buildUnits(sources: Record<string, string>): FileUnit[] {
  return Object.entries(sources).map(([f, s]) => {
    const ast = file(s, f);
    const info = readModuleInfo(ast, f);
    const { components, aliases } = findComponents(ast, s, f, info);
    return { file: f, info, components, aliases, routeRefs: findRouteRefs(ast) };
  });
}

export function graphOf(sources: Record<string, string>, cfg: AppConfig = testConfig) {
  const units = buildUnits(sources);
  const graph = buildGraph(units, createResolver(tmpDir(), new Set(Object.keys(sources))), cfg);
  return { units, graph, components: units.flatMap((u) => u.components) };
}
```

`test/graph.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moduleOf, sharedRootOf } from '../src/inventory/modules.ts';
import { graphOf, testConfig } from './pipeline-helpers.ts';

const SOURCES: Record<string, string> = {
  'src/shared/index.ts': `export * from './tag';`,
  'src/shared/tag.tsx': `import Chip from '@mui/material/Chip';\nexport function Tag() { return <Chip />; }`,
  'src/features/leads/LeadRow.tsx': `import { Tag } from '../../shared';\nimport { Box } from '@mui/material';\nimport * as Mui from '@mui/material';\nexport function LeadRow() { return <Box><Tag /><Mui.Button /><div /></Box>; }`,
  'src/features/leads/LeadsPage.tsx': `import { LeadRow } from './LeadRow';\nexport function LeadsPage() { return <LeadRow />; }`,
  'src/features/deals/Deal.tsx': `import { LeadRow } from '../leads/LeadRow';\nexport function Deal() { return <LeadRow />; }`,
  'src/routes.tsx': `import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { LeadsPage } from './features/leads/LeadsPage';
const Deal = lazy(() => import('./features/deals/Deal').then((m) => ({ default: m.Deal })));
export const routes = [{ path: '/deal', element: <Deal /> }];
export function R() { return <Route path="/leads" element={<Guard><LeadsPage /></Guard>} />; }
function Guard({ children }) { return children; }`,
};

test('moduleOf and sharedRootOf group files', () => {
  assert.equal(moduleOf('src/features/leads/LeadRow.tsx', testConfig), 'leads');
  assert.equal(moduleOf('src/shared/tag.tsx', testConfig), 'shared');
  assert.equal(sharedRootOf('src/shared/tag.tsx', testConfig), 'src/shared');
  assert.equal(moduleOf('src/routes.tsx', testConfig), null);
  assert.equal(moduleOf('src/features/loose.tsx', testConfig), null);
});

test('importers resolve through barrels; renders and library primitives are recorded', () => {
  const { graph } = graphOf(SOURCES);
  assert.deepEqual([...(graph.importers.get('src/shared/tag.tsx#Tag') ?? [])], ['src/features/leads/LeadRow.tsx']);
  assert.deepEqual([...(graph.importers.get('src/features/leads/LeadRow.tsx#LeadRow') ?? [])].sort(), ['src/features/deals/Deal.tsx', 'src/features/leads/LeadsPage.tsx']);
  assert.deepEqual([...(graph.renders.get('src/features/leads/LeadRow.tsx#LeadRow') ?? [])], ['src/shared/tag.tsx#Tag']);
  assert.deepEqual([...(graph.library.get('src/features/leads/LeadRow.tsx#LeadRow') ?? [])].sort(), ['dom:div', 'mui:Box', 'mui:Button']);
  assert.deepEqual([...(graph.library.get('src/shared/tag.tsx#Tag') ?? [])], ['mui:Chip']);
});

test('routes come from Route elements (leaf children) and route objects, including lazy imports', () => {
  const { graph } = graphOf(SOURCES);
  assert.deepEqual([...graph.routes].sort(), ['src/features/deals/Deal.tsx#Deal', 'src/features/leads/LeadsPage.tsx#LeadsPage']);
});

test('imports that reach into another feature module are recorded', () => {
  const { graph } = graphOf(SOURCES);
  assert.deepEqual(graph.crossFeature, [{ from: 'src/features/deals/Deal.tsx', to: 'src/features/leads/LeadRow.tsx', fromModule: 'deals', toModule: 'leads' }]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `modules.ts` / `graph.ts`.

- [ ] **Step 3: Implement modules and the graph**

`src/inventory/modules.ts`:
```ts
import type { AppConfig } from '../config/config.ts';

const norm = (r: string): string => r.replace(/\/+$/, '');

export function sharedRootOf(file: string, cfg: AppConfig): string | null {
  return cfg.modules.shared.find((r) => file.startsWith(`${norm(r)}/`)) ?? null;
}

export function moduleOf(file: string, cfg: AppConfig): string | null {
  if (sharedRootOf(file, cfg)) return 'shared';
  for (const root of cfg.modules.roots) {
    const prefix = `${norm(root)}/`;
    if (!file.startsWith(prefix)) continue;
    const rest = file.slice(prefix.length);
    const slash = rest.indexOf('/');
    return slash > 0 ? rest.slice(0, slash) : null;
  }
  return null;
}
```

`src/inventory/graph.ts`:
```ts
import type { N } from '../parse/parse.ts';
import { walk, unwrap } from '../parse/walk.ts';
import { jsxName, jsxAttr, jsxAttrExpr } from '../parse/jsx.ts';
import { keyName } from '../parse/literal.ts';
import { libraryOf } from '../parse/imports.ts';
import type { AppConfig } from '../config/config.ts';
import type { Resolver } from './resolve.ts';
import { resolveExport, type ModuleInfo } from './module-info.ts';
import type { ComponentDef } from './components.ts';
import { moduleOf } from './modules.ts';

export interface FileUnit { file: string; info: ModuleInfo; components: ComponentDef[]; aliases: Map<string, string>; routeRefs: string[] }
export interface CrossFeatureImport { from: string; to: string; fromModule: string; toModule: string }
export interface Graph {
  importers: Map<string, Set<string>>;
  renders: Map<string, Set<string>>;
  library: Map<string, Set<string>>;
  routes: Set<string>;
  crossFeature: CrossFeatureImport[];
}

export function findRouteRefs(ast: N): string[] {
  const refs = new Set<string>();
  const leavesOf = (el: N | null): void => {
    if (!el) return;
    if (el.type === 'JSXFragment') { for (const k of el.children) if (k.type === 'JSXElement' || k.type === 'JSXFragment') leavesOf(k); return; }
    if (el.type !== 'JSXElement') return;
    const kids = el.children.filter((ch: N) => ch.type === 'JSXElement' || ch.type === 'JSXFragment' || (ch.type === 'JSXExpressionContainer' && ch.expression.type !== 'JSXEmptyExpression'));
    if (kids.length === 0) {
      const name = jsxName(el.openingElement.name).split('.')[0];
      if (/^[A-Z]/.test(name)) refs.add(name);
      return;
    }
    for (const k of kids) if (k.type === 'JSXElement' || k.type === 'JSXFragment') leavesOf(k);
  };
  walk(ast, (n) => {
    if (n.type === 'JSXOpeningElement' && jsxName(n.name) === 'Route') {
      leavesOf(jsxAttrExpr(jsxAttr(n, 'element')));
      for (const a of ['component', 'Component']) { const e = jsxAttrExpr(jsxAttr(n, a)); if (e?.type === 'Identifier') refs.add(e.name); }
    } else if (n.type === 'ObjectExpression') {
      const props = new Map<string, N>();
      for (const p of n.properties) {
        if (p.type !== 'ObjectProperty') continue;
        const k = keyName(p);
        const v = unwrap(p.value);
        if (k && v) props.set(k, v);
      }
      if (!props.has('path') && !props.has('index')) return;
      leavesOf(props.get('element') ?? null);
      for (const k of ['component', 'Component']) { const v = props.get(k); if (v?.type === 'Identifier') refs.add(v.name); }
    }
  });
  return [...refs].sort();
}

function addTo(m: Map<string, Set<string>>, k: string, v: string): void {
  let s = m.get(k);
  if (!s) { s = new Set(); m.set(k, s); }
  s.add(v);
}

export function buildGraph(units: readonly FileUnit[], resolver: Resolver, cfg: AppConfig): Graph {
  const modules = new Map(units.map((u) => [u.file, u.info]));
  const byLocal = new Map<string, ComponentDef>();
  const aliasOf = new Map<string, string>();
  for (const u of units) {
    for (const c of u.components) byLocal.set(`${u.file}#${c.local}`, c);
    for (const [a, t] of u.aliases) aliasOf.set(`${u.file}#${a}`, `${u.file}#${t}`);
  }
  const lookup = (file: string, local: string): ComponentDef | null => {
    const k = `${file}#${local}`;
    return byLocal.get(k) ?? byLocal.get(aliasOf.get(k) ?? '') ?? null;
  };
  const g: Graph = { importers: new Map(), renders: new Map(), library: new Map(), routes: new Set(), crossFeature: [] };
  const seenCross = new Set<string>();

  for (const u of units) {
    const bindings = new Map<string, ComponentDef>();
    const nsTargets = new Map<string, string>();
    const libBindings = new Map<string, { lib: string; name: string }>();
    for (const imp of u.info.imports) {
      if (imp.typeOnly) continue;
      const target = resolver.resolve(u.file, imp.source);
      if (target) {
        const fm = moduleOf(u.file, cfg);
        const tm = moduleOf(target, cfg);
        if (fm && tm && fm !== tm && fm !== 'shared' && tm !== 'shared') {
          const k = `${u.file}>${target}`;
          if (!seenCross.has(k)) { seenCross.add(k); g.crossFeature.push({ from: u.file, to: target, fromModule: fm, toModule: tm }); }
        }
        if (imp.imported === '*') { nsTargets.set(imp.local, target); continue; }
        const r = resolveExport(modules, resolver, target, imp.imported);
        const def = r ? lookup(r.file, r.local) : null;
        if (def) { bindings.set(imp.local, def); addTo(g.importers, def.id, u.file); }
      } else {
        const lib = libraryOf(imp.source);
        if (lib) libBindings.set(imp.local, { lib, name: imp.imported === 'default' ? (imp.source.split('/').pop() ?? imp.local) : imp.imported });
      }
    }
    for (const [local, lz] of u.info.lazy) {
      const target = resolver.resolve(u.file, lz.source);
      if (!target) continue;
      const r = resolveExport(modules, resolver, target, lz.imported);
      const def = r ? lookup(r.file, r.local) : null;
      if (def) { bindings.set(local, def); addTo(g.importers, def.id, u.file); }
    }
    for (const c of u.components) {
      for (const el of c.rendered) {
        const [base, member] = el.name.split('.');
        let def: ComponentDef | null = null;
        if (member && nsTargets.has(base)) {
          const r = resolveExport(modules, resolver, nsTargets.get(base) ?? '', member);
          def = r ? lookup(r.file, r.local) : null;
        } else if (!member) {
          def = bindings.get(base) ?? (base !== c.local ? lookup(u.file, base) : null);
        }
        if (def) { if (def.id !== c.id) addTo(g.renders, c.id, def.id); continue; }
        const lib = libBindings.get(base);
        if (lib) addTo(g.library, c.id, `${lib.lib}:${member ?? lib.name}`);
        else if (/^[a-z]/.test(base)) addTo(g.library, c.id, `dom:${base}`);
      }
      const t = c.signals.styledTarget;
      if (t) {
        const def = bindings.get(t) ?? lookup(u.file, t);
        if (def) addTo(g.renders, c.id, def.id);
        else {
          const lib = libBindings.get(t);
          addTo(g.library, c.id, lib ? `${lib.lib}:${lib.name}` : /^[a-z]/.test(t) ? `dom:${t}` : `unknown:${t}`);
        }
      }
    }
    for (const ref of u.routeRefs) {
      const def = bindings.get(ref) ?? lookup(u.file, ref);
      if (def) g.routes.add(def.id);
    }
  }
  g.crossFeature.sort((a, b) => (`${a.from}>${a.to}` < `${b.from}>${b.to}` ? -1 : 1));
  return g;
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): build the import and render graph with routes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Atomic classifier and ecosystem layer

**Files:**
- Create: `src/adapters/react-mui/primitives.ts`, `src/inventory/classify.ts`
- Test: `test/classify.test.ts`

**Interfaces:**
- Consumes: `ComponentDef`, `Graph`, `moduleOf`, `sharedRootOf`, `AppConfig`.
- Produces: `Level = 'layout' | 'atom' | 'molecule' | 'organism' | 'template' | 'page'`, `RANK`, `LEVELS`, `libLevel(id): Level | 'icon' | null`; `Classification { level, reason, confidence: 'high' | 'medium' | 'low', smells: string[] }`, `classifyAll(components, graph): Map<compId, Classification>`, `Ecosystem { layer, logic, importerFiles, importerModules, promotionCandidate }`, `ecosystemOf(c, graph, cfg): Ecosystem`.
- Decision procedure (first match wins, then a monotonic pass so a parent is never below its highest child; template/page children raise a parent to organism): styled wrapper → its target's level; route → page; page area + ≥ 2 slots → template (templates are mostly layout plus slots, so this runs before the layout rule); nothing meaningful rendered → layout (or atom with `low` confidence if nothing is rendered); data → organism; region → organism; ≥ 2 meaningful in-house children incl. a molecule+ → organism; ≥ 4 atoms → organism; ≥ 2 atoms with ≤ 1 primary action → molecule; ≥ 2 atoms with > 1 primary action → organism; one molecule-level child → molecule; else atom.

- [ ] **Step 1: Write the failing test**

`test/classify.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAll, ecosystemOf } from '../src/inventory/classify.ts';
import type { ComponentDef, ComponentSignals } from '../src/inventory/components.ts';
import type { Graph } from '../src/inventory/graph.ts';
import { testConfig } from './pipeline-helpers.ts';

function def(id: string, over: Partial<ComponentSignals> = {}, rendered = 1): ComponentDef {
  const [file, name] = id.split('#');
  return {
    id, name, local: name, file, line: 1, loc: 10, exportNames: [],
    rendered: Array.from({ length: rendered }, () => ({ name: 'X', line: 1, props: {} })),
    signals: { data: false, dataHooks: [], slots: 0, region: false, primaryActions: 0, pageArea: false, domainProps: false, styledTarget: null, ...over },
  };
}
function graph(parts: { library?: Record<string, string[]>; renders?: Record<string, string[]>; routes?: string[] } = {}): Graph {
  const toMap = (o: Record<string, string[]> = {}) => new Map(Object.entries(o).map(([k, v]) => [k, new Set(v)]));
  return { importers: new Map(), library: toMap(parts.library), renders: toMap(parts.renders), routes: new Set(parts.routes ?? []), crossFeature: [] };
}
const one = (c: ComponentDef, g: Graph) => classifyAll([c], g).get(c.id);

test('single primitive wrappers are atoms', () => {
  assert.deepEqual(one(def('a.tsx#A'), graph({ library: { 'a.tsx#A': ['mui:Chip', 'icon:Close'] } })), { level: 'atom', reason: 'wraps a single primitive', confidence: 'high', smells: [] });
});

test('two atoms for one job are a molecule; four are an organism', () => {
  assert.equal(one(def('m.tsx#M'), graph({ library: { 'm.tsx#M': ['mui:Typography', 'mui:Button', 'mui:Box'] } }))?.level, 'molecule');
  assert.equal(one(def('o.tsx#O'), graph({ library: { 'o.tsx#O': ['mui:Typography', 'mui:Button', 'mui:IconButton', 'mui:Avatar'] } }))?.level, 'organism');
});

test('regions and data make organisms; routes make pages; layout-only is layout', () => {
  assert.equal(one(def('r.tsx#R', { region: true }), graph({ library: { 'r.tsx#R': ['mui:Dialog'] } }))?.level, 'organism');
  assert.match(one(def('d.tsx#D', { data: true, dataHooks: ['useQuery'] }), graph())?.reason ?? '', /binds data \(useQuery\)/);
  assert.equal(one(def('p.tsx#P'), graph({ routes: ['p.tsx#P'] }))?.level, 'page');
  assert.equal(one(def('l.tsx#L'), graph({ library: { 'l.tsx#L': ['mui:Box', 'dom:div'] } }))?.level, 'layout');
});

test('page-level areas with two slots are templates; with data they smell', () => {
  assert.equal(one(def('t.tsx#T', { pageArea: true, slots: 2 }), graph({ library: { 't.tsx#T': ['mui:Container'] } }))?.level, 'template');
  assert.deepEqual(one(def('u.tsx#U', { pageArea: true, slots: 2, data: true, dataHooks: ['useQuery'] }), graph())?.smells, ['template-with-logic']);
});

test('styled wrappers take their target level', () => {
  assert.equal(one(def('s.tsx#S', { styledTarget: 'Button' }), graph({ library: { 's.tsx#S': ['mui:Button'] } }))?.reason, 'styled wrapper of Button');
});

test('a parent is raised to its highest child', () => {
  const parent = def('p.tsx#Parent');
  const child = def('c.tsx#Child', { region: true });
  const g = graph({ library: { 'p.tsx#Parent': ['mui:Typography'], 'c.tsx#Child': ['mui:Drawer'] }, renders: { 'p.tsx#Parent': ['c.tsx#Child'] } });
  const out = classifyAll([parent, child], g).get('p.tsx#Parent');
  assert.equal(out?.level, 'organism');
  assert.match(out?.reason ?? '', /raised to organism by its children/);
  assert.equal(out?.confidence, 'medium');
});

test('molecule-level primitives, name smells and empty components', () => {
  assert.equal(one(def('a.tsx#Auto'), graph({ library: { 'a.tsx#Auto': ['mui:Autocomplete'] } }))?.level, 'molecule');
  assert.deepEqual(one(def('x.tsx#LeadsPage'), graph({ library: { 'x.tsx#LeadsPage': ['mui:Chip'] } }))?.smells, ['name-suggests-page']);
  assert.equal(one(def('e.tsx#Empty', {}, 0), graph())?.confidence, 'low');
});

test('ecosystemOf assigns layer, logic and promotion candidates', () => {
  const g = graph();
  g.importers.set('src/features/a/Card.tsx#Card', new Set(['src/features/a/x.tsx', 'src/features/b/y.tsx']));
  assert.deepEqual(ecosystemOf(def('src/features/a/Card.tsx#Card'), g, testConfig), { layer: 'recipe', logic: 'presentational', importerFiles: 2, importerModules: ['a', 'b'], promotionCandidate: true });
  assert.equal(ecosystemOf(def('src/shared/Tag.tsx#Tag'), graph(), testConfig).layer, 'core');
  assert.deepEqual(ecosystemOf(def('src/features/a/Solo.tsx#Solo', { data: true }), graph(), testConfig), { layer: 'snowflake', logic: 'smart', importerFiles: 0, importerModules: [], promotionCandidate: false });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `classify.ts`.

- [ ] **Step 3: Implement primitives and the classifier**

`src/adapters/react-mui/primitives.ts`:
```ts
export type Level = 'layout' | 'atom' | 'molecule' | 'organism' | 'template' | 'page';
export const RANK: Record<Level, number> = { layout: 0, atom: 1, molecule: 2, organism: 3, template: 4, page: 5 };
export const LEVELS: readonly Level[] = ['layout', 'atom', 'molecule', 'organism', 'template', 'page'];

const MUI: Record<'layout' | 'atom' | 'molecule' | 'organism', string[]> = {
  layout: ['Box', 'Stack', 'Grid', 'Grid2', 'Container', 'Paper', 'Card', 'CardContent', 'CardActions', 'CardMedia', 'CardActionArea', 'Divider', 'Toolbar', 'DialogTitle', 'DialogContent', 'DialogContentText', 'DialogActions', 'TableHead', 'TableBody', 'TableRow', 'TableCell', 'TableFooter', 'List', 'Collapse', 'Fade', 'Grow', 'Slide', 'Zoom', 'ClickAwayListener', 'Portal', 'Backdrop', 'ImageList', 'FormGroup', 'FormControl'],
  atom: ['Button', 'LoadingButton', 'IconButton', 'Fab', 'ToggleButton', 'TextField', 'Select', 'NativeSelect', 'InputBase', 'Input', 'OutlinedInput', 'FilledInput', 'Checkbox', 'Radio', 'Switch', 'Slider', 'Rating', 'Chip', 'Avatar', 'Badge', 'Tooltip', 'Link', 'Typography', 'SvgIcon', 'Icon', 'CircularProgress', 'LinearProgress', 'Skeleton', 'FormLabel', 'FormHelperText', 'InputLabel', 'InputAdornment', 'MenuItem', 'Tab', 'ListItemText', 'ListItemIcon', 'ListItemAvatar', 'ListSubheader'],
  molecule: ['ButtonGroup', 'ToggleButtonGroup', 'Autocomplete', 'Pagination', 'TablePagination', 'Breadcrumbs', 'Tabs', 'Stepper', 'Step', 'StepLabel', 'Alert', 'AlertTitle', 'Snackbar', 'Menu', 'MenuList', 'SpeedDial', 'DatePicker', 'TimePicker', 'DateTimePicker', 'DateRangePicker', 'ListItem', 'ListItemButton', 'FormControlLabel', 'RadioGroup', 'AvatarGroup', 'CardHeader', 'AccordionSummary', 'AccordionDetails'],
  organism: ['Dialog', 'Drawer', 'SwipeableDrawer', 'Popover', 'Popper', 'AppBar', 'Table', 'TableContainer', 'Accordion', 'TreeView', 'SimpleTreeView', 'RichTreeView', 'DataGrid', 'DataGridPro', 'LineChart', 'BarChart', 'PieChart', 'ScatterChart', 'SparkLineChart', 'Gauge'],
};
const IGNORED_MUI = new Set(['ThemeProvider', 'StyledEngineProvider', 'CssBaseline', 'GlobalStyles', 'LocalizationProvider', 'NoSsr']);
const MUI_INDEX = new Map<string, Level>(Object.entries(MUI).flatMap(([lv, names]) => names.map((n): [string, Level] => [n, lv as Level])));
const DOM: Record<string, Level> = {
  button: 'atom', input: 'atom', a: 'atom', img: 'atom', select: 'atom', textarea: 'atom', label: 'atom', svg: 'atom', p: 'atom',
  h1: 'atom', h2: 'atom', h3: 'atom', h4: 'atom', h5: 'atom', h6: 'atom',
  nav: 'organism', header: 'organism', aside: 'organism', form: 'organism', table: 'organism', dialog: 'organism',
};

export function libLevel(id: string): Level | 'icon' | null {
  const i = id.indexOf(':');
  const lib = id.slice(0, i);
  const name = id.slice(i + 1);
  if (lib === 'icon') return 'icon';
  if (lib === 'mui') return IGNORED_MUI.has(name) ? null : (MUI_INDEX.get(name) ?? 'atom');
  if (lib === 'dom') return DOM[name] ?? 'layout';
  if (lib === 'router') return name === 'Link' || name === 'NavLink' ? 'atom' : null;
  return null;
}
```

`src/inventory/classify.ts`:
```ts
import type { AppConfig } from '../config/config.ts';
import { RANK, libLevel, type Level } from '../adapters/react-mui/primitives.ts';
import type { ComponentDef } from './components.ts';
import type { Graph } from './graph.ts';
import { moduleOf, sharedRootOf } from './modules.ts';

export interface Classification { level: Level; reason: string; confidence: 'high' | 'medium' | 'low'; smells: string[] }
export interface Ecosystem { layer: 'core' | 'recipe' | 'snowflake'; logic: 'presentational' | 'smart'; importerFiles: number; importerModules: string[]; promotionCandidate: boolean }

const NAME_HINTS: Array<[RegExp, Level]> = [
  [/Page$/, 'page'],
  [/(Layout|Template|Shell)$/, 'template'],
  [/(Dialog|Drawer|Panel|Table)$/, 'organism'],
  [/(Chip|Badge|Tag|Icon|Button|Field)$/, 'atom'],
];
const NOTHING = 'renders no recognised primitives';

export function classifyAll(components: readonly ComponentDef[], g: Graph): Map<string, Classification> {
  const base = (c: ComponentDef, levels: Map<string, Level>): { level: Level; reason: string } => {
    const libs = [...(g.library.get(c.id) ?? [])].map(libLevel);
    const kids = [...(g.renders.get(c.id) ?? [])].map((id) => levels.get(id) ?? 'atom');
    const count = (lv: Level): number => libs.filter((x) => x === lv).length;
    const libAtoms = count('atom');
    const libMolecules = count('molecule');
    const libOrganisms = count('organism');
    const kidAtoms = kids.filter((k) => k === 'atom').length;
    const kidHigher = kids.filter((k) => RANK[k] >= RANK.molecule).length;
    const kidMeaningful = kids.filter((k) => k !== 'layout').length;
    const s = c.signals;
    if (s.styledTarget) {
      const target = libs.find((x): x is Level => x !== null && x !== 'icon') ?? kids[0] ?? 'atom';
      return { level: target, reason: `styled wrapper of ${s.styledTarget}` };
    }
    if (g.routes.has(c.id)) return { level: 'page', reason: 'referenced as a route element' };
    if (s.pageArea && s.slots >= 2) return { level: 'template', reason: 'page-level area with 2+ slots' };
    if (libAtoms + libMolecules + libOrganisms + kidMeaningful === 0 && !s.data) {
      return c.rendered.length > 0 ? { level: 'layout', reason: 'renders only layout primitives' } : { level: 'atom', reason: NOTHING };
    }
    if (s.data) return { level: 'organism', reason: `binds data (${s.dataHooks.join(', ')})` };
    if (s.region || libOrganisms > 0) return { level: 'organism', reason: 'renders a region (dialog, drawer, table, nav…)' };
    if (kidHigher >= 1 && kidMeaningful >= 2) return { level: 'organism', reason: 'composes 2+ in-house components including a molecule or higher' };
    if (libAtoms + kidAtoms >= 4) return { level: 'organism', reason: '4+ atoms form a section' };
    const parts = libAtoms + kidAtoms + libMolecules + kidHigher;
    if (parts >= 2 && s.primaryActions <= 1) return { level: 'molecule', reason: '2+ atoms combined for one job' };
    if (parts >= 2) return { level: 'organism', reason: 'more than one primary action' };
    if (libMolecules + kidHigher >= 1) return { level: 'molecule', reason: 'wraps a molecule-level component' };
    return { level: 'atom', reason: 'wraps a single primitive' };
  };

  let levels = new Map<string, Level>(components.map((c): [string, Level] => [c.id, 'atom']));
  for (let pass = 0; pass < 12; pass++) {
    const next = new Map<string, Level>();
    let changed = false;
    for (const c of components) {
      let level = base(c, levels).level;
      const kids = [...(g.renders.get(c.id) ?? [])].map((id) => levels.get(id) ?? 'atom');
      const top = kids.reduce<Level>((m, k) => (RANK[k] > RANK[m] ? k : m), 'layout');
      if (level !== 'page' && level !== 'template' && RANK[top] > RANK[level]) level = RANK[top] >= RANK.template ? 'organism' : top;
      if (level === 'molecule' && kids.includes('molecule') && c.signals.primaryActions > 1) level = 'organism';
      next.set(c.id, level);
      if (level !== levels.get(c.id)) changed = true;
    }
    levels = next;
    if (!changed) break;
  }

  const result = new Map<string, Classification>();
  for (const c of components) {
    const b = base(c, levels);
    const level = levels.get(c.id) ?? b.level;
    const smells: string[] = [];
    if (level === 'template' && c.signals.data) smells.push('template-with-logic');
    const hint = NAME_HINTS.find(([re]) => re.test(c.name));
    if (hint && hint[1] !== level && !(hint[1] === 'atom' && level === 'molecule')) smells.push(`name-suggests-${hint[1]}`);
    const raised = level !== b.level;
    const confidence = b.reason === NOTHING ? 'low' : raised || smells.length > 0 ? 'medium' : 'high';
    result.set(c.id, { level, reason: raised ? `${b.reason}; raised to ${level} by its children` : b.reason, confidence, smells });
  }
  return result;
}

export function ecosystemOf(c: ComponentDef, g: Graph, cfg: AppConfig): Ecosystem {
  const importers = [...(g.importers.get(c.id) ?? [])];
  const modules = [...new Set(importers.map((f) => moduleOf(f, cfg)).filter((m): m is string => m !== null))].sort();
  const shared = sharedRootOf(c.file, cfg) !== null;
  const own = moduleOf(c.file, cfg);
  return {
    layer: shared ? 'core' : importers.length >= 2 ? 'recipe' : 'snowflake',
    logic: c.signals.data ? 'smart' : 'presentational',
    importerFiles: importers.length,
    importerModules: modules,
    promotionCandidate: !shared && modules.length >= 2 && modules.some((m) => m !== own),
  };
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): classify components into atomic levels and layers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: File facts and duplicate families

**Files:**
- Create: `src/inventory/file-facts.ts`, `src/inventory/families.ts`
- Test: `test/families.test.ts`

**Interfaces:**
- Consumes: `ComponentDef`, `Graph`, `StyleBlock`, `sharedRootOf`, `isColorLiteral`, walk helpers.
- Produces: `StatusMap { line, name, entries }`, `FileFacts { file, normHash, normLength, statusMaps, copyComments }`, `normalizeSource(src)`, `collectFileFacts(ast | null, src, file)`; `FamilyKind` (`same-name | identical-files | near-duplicate-files | repeated-style-block | status-color-map | cross-feature-import | dead-shared | copy-comment`), `FamilyMember { file, line, name }`, `Family { key, kind, size, members, note }`, `FamilyInput`, `detectFamilies(input): Family[]` (sorted by key; members sorted), `shingles(src)`, `jaccard(a, b)`.
- Family keys: `same-name:<Name>`, `identical-files:<hash12>`, `near-duplicate-files:<a>|<b>`, `repeated-style-block:<hash12>`, `status-color-map:all`, `cross-feature-import:<from>-><to>`, `dead-shared:all`, `copy-comment:all`. Identical/near-duplicate checks ignore files under 200 normalised characters; near-duplicates compare same-basename files (groups ≤ 25) at Jaccard ≥ 0.85 on 5-token shingles; repeated style blocks need ≥ 3 files; status maps exclude the theme entry and `theme/` folders.

- [ ] **Step 1: Write the failing test**

`test/families.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectFileFacts } from '../src/inventory/file-facts.ts';
import { detectFamilies, jaccard, shingles } from '../src/inventory/families.ts';
import { extractStyles } from '../src/adapters/react-mui/extract.ts';
import { DEFAULT_THEME } from '../src/adapters/react-mui/units.ts';
import type { StyleBlock } from '../src/adapters/react-mui/collector.ts';
import { readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';
import { graphOf, testConfig } from './pipeline-helpers.ts';

const INBOX = `import { List, ListItem, ListItemText } from '@mui/material';
export interface InboxItem { id: string; from: string; preview: string }
export function Inbox({ items }: { items: InboxItem[] }) {
  return (<List dense>{items.map((item) => (<ListItem key={item.id} divider><ListItemText primary={item.from} secondary={item.preview} /></ListItem>))}</List>);
}`;
const STYLE_USER = (name: string) => `const S = { p: 1, m: 2, gap: 1 };\nexport function ${name}() { return <div sx={S} />; }`;
const SOURCES: Record<string, string> = {
  'src/shared/dead.tsx': `export function Dead() { return <div>never used</div>; }`,
  'src/features/a/Chip.tsx': `export function StatusChip() { return <span />; }\n// copied from b/Chip.tsx\nconst TONES = { open: 'success', won: 'info', lost: 'error' };`,
  'src/features/b/Chip.tsx': `export function StatusChip() { return <b />; }\nconst MAP = { x: '#111', y: '#222', z: '#333' };`,
  'src/features/c/Inbox.tsx': INBOX,
  'src/features/d/Inbox.tsx': INBOX,
  'src/features/e/x.tsx': `import { StatusChip } from '../a/Chip';\n${STYLE_USER('X')}\nexport function X2() { return <StatusChip />; }`,
  'src/features/e/y.tsx': STYLE_USER('Y'),
  'src/features/f/z.tsx': STYLE_USER('Z'),
};

function families() {
  const { components, graph } = graphOf(SOURCES);
  const blocks = new Map<string, StyleBlock[]>();
  const facts = Object.entries(SOURCES).map(([f, s]) => {
    const ast = file(s, f);
    const ex = extractStyles(ast, s, f, readImports(ast), DEFAULT_THEME);
    if (ex.blocks.length) blocks.set(f, ex.blocks);
    return collectFileFacts(ast, s, f);
  });
  return detectFamilies({ facts, sources: new Map(Object.entries(SOURCES)), blocks, components, graph, cfg: testConfig });
}
const byKey = (fs: ReturnType<typeof families>, key: string) => fs.find((f) => f.key === key);

test('same-name, identical files and dead shared components are found', () => {
  const fs = families();
  assert.equal(byKey(fs, 'same-name:StatusChip')?.size, 2);
  assert.equal(byKey(fs, 'same-name:Inbox')?.size, 2);
  const identical = fs.find((f) => f.kind === 'identical-files');
  assert.deepEqual(identical?.members.map((m) => m.file), ['src/features/c/Inbox.tsx', 'src/features/d/Inbox.tsx']);
  assert.deepEqual(byKey(fs, 'dead-shared:all')?.members.map((m) => m.name), ['Dead']);
});

test('repeated style blocks, status maps, cross-feature imports and copy comments are found', () => {
  const fs = families();
  const block = fs.find((f) => f.kind === 'repeated-style-block');
  assert.deepEqual(block?.members.map((m) => m.file), ['src/features/e/x.tsx', 'src/features/e/y.tsx', 'src/features/f/z.tsx']);
  assert.equal(byKey(fs, 'status-color-map:all')?.size, 2);
  assert.equal(byKey(fs, 'cross-feature-import:e->a')?.size, 1);
  assert.deepEqual(byKey(fs, 'copy-comment:all')?.members.map((m) => [m.file, m.line]), [['src/features/a/Chip.tsx', 2]]);
});

test('families are sorted by key', () => {
  const keys = families().map((f) => f.key);
  assert.deepEqual(keys, [...keys].sort());
});

test('shingles and jaccard measure similarity', () => {
  assert.equal(shingles('a b c d e f').size, 2);
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])), 1 / 3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `file-facts.ts`.

- [ ] **Step 3: Implement file facts and families**

`src/inventory/file-facts.ts`:
```ts
import type { N } from '../parse/parse.ts';
import { walk, lineOf, unwrap } from '../parse/walk.ts';
import { keyName } from '../parse/literal.ts';
import { isColorLiteral } from '../adapters/react-mui/units.ts';
import { sha1 } from '../util/hash.ts';

export interface StatusMap { line: number; name: string | null; entries: number }
export interface FileFacts { file: string; normHash: string; normLength: number; statusMaps: StatusMap[]; copyComments: Array<{ line: number; text: string }> }

const STATUS_TONES = new Set(['success', 'error', 'warning', 'info', 'primary', 'secondary', 'default', 'neutral', 'danger']);
const COPY_RE = /\b(copied|copy of|copies|duplicated?|cloned?|ported|mirrors?)\b.{0,40}\b(from|of)\b|\bsame (shape|as)\b/i;

export function normalizeSource(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').replace(/\s+/g, ' ').trim();
}

function isColorValue(v: N | null): boolean {
  if (!v) return false;
  if (v.type === 'StringLiteral') {
    const s = String(v.value).trim();
    return isColorLiteral(s) || STATUS_TONES.has(s) || /^(success|error|warning|info|primary|secondary|grey|text)\.\w+$/.test(s);
  }
  if (v.type === 'ObjectExpression') {
    return v.properties.some((p: N) => p.type === 'ObjectProperty' && /^(color|bg|bgcolor|background|backgroundColor|fg|text|border|borderColor|main|light|dark)$/.test(keyName(p) ?? '') && isColorValue(unwrap(p.value)));
  }
  return false;
}

export function collectFileFacts(ast: N | null, src: string, file: string): FileFacts {
  const norm = normalizeSource(src);
  const statusMaps: StatusMap[] = [];
  const copyComments: Array<{ line: number; text: string }> = [];
  if (ast) {
    walk(ast, (n, parents) => {
      if (n.type !== 'ObjectExpression') return;
      const props = n.properties.filter((p: N) => p.type === 'ObjectProperty' && keyName(p) !== null);
      if (props.length < 3) return;
      const colorish = props.filter((p: N) => isColorValue(unwrap(p.value))).length;
      if (colorish < 3) return;
      let k = parents.length - 1;
      while (k >= 0 && /^(TS|Parenthesized)/.test(parents[k].type)) k--;
      const holder = k >= 0 ? parents[k] : null;
      statusMaps.push({ line: lineOf(n), name: holder?.type === 'VariableDeclarator' && holder.id.type === 'Identifier' ? holder.id.name : null, entries: colorish });
      return 'skip';
    });
    for (const c of ast.comments ?? []) if (COPY_RE.test(c.value)) copyComments.push({ line: lineOf(c), text: String(c.value).trim().slice(0, 120) });
  }
  return { file, normHash: sha1(norm), normLength: norm.length, statusMaps, copyComments };
}
```

`src/inventory/families.ts`:
```ts
import type { AppConfig } from '../config/config.ts';
import type { StyleBlock } from '../adapters/react-mui/collector.ts';
import type { ComponentDef } from './components.ts';
import type { Graph } from './graph.ts';
import { sharedRootOf } from './modules.ts';
import { normalizeSource, type FileFacts } from './file-facts.ts';

export type FamilyKind = 'same-name' | 'identical-files' | 'near-duplicate-files' | 'repeated-style-block' | 'status-color-map' | 'cross-feature-import' | 'dead-shared' | 'copy-comment';
export interface FamilyMember { file: string; line: number | null; name: string | null }
export interface Family { key: string; kind: FamilyKind; size: number; members: FamilyMember[]; note: string }
export interface FamilyInput {
  facts: FileFacts[];
  sources: ReadonlyMap<string, string>;
  blocks: ReadonlyMap<string, StyleBlock[]>;
  components: readonly ComponentDef[];
  graph: Graph;
  cfg: AppConfig;
}

const MIN_DUP_LENGTH = 200;

export function shingles(src: string, size = 5): Set<string> {
  const toks = normalizeSource(src).match(/\w+|[^\s\w]/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + size <= toks.length; i++) out.add(toks.slice(i, i + size).join(' '));
  return out;
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function groupBy<T>(items: readonly T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it); else m.set(k, [it]);
  }
  return m;
}

export function detectFamilies(inp: FamilyInput): Family[] {
  const fams: Family[] = [];
  const push = (key: string, kind: FamilyKind, members: FamilyMember[], note: string): void => {
    const seen = new Set<string>();
    const list: FamilyMember[] = [];
    for (const m of members) {
      const k = `${m.file}|${m.line}|${m.name}`;
      if (!seen.has(k)) { seen.add(k); list.push(m); }
    }
    list.sort((a, b) => (a.file !== b.file ? (a.file < b.file ? -1 : 1) : (a.line ?? 0) - (b.line ?? 0)));
    if (list.length) fams.push({ key, kind, size: list.length, members: list, note });
  };

  for (const [name, defs] of groupBy(inp.components, (c) => c.name)) {
    const files = new Set(defs.map((d) => d.file));
    if (files.size >= 2) push(`same-name:${name}`, 'same-name', defs.map((d) => ({ file: d.file, line: d.line, name })), `${name} is defined in ${files.size} files`);
  }

  const big = inp.facts.filter((f) => f.normLength >= MIN_DUP_LENGTH);
  for (const [hash, fs] of groupBy(big, (f) => f.normHash)) {
    if (fs.length >= 2) push(`identical-files:${hash.slice(0, 12)}`, 'identical-files', fs.map((f) => ({ file: f.file, line: null, name: null })), `${fs.length} files are identical apart from whitespace and comments`);
  }

  const shingleCache = new Map<string, Set<string>>();
  const sh = (f: string): Set<string> => { let s = shingleCache.get(f); if (!s) { s = shingles(inp.sources.get(f) ?? ''); shingleCache.set(f, s); } return s; };
  for (const [, fs] of groupBy(big, (f) => f.file.split('/').pop() ?? f.file)) {
    if (fs.length < 2 || fs.length > 25) continue;
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        const a = fs[i];
        const b = fs[j];
        if (a.normHash === b.normHash) continue;
        const sim = jaccard(sh(a.file), sh(b.file));
        if (sim >= 0.85) push(`near-duplicate-files:${a.file}|${b.file}`, 'near-duplicate-files', [{ file: a.file, line: null, name: null }, { file: b.file, line: null, name: null }], `${Math.round(sim * 100)}% similar`);
      }
    }
  }

  const blockGroups = new Map<string, FamilyMember[]>();
  for (const [file, bs] of inp.blocks) for (const b of bs) blockGroups.set(b.hash, [...(blockGroups.get(b.hash) ?? []), { file, line: b.line, name: null }]);
  for (const [hash, ms] of blockGroups) {
    const files = new Set(ms.map((m) => m.file)).size;
    if (files >= 3) push(`repeated-style-block:${hash}`, 'repeated-style-block', ms, `The same style block appears in ${files} files`);
  }

  const themeFile = inp.cfg.themeEntry;
  const maps = inp.facts
    .filter((f) => f.file !== themeFile && !/(^|\/)theme\//.test(f.file))
    .flatMap((f) => f.statusMaps.map((m) => ({ file: f.file, line: m.line, name: m.name })));
  if (maps.length >= 2) push('status-color-map:all', 'status-color-map', maps, `${maps.length} separate status-to-colour maps`);

  for (const [k, xs] of groupBy(inp.graph.crossFeature, (x) => `${x.fromModule}->${x.toModule}`)) {
    const [from, to] = k.split('->');
    push(`cross-feature-import:${k}`, 'cross-feature-import', xs.map((x) => ({ file: x.from, line: null, name: x.to })), `${xs.length} import(s) from ${from} reach into ${to}`);
  }

  const renderedIds = new Set([...inp.graph.renders.values()].flatMap((s) => [...s]));
  const dead = inp.components.filter((c) => sharedRootOf(c.file, inp.cfg) !== null && !(inp.graph.importers.get(c.id)?.size) && !renderedIds.has(c.id));
  if (dead.length) push('dead-shared:all', 'dead-shared', dead.map((c) => ({ file: c.file, line: c.line, name: c.name })), `${dead.length} shared component(s) have no consumers`);

  const copies = inp.facts.flatMap((f) => f.copyComments.map((c) => ({ file: f.file, line: c.line, name: c.text })));
  if (copies.length) push('copy-comment:all', 'copy-comment', copies, `${copies.length} comment(s) say the code was copied`);

  return fams.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): detect duplicate families across the codebase" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Module scorecard

**Files:**
- Create: `src/inventory/scorecard.ts`
- Test: `test/scorecard.test.ts`

**Interfaces:**
- Consumes: `Sample`, `ComponentDef`, `moduleOf`, `AppConfig`.
- Produces: `ModuleScore { module, files, loc, components, samples, rawPerKloc, tokenDiscipline, i18nCoverage, testRatio, lastCommit }`, `isRawSample(s)`, `isThemeSample(s)`, `scoreModules(input): ModuleScore[]` (sorted by module; files outside module and shared roots are grouped as `(other)`; `lastCommit` uses `git log -1 --format=%cs` only when `git` is true).
- Focus kinds for token discipline: spacing, radius, fontSize, fontWeight, color, shadow. Raw = `raw-color | px | rem | em | literal`, plus `unitless` font weights. Theme = `theme | theme-ref`.

- [ ] **Step 1: Write the failing test**

`test/scorecard.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRawSample, isThemeSample, scoreModules } from '../src/inventory/scorecard.ts';
import type { Sample } from '../src/adapters/react-mui/collector.ts';
import type { Kind, ValueClass } from '../src/adapters/react-mui/units.ts';
import { testConfig } from './pipeline-helpers.ts';
import { tmpDir } from './helpers.ts';

const s = (file: string, cls: ValueClass, kind: Kind = 'spacing'): Sample => ({ file, line: 1, ctx: 'sx', kind, property: 'p', raw: '1', cls, px: 8, element: null, conditional: false, responsive: false, selector: false });

test('raw and theme samples are told apart', () => {
  assert.equal(isRawSample(s('a', 'px')), true);
  assert.equal(isRawSample(s('a', 'unitless', 'fontWeight')), true);
  assert.equal(isRawSample(s('a', 'px', 'size')), false);
  assert.equal(isThemeSample(s('a', 'theme-ref', 'color')), true);
});

test('scoreModules reports size, token discipline, i18n and tests per module', () => {
  const files = [
    { file: 'src/features/a/x.tsx', src: "const { t } = useTranslation();\nline2\nline3" },
    { file: 'src/features/a/y.tsx', src: 'no i18n' },
    { file: 'src/shared/z.tsx', src: 'z' },
  ];
  const samples = [s('src/features/a/x.tsx', 'theme'), s('src/features/a/x.tsx', 'px'), s('src/features/a/y.tsx', 'raw-color', 'color'), s('src/shared/z.tsx', 'theme')];
  const out = scoreModules({ files, samples, components: [], testFiles: ['src/features/a/x.test.tsx'], cfg: testConfig, appRootAbs: tmpDir(), git: false });
  assert.deepEqual(out.map((m) => m.module), ['a', 'shared']);
  assert.deepEqual(out[0], { module: 'a', files: 2, loc: 4, components: 0, samples: 3, rawPerKloc: 500, tokenDiscipline: 0.333, i18nCoverage: 0.5, testRatio: 0.5, lastCommit: null });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `scorecard.ts`.

- [ ] **Step 3: Implement the scorecard**

`src/inventory/scorecard.ts`:
```ts
import { execFileSync } from 'node:child_process';
import type { AppConfig } from '../config/config.ts';
import type { Sample } from '../adapters/react-mui/collector.ts';
import type { Kind } from '../adapters/react-mui/units.ts';
import type { ComponentDef } from './components.ts';
import { moduleOf } from './modules.ts';

export interface ModuleScore {
  module: string;
  files: number;
  loc: number;
  components: number;
  samples: number;
  rawPerKloc: number;
  tokenDiscipline: number | null;
  i18nCoverage: number | null;
  testRatio: number;
  lastCommit: string | null;
}
export interface ScoreInput {
  files: ReadonlyArray<{ file: string; src: string }>;
  samples: readonly Sample[];
  components: readonly ComponentDef[];
  testFiles: readonly string[];
  cfg: AppConfig;
  appRootAbs: string;
  git: boolean;
}

const FOCUS = new Set<Kind>(['spacing', 'radius', 'fontSize', 'fontWeight', 'color', 'shadow']);
const RAW = new Set(['raw-color', 'px', 'rem', 'em', 'literal']);
const I18N_RE = /\buseTranslation\b|\bi18n\.t\(|\bt\(\s*['"`]|<Trans\b|\bwithTranslation\b/;
const round = (n: number, d: number): number => Math.round(n * 10 ** d) / 10 ** d;

export function isRawSample(s: Sample): boolean {
  return FOCUS.has(s.kind) && (RAW.has(s.cls) || (s.kind === 'fontWeight' && s.cls === 'unitless'));
}

export function isThemeSample(s: Sample): boolean {
  return FOCUS.has(s.kind) && (s.cls === 'theme' || s.cls === 'theme-ref');
}

function lastCommit(appRootAbs: string, dirs: string[]): string | null {
  if (dirs.length === 0) return null;
  try {
    const out = execFileSync('git', ['-C', appRootAbs, 'log', '-1', '--format=%cs', '--', ...dirs], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function scoreModules(inp: ScoreInput): ModuleScore[] {
  const mod = (f: string): string => moduleOf(f, inp.cfg) ?? '(other)';
  const groups = new Map<string, { files: string[]; loc: number; tsx: number; i18n: number }>();
  for (const { file, src } of inp.files) {
    const key = mod(file);
    const g = groups.get(key) ?? { files: [], loc: 0, tsx: 0, i18n: 0 };
    g.files.push(file);
    g.loc += src.split('\n').length;
    if (/\.(tsx|jsx)$/.test(file)) { g.tsx++; if (I18N_RE.test(src)) g.i18n++; }
    groups.set(key, g);
  }
  const samplesBy = new Map<string, Sample[]>();
  for (const s of inp.samples) { const k = mod(s.file); samplesBy.set(k, [...(samplesBy.get(k) ?? []), s]); }
  const dirsOf = (module: string, files: string[]): string[] => {
    if (module === '(other)') return [];
    if (module === 'shared') return inp.cfg.modules.shared;
    const root = inp.cfg.modules.roots.find((r) => files[0]?.startsWith(`${r.replace(/\/+$/, '')}/`));
    return root ? [`${root.replace(/\/+$/, '')}/${module}`] : [];
  };
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([module, g]) => {
      const ss = samplesBy.get(module) ?? [];
      const raw = ss.filter(isRawSample).length;
      const themed = ss.filter(isThemeSample).length;
      return {
        module,
        files: g.files.length,
        loc: g.loc,
        components: inp.components.filter((c) => mod(c.file) === module).length,
        samples: ss.length,
        rawPerKloc: round(raw / Math.max(g.loc / 1000, 0.001), 1),
        tokenDiscipline: raw + themed > 0 ? round(themed / (raw + themed), 3) : null,
        i18nCoverage: g.tsx > 0 ? round(g.i18n / g.tsx, 3) : null,
        testRatio: round(inp.testFiles.filter((t) => mod(t) === module).length / g.files.length, 3),
        lastCommit: inp.git ? lastCommit(inp.appRootAbs, dirsOf(module, g.files)) : null,
      };
    });
}
```

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit** (from the repo root)

```bash
git add plugins/design-studio/engine
git commit -m "feat(design-studio): score modules for token discipline, i18n and tests" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Registry, report, pipeline and the `inventory` command

**Files:**
- Create: `src/schemas/registry.ts`, `src/inventory/registry.ts`, `src/inventory/report.ts`, `src/inventory/run.ts`, `src/commands/inventory.ts`
- Modify: `src/schemas/index.ts`, `src/commands.ts`
- Modify: `docs/superpowers/specs/2026-09-29-design-studio-design.md` §5.7 (align field names with the implementation)
- Create (generated): `plugins/design-studio/schemas/registry.schema.json`
- Test: `test/run.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–14.
- Produces: `registrySchema`; `ComponentEntry` (incl. `families`: keys of the duplicate families the component belongs to, and `quality`: raw vs theme style values inside its line range), `PrimitiveStat`, `Metrics`, `Registry` (spec §5.7), `buildRegistry(input): Registry`; `renderReport(registry): string`; `InventoryOptions { appRootAbs, cfg, git }`, `InventoryResult { registry, samples, report }`, `runInventory(opts)`, `writeInventory(result, outDir)` (writes `registry.json`, `samples.jsonl`, `report.md`); `inventoryCommand` registered as `inventory` (`--app` required; `--config` or `<app>/design-system/design-studio.config.json`; `--out` defaults to `<config dir>/inventory`; without a config, `--out` is required and the detected config is used; `--no-git` skips commit dates).

- [ ] **Step 1: Write the failing test**

`test/run.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInventory } from '../src/inventory/run.ts';
import { registrySchema } from '../src/schemas/registry.ts';
import { makeValidator } from '../src/schemas/validate.ts';
import { detectStack, proposeConfig } from '../src/detect/detect.ts';
import { main } from '../src/cli.ts';
import { tmpDir, writeTree } from './helpers.ts';

function tinyApp(): string {
  const root = tmpDir();
  writeTree(root, {
    'package.json': '{"name":"tiny","dependencies":{"@mui/material":"^7.0.0","react":"^19.0.0"}}',
    'src/theme/index.ts': `import { createTheme } from '@mui/material/styles';\nexport const theme = createTheme({ spacing: 4 });`,
    'src/components/a/A.tsx': `import { Box, Typography } from '@mui/material';\nexport function A() { return <Box sx={{ p: 2, color: '#123456' }}><Typography>Hi</Typography></Box>; }`,
    'src/components/a/A.test.tsx': `test('a', () => {});`,
    'src/common/components/B.tsx': `import Chip from '@mui/material/Chip';\nexport const B = () => <Chip />;`,
  });
  return root;
}
const validateRegistry = makeValidator(registrySchema);

test('runInventory produces a schema-valid registry with theme-aware samples', () => {
  const root = tinyApp();
  const { registry, samples, report } = runInventory({ appRootAbs: root, cfg: proposeConfig(detectStack(root), root), git: false });
  assert.deepEqual(validateRegistry(registry), []);
  assert.deepEqual(registry.theme, { spacingUnit: 4, radiusUnit: 4, source: 'static' });
  assert.equal(registry.inputs.files, 3);
  assert.equal(registry.metrics.components, 2);
  assert.equal(samples.find((s) => s.property === 'p')?.px, 8);
  assert.equal(registry.modules.find((m) => m.module === 'a')?.testRatio, 1);
  assert.deepEqual(registry.components.map((c) => c.id), ['src/common/components/B.tsx#B', 'src/components/a/A.tsx#A']);
  assert.match(report, /^# Interface inventory: tiny/);
  assert.match(report, /## Module scorecard/);
});

test('the inventory command writes registry, samples and report to --out', async () => {
  const root = tinyApp();
  const out = join(tmpDir(), 'inv');
  const lines: string[] = [];
  const code = await main(['inventory', '--app', root, '--out', out, '--no-git'], { out: (s) => { lines.push(s); }, err: () => {} });
  assert.equal(code, 0);
  for (const f of ['registry.json', 'samples.jsonl', 'report.md']) assert.ok(existsSync(join(out, f)), `${f} missing`);
  assert.match(lines[0], /^inventory: 3 files, 2 components/);
});

test('the inventory command needs a config or --out', async () => {
  const err: string[] = [];
  assert.equal(await main(['inventory', '--app', tinyApp()], { out: () => {}, err: (s) => { err.push(s); } }), 2);
  assert.match(err[0], /--out/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — cannot find `run.ts`.

- [ ] **Step 3: Implement the registry schema**

`src/schemas/registry.ts`:
```ts
const str = { type: 'string' } as const;
const strArr = { type: 'array', items: { type: 'string' } } as const;
const count = { type: 'integer', minimum: 0 } as const;
const ratio = { type: ['number', 'null'], minimum: 0, maximum: 1 } as const;
const LEVEL = ['layout', 'atom', 'molecule', 'organism', 'template', 'page'] as const;
const FAMILY_KINDS = ['same-name', 'identical-files', 'near-duplicate-files', 'repeated-style-block', 'status-color-map', 'cross-feature-import', 'dead-shared', 'copy-comment'] as const;

export const registrySchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://github.com/shironigun/claude-marketplace/plugins/design-studio/schemas/registry.schema.json',
  title: 'design-studio inventory registry',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'engine', 'app', 'inputs', 'theme', 'metrics', 'components', 'families', 'modules', 'primitives', 'parseErrors'],
  properties: {
    schemaVersion: { const: 1 },
    engine: str,
    app: { type: 'object', additionalProperties: false, required: ['product', 'appRoot', 'adapter'], properties: { product: str, appRoot: str, adapter: str } },
    inputs: { type: 'object', additionalProperties: false, required: ['files', 'hash'], properties: { files: count, hash: { type: 'string', pattern: '^[0-9a-f]{40}$' } } },
    theme: {
      type: 'object', additionalProperties: false, required: ['spacingUnit', 'radiusUnit', 'source'],
      properties: { spacingUnit: { type: 'number' }, radiusUnit: { type: 'number' }, source: { enum: ['static', 'default'] } },
    },
    metrics: {
      type: 'object', additionalProperties: false, required: ['files', 'components', 'byLevel', 'samples', 'tokenCoverage', 'distinct', 'families'],
      properties: {
        files: count, components: count, samples: count, families: count, tokenCoverage: ratio,
        byLevel: { type: 'object', additionalProperties: false, required: [...LEVEL], properties: Object.fromEntries(LEVEL.map((l) => [l, count])) },
        distinct: { type: 'object', additionalProperties: false, required: ['colors', 'fontSizes', 'radii', 'spacing', 'shadows'], properties: { colors: count, fontSizes: count, radii: count, spacing: count, shadows: count } },
      },
    },
    components: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'name', 'file', 'line', 'loc', 'exportNames', 'module', 'shared', 'level', 'levelReason', 'confidence', 'evidence', 'smells', 'layer', 'logic', 'wraps', 'uses', 'importers', 'promotionCandidate', 'families', 'quality', 'signals'],
        properties: {
          id: str, name: str, file: str, line: count, loc: count, exportNames: strArr, module: { type: ['string', 'null'] }, shared: { type: 'boolean' },
          level: { enum: [...LEVEL] }, levelReason: str, confidence: { enum: ['high', 'medium', 'low'] }, evidence: { enum: ['CONFIRMED', 'INFERRED'] },
          smells: strArr, layer: { enum: ['core', 'recipe', 'snowflake'] }, logic: { enum: ['presentational', 'smart'] }, wraps: strArr, uses: strArr,
          importers: { type: 'object', additionalProperties: false, required: ['files', 'modules'], properties: { files: count, modules: strArr } },
          promotionCandidate: { type: 'boolean' },
          families: strArr,
          quality: { type: 'object', additionalProperties: false, required: ['rawValues', 'themeValues'], properties: { rawValues: count, themeValues: count } },
          signals: { type: 'object', required: ['data', 'dataHooks', 'slots', 'region', 'primaryActions', 'pageArea', 'domainProps', 'styledTarget'] },
        },
      },
    },
    families: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['key', 'kind', 'size', 'members', 'note'],
        properties: {
          key: str, kind: { enum: [...FAMILY_KINDS] }, size: count, note: str,
          members: { type: 'array', minItems: 1, items: { type: 'object', additionalProperties: false, required: ['file', 'line', 'name'], properties: { file: str, line: { type: ['integer', 'null'] }, name: { type: ['string', 'null'] } } } },
        },
      },
    },
    modules: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['module', 'files', 'loc', 'components', 'samples', 'rawPerKloc', 'tokenDiscipline', 'i18nCoverage', 'testRatio', 'lastCommit'],
        properties: { module: str, files: count, loc: count, components: count, samples: count, rawPerKloc: { type: 'number', minimum: 0 }, tokenDiscipline: ratio, i18nCoverage: ratio, testRatio: { type: 'number', minimum: 0 }, lastCommit: { type: ['string', 'null'] } },
      },
    },
    primitives: {
      type: 'object',
      additionalProperties: { type: 'object', additionalProperties: false, required: ['count', 'props'], properties: { count, props: { type: 'object', additionalProperties: { type: 'object', additionalProperties: count } } } },
    },
    parseErrors: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['file', 'message'], properties: { file: str, message: str } } },
  },
} as const;
```

Replace `src/schemas/index.ts` with:
```ts
import { configSchema } from './config.ts';
import { registrySchema } from './registry.ts';

export const SCHEMAS: Record<string, object> = { config: configSchema, registry: registrySchema };
```

- [ ] **Step 4: Implement the registry builder, report and pipeline**

`src/inventory/registry.ts`:
```ts
import { VERSION } from '../version.ts';
import { sha1 } from '../util/hash.ts';
import type { AppConfig } from '../config/config.ts';
import type { ThemeFacts } from '../adapters/react-mui/units.ts';
import type { Sample } from '../adapters/react-mui/collector.ts';
import type { PrimitiveUse } from '../adapters/react-mui/extract.ts';
import { LEVELS, type Level } from '../adapters/react-mui/primitives.ts';
import type { ComponentDef, ComponentSignals } from './components.ts';
import type { Graph } from './graph.ts';
import { ecosystemOf, type Classification } from './classify.ts';
import type { Family } from './families.ts';
import { isRawSample, isThemeSample, type ModuleScore } from './scorecard.ts';
import { moduleOf, sharedRootOf } from './modules.ts';

export interface ComponentEntry {
  id: string; name: string; file: string; line: number; loc: number; exportNames: string[];
  module: string | null; shared: boolean;
  level: Level; levelReason: string; confidence: 'high' | 'medium' | 'low'; evidence: 'CONFIRMED' | 'INFERRED'; smells: string[];
  layer: 'core' | 'recipe' | 'snowflake'; logic: 'presentational' | 'smart';
  wraps: string[]; uses: string[]; importers: { files: number; modules: string[] }; promotionCandidate: boolean;
  families: string[]; quality: { rawValues: number; themeValues: number };
  signals: ComponentSignals;
}
export interface PrimitiveStat { count: number; props: Record<string, Record<string, number>> }
export interface Metrics {
  files: number; components: number; byLevel: Record<Level, number>; samples: number; tokenCoverage: number | null;
  distinct: { colors: number; fontSizes: number; radii: number; spacing: number; shadows: number }; families: number;
}
export interface Registry {
  schemaVersion: 1; engine: string;
  app: { product: string; appRoot: string; adapter: string };
  inputs: { files: number; hash: string };
  theme: ThemeFacts; metrics: Metrics; components: ComponentEntry[]; families: Family[]; modules: ModuleScore[];
  primitives: Record<string, PrimitiveStat>; parseErrors: Array<{ file: string; message: string }>;
}
export interface BuildInput {
  cfg: AppConfig; files: string[]; sources: ReadonlyMap<string, string>; theme: ThemeFacts; components: ComponentDef[];
  levels: Map<string, Classification>; graph: Graph; families: Family[]; modules: ModuleScore[]; primitives: PrimitiveUse[];
  samples: Sample[]; parseErrors: Array<{ file: string; message: string }>;
}

export function buildRegistry(i: BuildInput): Registry {
  const familyIndex = new Map<string, string[]>();
  for (const f of i.families) {
    for (const m of f.members) {
      const k = m.line === null ? m.file : `${m.file}:${m.line}`;
      familyIndex.set(k, [...(familyIndex.get(k) ?? []), f.key]);
    }
  }
  const samplesByFile = new Map<string, Sample[]>();
  for (const s of i.samples) samplesByFile.set(s.file, [...(samplesByFile.get(s.file) ?? []), s]);
  const components = i.components
    .map((c): ComponentEntry => {
      const fallback: Classification = { level: 'atom', reason: 'unclassified', confidence: 'low', smells: [] };
      const cl: Classification = i.levels.get(c.id) ?? fallback;
      const eco = ecosystemOf(c, i.graph, i.cfg);
      const inside = (samplesByFile.get(c.file) ?? []).filter((s) => s.line >= c.line && s.line < c.line + c.loc);
      const families = [...new Set([...(familyIndex.get(`${c.file}:${c.line}`) ?? []), ...(familyIndex.get(c.file) ?? [])])].sort();
      return {
        id: c.id, name: c.name, file: c.file, line: c.line, loc: c.loc, exportNames: c.exportNames,
        module: moduleOf(c.file, i.cfg), shared: sharedRootOf(c.file, i.cfg) !== null,
        level: cl.level, levelReason: cl.reason, confidence: cl.confidence, evidence: cl.confidence === 'high' ? 'CONFIRMED' : 'INFERRED', smells: cl.smells,
        layer: eco.layer, logic: eco.logic,
        wraps: [...(i.graph.library.get(c.id) ?? [])].sort(), uses: [...(i.graph.renders.get(c.id) ?? [])].sort(),
        importers: { files: eco.importerFiles, modules: eco.importerModules }, promotionCandidate: eco.promotionCandidate,
        families,
        quality: { rawValues: inside.filter(isRawSample).length, themeValues: inside.filter(isThemeSample).length },
        signals: c.signals,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
  for (const c of components) byLevel[c.level]++;
  const primitives: Record<string, PrimitiveStat> = {};
  for (const p of i.primitives) {
    const stat = (primitives[p.name] ??= { count: 0, props: {} });
    stat.count++;
    for (const [k, v] of Object.entries(p.props)) { const bucket = (stat.props[k] ??= {}); bucket[v] = (bucket[v] ?? 0) + 1; }
  }
  const raw = i.samples.filter(isRawSample);
  const themed = i.samples.filter(isThemeSample);
  const distinct = (kind: string, val: (s: Sample) => string | number | null): number => new Set(raw.filter((s) => s.kind === kind).map(val).filter((v) => v !== null)).size;
  return {
    schemaVersion: 1,
    engine: VERSION,
    app: { product: i.cfg.product, appRoot: i.cfg.appRoot, adapter: i.cfg.adapter },
    inputs: { files: i.files.length, hash: sha1(i.files.map((f) => `${f}\n${sha1(i.sources.get(f) ?? '')}`).join('\n')) },
    theme: i.theme,
    metrics: {
      files: i.files.length,
      components: components.length,
      byLevel,
      samples: i.samples.length,
      tokenCoverage: raw.length + themed.length > 0 ? Math.round((themed.length / (raw.length + themed.length)) * 1000) / 1000 : null,
      distinct: {
        colors: distinct('color', (s) => s.raw),
        fontSizes: distinct('fontSize', (s) => s.px),
        radii: distinct('radius', (s) => s.px),
        spacing: distinct('spacing', (s) => s.px),
        shadows: distinct('shadow', (s) => s.raw),
      },
      families: i.families.length,
    },
    components,
    families: i.families,
    modules: i.modules,
    primitives,
    parseErrors: [...i.parseErrors].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)),
  };
}
```

`src/inventory/report.ts`:
```ts
import type { Registry } from './registry.ts';

const pct = (n: number | null): string => (n === null ? 'n/a' : `${Math.round(n * 100)}%`);
const esc = (s: string): string => s.replace(/\|/g, '\\|');

export function renderReport(r: Registry): string {
  const L: string[] = [];
  L.push(`# Interface inventory: ${r.app.product}`, '');
  L.push(`Engine ${r.engine} · ${r.metrics.files} files · ${r.metrics.components} components · ${r.metrics.samples} style values · ${r.metrics.families} duplicate families`, '');
  L.push('## Components by atomic level', '', '| Level | Count |', '|---|---:|');
  for (const lv of ['page', 'template', 'organism', 'molecule', 'atom', 'layout'] as const) L.push(`| ${lv} | ${r.metrics.byLevel[lv]} |`);
  L.push('', '## Most-used components', '', '| Component | Level | Layer | Importing files | Modules | File |', '|---|---|---|---:|---:|---|');
  const top = [...r.components].filter((c) => c.importers.files > 0).sort((a, b) => b.importers.files - a.importers.files || (a.id < b.id ? -1 : 1)).slice(0, 25);
  for (const c of top) L.push(`| ${esc(c.name)} | ${c.level} | ${c.layer} | ${c.importers.files} | ${c.importers.modules.length} | \`${c.file}:${c.line}\` |`);
  const promo = r.components.filter((c) => c.promotionCandidate);
  L.push('', '## Promotion candidates', '');
  if (promo.length === 0) L.push('_None._');
  for (const c of promo) L.push(`- **${esc(c.name)}** (${c.level}) in \`${c.file}\` is used by ${c.importers.modules.join(', ')}`);
  L.push('', '## Duplicate families (largest 30)', '', '| Family | Kind | Size | Note |', '|---|---|---:|---|');
  for (const f of [...r.families].sort((a, b) => b.size - a.size || (a.key < b.key ? -1 : 1)).slice(0, 30)) L.push(`| \`${esc(f.key)}\` | ${f.kind} | ${f.size} | ${esc(f.note)} |`);
  const d = r.metrics.distinct;
  L.push('', '## Foundations in use', '');
  L.push(`- Token coverage: ${pct(r.metrics.tokenCoverage)} of colour, type, spacing, radius and shadow values use the theme`);
  L.push(`- Distinct values outside the theme: ${d.colors} colours, ${d.fontSizes} font sizes, ${d.radii} radii, ${d.spacing} spacing values, ${d.shadows} shadows`);
  L.push(`- Theme facts: spacing unit ${r.theme.spacingUnit}px, radius unit ${r.theme.radiusUnit}px (${r.theme.source === 'static' ? 'read from the theme file' : 'library defaults; not set in the theme file'})`);
  L.push('', '## Module scorecard', '', '| Module | Files | LOC | Components | Raw values per kLOC | Token discipline | i18n | Tests | Last commit |', '|---|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const m of r.modules) L.push(`| ${esc(m.module)} | ${m.files} | ${m.loc} | ${m.components} | ${m.rawPerKloc} | ${pct(m.tokenDiscipline)} | ${pct(m.i18nCoverage)} | ${pct(m.testRatio)} | ${m.lastCommit ?? 'n/a'} |`);
  if (r.parseErrors.length) {
    L.push('', '## Files that could not be parsed (UNVERIFIED)', '');
    for (const e of r.parseErrors) L.push(`- \`${e.file}\`: ${esc(e.message)}`);
  }
  return L.join('\n') + '\n';
}
```

`src/inventory/run.ts`:
```ts
import { join } from 'node:path';
import { readText } from '../util/read.ts';
import { walkFiles } from '../util/fs-walk.ts';
import { writeJson, writeJsonl, writeText } from '../util/write.ts';
import { parseSource, type N } from '../parse/parse.ts';
import type { AppConfig } from '../config/config.ts';
import { readThemeFacts } from '../adapters/react-mui/theme-static.ts';
import { extractStyles, type PrimitiveUse } from '../adapters/react-mui/extract.ts';
import { extractCssFile } from '../adapters/react-mui/extract-nonjsx.ts';
import type { Sample, StyleBlock } from '../adapters/react-mui/collector.ts';
import { createResolver } from './resolve.ts';
import { readModuleInfo } from './module-info.ts';
import { findComponents } from './components.ts';
import { buildGraph, findRouteRefs, type FileUnit } from './graph.ts';
import { classifyAll } from './classify.ts';
import { collectFileFacts, type FileFacts } from './file-facts.ts';
import { detectFamilies } from './families.ts';
import { scoreModules } from './scorecard.ts';
import { buildRegistry, type Registry } from './registry.ts';
import { renderReport } from './report.ts';

export interface InventoryOptions { appRootAbs: string; cfg: AppConfig; git: boolean }
export interface InventoryResult { registry: Registry; samples: Sample[]; report: string }

const CSS_FILE = /\.(css|scss|less)$/i;

function sampleKey(s: Sample): string {
  return [s.file, String(s.line).padStart(7, '0'), s.property, s.ctx, s.raw].join('\u0000');
}

export function runInventory(opts: InventoryOptions): InventoryResult {
  const { appRootAbs, cfg } = opts;
  const files = walkFiles(appRootAbs, { include: cfg.sources, exclude: [...cfg.exclude, ...cfg.legacy] });
  const testFiles = walkFiles(appRootAbs, { include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'] });
  const theme = readThemeFacts(appRootAbs, cfg.themeEntry);
  const resolver = createResolver(appRootAbs, new Set(files));
  const units: FileUnit[] = [];
  const samples: Sample[] = [];
  const primitives: PrimitiveUse[] = [];
  const facts: FileFacts[] = [];
  const sources = new Map<string, string>();
  const blocks = new Map<string, StyleBlock[]>();
  const parseErrors: Array<{ file: string; message: string }> = [];
  for (const file of files) {
    const src = readText(join(appRootAbs, file));
    sources.set(file, src);
    if (CSS_FILE.test(file)) { samples.push(...extractCssFile(src, file, theme)); continue; }
    let ast: N;
    try {
      ast = parseSource(src, file);
    } catch (e) {
      parseErrors.push({ file, message: (e as Error).message.split('\n')[0] });
      facts.push(collectFileFacts(null, src, file));
      continue;
    }
    const info = readModuleInfo(ast, file);
    const { components, aliases } = findComponents(ast, src, file, info);
    const ex = extractStyles(ast, src, file, info.imports, theme);
    samples.push(...ex.samples);
    primitives.push(...ex.primitives);
    if (ex.blocks.length) blocks.set(file, ex.blocks);
    facts.push(collectFileFacts(ast, src, file));
    units.push({ file, info, components, aliases, routeRefs: findRouteRefs(ast) });
  }
  const graph = buildGraph(units, resolver, cfg);
  const components = units.flatMap((u) => u.components);
  const levels = classifyAll(components, graph);
  const families = detectFamilies({ facts, sources, blocks, components, graph, cfg });
  const modules = scoreModules({ files: files.map((f) => ({ file: f, src: sources.get(f) ?? '' })), samples, components, testFiles, cfg, appRootAbs, git: opts.git });
  samples.sort((a, b) => { const ka = sampleKey(a); const kb = sampleKey(b); return ka < kb ? -1 : ka > kb ? 1 : 0; });
  const registry = buildRegistry({ cfg, files, sources, theme, components, levels, graph, families, modules, primitives, samples, parseErrors });
  return { registry, samples, report: renderReport(registry) };
}

export function writeInventory(result: InventoryResult, outDir: string): void {
  writeJson(join(outDir, 'registry.json'), result.registry);
  writeJsonl(join(outDir, 'samples.jsonl'), result.samples);
  writeText(join(outDir, 'report.md'), result.report);
}
```

`src/commands/inventory.ts`:
```ts
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Command } from '../cli-types.ts';
import { configPathFor, loadConfig, type AppConfig } from '../config/config.ts';
import { detectStack, proposeConfig } from '../detect/detect.ts';
import { runInventory, writeInventory } from '../inventory/run.ts';

export const inventoryCommand: Command = async (args, io) => {
  if (typeof args.app !== 'string') { io.err('inventory: --app <dir> is required'); return 2; }
  const app = resolve(args.app);
  let outDir = typeof args.out === 'string' ? resolve(args.out) : null;
  const configPath = typeof args.config === 'string' ? resolve(args.config) : existsSync(configPathFor(app)) ? configPathFor(app) : null;
  let cfg: AppConfig;
  let appRootAbs = app;
  if (configPath) {
    const loaded = loadConfig(configPath);
    cfg = loaded.config;
    appRootAbs = loaded.appRootAbs;
    outDir ??= join(dirname(configPath), 'inventory');
  } else {
    if (!outDir) { io.err('inventory: no design-system/design-studio.config.json found; pass --config <file>, or --out <dir> to run with a detected config'); return 2; }
    cfg = proposeConfig(detectStack(app), app);
  }
  const result = runInventory({ appRootAbs, cfg, git: args['no-git'] !== true });
  writeInventory(result, outDir);
  const unverified = result.registry.parseErrors.length ? ` (${result.registry.parseErrors.length} file(s) UNVERIFIED: could not be parsed)` : '';
  io.out(`inventory: ${result.registry.metrics.files} files, ${result.registry.metrics.components} components, ${result.registry.families.length} families -> ${outDir}${unverified}`);
  return 0;
};
```

Replace `src/commands.ts` with:
```ts
import type { Command } from './cli-types.ts';
import { detectCommand } from './commands/detect.ts';
import { inventoryCommand } from './commands/inventory.ts';

export const COMMANDS: Record<string, Command> = { detect: detectCommand, inventory: inventoryCommand };
```

- [ ] **Step 5: Regenerate the committed schemas**

Run: `npm run schemas` → Expected: `wrote 2 schema(s)` and `plugins/design-studio/schemas/registry.schema.json` exists.

- [ ] **Step 6: Align the spec's registry section with the implementation**

In `docs/superpowers/specs/2026-09-29-design-studio-design.md` §5.7, replace the paragraph that starts
``Per component: `name`, `file`, `export`, `level` + `levelReason` + `levelEvidence` `` and ends
``unitContext, component}`.`` with:
```markdown
Per component: `id`, `name`, `file`, `line`, `loc`, `exportNames`, `module`, `shared`, `level` +
`levelReason` + `confidence` + `evidence` (`CONFIRMED`/`INFERRED`), `smells`, `layer`
(`core`/`recipe`/`snowflake`), `logic` (`presentational`/`smart`), `wraps` (library primitives),
`uses` (in-house components it renders), `importers` (files, modules; barrel-aware),
`promotionCandidate`, `families` (keys of the duplicate families it belongs to), `quality` (raw vs
theme style values inside it) and `signals` (data, slots, region, primary actions, page area,
domain props, styled target). Detected states and accessibility flags are added by the audit.
Per module: scorecard (files, LOC, components, raw values per kLOC, token discipline, i18n
coverage, test ratio, last commit). Also: duplicate `families`, a library `primitives` census
(count and `variant`/`size`/`color` values), `metrics` and `parseErrors`. Plus `samples.jsonl`:
one line per style value with `{file, line, ctx (unit context), kind, property, raw, cls, px,
element, conditional, responsive, selector}`.
```

- [ ] **Step 7: Run tests and type-check**

Run: `npm test` → Expected: all PASS (the schemas test now checks both files). Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 8: Commit** (from the repo root)

```bash
git add plugins/design-studio docs/superpowers/specs/2026-09-29-design-studio-design.md
git commit -m "feat(design-studio): assemble the inventory registry, report and command" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Mini CRM fixture, planted-problem tests and the golden registry

**Files:**
- Create: `plugins/design-studio/fixtures/mini-crm/**` (listed below)
- Create: `scripts/update-golden.ts`, `test/fixture.test.ts`, `test/golden/mini-crm.registry.json` (generated)
- Modify: `test/helpers.ts` (add `FIXTURE`)

**Interfaces:**
- Consumes: `loadConfig`, `runInventory`, `stableStringify`, `readText`, `registrySchema`, `makeValidator`.
- Produces: `FIXTURE` (absolute path to `fixtures/mini-crm/`), the golden registry; Plans 2–3 reuse this fixture for audit and Storybook tests.

- [ ] **Step 1: Create the fixture app**

`fixtures/mini-crm/README.md`:
```markdown
# Mini CRM fixture

A tiny, product-neutral React + MUI app used to test design-studio. It is never built or run; the
engine reads it statically. Planted problems (tests depend on them, so change them only with the
tests):

- StatusChip is defined twice (`settings/`, `deals/`); `deals/StatusChip.tsx` says it was copied.
- `messenger/Inbox.tsx` and `messenger-v2/Inbox.tsx` are identical.
- `TABLE_HEAD_SX` is the same style block in three files.
- Three separate status-to-colour maps (`LeadRow`, `settings/StatusChip`, `deals/StatusChip`).
- `deals/DealsPanel.tsx` imports from inside the `settings` module.
- `common/components/unused-card.tsx` has no consumers.
- Off-scale and raw values: `p: 0.6`, `padding: 5`, `fontSize: 11.5`, `#fff`, an unlabelled icon button,
  a placeholder-only text field.
```

`fixtures/mini-crm/package.json`:
```json
{
  "name": "mini-crm",
  "private": true,
  "dependencies": {
    "@mui/icons-material": "^7.3.0",
    "@mui/material": "^7.3.0",
    "@tanstack/react-query": "^5.90.0",
    "react": "^19.2.0",
    "react-i18next": "^15.0.0",
    "react-router-dom": "^7.9.0",
    "tss-react": "^4.9.0"
  },
  "devDependencies": { "vitest": "^3.2.0" }
}
```

`fixtures/mini-crm/tsconfig.json`:
```json
{ "compilerOptions": { "baseUrl": "src", "jsx": "react-jsx" } }
```

`fixtures/mini-crm/design-system/design-studio.config.json`:
```json
{
  "product": "Mini CRM",
  "appRoot": ".",
  "adapter": "react-mui",
  "sources": ["src/**/*.{ts,tsx,js,jsx}", "src/**/*.{css,scss,less}"],
  "exclude": ["**/*.test.*", "**/*.spec.*", "**/__tests__/**", "**/__mocks__/**", "**/*.stories.*", "**/*.d.ts"],
  "libraryHome": "src/common/components",
  "themeEntry": "src/theme/index.ts",
  "providersEntry": "src/app.tsx",
  "modules": { "roots": ["src/components"], "shared": ["src/common/components"] }
}
```

`fixtures/mini-crm/src/theme/index.ts`:
```ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: { primary: { main: '#3f51b5' }, secondary: { main: '#ff1744' }, success: { main: '#4caf50' } },
  shape: { borderRadius: 4 },
});
```

`fixtures/mini-crm/src/app.tsx`:
```tsx
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { AppRoutes } from './routes/Routes';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <AppRoutes />
    </ThemeProvider>
  );
}
```

`fixtures/mini-crm/src/routes/Routes.tsx`:
```tsx
import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LeadsPage } from 'components/leads/LeadsPage';

const SettingsPage = lazy(() => import('../components/settings/SettingsPage'));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
```

`fixtures/mini-crm/src/api/leads-api.ts`:
```ts
export async function fetchLeads() {
  const response = await fetch('/api/leads');
  return response.json();
}
```

`fixtures/mini-crm/src/styles/global.css`:
```css
.page {
  padding: 10px;
  color: #333333;
}
```

`fixtures/mini-crm/src/common/components/index.ts`:
```ts
export * from './status-tag';
export { default as PageTitle } from './page-title';
export { DrawerToolbar } from './drawer-toolbar';
```

`fixtures/mini-crm/src/common/components/status-tag.tsx`:
```tsx
import Chip from '@mui/material/Chip';

interface StatusTagProps { label: string; color: string }

export function StatusTag({ label, color }: StatusTagProps) {
  return <Chip label={label} size="small" sx={{ bgcolor: color, color: '#fff', fontSize: 11, borderRadius: 2, height: 22 }} />;
}
```

`fixtures/mini-crm/src/common/components/page-title.tsx`:
```tsx
import Typography from '@mui/material/Typography';

export default function PageTitle({ title }: { title: string }) {
  return <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>{title}</Typography>;
}
```

`fixtures/mini-crm/src/common/components/drawer-toolbar.tsx`:
```tsx
import { Button, IconButton, Toolbar, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface DrawerToolbarProps { title: string; onClose: () => void; onSave: () => void }

export function DrawerToolbar({ title, onClose, onSave }: DrawerToolbarProps) {
  return (
    <Toolbar sx={{ px: 2, gap: 1 }}>
      <Typography variant="h6" sx={{ flex: 1 }}>{title}</Typography>
      <IconButton onClick={onClose}><CloseIcon /></IconButton>
      <Button variant="contained" onClick={onSave}>Save</Button>
    </Toolbar>
  );
}
```

`fixtures/mini-crm/src/common/components/unused-card.tsx`:
```tsx
import { Card, CardContent, Typography } from '@mui/material';

export function UnusedCard({ text }: { text: string }) {
  return (
    <Card sx={{ p: 0.6 }}>
      <CardContent><Typography>{text}</Typography></CardContent>
    </Card>
  );
}
```

`fixtures/mini-crm/src/components/leads/LeadsPage.tsx`:
```tsx
import { useQuery } from '@tanstack/react-query';
import { Box, Dialog, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageTitle, DrawerToolbar } from 'common/components';
import { LeadRow } from './LeadRow';
import { fetchLeads } from '../../api/leads-api';

const TABLE_HEAD_SX = { fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1 };

export function LeadsPage() {
  const { t } = useTranslation();
  const { data = [] } = useQuery({ queryKey: ['leads'], queryFn: fetchLeads });
  return (
    <Box sx={{ p: 3, minHeight: 'calc(100vh - 48px)' }}>
      <PageTitle title={t('leads.title')} />
      <Box sx={TABLE_HEAD_SX}>{t('leads.name')}</Box>
      <TextField placeholder="Search leads" size="small" />
      {data.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
      <Dialog open={false}>
        <DrawerToolbar title="Edit" onClose={() => {}} onSave={() => {}} />
      </Dialog>
    </Box>
  );
}
```

`fixtures/mini-crm/src/components/leads/LeadRow.tsx`:
```tsx
import { Box, Typography } from '@mui/material';
import { StatusTag } from 'common/components';

const STATUS_COLORS = { new: '#2196f3', won: '#4caf50', lost: '#f44336' };

export function LeadRow({ lead }: { lead: { id: string; name: string; status: 'new' | 'won' | 'lost' } }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      <Typography sx={{ fontSize: 13 }}>{lead.name}</Typography>
      <StatusTag label={lead.status} color={STATUS_COLORS[lead.status]} />
    </Box>
  );
}
```

`fixtures/mini-crm/src/components/leads/leads.test.tsx`:
```tsx
import { test } from 'vitest';

test('placeholder', () => {});
```

`fixtures/mini-crm/src/components/settings/SettingsPage.tsx`:
```tsx
import { Box, Typography } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { StatusChip } from './StatusChip';

const TABLE_HEAD_SX = { fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1 };

const useStyles = makeStyles()((theme) => ({ header: { marginTop: 12, padding: theme.spacing(2), borderRadius: 6 } }));

export default function SettingsPage() {
  const { classes } = useStyles();
  return (
    <Box className={classes.header} style={{ padding: 5 }}>
      <Box sx={TABLE_HEAD_SX}>Name</Box>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>General</Typography>
      <StatusChip status="active" />
    </Box>
  );
}
```

`fixtures/mini-crm/src/components/settings/StatusChip.tsx`:
```tsx
import Chip from '@mui/material/Chip';

const TONES = { active: 'success', paused: 'warning', archived: 'default' } as const;

export function StatusChip({ status }: { status: keyof typeof TONES }) {
  return <Chip size="small" color={TONES[status]} label={status} />;
}
```

`fixtures/mini-crm/src/components/deals/StatusChip.tsx`:
```tsx
import Chip from '@mui/material/Chip';

// copied from settings/StatusChip and adjusted for deals
const DEAL_TONES = { open: 'info', won: 'success', lost: 'error' };

export function StatusChip({ status }: { status: string }) {
  return <Chip size="small" color={DEAL_TONES[status as keyof typeof DEAL_TONES] as 'info'} label={status} sx={{ fontSize: 10 }} />;
}
```

`fixtures/mini-crm/src/components/deals/DealsPanel.tsx`:
```tsx
import { Drawer, Typography } from '@mui/material';
import { StatusChip } from 'components/settings/StatusChip';

const TABLE_HEAD_SX = { fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1 };

export function DealsPanel({ open }: { open: boolean }) {
  return (
    <Drawer open={open} anchor="right" PaperProps={{ sx: { width: 420, p: 2 } }}>
      <Typography sx={TABLE_HEAD_SX}>Deals</Typography>
      <StatusChip status="active" />
    </Drawer>
  );
}
```

`fixtures/mini-crm/src/components/messenger/Inbox.tsx` **and** `fixtures/mini-crm/src/components/messenger-v2/Inbox.tsx` (identical content):
```tsx
import { List, ListItem, ListItemText, Typography } from '@mui/material';

export interface InboxItem { id: string; from: string; preview: string }

export function Inbox({ items }: { items: InboxItem[] }) {
  return (
    <List dense sx={{ bgcolor: '#fafafa', borderRadius: 1 }}>
      {items.map((item) => (
        <ListItem key={item.id} divider>
          <ListItemText primary={item.from} secondary={item.preview} />
          <Typography sx={{ fontSize: 10.5, color: '#9e9e9e' }}>now</Typography>
        </ListItem>
      ))}
    </List>
  );
}
```

- [ ] **Step 2: Add `FIXTURE` to the test helpers and write the golden script**

In `test/helpers.ts`, add this line to the imports at the top:
```ts
import { fileURLToPath } from 'node:url';
```
and append at the end of the file:
```ts
export const FIXTURE = fileURLToPath(new URL('../../fixtures/mini-crm/', import.meta.url));
```

`scripts/update-golden.ts`:
```ts
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/config.ts';
import { runInventory } from '../src/inventory/run.ts';
import { writeJson } from '../src/util/write.ts';

const fixture = fileURLToPath(new URL('../../fixtures/mini-crm/', import.meta.url));
const { config, appRootAbs } = loadConfig(join(fixture, 'design-system', 'design-studio.config.json'));
const { registry } = runInventory({ appRootAbs, cfg: config, git: false });
writeJson(fileURLToPath(new URL('../test/golden/mini-crm.registry.json', import.meta.url)), registry);
console.log('golden registry updated');
```

- [ ] **Step 3: Write the failing fixture test**

`test/fixture.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/config.ts';
import { runInventory } from '../src/inventory/run.ts';
import { registrySchema } from '../src/schemas/registry.ts';
import { makeValidator } from '../src/schemas/validate.ts';
import { stableStringify } from '../src/util/write.ts';
import { readText } from '../src/util/read.ts';
import { FIXTURE } from './helpers.ts';

const GOLDEN = fileURLToPath(new URL('./golden/mini-crm.registry.json', import.meta.url));
const loaded = loadConfig(join(FIXTURE, 'design-system', 'design-studio.config.json'));
const run = () => runInventory({ appRootAbs: loaded.appRootAbs, cfg: loaded.config, git: false });
const result = run();
const reg = result.registry;

function comp(id: string) {
  const c = reg.components.find((x) => x.id === id);
  assert.ok(c, `missing component ${id}`);
  return c;
}
function fam(key: string) {
  const f = reg.families.find((x) => x.key === key);
  assert.ok(f, `missing family ${key}`);
  return f;
}
const values = (file: string, property: string) => result.samples.filter((s) => s.file === file && s.property === property).map((s) => [s.ctx, s.px ?? s.raw, s.cls]);

test('the registry is schema-valid and reads the theme', () => {
  assert.deepEqual(makeValidator(registrySchema)(reg), []);
  assert.deepEqual(reg.theme, { spacingUnit: 8, radiusUnit: 4, source: 'static' });
});

test('the planted components get the expected levels and layers', () => {
  const expect: Array<[string, string, string]> = [
    ['src/common/components/status-tag.tsx#StatusTag', 'atom', 'core'],
    ['src/common/components/page-title.tsx#PageTitle', 'atom', 'core'],
    ['src/common/components/drawer-toolbar.tsx#DrawerToolbar', 'molecule', 'core'],
    ['src/common/components/unused-card.tsx#UnusedCard', 'atom', 'core'],
    ['src/components/leads/LeadRow.tsx#LeadRow', 'molecule', 'snowflake'],
    ['src/components/deals/DealsPanel.tsx#DealsPanel', 'organism', 'snowflake'],
    ['src/components/messenger/Inbox.tsx#Inbox', 'molecule', 'snowflake'],
    ['src/components/settings/StatusChip.tsx#StatusChip', 'atom', 'recipe'],
    ['src/components/deals/StatusChip.tsx#StatusChip', 'atom', 'snowflake'],
  ];
  for (const [id, level, layer] of expect) assert.deepEqual([comp(id).level, comp(id).layer], [level, layer], id);
  const leads = comp('src/components/leads/LeadsPage.tsx#LeadsPage');
  assert.deepEqual([leads.level, leads.logic], ['page', 'smart']);
  assert.deepEqual(leads.signals.dataHooks, ['fetchLeads', 'useQuery']);
  assert.equal(comp('src/components/settings/SettingsPage.tsx#SettingsPage').level, 'page');
});

test('reach is resolved through barrels, default re-exports, baseUrl and lazy routes', () => {
  assert.equal(comp('src/common/components/status-tag.tsx#StatusTag').importers.files, 1);
  assert.equal(comp('src/common/components/page-title.tsx#PageTitle').importers.files, 1);
  assert.equal(comp('src/common/components/drawer-toolbar.tsx#DrawerToolbar').importers.files, 1);
  const chip = comp('src/components/settings/StatusChip.tsx#StatusChip');
  assert.deepEqual(chip.importers, { files: 2, modules: ['deals', 'settings'] });
  assert.equal(chip.promotionCandidate, true);
});

test('the planted duplicate families are found', () => {
  assert.equal(fam('same-name:StatusChip').size, 2);
  assert.equal(fam('same-name:Inbox').size, 2);
  assert.deepEqual(reg.families.find((f) => f.kind === 'identical-files')?.members.map((m) => m.file), ['src/components/messenger-v2/Inbox.tsx', 'src/components/messenger/Inbox.tsx']);
  assert.deepEqual(reg.families.find((f) => f.kind === 'repeated-style-block')?.members.map((m) => m.file), ['src/components/deals/DealsPanel.tsx', 'src/components/leads/LeadsPage.tsx', 'src/components/settings/SettingsPage.tsx']);
  assert.equal(fam('status-color-map:all').size, 3);
  assert.equal(fam('cross-feature-import:deals->settings').size, 1);
  assert.deepEqual(fam('dead-shared:all').members.map((m) => m.name), ['UnusedCard']);
  assert.deepEqual(fam('copy-comment:all').members.map((m) => m.file), ['src/components/deals/StatusChip.tsx']);
});

test('components carry their duplicate families and style quality', () => {
  assert.ok(comp('src/components/settings/StatusChip.tsx#StatusChip').families.includes('same-name:StatusChip'));
  const inbox = comp('src/components/messenger/Inbox.tsx#Inbox').families;
  assert.ok(inbox.includes('same-name:Inbox') && inbox.some((k) => k.startsWith('identical-files:')));
  assert.deepEqual(comp('src/common/components/unused-card.tsx#UnusedCard').families, ['dead-shared:all']);
  assert.deepEqual(comp('src/common/components/status-tag.tsx#StatusTag').quality, { rawValues: 2, themeValues: 1 });
});

test('style values are converted with their unit context', () => {
  assert.deepEqual(values('src/common/components/unused-card.tsx', 'p'), [['sx', 4.8, 'theme']]);
  assert.deepEqual(values('src/components/settings/SettingsPage.tsx', 'padding'), [['makeStyles', 16, 'theme'], ['style', 5, 'px']]);
  assert.deepEqual(values('src/components/settings/SettingsPage.tsx', 'marginTop'), [['makeStyles', 12, 'px']]);
  assert.deepEqual(values('src/common/components/status-tag.tsx', 'borderRadius'), [['sx', 8, 'theme']]);
  assert.deepEqual(values('src/common/components/status-tag.tsx', 'color'), [['sx', '#ffffff', 'raw-color']]);
  assert.deepEqual(values('src/styles/global.css', 'padding'), [['css', 10, 'px']]);
  assert.deepEqual(values('src/components/leads/LeadRow.tsx', 'new'), [['literal', '#2196f3', 'raw-color']]);
  assert.deepEqual(values('src/components/leads/LeadsPage.tsx', 'minHeight'), [['sx', 'calc(100vh - 48px)', 'calc']]);
});

test('modules are scored', () => {
  assert.deepEqual(reg.modules.map((m) => m.module), ['(other)', 'deals', 'leads', 'messenger', 'messenger-v2', 'settings', 'shared']);
  const leads = reg.modules.find((m) => m.module === 'leads');
  assert.deepEqual([leads?.files, leads?.i18nCoverage, leads?.testRatio], [2, 0.5, 0.5]);
  assert.equal(reg.modules.find((m) => m.module === 'settings')?.i18nCoverage, 0);
});

test('two runs are byte-identical', () => {
  const again = run();
  assert.equal(stableStringify(again.registry), stableStringify(reg));
  assert.equal(stableStringify(again.samples), stableStringify(result.samples));
});

test('the registry matches the committed golden file', () => {
  assert.equal(stableStringify(reg), readText(GOLDEN), 'golden is stale — run npm run golden and review the diff');
});
```

- [ ] **Step 4: Run the fixture test — every test except the golden one must pass**

Run: `npm test`
Expected: only `the registry matches the committed golden file` FAILS (`ENOENT ... mini-crm.registry.json`). If any other fixture test fails, fix the engine (not the test) before continuing: the expectations encode the classifier, resolver and unit rules from the spec.

- [ ] **Step 5: Generate and review the golden registry**

Run: `npm run golden` → Expected: `golden registry updated`.
Open `test/golden/mini-crm.registry.json` and check by eye: 14 components; no absolute paths; `parseErrors` is `[]`; `engine` is `0.1.0`.

- [ ] **Step 6: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 7: Commit** (from the repo root)

```bash
git add plugins/design-studio
git commit -m "test(design-studio): add Mini CRM fixture with planted problems and golden registry" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Bundle the CLI and smoke-run it on the pilot product

**Files:**
- Create (generated): `plugins/design-studio/engine/dist/cli.mjs`
- Test: `test/dist.test.ts`
- Modify (pilot product repo, private): the smoke checklist named below

**Interfaces:**
- Consumes: the whole engine, the fixture.
- Produces: a committed, dependency-free `dist/cli.mjs` that later plans (skills, hooks, CI) call as `node ${CLAUDE_PLUGIN_ROOT}/engine/dist/cli.mjs …`.

- [ ] **Step 1: Write the failing bundle test**

`test/dist.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/config.ts';
import { runInventory } from '../src/inventory/run.ts';
import { stableStringify } from '../src/util/write.ts';
import { readText } from '../src/util/read.ts';
import { FIXTURE, tmpDir } from './helpers.ts';

const DIST = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url));

test('the committed bundle runs and matches the sources', () => {
  assert.ok(existsSync(DIST), 'dist/cli.mjs is missing — run npm run build');
  assert.equal(execFileSync(process.execPath, [DIST, '--version'], { encoding: 'utf8' }).trim(), '0.1.0');
  const out = tmpDir();
  execFileSync(process.execPath, [DIST, 'inventory', '--app', FIXTURE, '--out', out, '--no-git'], { stdio: 'pipe' });
  const loaded = loadConfig(join(FIXTURE, 'design-system', 'design-studio.config.json'));
  const expected = stableStringify(runInventory({ appRootAbs: loaded.appRootAbs, cfg: loaded.config, git: false }).registry);
  assert.equal(readText(join(out, 'registry.json')), expected, 'dist/cli.mjs is stale — run npm run build');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test` → Expected: FAIL — `dist/cli.mjs is missing`.

- [ ] **Step 3: Build the bundle**

Run: `npm run build` → Expected: esbuild reports `dist/cli.mjs` written, no errors.
Run: `node dist/cli.mjs --version` → Expected: `0.1.0`.
Run: `node dist/cli.mjs detect --app ../fixtures/mini-crm` → Expected: JSON whose `stack.packageName` is `"mini-crm"`.

- [ ] **Step 4: Run tests and type-check**

Run: `npm test` → Expected: all PASS. Run: `npm run typecheck` → Expected: exit 0.

- [ ] **Step 5: Commit the bundle** (from the repo root)

```bash
git add plugins/design-studio/engine/dist plugins/design-studio/engine/test/dist.test.ts
git commit -m "build(design-studio): commit the bundled engine CLI" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Smoke-run on the pilot product**

The pilot's paths and expected ranges are private and live in the pilot product's repo at
`docs/design-studio/plan-1-smoke-checklist.md` (on its pilot branch). Follow that checklist exactly:
it runs `detect`, two `inventory` runs into the OS temp folder with `--no-git`, compares hashes, prints
the key metrics, and confirms the product repo was not modified.

Pass criteria (all must hold; the checklist gives the product-specific ranges):
- each `inventory` run finishes in under 2 minutes;
- the two runs produce byte-identical `registry.json` and `samples.jsonl`;
- parse errors ≤ 5 files;
- every metric in the checklist's table is inside its expected range;
- `git status --porcelain` in the product repo is unchanged by the run.

If a check fails, fix the engine in this repo (add a unit test reproducing the case first), rebuild
(`npm run build`), re-run Steps 4–6, and commit the fix with a `fix(design-studio): …` message.

- [ ] **Step 7: Record the smoke results in the pilot product repo**

Fill in the checklist's **Results** table with the measured values, then commit it on the pilot branch
in the product repo (never on its integration branch). Use the product repo path and pilot branch
named in the checklist's **Setup** section as `$PRODUCT_REPO`:

```bash
git -C "$PRODUCT_REPO" add docs/design-studio/plan-1-smoke-checklist.md
git -C "$PRODUCT_REPO" commit -m "docs(design-studio): record Plan 1 inventory smoke results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## What comes next

Plan 1 ends with a working, deterministic `inventory`. The next two plans are written after this one
lands, using what the pilot smoke run teaches:

- **Plan 2 — Standard and audit engine:** the canon catalog (consolidating the research rules into
  `canon/rules/*.yaml`, `conflicts.yaml`, page gates) with its schema; DTCG 2025.10 tokens and resolver;
  runtime theme resolution in the adapter; scale proposals with coverage; the contrast matrix; library
  decision cards and the discrepancy register; emitters (MUI theme, CSS variables, `AGENTS.md`, ESLint
  pack with the MUI component map); the static rule checker; `audit` (findings → families → fix
  location → register diff → report); the hook entry points. It also closes the two §6.2 items this
  plan leaves open: owner `levelOverride` (level + reason + who) stored with the decisions, and an
  accessibility-density column in the module scorecard fed by the audit's findings.
- **Plan 3 — Plugin surface, Storybook and the pilot:** `plugin.json`, README, CONNECTORS, the seven
  skills, five agents and `hooks.json`; `init` (config, profile, root marker); Storybook harness
  templates and the story/Foundations emitters; the marketplace entry; skill evals; then the pilot run
  (`init` → `inventory` → `standard` → `storybook` → `audit`) against spec §13.2–13.3.
