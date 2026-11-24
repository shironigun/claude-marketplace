'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, fixtureRepo, analysedFixture: analysed, inputFile, EXAMPLES } = require('./helpers');

const NOW = '2026-11-12T10:00:00.000Z';
const EXPECTED = path.join(EXAMPLES, 'expected', 'example-desk');
const expected = (subject, kind) => JSON.parse(fs.readFileSync(path.join(EXPECTED, subject, `${kind}.json`), 'utf8'));

test('dossier: the expected analysis of the Reminders feature is ready, and gate 1 then passes', () => {
  const { repo, env } = analysed('reminders');
  const d = runSp(repo, ['dossier', 'reminders', '--json'], env).json;
  assert.deepEqual([d.ready, d.missing, d.problems], [true, [], []]);
  assert.deepEqual(d.screens, [{ id: 'SCR-01', title: 'Reminders queue', route: '/reminders' }]);
  assert.deepEqual([d.calls, d.truth], [6, { 'manual-only': 1, 'does-not': 2, 'never-populated': 1, hidden: 1, limit: 2, does: 9 }]);
  assert.deepEqual(d.mustNotShow.map((e) => [e.id, e.kind]), [
    ['T-02', 'does-not'], ['T-03', 'does-not'], ['T-04', 'never-populated'], ['T-05', 'hidden'],
  ]);
  assert.deepEqual([d.open, d.brand], [[], { saved: false, confirmed: false }]);
  assert.match(d.purpose, /^A queue of follow-up reminders/);
  assert.equal(d.names.length, 12);
  assert.deepEqual([d.names[0], d.names[6], d.names[11]], ['Ava Brooks', 'Riley Chen', 'Kim Bakery']);
  const text = runSp(repo, ['dossier', 'reminders'], env).stdout;
  assert.match(text, /^names no film shows: Ava Brooks, Noah Patel, Mia Johnson, /m);
  assert.match(text, /^ready for gate 1$/m);
  assert.match(text, /^ {2}T-05 hidden: The reminder drawer's History tab is hidden\.$/m);
  const gate = runSp(repo, ['confirm', 'gate-1', '--subject', 'reminders', '--json'], env);
  assert.deepEqual(gate.json, { confirmed: 'gate-1', subject: 'reminders', at: NOW });
  assert.equal(runSp(repo, ['status', 'reminders', '--json'], env).json.next, 'done');
});

test('dossier: the module lists every screen with its feature', () => {
  const { repo, env } = analysed('the-desk');
  const d = runSp(repo, ['dossier', 'the-desk', '--json'], env).json;
  assert.equal(d.ready, true, d.problems.join('\n'));
  assert.deepEqual(d.screens.map((s) => s.feature), ['Dashboard', 'Reminders', 'Customers']);
});

test('dossier: an unknown call id and a citation the code no longer holds are problems, and gate 1 waits', () => {
  const { repo, env } = analysed('reminders');
  const screens = expected('reminders', 'screens');
  screens.screens[0].actions[5].calls.push('API-09');
  assert.equal(runSp(repo, ['save', 'screens', inputFile(screens, repo), '--subject', 'reminders'], env).code, 0);
  fs.writeFileSync(path.join(repo, 'public', 'app.js'), '// emptied\n'); // the working tree moves on after the save
  const d = runSp(repo, ['dossier', 'reminders', '--json'], env).json;
  assert.equal(d.ready, false);
  assert.deepEqual(d.problems, [
    'SCR-01 action "Send reminder" calls API-09, which api-calls.json does not list',
    'entryPoints/2: public/app.js:8: the file has 1 line',
    'neighbours/0: public/app.js:60: the file has 1 line',
    'API-05: public/app.js:33: the file has 1 line',
    'API-06: public/app.js:20: the file has 1 line',
    'T-04 evidence 2: public/app.js:54: the file has 1 line',
    'T-10 evidence 2: public/app.js:22: the file has 1 line',
    'T-11 evidence 2: public/app.js:5: the file has 1 line',
    'T-12 evidence 2: public/app.js:60: the file has 1 line',
  ]); // the ledger is re-checked against the code as it is now, not at the commit it cites
  const gate = runSp(repo, ['confirm', 'gate-1', '--subject', 'reminders'], env);
  assert.equal(gate.code, 1);
  assert.match(gate.stderr, /the dossier has 9 problems:\n {2}SCR-01 action "Send reminder" calls API-09/);
});

test('confirm gate-1: misuse, the analysis first, and a new save asks for gate 1 again', () => {
  const { repo, env } = analysed('reminders');
  assert.equal(runSp(repo, ['confirm', 'gate-1'], env).code, 2);
  assert.equal(runSp(repo, ['confirm', 'gate-1', '--subject', 'nope'], env).code, 2);
  assert.equal(runSp(repo, ['dossier'], env).code, 2);
  assert.equal(runSp(repo, ['dossier', 'nope'], env).code, 2);
  assert.equal(runSp(repo, ['init', 'Customers', '--json'], env).code, 0);
  const early = runSp(repo, ['confirm', 'gate-1', '--subject', 'customers'], env);
  assert.equal(early.code, 1);
  assert.match(early.stderr, /gate 1 comes after the analysis; the next step is screens/);
  const fresh = runSp(repo, ['dossier', 'customers', '--json'], env).json;
  assert.deepEqual([fresh.ready, fresh.missing], [false, ['screens.json', 'api-calls.json', 'truth.json', 'brief.md']]);
  const bare = fixtureRepo();
  const bareEnv = { SCREENPLAY_HOME: tempDir('sp-home-') };
  assert.equal(runSp(bare, ['init', 'Plain', '--json'], bareEnv).code, 0);
  const plain = runSp(bare, ['dossier', 'plain', '--json'], bareEnv).json; // no sp detect, so no stack.json
  assert.deepEqual([plain.ready, plain.missing], [false, ['stack.json', 'screens.json', 'api-calls.json', 'truth.json', 'brief.md']]);
  assert.equal(runSp(repo, ['confirm', 'gate-1', '--subject', 'reminders'], env).code, 0);
  const truth = inputFile(expected('reminders', 'truth'), repo);
  assert.equal(runSp(repo, ['save', 'truth', truth, '--subject', 'reminders'], env).code, 0);
  assert.equal(runSp(repo, ['status', 'reminders', '--json'], env).json.next, 'gate-1');
});
