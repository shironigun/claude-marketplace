'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EXAMPLES } = require('./helpers');
const { check } = require('../lib/schema');
const { checkCitations, citationsOf } = require('../lib/citations');
const { checkBrief } = require('../lib/brief');

// The expected files carry no commits, so their citations are read from the fixture's files as they are.
const APP = path.join(EXAMPLES, 'example-desk');
const EXPECTED = path.join(EXAMPLES, 'expected', 'example-desk');
const read = (...parts) => JSON.parse(fs.readFileSync(path.join(EXPECTED, ...parts), 'utf8'));
// The truths the README plants in the code: [kind, file, line].
const PLANTED = [
  ['manual-only', 'server.js', 90], ['does-not', 'server.js', 87], ['does-not', 'server.js', 96],
  ['never-populated', 'server.js', 73], ['hidden', 'public/reminders.html', 32], ['limit', 'server.js', 9],
  ['limit', 'server.js', 86],
];

test('expected: the brand profile passes its checks, every citation holds, and it is the README\'s brand rule', () => {
  const brands = read('brands.json');
  assert.deepEqual(check('brands', brands), []);
  assert.deepEqual(checkCitations(APP, citationsOf('brands', brands)), []);
  assert.deepEqual(brands.brands.map((b) => b.id), ['harbor', 'lumen']);
  assert.deepEqual(brands.rule.evidence[0], { path: 'public/brand.js', line: 9, quote: 'return (workspace && workspace.partner) ||' });
  assert.deepEqual(brands.brands.map((b) => b.chrome), [
    { rail: { logo: 'full', height: 32, inset: 0 } }, { rail: { logo: 'collapsed', height: 25, inset: 10 } },
  ]);
});

for (const subject of ['reminders', 'the-desk']) {
  test(`expected: ${subject} passes its checks, every citation holds, and its ledger holds every planted truth`, () => {
    for (const kind of ['screens', 'api-calls', 'truth']) {
      const value = read(subject, `${kind}.json`);
      assert.deepEqual(check(kind, value), [], `${subject} ${kind}`);
      assert.deepEqual(checkCitations(APP, citationsOf(kind, value)), [], `${subject} ${kind}`);
    }
    assert.deepEqual(checkBrief(fs.readFileSync(path.join(EXPECTED, subject, 'brief.md'), 'utf8')), []);
    const { entries } = read(subject, 'truth.json');
    for (const [kind, file, line] of PLANTED) {
      const found = entries.some((e) => e.kind === kind && e.evidence.some((ev) => ev.path === file && ev.line === line));
      assert.ok(found, `${subject}: no ${kind} entry cites ${file}:${line}`);
    }
  });
}

test('expected: the feature is one screen with its neighbours; the module is every screen, each with its feature', () => {
  const feature = read('reminders', 'screens.json');
  assert.deepEqual(feature.screens.map((s) => s.route), ['/reminders']);
  assert.deepEqual(feature.neighbours.map((n) => n.where), ['Customers list', 'Dashboard', 'Notifications panel, on every page']);
  const module = read('the-desk', 'screens.json');
  assert.deepEqual(module.screens.map((s) => [s.route, s.feature]), [['/', 'Dashboard'], ['/reminders', 'Reminders'], ['/customers', 'Customers']]);
  assert.deepEqual(module.neighbours, []);
});
