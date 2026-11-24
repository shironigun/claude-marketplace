'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, repoFiles, gitRepo } = require('./helpers');
const { repoInfo, isInside } = require('../lib/paths');
const { renderState, parseState } = require('../lib/state');

test('paths: the repository is named after its git top folder, from any subfolder', () => {
  const dir = gitRepo('Acme Web');
  const info = repoInfo(path.join(dir, 'src'));
  assert.equal(info.key, 'acme-web');
  assert.equal(info.git, true);
  assert.equal(fs.realpathSync.native(info.dir), fs.realpathSync.native(dir));
  const plain = path.join(tempDir(), 'plain-folder');
  fs.mkdirSync(plain);
  assert.deepEqual([repoInfo(plain).key, repoInfo(plain).git], ['plain-folder', false]);
  assert.throws(() => repoInfo(path.join(plain, 'missing')), (e) => e.code === 2);
});

test('workspace: two repositories with the same folder name get separate workspaces', () => {
  const home = tempDir('sp-home-');
  const env = { SCREENPLAY_HOME: home };
  const first = gitRepo('web');
  const second = gitRepo('web');
  const a = runSp(first, ['init', 'Mine', '--json'], env);
  assert.equal(a.code, 0, a.stderr);
  assert.equal(a.json.repository, 'web');
  const claim = JSON.parse(fs.readFileSync(path.join(home, 'web', 'profile', 'repository.json'), 'utf8'));
  assert.deepEqual(claim, { path: a.json.repositoryDir, name: 'web' });
  const b = runSp(second, ['init', 'X', '--json'], env);
  assert.equal(b.code, 0, b.stderr);
  assert.match(b.json.repository, /^web-[0-9a-f]{6}$/);
  const again = runSp(second, ['init', 'X', '--json'], env).json; // the hashed key is stable
  assert.deepEqual([again.repository, again.created], [b.json.repository, false]);
  const listed = (dir) => {
    const s = runSp(dir, ['status', '--json'], env).json;
    return [s.repository, s.subjects.map((x) => x.subject)];
  };
  assert.deepEqual(listed(first), ['web', ['mine']]);
  assert.deepEqual(listed(second), [b.json.repository, ['x']]);
});

test('workspace: the reserved name tools and a folder name with no letters or digits get a hashed key', () => {
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const tools = runSp(gitRepo('tools'), ['init', 'X', '--json'], env);
  assert.equal(tools.code, 0, tools.stderr);
  assert.match(tools.json.repository, /^tools-[0-9a-f]{6}$/);
  const nihon = gitRepo('日本');
  assert.equal(repoInfo(nihon).key, '');
  const unnamed = runSp(nihon, ['init', '日本', '--json'], env);
  assert.equal(unnamed.code, 2);
  assert.match(unnamed.stderr, /no letters a-z or digits.*--slug/);
  const named = runSp(nihon, ['init', '日本', '--slug', 'nihon', '--json'], env);
  assert.equal(named.code, 0, named.stderr);
  assert.equal(named.json.subject, 'nihon');
  assert.match(named.json.repository, /^repo-[0-9a-f]{6}$/);
});

test('workspace: a home that holds the repository gets a hashed key, so the workspace is never the repository', () => {
  const repo = gitRepo('shop');
  const init = runSp(repo, ['init', 'Orders', '--home', '..', '--json']); // the home is the repository's parent
  assert.equal(init.code, 0, init.stderr);
  assert.match(init.json.repository, /^shop-[0-9a-f]{6}$/);
  const detect = runSp(repo, ['detect', '--home', '..', '--json']);
  assert.equal(detect.code, 0, detect.stderr);
  assert.equal(detect.json.stack.repository, init.json.repository);
  assert.deepEqual(repoFiles(repo), []); // nothing written in the repository, at any depth
  assert.equal(isInside(detect.json.inbox, repo), false);
});

test('init: a subject name holding a line break is refused', () => {
  const r = runSp(gitRepo('shop'), ['init', 'two\nlines', '--json']);
  assert.equal(r.code, 2);
  assert.match(r.stderr, /the subject name must be one line/);
});

test('init: creates a subject outside the repository; a second init resumes', () => {
  const repo = gitRepo('shop');
  const home = tempDir('sp-home-');
  const env = { SCREENPLAY_HOME: home };
  const r = runSp(repo, ['init', 'Reminders', 'Queue', '--json'], env);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual([r.json.created, r.json.subject, r.json.kind], [true, 'reminders-queue', 'feature']);
  const dir = path.join(home, 'shop', 'subjects', 'reminders-queue');
  assert.equal(fs.readFileSync(path.join(dir, 'state.md'), 'utf8'), [
    '# Working State: Reminders Queue', '',
    '- subject: reminders-queue', '- kind: feature', '- repository: shop',
    '- phase: bootstrap (0 Bootstrap)', '- updated: 2026-11-12T10:00:00.000Z', '',
    '## Decisions', '- (none yet)', '', '## Pending', '- (none)', '',
  ].join('\n'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'subject.json'), 'utf8')), { name: 'Reminders Queue', kind: 'feature' });
  assert.deepEqual(repoFiles(repo), []); // nothing written in the repository, at any depth
  const again = runSp(repo, ['init', 'Reminders', 'Queue', '--json'], env);
  assert.deepEqual([again.code, again.json.created], [0, false]);
});

test('init: a module or a flow is a subject too; other kinds and a home inside the repository are refused', () => {
  const repo = gitRepo('shop');
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  assert.equal(runSp(repo, ['init', 'The Desk', '--kind', 'module', '--json'], env).json.kind, 'module');
  assert.equal(runSp(repo, ['init', 'Send and follow up', '--kind', 'flow', '--json'], env).json.kind, 'flow');
  assert.equal(runSp(repo, ['init', 'X', '--kind', 'page'], env).code, 2);
  const inside = runSp(repo, ['init', 'X'], { SCREENPLAY_HOME: path.join(repo, '.films') });
  assert.equal(inside.code, 2);
  assert.match(inside.stderr, /inside the app's repository/);
  assert.equal(fs.existsSync(path.join(repo, '.films')), false);
});

test('status and state: the list, the next step, and recorded progress', () => {
  const repo = gitRepo('shop');
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  assert.equal(runSp(repo, ['init', 'Reminders', '--json'], env).code, 0);
  assert.equal(runSp(repo, ['init', 'The Desk', '--kind', 'module', '--json'], env).code, 0);
  assert.equal(runSp(repo, ['init', 'Broken', '--json'], env).code, 0);
  const subjects = path.join(env.SCREENPLAY_HOME, 'shop', 'subjects');
  fs.writeFileSync(path.join(subjects, 'Thumbs.db'), '');
  fs.mkdirSync(path.join(subjects, 'Not A Slug'));
  fs.writeFileSync(path.join(subjects, 'broken', 'state.md'), 'garbage\n');
  const list = runSp(repo, ['status', '--json'], env);
  assert.equal(list.code, 0, list.stderr);
  assert.deepEqual(list.json.subjects.map((s) => s.subject), ['broken', 'reminders', 'the-desk']);
  assert.deepEqual(list.json.subjects.find((s) => s.error), { subject: 'broken', error: 'state.md is not a Working State file' });
  assert.deepEqual(list.json.subjects.filter((s) => !s.error).map((s) => [s.subject, s.kind, s.phase]), [
    ['reminders', 'feature', 'bootstrap'], ['the-desk', 'module', 'bootstrap'],
  ]);
  const one = runSp(repo, ['status', 'reminders', '--json'], env);
  assert.equal(one.json.next, 'bootstrap');
  assert.equal(one.json.files['stack.json'], false);
  const s = runSp(repo, ['state', 'reminders', '--phase', 'brand', '--decision', 'Demo data only', '--pending', 'Confirm the brand board', '--json'], env);
  assert.equal(s.code, 0, s.stderr);
  assert.equal(s.json.phase, 'brand');
  const done = runSp(repo, ['state', 'reminders', '--done', 'Confirm the brand board', '--json'], env);
  assert.deepEqual([done.json.pending, done.json.decisions], [[], ['Demo data only']]);
  assert.equal(runSp(repo, ['state', 'reminders', '--phase', 'ui'], env).code, 2); // a film's phase, not a subject's
  assert.equal(runSp(repo, ['state', 'reminders', '--done', 'never pending'], env).code, 2);
  assert.equal(runSp(repo, ['state', 'reminders', '--decision', 'two\nlines'], env).code, 2);
  assert.equal(runSp(repo, ['state', 'reminders'], env).code, 2);
  assert.equal(runSp(repo, ['status', 'nope'], env).code, 2);
});

test('state: render and parse round-trip; anything else is not a Working State', () => {
  const s = {
    name: 'X', subject: 'x', kind: 'module', repository: 'r', phase: 'gate-1',
    updated: '2026-11-12T10:00:00.000Z', decisions: ['a: b'], pending: ['c'],
  };
  assert.deepEqual(parseState(renderState(s)), s);
  assert.throws(() => parseState('# Something else'), /not a Working State/);
});
