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
const NOTICES = fileURLToPath(new URL('../dist/THIRD_PARTY_NOTICES.txt', import.meta.url));
const PACKAGE = fileURLToPath(new URL('../package.json', import.meta.url));

test('the bundle ships the licence notices of every package it carries', () => {
  assert.ok(existsSync(NOTICES), 'dist/THIRD_PARTY_NOTICES.txt is missing — run npm run build');
  const text = readText(NOTICES);
  const deps = Object.keys((JSON.parse(readText(PACKAGE)) as { dependencies: Record<string, string> }).dependencies);
  assert.ok(deps.length > 0);
  for (const name of deps) assert.match(text, new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} \\d+\\.\\d+\\.\\d+ — `, 'm'), `${name} is not named in the notices`);
  // Each listed package's licence text follows under its own heading.
  assert.match(text, /^@babel\/parser \d+\.\d+\.\d+ \(MIT\)\n=+\n\nCopyright .*\n\nPermission is hereby granted/m);
});

test('the committed bundle runs and matches the sources', () => {
  assert.ok(existsSync(DIST), 'dist/cli.mjs is missing — run npm run build');
  assert.equal(execFileSync(process.execPath, [DIST, '--version'], { encoding: 'utf8' }).trim(), '0.1.0');
  const out = tmpDir();
  execFileSync(process.execPath, [DIST, 'inventory', '--app', FIXTURE, '--out', out, '--no-git'], { stdio: 'pipe' });
  const loaded = loadConfig(join(FIXTURE, 'design-system', 'design-studio.config.json'));
  const expected = stableStringify(runInventory({ appRootAbs: loaded.appRootAbs, cfg: loaded.config, git: false }).registry);
  assert.equal(readText(join(out, 'registry.json')), expected, 'dist/cli.mjs is stale — run npm run build');
});
