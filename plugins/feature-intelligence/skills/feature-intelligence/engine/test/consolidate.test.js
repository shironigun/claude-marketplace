'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { runFi } = require('./helpers');
const { DECISIONS, claim, must, write, prepare, buildModel } = require('./model-fixture');
const { workspacePaths } = require('../lib/paths');
const { loadModel } = require('../lib/workspace');

const nodesOf = (root) => loadModel(workspacePaths(root, 'csv')).nodes;

test('consolidate: propose suggests; undecided clusters stop --apply; decisions create the model', () => {
  const root = prepare();
  const proposal = must(runFi(root, ['consolidate', 'csv', '--propose', '--json'])).json;
  assert.deepEqual(proposal.clusters.map((k) => [k.id, k.type, k.claims.length, k.suggest]), [
    ['K-001', 'GOAL', 1, 'new'], ['K-002', 'RULE', 2, 'conflict?'], ['K-003', 'RULE', 1, 'new'], ['K-004', 'RULE', 2, 'merge?'],
    ['K-005', 'RULE', 1, 'new'], ['K-006', 'Q', 1, 'new'], ['K-007', 'STORY', 1, 'new'], ['K-008', 'STORY', 1, 'new'],
  ]);
  assert.match(runFi(root, ['consolidate', 'csv', '--propose']).stdout, /K-002 RULE conflict\? the numbers differ/);
  const undecided = runFi(root, ['consolidate', 'csv', '--apply', write(root, 'none.json', {})]);
  assert.equal(undecided.code, 1);
  assert.match(undecided.stderr, /K-002 \(conflict\?\), K-004 \(merge\?\)/);
  assert.equal(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'stray.json', { 'K-099': { action: 'merge' } })]).code, 2);
  const applied = must(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'd.json', DECISIONS), '--json'])).json;
  assert.deepEqual(applied.created, ['GOAL-001', 'RULE-001', 'RULE-002', 'RULE-003', 'RULE-004', 'RULE-005', 'Q-001', 'STORY-001', 'STORY-002']);
  const rule = nodesOf(root).find((n) => n.id === 'RULE-001');
  assert.deepEqual([rule.status, rule.provenance.map((pv) => `${pv.src} ${pv.anchor}`)], ['conflict', ['SRC-001 §2 ¶1', 'SRC-002 AC-1']]);
  assert.equal(nodesOf(root).find((n) => n.id === 'Q-001').status, 'open');
  assert.deepEqual(must(runFi(root, ['consolidate', 'csv', '--propose', '--json'])).json.clusters, []);
});

test('consolidate: a re-run keeps ids stable; restatements, new facts and updates', () => {
  const root = buildModel();
  must(runFi(root, ['claims', 'add', 'csv', write(root, 'again.json', [
    claim('SRC-001#4', '§2 ¶3', 'RULE', 'Email required', 'Every row must have an email.', 'The email column is required.'),
    claim('SRC-001#6', '§2 ¶5', 'RULE', 'Email format', 'An email must be a valid email address.', 'Format: a valid email address'),
    claim('SRC-001#2', '§2 ¶1', 'RULE', 'Row limit per file', 'Each file may hold up to 10,000 rows.', 'Files are limited to 10,000 rows.'),
  ])]));
  const proposal = must(runFi(root, ['consolidate', 'csv', '--propose', '--json'])).json;
  assert.deepEqual(proposal.clusters.map((k) => [k.id, k.existing, k.suggest]), [
    ['K-001', 'RULE-003', 'same'], ['K-002', null, 'new'], ['K-003', 'RULE-001', 'update?'],
  ]);
  const statement = 'An import file may contain at most 10,000 rows (FRD, restated) or 5,000 rows (story 2104).';
  const r = must(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'd2.json', { 'K-003': { action: 'existing', statement } }), '--json'])).json;
  assert.deepEqual([r.created, r.updated], [['RULE-006'], ['RULE-001']]);
  const byId = new Map(nodesOf(root).map((n) => [n.id, n]));
  assert.deepEqual([byId.get('RULE-001').rev, byId.get('RULE-001').statement, byId.get('RULE-001').status], [2, statement, 'conflict']);
  assert.equal(byId.get('RULE-003').rev, 1);
});

test('consolidate: a proposal made before new claims arrived is refused; drop needs a reason', () => {
  const root = prepare();
  must(runFi(root, ['consolidate', 'csv', '--propose']));
  must(runFi(root, ['claims', 'add', 'csv', write(root, 'late.json', [
    claim('SRC-002#2', 'description ¶2', 'ACT', 'Manager', 'Managers can start imports.', 'Managers can also start imports.'),
  ])]));
  const stale = runFi(root, ['consolidate', 'csv', '--apply', write(root, 'd.json', DECISIONS)]);
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /changed since --propose/);
  must(runFi(root, ['consolidate', 'csv', '--propose']));
  assert.equal(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'drop.json', { ...DECISIONS, 'K-009': { action: 'drop' } })]).code, 2);
  const r = must(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'drop2.json', { ...DECISIONS, 'K-009': { action: 'drop', reason: 'covered by the role matrix' } }), '--json'])).json;
  assert.equal(r.dropped, 1);
});

test('consolidate: negation, modality and later similar claims need a decision; malformed decisions are refused', () => {
  const root = buildModel();
  must(runFi(root, ['claims', 'add', 'csv', write(root, 'more.json', [
    claim('SRC-003#2', 'AC-1', 'RULE', 'Duplicate emails', 'A row whose email matches an existing customer is not skipped.', 'The report lists the row number and the reason.'),
    claim('SRC-002#4', 'AC-2', 'RULE', 'File size limit', 'An import file may be at most 2 MB.', 'The rejection message names the row limit.'),
    claim('SRC-001#5', '§2 ¶4', 'RULE', 'Name required', 'Every row must have a name.', 'Name is required.'),
  ])]));
  const proposal = must(runFi(root, ['consolidate', 'csv', '--propose', '--json'])).json;
  assert.deepEqual(proposal.clusters.map((k) => [k.id, k.existing, k.suggest]), [
    ['K-001', 'RULE-005', 'conflict?'], ['K-002', 'RULE-002', 'conflict?'], ['K-003', 'RULE-004', 'same'],
  ]);
  assert.match(runFi(root, ['consolidate', 'csv', '--propose']).stdout, /K-003 RULE same restates RULE-004/);
  const refused = (decisions, message) => {
    const r = runFi(root, ['consolidate', 'csv', '--apply', write(root, 'bad.json', decisions)]);
    assert.equal(r.code, 2, JSON.stringify(decisions));
    assert.match(r.stderr, message);
  };
  refused({ 'K-001': { action: 'constructor' }, 'K-002': { action: 'conflict' } }, /action must be/);
  refused({ 'K-001': { action: 'conflict', statment: 'x' }, 'K-002': { action: 'conflict' } }, /unknown decision field statment/);
  refused({ 'K-001': { action: ['merge'] }, 'K-002': { action: 'conflict' } }, /action must be/);
  refused({ 'K-001': { action: 'drop', reason: '  ' }, 'K-002': { action: 'conflict' } }, /reason must be text/);
  const decided = { 'K-001': { action: 'conflict' }, 'K-002': { action: 'conflict' } };
  const r = must(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'ok.json', decided), '--json'])).json;
  assert.deepEqual([r.created, r.updated.sort()], [[], ['RULE-002', 'RULE-005']]);
});

test('consolidate: --apply on a model holding one id twice exits 1 and writes nothing', () => {
  const root = prepare();
  const p = workspacePaths(root, 'csv');
  const node = JSON.stringify({
    id: 'GOAL-001', type: 'GOAL', title: 'Import customers from a file', statement: 'Admins can import customers from a CSV file.', status: 'confirmed',
    provenance: [{ src: 'SRC-001', anchor: '§1 ¶1', quote: 'Admins import customers from a CSV file' }], rev: 1, updated: '2026-10-30',
  });
  fs.writeFileSync(p.nodes, `${node}\n${node}\n`);
  const proposal = must(runFi(root, ['consolidate', 'csv', '--propose', '--json'])).json;
  const decisions = Object.fromEntries(proposal.clusters.map((k) => [k.id, { action: 'separate' }]));
  const before = fs.readFileSync(p.nodes, 'utf8');
  const r = runFi(root, ['consolidate', 'csv', '--apply', write(root, 'd.json', decisions)]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /holds GOAL-001 more than once/);
  assert.equal(fs.readFileSync(p.nodes, 'utf8'), before);
});
