'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SpError, checkError, usageError } = require('../lib/errors');
const { readText, slugify } = require('../lib/text');
const { readJson, writeJson } = require('../lib/files');
const { parseArgs, readJsonFile } = require('../lib/args');
const { main } = require('../lib/cli');
const { runSp, tempDir } = require('./helpers');

const io = (cwd = process.cwd()) => {
  const out = [];
  const err = [];
  return { out, err, io: { cwd, env: {}, stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } } };
};

test('errors: check errors exit 1, usage errors exit 2', () => {
  assert.equal(checkError('x').code, 1);
  assert.equal(usageError('y').code, 2);
  assert.ok(usageError('y') instanceof SpError);
});

test('text: readText normalizes BOM and line endings; slugify makes safe names', () => {
  assert.equal(readText(Buffer.from('\uFEFFa\r\nb\rc')), 'a\nb\nc');
  assert.equal(slugify('  Reminders Queue! '), 'reminders-queue');
  assert.equal(slugify('Café --- Été'), 'cafe-ete');
  assert.equal(slugify('x'.repeat(80)).length, 64);
});

test('files: JSON is written with 2-space indent and a newline; bad JSON is a check error', () => {
  const dir = tempDir();
  const file = path.join(dir, 'a', 'x.json');
  assert.deepEqual(readJson(file, { empty: true }), { empty: true });
  writeJson(file, { b: 1 });
  assert.equal(fs.readFileSync(file, 'utf8'), '{\n  "b": 1\n}\n');
  fs.writeFileSync(file, '{broken');
  assert.throws(() => readJson(file), (e) => e.code === 1 && /invalid JSON/.test(e.message));
});

test('args: flags, values, booleans and the errors for misuse', () => {
  assert.deepEqual(parseArgs(['a', '--name', 'X', '--json', 'b'], { name: 'string' }), { _: ['a', 'b'], flags: { name: 'X', json: true } });
  assert.deepEqual(parseArgs(['--name=Y'], { name: 'string' }).flags, { name: 'Y' });
  assert.throws(() => parseArgs(['--nope']), /unknown flag --nope/);
  assert.throws(() => parseArgs(['--name'], { name: 'string' }), /--name needs a value/);
  assert.throws(() => parseArgs(['--json=1']), /--json takes no value/);
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'in.json'), '{"a":1}');
  assert.deepEqual(readJsonFile(dir, 'in.json'), { a: 1 });
  assert.throws(() => readJsonFile(dir, 'missing.json'), (e) => e.code === 2);
});

test('cli: help lists commands; no command is a usage error; an unknown command exits 2', () => {
  const a = io();
  assert.equal(main(['help'], a.io), 0);
  assert.match(a.out.join(''), /^Usage: sp <command>/);
  const b = io();
  assert.equal(main([], b.io), 2);
  const c = io();
  assert.equal(main(['nope'], c.io), 2);
  assert.match(c.err.join(''), /sp: unknown command "nope"/);
});

test('cli: the entry point runs as a process', () => {
  const r = runSp(tempDir(), ['help']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /Usage: sp <command>/);
});
