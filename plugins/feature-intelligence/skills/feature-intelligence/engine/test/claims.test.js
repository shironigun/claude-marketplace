'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tempDir, runFi, FIXTURES } = require('./helpers');
const { workspacePaths } = require('../lib/paths');
const { loadClaims } = require('../lib/claims');
const { writeSimplePdf } = require('../lib/pdf');

function setup() {
  const root = tempDir();
  runFi(root, ['init', 'csv', '--mode', 'new']);
  fs.copyFileSync(path.join(FIXTURES, 'mini-frd.md'), path.join(root, 'frd.md'));
  fs.writeFileSync(path.join(root, 'frd.pdf'), writeSimplePdf([['one']]));
  assert.equal(runFi(root, ['ingest', 'csv', 'frd.md']).code, 0);
  assert.equal(runFi(root, ['ingest', 'csv', 'frd.pdf']).code, 0);
  return root;
}

const claim = (extra) => ({
  chunk: 'SRC-001#2', type: 'RULE', title: 'Row limit per file', statement: 'An import file may contain at most 10,000 rows.',
  status: 'confirmed', anchor: '§2 ¶1', quote: 'files are limited to 10,000 rows', terms: ['row'], ...extra,
});

function add(root, name, claims) {
  const body = name.endsWith('.jsonl') ? claims.map((c) => JSON.stringify(c)).join('\n') : JSON.stringify(claims);
  fs.writeFileSync(path.join(root, name), body);
  return runFi(root, ['claims', 'add', 'csv', name, '--json']);
}

test('claims: valid claims are stored with ids, sources and hashes', () => {
  const root = setup();
  const pdfClaim = claim({ chunk: 'SRC-002#1', anchor: 'p1', quote: 'one', type: 'FR', title: 'Page one', statement: 'Page one says one.' });
  const r = add(root, 'c.jsonl', [claim(), pdfClaim]);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json, { addedCount: 2, first: 'CL-001', last: 'CL-002', batch: 'batch-001', unverified: 1, errors: [] });
  const stored = loadClaims(workspacePaths(root, 'csv'));
  assert.deepEqual([stored[0].src, stored[0].quoteVerified, typeof stored[0].hash], ['SRC-001', true, 'string']);
  assert.deepEqual([stored[1].src, stored[1].quoteVerified, stored[1].hash], ['SRC-002', false, null]);
  assert.deepEqual(add(root, 'd.json', [claim()]).json.first, 'CL-003');
  assert.equal(loadClaims(workspacePaths(root, 'csv'))[2].batch, 'batch-002');
});

test('claims: one bad claim rejects the whole file', () => {
  const root = setup();
  const r = add(root, 'c.json', [
    claim(),
    claim({ quote: 'Files hold 5,000 rows' }),
    claim({ anchor: '§9 ¶9' }),
    claim({ chunk: 'SRC-001#99' }),
    claim({ status: 'assumed' }),
    claim({ chunk: 'SRC-009#1' }),
    claim({ quote: '""' }),
  ]);
  assert.equal(r.code, 1);
  assert.deepEqual(r.json.errors, [
    'claim 2: quote not found in SRC-001#2',
    'claim 3: anchor "§9 ¶9" does not match SRC-001#2 ("§2 ¶1")',
    'claim 4: no chunk SRC-001#99',
    'claim 5: status must be confirmed or open; extractors do not infer',
    'claim 6: no source SRC-009',
    'claim 7: quote has no words',
  ]);
  assert.deepEqual(loadClaims(workspacePaths(root, 'csv')), []);
  fs.writeFileSync(path.join(root, 'empty.json'), '[]');
  assert.equal(runFi(root, ['claims', 'add', 'csv', 'empty.json']).code, 2);
  assert.equal(runFi(root, ['claims', 'list', 'csv', 'empty.json']).code, 2);
});

test('claims: code facts cite the repository with a path:line@commit anchor', () => {
  const root = setup();
  const app = path.join(root, 'app');
  fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, 'rows.js'), 'const MAX_ROWS = 10000;\n');
  const git = (...a) => execFileSync('git', ['-C', app, ...a], { stdio: 'ignore' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'x');
  const head = execFileSync('git', ['-C', app, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(runFi(root, ['ingest', 'csv', '--repo', 'app']).code, 0);
  const code = claim({ chunk: 'SRC-003', anchor: `rows.js:1@${head.slice(0, 7)}`, quote: 'const MAX_ROWS = 10000;' });
  assert.equal(add(root, 'code.json', [code]).json.unverified, 1);
  const r = add(root, 'bad.json', [
    claim({ chunk: 'SRC-003', anchor: 'rows.js line 1' }),
    claim({ chunk: 'SRC-003#1' }),
    claim({ chunk: 'SRC-003', anchor: 'rows.js:1@1a2b3c4' }),
  ]);
  assert.deepEqual(r.json.errors, [
    'claim 1: code anchor "rows.js line 1" must look like path/file.ts:42@1a2b3c4',
    'claim 2: code claims cite the source id SRC-003, not a chunk',
    `claim 3: anchor commit 1a2b3c4 is not SRC-003's commit ${head.slice(0, 7)}`,
  ]);
});
