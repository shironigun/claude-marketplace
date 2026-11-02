'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { runFi } = require('./helpers');
const { must, write, buildModel } = require('./model-fixture');
const { workspacePaths } = require('../lib/paths');
const { loadModel, loadDecisions } = require('../lib/workspace');

const ROW_LIMIT_DECIDED = {
  decisions: [{
    id: '+d1', question: 'Which row limit applies: 10,000 or 5,000?', answer: 'Use 10,000 rows for every file.',
    decidedBy: 'Product owner', via: 'session',
  }],
  nodes: [
    { id: '+q1', type: 'Q', title: 'Row limit', statement: 'Which row limit applies: 10,000 or 5,000?', status: 'open', derivedFrom: ['RULE-001'] },
    {
      id: '+t1', type: 'TS', title: 'Reject a file over the limit', statement: 'A file one row over the limit is rejected and the message names the limit.',
      status: 'inferred', confidence: 'high', derivedFrom: ['RULE-001'], category: 'boundary value analysis',
    },
    {
      id: 'RULE-001', status: 'confirmed', statement: 'An import file may contain at most 10,000 rows.',
      provenance: [{ src: '+d1', anchor: 'answer', quote: 'Use 10,000 rows' }, { src: 'SRC-001', anchor: '§2 ¶1', quote: 'Files are limited to 10,000 rows.' }],
    },
  ],
  links: [
    { from: '+q1', type: 'blocks', to: 'RULE-001' },
    { from: '+t1', type: 'covers', to: 'RULE-001' },
    { from: '+d1', type: 'answers', to: '+q1' },
  ],
};

test('add: temporary ids, a patch, links and a decision', () => {
  const root = buildModel();
  const r = must(runFi(root, ['add', 'csv', write(root, 'add.json', ROW_LIMIT_DECIDED), '--json'])).json;
  assert.deepEqual(r.ids, { '+d1': 'DL-001', '+q1': 'Q-002', '+t1': 'TS-001' });
  assert.deepEqual([r.changed, r.links, r.decisions], [['Q-002', 'TS-001', 'RULE-001'], 3, ['DL-001']]);
  const p = workspacePaths(root, 'csv');
  const { nodes, links } = loadModel(p);
  const rule = nodes.find((n) => n.id === 'RULE-001');
  assert.deepEqual([rule.status, rule.rev, rule.provenance[0].src], ['confirmed', 2, 'DL-001']);
  assert.ok(links.some((l) => l.from === 'DL-001' && l.type === 'answers' && l.to === 'Q-002'));
  assert.deepEqual(loadDecisions(p).map((d) => [d.id, d.decidedAt]), [['DL-001', '2026-10-30T10:00:00.000Z']]);
  assert.deepEqual(must(runFi(root, ['validate', 'csv', '--json'])).json.errors, []);
  const removed = must(runFi(root, ['add', 'csv', write(root, 'rm.json', { removeLinks: [{ from: 'TS-001', type: 'covers', to: 'RULE-001' }] }), '--json'])).json;
  assert.equal(removed.removed, 1);
});

test('add: a dangling id, a bad quote, a wrong link or an unknown node writes nothing', () => {
  const root = buildModel();
  const nodesFile = workspacePaths(root, 'csv').nodes;
  const before = fs.readFileSync(nodesFile, 'utf8');
  const refused = [
    [{ nodes: [{ id: '+a', type: 'ASM', title: 'a', statement: 's', status: 'assumed', derivedFrom: ['Q-404'] }] }, /ASM-001: derivedFrom Q-404 does not exist/],
    [{ nodes: [{ id: 'RULE-002', provenance: [{ src: 'SRC-001', anchor: '§2 ¶2', quote: 'The maximum file size is 50 MB.' }] }] }, /quote not found in SRC-001 §2 ¶2/],
    [{ links: [{ from: 'RULE-002', type: 'blocks', to: 'RULE-003' }] }, /only questions block/],
    [{ nodes: [{ id: 'RULE-002', provenance: [{ src: 'SRC-001', anchor: '§2 ¶2', quote: '""' }] }] }, /quote has no words/],
    [{ nodes: [{ id: '+x', type: 'MSG', title: 'm', statement: 's', status: 'recommended' }] }, /recommended nodes need derivedFrom/],
    [{ nodes: [{ id: 'RULE-002', provenance: [null] }] }, /RULE-002: provenance\[0\] must be an object/],
  ];
  for (const [input, message] of refused) {
    const r = runFi(root, ['add', 'csv', write(root, 'bad.json', input)]);
    assert.equal(r.code, 1, JSON.stringify(input));
    assert.match(r.stderr, message);
  }
  assert.equal(runFi(root, ['add', 'csv', write(root, 'bad.json', { nodes: [{ id: 'RULE-404', status: 'open' }] })]).code, 2);
  assert.equal(runFi(root, ['add', 'csv', write(root, 'bad.json', { links: [{ from: '+nope', type: 'blocks', to: 'RULE-001' }] })]).code, 2);
  assert.equal(runFi(root, ['add', 'csv', write(root, 'bad.json', { edges: [] })]).code, 2);
  assert.equal(fs.readFileSync(nodesFile, 'utf8'), before);
});

test('validate: reports problems in a hand-edited model', () => {
  const root = buildModel();
  fs.appendFileSync(workspacePaths(root, 'csv').links, `${JSON.stringify({ from: 'TS-009', type: 'covers', to: 'RULE-001' })}\n`);
  const r = runFi(root, ['validate', 'csv', '--json']);
  assert.equal(r.code, 1);
  assert.deepEqual(r.json.errors, ['link TS-009 covers RULE-001: TS-009 does not exist']);
});

test('validate: a provenance entry that is not an object is reported, not thrown', () => {
  const root = buildModel();
  const nodesFile = workspacePaths(root, 'csv').nodes;
  const nodes = fs.readFileSync(nodesFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  nodes.find((n) => n.id === 'RULE-002').provenance.unshift(null);
  fs.writeFileSync(nodesFile, `${nodes.map((n) => JSON.stringify(n)).join('\n')}\n`);
  const r = runFi(root, ['validate', 'csv', '--json']);
  assert.equal(r.code, 1, r.stderr);
  assert.deepEqual(r.json.errors, ['RULE-002: provenance[0] must be an object']);
});
