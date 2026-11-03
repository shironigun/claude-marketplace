'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir, runFi, FIXTURES } = require('./helpers');
const { CLAIMS, must, write } = require('./model-fixture');

test('status: each stage names the next step', () => {
  const root = tempDir();
  must(runFi(root, ['init', 'csv', '--mode', 'new', '--name', 'Import customers from CSV']));
  const next = () => must(runFi(root, ['status', 'csv', '--json'])).json.next;
  assert.equal(next(), 'fi ingest csv <file>');
  fs.copyFileSync(path.join(FIXTURES, 'mini-frd.md'), path.join(root, 'frd.md'));
  must(runFi(root, ['ingest', 'csv', 'frd.md']));
  assert.match(next(), /^extract claims/);
  must(runFi(root, ['claims', 'add', 'csv', write(root, 'c.json', CLAIMS.filter((c) => c.chunk.startsWith('SRC-001#')))]));
  assert.equal(next(), 'fi consolidate csv --propose');
  must(runFi(root, ['consolidate', 'csv', '--propose']));
  assert.match(next(), /^decide the proposed clusters/);
  must(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'd.json', { 'K-004': { action: 'separate' } })]));
  assert.equal(next(), 'fi coverage csv: 2 chunks unaccounted');
  must(runFi(root, ['set-aside', 'csv', 'SRC-001#6', 'SRC-001#7', '--reason', 'column table rows, modelled from the rules (test fixture)']));
  assert.equal(next(), 'fi questions csv: ask the top five');
  const s = must(runFi(root, ['status', 'csv', '--json'])).json;
  assert.deepEqual([s.sources.total, s.claims.total, s.claims.pending, s.nodes.live, s.openQuestions], [1, 7, 0, 7, 1]);
  assert.match(runFi(root, ['status', 'csv']).stdout, /^csv "Import customers from CSV" \(mode new, lens all, version 0\)$/m);
  must(runFi(root, ['add', 'csv', write(root, 'a.json', {
    decisions: [{ id: '+d1', question: 'Which date formats are accepted?', answer: 'ISO 8601 dates only.', decidedBy: 'Product owner', via: 'session' }],
    links: [{ from: '+d1', type: 'answers', to: 'Q-001' }],
  })]));
  assert.equal(next(), 'analyse the model, then derive what the lens needs');
});
