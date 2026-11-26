'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SP, runSp, tempDir } = require('./helpers');

test('cli: with --json a failure prints its error as JSON too; a --json after -- is an argument, not the flag', () => {
  const dir = tempDir();
  const flag = runSp(dir, ['state', 'x', '--json']);
  assert.equal(flag.code, 2);
  assert.deepEqual(flag.json, { error: { code: 2, message: 'nothing to record: give --phase, --decision, --pending or --done' } });
  const argument = runSp(dir, ['state', 'x', '--', '--json']);
  assert.equal(argument.code, 2);
  assert.equal(argument.stdout, '');
});

test('cli: a command module that fails to load is an internal error (exit 3), not a crash', () => {
  const engine = path.join(tempDir(), 'engine');
  for (const dir of ['lib', 'catalog', 'schemas']) fs.cpSync(path.join(path.dirname(SP), dir), path.join(engine, dir), { recursive: true });
  fs.copyFileSync(SP, path.join(engine, 'sp.js'));
  fs.writeFileSync(path.join(engine, 'lib', 'cmd', 'broken.js'), "throw new Error('broken');\n");
  const r = spawnSync(process.execPath, [path.join(engine, 'sp.js'), 'help'], { encoding: 'utf8' });
  assert.equal(r.status, 3);
  assert.equal(r.stderr, 'sp help: internal error: broken\n');
});

test('cli: an asynchronous command that rejects with a check error exits 1, and one that resolves exits 0', () => {
  const engine = path.join(tempDir(), 'engine');
  for (const dir of ['lib', 'catalog', 'schemas']) fs.cpSync(path.join(path.dirname(SP), dir), path.join(engine, dir), { recursive: true });
  fs.copyFileSync(SP, path.join(engine, 'sp.js'));
  const stub = (name, run) => fs.writeFileSync(path.join(engine, 'lib', 'cmd', `${name}.js`), `const { checkError } = require('../errors');
module.exports = { name: '${name}', usage: '${name}', summary: 's', flags: {}, run: () => ${run} };
`);
  stub('zzfail', "Promise.reject(checkError('the stand-in failed'))");
  stub('zzok', "Promise.resolve({ text: 'fine' })");
  const bad = spawnSync(process.execPath, [path.join(engine, 'sp.js'), 'zzfail'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stderr, 'sp zzfail: the stand-in failed\n');
  const good = spawnSync(process.execPath, [path.join(engine, 'sp.js'), 'zzok'], { encoding: 'utf8' });
  assert.equal(good.status, 0);
  assert.equal(good.stdout, 'fine\n');
});
