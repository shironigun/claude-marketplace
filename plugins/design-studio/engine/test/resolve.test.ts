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

test('the resolver handles trailing slashes and specifiers that land on the app root', () => {
  const r = createResolver(tmpDir(), new Set(['src/a/index.ts', 'src/a/b/x.ts', 'src/a/x.ts', 'index.ts']));
  assert.equal(r.resolve('src/a/b/x.ts', '../'), 'src/a/index.ts');
  assert.equal(r.resolve('src/a/x.ts', './'), 'src/a/index.ts');
  assert.equal(r.resolve('src/a/x.ts', '../..'), 'index.ts');
});

test('a trailing slash means the directory, never a sibling file of the same name', () => {
  const r = createResolver(tmpDir(), new Set(['src/a.ts', 'src/a/index.ts', 'src/b.ts', 'src/main.ts']));
  assert.equal(r.resolve('src/main.ts', './a/'), 'src/a/index.ts');
  assert.equal(r.resolve('src/main.ts', './b/'), null);
  assert.equal(r.resolve('src/main.ts', './b'), 'src/b.ts');
});

test('a tsconfig of the wrong shape degrades to no path rules instead of throwing', () => {
  const files = new Set(['src/a/x.tsx', 'src/a/y.tsx', 'src/lib/z.tsx']);
  const shapes: Record<string, string> = {
    'a null body': 'null',
    'an array body': '[]',
    'a string compilerOptions': '{ "compilerOptions": "strict" }',
    'a null compilerOptions': '{ "compilerOptions": null }',
    'an array paths': '{ "compilerOptions": { "paths": ["src/*"] } }',
    'a non-array paths target': '{ "compilerOptions": { "paths": { "@/*": "src/*" } } }',
    'a numeric baseUrl': '{ "compilerOptions": { "baseUrl": 5 } }',
  };
  for (const [label, body] of Object.entries(shapes)) {
    const root = tmpDir();
    writeTree(root, { 'tsconfig.json': body });
    const r = createResolver(root, files);
    assert.equal(r.resolve('src/a/x.tsx', './y'), 'src/a/y.tsx', `${label}: relative imports still resolve`);
    assert.equal(r.resolve('src/a/x.tsx', '@/lib/z'), null, `${label}: no alias rules are invented`);
  }
});

test('a Vite-style tsconfig.json with only references takes its aliases from the referenced configs', () => {
  const root = tmpDir();
  writeTree(root, {
    'tsconfig.json': '{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }, { "path": "./packages/web" }, { "nope": 1 }, 7] }',
    'tsconfig.app.json': '{ "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } } }',
    'tsconfig.node.json': '{ "compilerOptions": { "paths": { "@/*": ["./wrong/*"], "@node/*": ["./scripts/*"] } } }',
    'packages/web/tsconfig.json': '{ "compilerOptions": { "paths": { "@web/*": ["./src/*"] } } }',
  });
  const r = createResolver(root, new Set(['src/lib/z.tsx', 'scripts/build.ts', 'packages/web/src/page.tsx']));
  assert.equal(r.resolve('src/a/x.tsx', '@/lib/z'), 'src/lib/z.tsx');
  assert.equal(r.resolve('src/a/x.tsx', '@node/build'), 'scripts/build.ts');
  assert.equal(r.resolve('src/a/x.tsx', '@web/page'), 'packages/web/src/page.tsx');
  assert.deepEqual(r.configInputs.map((c) => c.file), ['packages/web/tsconfig.json', 'tsconfig.app.json', 'tsconfig.json', 'tsconfig.node.json']);
});

test('the referencing config wins over the configs it references', () => {
  const root = tmpDir();
  writeTree(root, {
    'tsconfig.json': '{ "references": [{ "path": "./tsconfig.app.json" }], "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
    'tsconfig.app.json': '{ "compilerOptions": { "paths": { "@/*": ["./wrong/*"] } } }',
  });
  assert.equal(createResolver(root, new Set(['src/x.ts', 'wrong/x.ts'])).resolve('src/a.ts', '@/x'), 'src/x.ts');
});

test('an array extends merges its configs, later ones and the file itself winning, and skips package names', () => {
  const root = tmpDir();
  // As in TypeScript, every path target resolves against the merged baseUrl (here ./src from the base config).
  writeTree(root, {
    'tsconfig.json': '{ "extends": ["@tsconfig/strictest/tsconfig.json", "./tsconfig.base.json", "./tsconfig.paths"], "compilerOptions": { "paths": { "@app/*": ["app/*"] } } }',
    'tsconfig.base.json': '{ "compilerOptions": { "baseUrl": "./src", "paths": { "@ui/*": ["wrong/*"] } } }',
    'tsconfig.paths.json': '{ "compilerOptions": { "paths": { "@ui/*": ["ui/*"], "@app/*": ["wrong/*"] } } }',
  });
  const r = createResolver(root, new Set(['src/ui/button.tsx', 'src/app/index.ts', 'src/app/main.ts', 'src/lib/util.ts']));
  assert.equal(r.resolve('src/x.ts', '@ui/button'), 'src/ui/button.tsx');
  assert.equal(r.resolve('src/x.ts', '@app/main'), 'src/app/main.ts');
  assert.equal(r.resolve('src/x.ts', 'lib/util'), 'src/lib/util.ts');
});

test('jsconfig.json is read when there is no tsconfig.json', () => {
  const root = tmpDir();
  writeTree(root, { 'jsconfig.json': '{ "compilerOptions": { "baseUrl": "src", "paths": { "~/*": ["*"] } } }' });
  const r = createResolver(root, new Set(['src/app/index.js', 'src/lib/z.js']));
  assert.equal(r.resolve('src/x.js', 'app'), 'src/app/index.js');
  assert.equal(r.resolve('src/x.js', '~/lib/z'), 'src/lib/z.js');
  assert.deepEqual(r.configInputs.map((c) => c.file), ['jsconfig.json']);
});

test('path targets that are not strings are skipped and the valid ones still apply', () => {
  const root = tmpDir();
  writeTree(root, { 'tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": [1, null, "src/*"] } } }' });
  assert.equal(createResolver(root, new Set(['src/lib/z.tsx'])).resolve('src/a/x.tsx', '@/lib/z'), 'src/lib/z.tsx');
});
