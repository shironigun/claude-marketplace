'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { runFi, tempDir } = require('./helpers');
const { must, write, buildModel } = require('./model-fixture');
const { workspacePaths } = require('../lib/paths');
const { main } = require('../lib/cli');

test('cli: --json turns a usage error into an envelope with code 2', () => {
  const root = tempDir();
  const r = runFi(root, ['status', 'nope', '--json']);
  assert.equal(r.code, 2);
  assert.equal(r.json.error.code, 2);
  assert.match(r.json.error.message, /no workspace "nope"/);
  assert.match(r.stderr, /fi status: no workspace/);
  const bad = runFi(root, ['status', 'x', '--bogus', '--json']); // parseArgs itself throws
  assert.equal(bad.code, 2);
  assert.equal(bad.json.error.code, 2);
});

test('cli: --json turns a check error into an envelope with code 1', () => {
  const root = buildModel();
  const add = { nodes: [{ id: '+r', type: 'RULE', title: 'No source', statement: 'A rule with no provenance.', status: 'confirmed' }] };
  const r = runFi(root, ['add', 'csv', write(root, 'bad.json', add), '--json']);
  assert.equal(r.code, 1);
  assert.equal(r.json.error.code, 1);
  assert.match(r.json.error.message, /a confirmed node needs provenance/);
  assert.equal(runFi(root, ['add', 'csv', 'bad.json']).stdout, ''); // without --json stdout stays empty
});

test('cli: a corrupted sources.json is a check failure, not a stack trace', () => {
  const root = buildModel();
  fs.writeFileSync(workspacePaths(root, 'csv').sources, '{}');
  const r = runFi(root, ['status', 'csv']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /sources\.json must hold a list/);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
  const v = runFi(root, ['validate', 'csv', '--json']);
  assert.equal(v.code, 1);
  assert.ok(v.json.errors.includes('sources.json must hold a list'));
  for (const args of [['trace', 'csv', 'RULE-001'], ['add', 'csv', write(root, 'none.json', { nodes: [] })]]) {
    const r2 = runFi(root, args);
    assert.equal(r2.code, 1, args.join(' '));
    assert.match(r2.stderr, /sources.json must hold a list/);
  }
});

test('cli: set-aside of an unknown chunk is a usage error', () => {
  const root = buildModel();
  assert.equal(runFi(root, ['set-aside', 'csv', 'SRC-009#1', '--reason', 'x']).code, 2);
});

test('cli: any other exception is an internal error, exit 3', () => {
  const status = require('../lib/cmd/status');
  const original = status.run;
  status.run = () => { throw new Error('boom'); };
  try {
    const out = [];
    const err = [];
    const io = { cwd: process.cwd(), env: {}, stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } };
    assert.equal(main(['status', 'x'], io), 3);
    assert.equal(err.join(''), 'fi status: internal error: boom\n');
    assert.equal(out.length, 0);
    assert.equal(main(['status', 'x', '--json'], io), 3);
    assert.deepEqual(JSON.parse(out.join('')), { error: { code: 3, message: 'internal error: boom' } });
  } finally {
    status.run = original;
  }
});
