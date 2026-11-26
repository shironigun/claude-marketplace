'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, shopRepo, validJson } = require('./helpers');
const { checkBrief, sectionText, forbiddenNames, namesShown } = require('../lib/brief');

const BRIEF = [
  '# Orders', '',
  '## Purpose', 'Lists the orders and approves them one at a time.', '',
  '## Users', 'Sales managers.', '',
  '## Payoff', 'An order approved from its drawer.', '',
  '## Release status', 'Released.', '',
  '## Must not show', '- T-02: delivery happens in another service.', '- Seed names: `Dana Fox`, `Fox Supplies`.', '',
].join('\n');

function setup() {
  const repo = shopRepo();
  const home = tempDir('sp-home-');
  const env = { SCREENPLAY_HOME: home };
  const init = runSp(repo, ['init', 'Orders', '--json'], env);
  assert.equal(init.code, 0, init.stderr);
  return { repo, home, env, init: init.json };
}

function inboxFile(home, name, text) {
  const file = path.join(home, 'shop', 'inbox', name);
  fs.writeFileSync(file, text);
  return file;
}

test('brief: five sections in order, each with text; a section is read back by its heading', () => {
  assert.deepEqual(checkBrief(BRIEF), []);
  assert.equal(sectionText(BRIEF, 'Purpose'), 'Lists the orders and approves them one at a time.');
  assert.equal(sectionText(BRIEF, 'Notes'), null);
  assert.deepEqual(checkBrief(BRIEF.replace('# Orders', 'Orders')), ['line 1: start with the title line "# <subject name>"']);
  assert.deepEqual(checkBrief(BRIEF.replace('Sales managers.', '')), ['## Users: has no text']);
  assert.deepEqual(checkBrief(BRIEF.replace('## Payoff', '## Notes')), [
    'the sections are Purpose, Users, Payoff, Release status, Must not show, in this order '
      + '(found: Purpose, Users, Notes, Release status, Must not show)',
  ]);
});

test('brief: the must-not-show list names seed data in code spans; each needs 3 characters and is found in any case', () => {
  assert.deepEqual(forbiddenNames(BRIEF), ['Dana Fox', 'Fox Supplies']);
  assert.deepEqual(forbiddenNames(BRIEF.replace(/`/g, '')), []);
  assert.deepEqual(checkBrief(BRIEF.replace('`Fox Supplies`', '`Fo`')), [
    '## Must not show: `Fo` names too little to look for; give at least 3 characters',
  ]);
  assert.deepEqual(checkBrief(BRIEF.replace('`Fox Supplies`', '`T-05`')), [
    '## Must not show: `T-05` is an id; a code span here names what no film shows, so write ids and labels as plain text',
  ]);
  assert.deepEqual(namesShown({ personas: [{ name: 'DANA FOX', n: 2 }], scenes: [{ text: 'Fox Supplies weekly' }] }, forbiddenNames(BRIEF)), [
    '/personas/0/name: shows "Dana Fox", which the brief\'s must-not-show list names',
    '/scenes/0/text: shows "Fox Supplies", which the brief\'s must-not-show list names',
  ]);
  assert.deepEqual(namesShown('Dana Fox', ['Dana Fox']), ['/: shows "Dana Fox", which the brief\'s must-not-show list names']);
  assert.deepEqual(namesShown({ a: 'Dana Fox' }, []), []);
});

test('save brief: the brief lands in the subject map; a bad one is refused and nothing is written', () => {
  const { repo, home, env, init } = setup();
  const target = path.join(init.workspace, 'map', 'brief.md');
  const bad = runSp(repo, ['save', 'brief', inboxFile(home, 'orders.brief.md', '# Orders\n'), '--subject', 'orders'], env);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /brief has 1 problem:\n {2}the sections are Purpose/);
  assert.equal(fs.existsSync(target), false);
  const r = runSp(repo, ['save', 'brief', inboxFile(home, 'orders.brief.md', BRIEF.replace(/\n/g, '\r\n')), '--subject', 'orders', '--json'], env);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json, { kind: 'brief', saved: target, items: 5 });
  assert.equal(fs.readFileSync(target, 'utf8'), `${BRIEF.trimEnd()}\n`);
  assert.equal(runSp(repo, ['save', 'brief', inboxFile(home, 'x.md', BRIEF)], env).code, 2); // needs --subject
});

test('save: a result inside the app\'s repository is refused; init and detect name the inbox outside it', () => {
  const { repo, home, env, init } = setup();
  const inbox = path.join(home, 'shop', 'inbox');
  assert.equal(init.inbox, inbox);
  assert.ok(fs.statSync(inbox).isDirectory());
  const detect = runSp(repo, ['detect', '--json'], env);
  assert.deepEqual([detect.json.workspace, detect.json.inbox], [path.join(home, 'shop'), inbox]);
  fs.writeFileSync(path.join(repo, 'brands.json'), JSON.stringify(validJson('brands')));
  const r = runSp(repo, ['save', 'brands', 'brands.json'], env);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /brands\.json is inside the app's repository; write it to the inbox, /);
  assert.equal(fs.existsSync(path.join(home, 'shop', 'profile', 'brands.json')), false);
});
