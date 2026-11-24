'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { shopRepo, validJson } = require('./helpers');
const { checkCitations, citationsOf } = require('../lib/citations');

const LINE = "router.post('/orders/:id/approve', approveOrder);";
const head = (repo) => spawnSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();

test('citations: a file, a line and a one-line quote, from the working tree or at a commit', () => {
  const repo = shopRepo();
  const commit = head(repo);
  const at = (c) => checkCitations(repo, [{ at: 'x', path: 'src/routes/orders.js', line: 18, ...c }]);
  assert.deepEqual(at({ quote: LINE }), []);
  assert.deepEqual(at({ quote: `  ${LINE.replace(', ', ',    ')}  ` }), []); // runs of white space count as one space
  assert.deepEqual(at({ quote: LINE, ref: commit }), []);
  fs.writeFileSync(path.join(repo, 'src', 'routes', 'orders.js'), 'module.exports = null;\n');
  assert.deepEqual(at({ quote: LINE }), ['x: src/routes/orders.js:18: the file has 1 line']);
  assert.deepEqual(at({ quote: LINE, ref: commit }), []); // the commit still holds the line
  assert.deepEqual(at({ line: 1, quote: 'module.exports = 1;' }), [
    'x: src/routes/orders.js:1: the line does not hold the quote "module.exports = 1;"',
  ]);
  assert.deepEqual(at({ line: 1, quote: 'module.exports\n= null;' }), ['x: src/routes/orders.js:1: a quote is one line']);
});

test('citations: a path outside the repository, a missing file and a bad ref are problems; a file citation needs no line', () => {
  const repo = shopRepo();
  const absolute = path.join(repo, 'src', 'api', 'orders.ts');
  assert.deepEqual(checkCitations(repo, [
    { at: 'a', path: '../secret.txt', line: 1 },
    { at: 'b', path: absolute, line: 1 },
    { at: 'c', path: 'src\\api\\orders.ts', line: 1 },
    { at: 'd', path: 'src/api/missing.ts', line: 1 },
    { at: 'e', path: 'src/api/orders.ts', line: 1, ref: '--output=x' },
    { at: 'f', path: 'src/api/orders.ts', line: 1, ref: 'no-such-branch' },
    { at: 'g', path: 'src/theme/logo.svg' },
    { at: 'h', path: 'src/theme/missing.svg' },
  ]), [
    'a: ../secret.txt:1: not a path inside the repository',
    `b: ${absolute}:1: not a path inside the repository`,
    'c: src\\api\\orders.ts:1: not a path inside the repository',
    'd: src/api/missing.ts:1: no such file',
    'e: src/api/orders.ts:1@--output=x: not a commit or branch name',
    'f: src/api/orders.ts:1@no-such-branch: no such file',
    'h: src/theme/missing.svg: no such file',
  ]);
});

test('citations: a folder is no file, even at a commit', () => {
  const repo = shopRepo();
  const commit = head(repo);
  assert.deepEqual(checkCitations(repo, [{ at: 'd', path: 'src/theme', ref: commit }]), [`d: src/theme@${commit}: no such file`]);
});

test('citations: a quote needs at least 3 characters that are not white space, or it would match any line', () => {
  const repo = shopRepo();
  for (const quote of ['   ', ';']) {
    assert.deepEqual(checkCitations(repo, [{ at: 'x', path: 'src/routes/orders.js', line: 18, quote }]), [
      'x: src/routes/orders.js:18: a quote needs at least 3 characters',
    ], JSON.stringify(quote));
  }
});

test('citations: every kind lists its citations, with the branch or commit to read them at', () => {
  const brands = citationsOf('brands', validJson('brands'));
  assert.equal(brands.length, 1 + 14 + 2); // the rule's evidence, one per value, and the two logo files
  assert.deepEqual(brands.at(-1), { at: 'sample logos.mark', path: 'src/theme/mark.svg' });
  const screens = validJson('screens');
  screens.branch = 'feature/orders';
  assert.deepEqual(citationsOf('screens', screens).map((c) => [c.at, c.ref]), [
    ['entryPoints/0', 'feature/orders'], ['SCR-01', 'feature/orders'], ['neighbours/0', 'feature/orders'],
  ]);
  assert.deepEqual(citationsOf('api-calls', validJson('api-calls')).map((c) => c.at), ['API-01', 'API-02']);
  assert.deepEqual(citationsOf('truth', validJson('truth')), [
    { at: 'T-01 evidence 1', path: 'src/routes/orders.js', line: 18, quote: LINE, ref: 'abc1234' },
  ]);
});
