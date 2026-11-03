'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runFi } = require('./helpers');
const { must, write, buildModel } = require('./model-fixture');
const { loadWorkspace } = require('../lib/workspace');

test('coverage: counts, unaccounted chunks, the minimum, and set-aside', () => {
  const root = buildModel();
  const first = must(runFi(root, ['coverage', 'csv', '--json'])).json;
  assert.deepEqual([first.chunks, first.covered, first.setAside], [17, 10, 0]);
  assert.deepEqual(first.unaccounted.map((u) => u.id), ['SRC-001#6', 'SRC-001#7', 'SRC-002#2', 'SRC-002#4', 'SRC-002#5', 'SRC-002#6', 'SRC-003#2']);
  assert.equal(runFi(root, ['coverage', 'csv', '--min', '0.95']).code, 1);
  must(runFi(root, ['set-aside', 'csv', 'SRC-002#5', '--reason', 'a thank-you, no requirement content']));
  const after = must(runFi(root, ['coverage', 'csv', '--json'])).json;
  assert.deepEqual([after.covered, after.setAside, after.unaccounted.length], [10, 1, 6]);
  assert.deepEqual(loadWorkspace(root, 'csv').manifest.coverage, { chunks: 17, covered: 10, setAside: 1 });
  const cited = runFi(root, ['set-aside', 'csv', 'SRC-001#2', '--reason', 'x']);
  assert.equal(cited.code, 1);
  assert.match(cited.stderr, /SRC-001#2 is cited by the model/);
  assert.equal(runFi(root, ['set-aside', 'csv', 'SRC-002#6']).code, 2);
  assert.equal(runFi(root, ['set-aside', 'csv', 'SRC-009#1', '--reason', 'x']).code, 2);
});

test('coverage: an unreadable source is unaccounted; superseded nodes do not count', () => {
  const root = buildModel();
  fs.writeFileSync(path.join(root, 'bad.docx'), 'not a zip archive, only text');
  assert.equal(runFi(root, ['ingest', 'csv', 'bad.docx']).code, 1);
  must(runFi(root, ['add', 'csv', write(root, 'sup.json', { nodes: [{ id: 'RULE-002', supersededBy: 'RULE-001' }] })]));
  const c = must(runFi(root, ['coverage', 'csv', '--json'])).json;
  assert.deepEqual([c.chunks, c.covered], [18, 9]);
  assert.deepEqual(c.unaccounted.find((u) => u.id === 'SRC-004#1'), { id: 'SRC-004#1', anchor: 'whole file', text: null, unreadable: true });
  assert.match(runFi(root, ['coverage', 'csv']).stdout, /SRC-004#1 whole file: \(unreadable source\)/);
});
