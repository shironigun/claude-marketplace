'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, shopRepo, validJson, inputFile } = require('./helpers');
const { renderState, parseState, readState, writeState, decisionValue } = require('../lib/state');

const NOW = '2026-11-12T10:00:00.000Z';

function setup() {
  const repo = shopRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const init = runSp(repo, ['init', 'Orders', '--json'], env);
  assert.equal(init.code, 0, init.stderr);
  return { repo, env, workspace: init.json.workspace };
}

const save = (repo, env, kind, ...rest) => runSp(repo, ['save', kind, inputFile(validJson(kind), repo), ...rest], env);

test('status: a subject walks stack, screens, backend and context to gate 1; the brand profile is not a step', () => {
  const { repo, env, workspace } = setup();
  const next = () => runSp(repo, ['status', 'orders', '--json'], env).json.next;
  assert.equal(next(), 'bootstrap');
  assert.equal(runSp(repo, ['detect'], env).code, 0);
  assert.equal(next(), 'screens'); // no brand profile is saved, and app-map does not wait for one
  for (const kind of ['screens', 'api-calls']) assert.equal(save(repo, env, kind, '--subject', 'orders').code, 0);
  assert.equal(next(), 'backend');
  assert.equal(save(repo, env, 'truth', '--subject', 'orders').code, 0);
  assert.equal(next(), 'context');
  fs.writeFileSync(path.join(workspace, 'map', 'brief.md'), '# Orders\n'); // what the context step leaves
  assert.equal(next(), 'gate-1');
  const status = runSp(repo, ['status', 'orders', '--json'], env).json;
  assert.deepEqual(status.files, { 'stack.json': true, 'screens.json': true, 'api-calls.json': true, 'truth.json': true, 'brief.md': true });
  assert.deepEqual(status.brand, { saved: false, confirmed: false });
  const file = path.join(workspace, 'state.md');
  writeState(file, { ...readState(file), gate1: NOW });
  assert.equal(next(), 'done');
  assert.equal(runSp(repo, ['status', 'orders', '--json'], env).json.gate1, NOW);
  assert.match(runSp(repo, ['status', 'orders'], env).stdout, /^next: done \(gate 1 passed\)$/m);
});

test('confirm: the brand profile needs a saved profile, and a new save clears the confirmation', () => {
  const { repo, env } = setup();
  const brand = () => runSp(repo, ['status', '--json'], env).json.brand;
  assert.equal(runSp(repo, ['confirm', 'brands'], env).code, 2);
  assert.equal(runSp(repo, ['confirm', 'everything'], env).code, 2);
  assert.equal(save(repo, env, 'brands').code, 0);
  assert.deepEqual(brand(), { saved: true, confirmed: false, brands: ['sample'] });
  const ok = runSp(repo, ['confirm', 'brands', '--json'], env);
  assert.deepEqual(ok.json, { confirmed: 'brands', at: NOW });
  assert.deepEqual(brand(), { saved: true, confirmed: true, confirmedAt: NOW, brands: ['sample'] });
  assert.deepEqual(runSp(repo, ['status', 'orders', '--json'], env).json.brand, brand());
  assert.match(runSp(repo, ['status'], env).stdout, /^brand profile: confirmed \(sample\)$/m);
  assert.equal(save(repo, env, 'brands').code, 0);
  assert.deepEqual(brand(), { saved: true, confirmed: false, brands: ['sample'] });
});

test('state: a decision recorded twice is kept once', () => {
  const { repo, env } = setup();
  runSp(repo, ['state', 'orders', '--decision', 'Stack: static-html'], env);
  const s = runSp(repo, ['state', 'orders', '--decision', 'Stack: static-html', '--json'], env);
  assert.deepEqual(s.json.decisions, ['Stack: static-html']);
});

test('state: a new answer to a keyed decision replaces the old one; Release takes only its values; Data is no key', () => {
  const { repo, env } = setup();
  const decide = (text) => runSp(repo, ['state', 'orders', '--decision', text, '--json'], env);
  decide('Stack: static-html');
  decide('Uses the staging server: it has the demo account');
  decide('Name: Follow-ups');
  assert.deepEqual(decide('Stack: react on vite').json.decisions, [
    'Stack: react on vite', 'Uses the staging server: it has the demo account', 'Name: Follow-ups',
  ]);
  const bad = decide('Release: some day');
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /a Release decision is one of: released, new, beta, unreleased \(as "Release: released"\)/);
  assert.equal(decide('Release: unreleased').code, 0);
  assert.deepEqual(decide('Release: beta').json.decisions, [
    'Stack: react on vite', 'Uses the staging server: it has the demo account', 'Name: Follow-ups', 'Release: beta',
  ]);
  // Films show demo data only (spec D21): a data answer is an ordinary decision, so a second one does not replace it.
  decide('Data: demo');
  assert.deepEqual(decide('Data: real').json.decisions.slice(-2), ['Data: demo', 'Data: real']);
  assert.equal(decisionValue(['Release: beta'], 'Release'), 'beta');
  assert.equal(decisionValue(['Release: beta, as recommended'], 'Release'), null); // recorded before the values were fixed
  assert.equal(decisionValue(['Name: Follow-ups'], 'Release'), null);
});

test('state: a passed gate 1 is one line above the sections; a decision that looks like it is not read as it', () => {
  const s = {
    name: 'X', subject: 'x', kind: 'feature', repository: 'r', phase: 'gate-1', updated: NOW, gate1: NOW,
    decisions: ['gate-1: passed never'], pending: [],
  };
  const text = renderState(s);
  assert.match(text, /^- updated: .+\n- gate-1: passed 2026-11-12T10:00:00\.000Z\n\n## Decisions$/m);
  assert.deepEqual(parseState(text), s);
  const open = { ...s };
  delete open.gate1;
  assert.deepEqual(parseState(renderState(open)), open);
});
