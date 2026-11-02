'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir, runFi } = require('./helpers');
const { parseArgs, numberFlag, listFlag } = require('../lib/args');
const { workspacePaths, checkSlug } = require('../lib/paths');
const { loadWorkspace, withLock, saveModel, loadModel } = require('../lib/workspace');

test('args: positionals, flags, numbers, lists, unknown flags', () => {
  assert.deepEqual(parseArgs(['a', '--mode', 'new', '--json', 'b', '--min=0.9'], { mode: 'string', min: 'string' }),
    { _: ['a', 'b'], flags: { mode: 'new', json: true, min: '0.9' } });
  assert.throws(() => parseArgs(['--nope']), /unknown flag --nope/);
  assert.throws(() => parseArgs(['--mode'], { mode: 'string' }), /--mode needs a value/);
  assert.equal(numberFlag({ min: '0.95' }, 'min', { min: 0, max: 1 }), 0.95);
  assert.throws(() => numberFlag({ top: '2.5' }, 'top', { min: 1, integer: true }), /--top must be a whole number/);
  assert.deepEqual(listFlag({ type: 'RULE,FR' }, 'type', new Set(['RULE', 'FR'])), ['RULE', 'FR']);
  assert.throws(() => listFlag({ type: 'RUEL' }, 'type', new Set(['RULE'])), /--type: unknown RUEL/);
});

test('paths: slugs are lowercase words joined by hyphens', () => {
  assert.equal(checkSlug('csv-customer-import'), 'csv-customer-import');
  assert.throws(() => checkSlug('CSV import'), /bad slug/);
  assert.throws(() => checkSlug('../etc'), /bad slug/);
  const p = workspacePaths(path.resolve('/r'), 'a-b');
  assert.equal(p.nodes, path.join(path.resolve('/r'), 'knowledge-base', 'features', 'a-b', 'model', 'nodes.jsonl'));
  assert.equal(p.chunks, path.join(path.resolve('/r'), '.feature-intelligence', 'cache', 'a-b', 'chunks'));
});

test('init: creates the workspace, the profile stub and the .gitignore entry once', () => {
  const root = tempDir();
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules/');
  const r = runFi(root, ['init', 'csv-customer-import', '--mode', 'new', '--name', 'Import customers from CSV', '--json']);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json, {
    slug: 'csv-customer-import', mode: 'new', workspace: 'knowledge-base/features/csv-customer-import',
    profileCreated: true, gitignoreUpdated: true,
  });
  const ws = loadWorkspace(root, 'csv-customer-import');
  assert.equal(ws.manifest.name, 'Import customers from CSV');
  assert.equal(ws.manifest.created, '2026-10-30');
  for (const f of ['sources.json', 'model/nodes.jsonl', 'model/links.jsonl', 'decisions.jsonl', 'tickets.json']) {
    assert.ok(fs.existsSync(path.join(ws.paths.ws, f)), f);
  }
  assert.equal(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), 'node_modules/\n.feature-intelligence/\n');
  const again = runFi(root, ['init', 'csv-customer-import', '--mode', 'new']);
  assert.equal(again.code, 1);
  assert.match(again.stderr, /already exists/);
  const other = runFi(root, ['init', 'billing-history', '--mode', 'existing', '--json']);
  assert.equal(other.json.profileCreated, false);
  assert.equal(other.json.gitignoreUpdated, false);
  assert.ok(!fs.existsSync(path.join(root, 'knowledge-base', 'features', 'billing-history', 'tickets.json')));
  assert.throws(() => loadWorkspace(root, 'missing'), /no workspace "missing"/);
});

test('cli: help and usage errors', () => {
  const root = tempDir();
  assert.equal(runFi(root, []).code, 2);
  assert.equal(runFi(root, ['nope']).code, 2);
  assert.equal(runFi(root, ['init', 'x']).code, 2);
  assert.equal(runFi(root, ['init', 'x', '--mode', 'old']).code, 2);
  const help = runFi(root, ['help']);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /init <slug> --mode new\|existing/);
  assert.equal(runFi(root, ['init', 'x', '--mode', 'new'], { FI_NOW: 'yesterday' }).code, 2);
});

test('model files are sorted, links de-duplicated; the lock clears a stale holder', () => {
  const root = tempDir();
  const p = workspacePaths(root, 'a');
  const node = (id) => ({ id, type: id.split('-')[0], title: 't', statement: 's', status: 'open', derivedFrom: ['Q-001'], rev: 1, updated: '2026-10-30' });
  const link = { from: 'RULE-002', type: 'refines', to: 'BR-001' };
  saveModel(p, { nodes: [node('RULE-010'), node('FR-002'), node('RULE-002')], links: [link, { ...link }] });
  assert.deepEqual(loadModel(p).nodes.map((n) => n.id), ['FR-002', 'RULE-002', 'RULE-010']);
  assert.equal(loadModel(p).links.length, 1);
  assert.equal(withLock(p, () => fs.existsSync(p.lock)), true);
  assert.equal(fs.existsSync(p.lock), false);
  fs.writeFileSync(p.lock, '999');
  const old = new Date(Date.now() - 120000);
  fs.utimesSync(p.lock, old, old);
  assert.equal(withLock(p, () => 'ran'), 'ran');
});
