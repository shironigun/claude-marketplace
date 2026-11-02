'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runFi } = require('./helpers');
const { must, write, buildModel } = require('./model-fixture');

test('query: by type, status, section, words and id; superseded nodes only with --all', () => {
  const root = buildModel();
  const ids = (args) => must(runFi(root, ['query', 'csv', ...args, '--json'])).json.nodes.map((n) => n.id);
  assert.deepEqual(ids(['--type', 'RULE']), ['RULE-001', 'RULE-002', 'RULE-003', 'RULE-004', 'RULE-005']);
  assert.deepEqual(ids(['--status', 'conflict,open']), ['Q-001', 'RULE-001']);
  assert.deepEqual(ids(['--section', 'A']), ['GOAL-001']);
  assert.deepEqual(ids(['--section', 'c']), ['STORY-001', 'STORY-002']);
  assert.deepEqual(ids(['--text', 'row limit']), ['RULE-001']);
  assert.deepEqual(ids(['--id', 'RULE-002,Q-001']), ['Q-001', 'RULE-002']);
  must(runFi(root, ['add', 'csv', write(root, 'sup.json', { nodes: [{ id: 'RULE-004', supersededBy: 'RULE-003' }] })]));
  assert.ok(!ids(['--type', 'RULE']).includes('RULE-004'));
  assert.ok(ids(['--type', 'RULE', '--all']).includes('RULE-004'));
  const limited = must(runFi(root, ['query', 'csv', '--limit', '2', '--json'])).json;
  assert.deepEqual([limited.nodes.length, limited.total], [2, 8]);
  assert.match(runFi(root, ['query', 'csv', '--limit', '2']).stdout, /\.\.\. and 6 more \(use --limit\)/);
  assert.match(runFi(root, ['query', 'csv', '--id', 'RULE-001']).stdout, /^RULE-001 \[conflict\] Row limit per file: .* \(2 quotes\)$/m);
  assert.equal(runFi(root, ['query', 'csv', '--section', 'Z']).code, 2);
  assert.equal(runFi(root, ['query', 'csv', '--type', 'RUEL']).code, 2);
  assert.equal(runFi(root, ['query', 'csv', '--text', 'the']).code, 2);
  must(runFi(root, ['add', 'csv', write(root, 'msg.json', {
    nodes: [{ id: '+m', type: 'MSG', title: 'Two\nlines', statement: 'line one\nline two', status: 'assumed', derivedFrom: ['GOAL-001'] }],
  })]));
  assert.match(runFi(root, ['query', 'csv', '--type', 'MSG']).stdout, /^MSG-001 \[assumed\] Two lines: line one line two$/m);
});

test('trace: quotes, links out and links in, to a depth', () => {
  const root = buildModel();
  must(runFi(root, ['add', 'csv', write(root, 'add.json', {
    nodes: [
      { id: '+ac', type: 'AC', title: 'Reject over the limit', statement: 'A file over the row limit is rejected before import.', status: 'inferred', confidence: 'high', derivedFrom: ['RULE-001'] },
      { id: '+ts', type: 'TS', title: 'One row over the limit', statement: 'A file one row over the limit is rejected.', status: 'inferred', confidence: 'medium', derivedFrom: ['+ac'] },
    ],
    links: [{ from: '+ac', type: 'refines', to: 'RULE-001' }, { from: 'STORY-001', type: 'implements', to: 'RULE-001' }],
  })]));
  const ac = must(runFi(root, ['trace', 'csv', 'AC-001', '--json'])).json;
  assert.deepEqual(ac.out.map((e) => [e.depth, e.type, e.id]), [[1, 'refines', 'RULE-001']]);
  assert.deepEqual(ac.in.map((e) => [e.depth, e.type, e.id]), [[1, 'derived from', 'TS-001']]);
  const rule = must(runFi(root, ['trace', 'csv', 'RULE-001', '--json'])).json;
  assert.deepEqual(rule.quotes.map((q) => [q.src, q.anchor, q.from]), [['SRC-001', '§2 ¶1', 'frd.md'], ['SRC-002', 'AC-1', 'Reject oversized files']]);
  assert.deepEqual(rule.in.map((e) => [e.depth, e.type, e.id]), [[1, 'refines', 'AC-001'], [1, 'implements', 'STORY-001'], [2, 'derived from', 'TS-001']]);
  assert.equal(must(runFi(root, ['trace', 'csv', 'RULE-001', '--depth', '1', '--json'])).json.in.length, 2);
  assert.match(runFi(root, ['trace', 'csv', 'RULE-001']).stdout, /← implements STORY-001 \[confirmed\] Reject oversized files/);
  assert.equal(runFi(root, ['trace', 'csv', 'RULE-404']).code, 2);
  assert.match(runFi(root, ['trace', 'csv', 'RULE-001']).stdout, /← derived from TS-001 \[inferred\] One row over the limit \(via AC-001\)/);
  must(runFi(root, ['add', 'csv', write(root, 'sup.json', { nodes: [{ id: 'AC-001', supersededBy: 'RULE-001' }] })]));
  assert.match(runFi(root, ['trace', 'csv', 'RULE-001']).stdout, /← refines AC-001 \[inferred\] Reject over the limit \(superseded by RULE-001\)/);
});
