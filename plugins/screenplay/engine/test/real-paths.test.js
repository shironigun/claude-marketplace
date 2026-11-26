'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runSp, tempDir, gitRepo, shopRepo, validJson, inputFile } = require('./helpers');
const { realPath, isInside } = require('../lib/paths');
const { checkCitations } = require('../lib/citations');

// A directory junction at `at` (a symbolic link to a folder elsewhere), pointing at `target`.
function link(target, at) {
  fs.symlinkSync(target, at, 'junction');
  return at;
}

test('paths: a path is compared by its real spelling, so a link into or out of the repository is seen', () => {
  const repo = gitRepo('shop');
  const outside = tempDir('sp-out-');
  const into = link(path.join(repo, 'src'), path.join(outside, 'into-repo'));
  assert.equal(isInside(path.join(into, 'a.txt'), repo), true);
  const away = link(outside, path.join(repo, 'src', 'away'));
  assert.equal(isInside(path.join(away, 'b.txt'), repo), false);
  assert.equal(realPath(path.join(into, 'not', 'yet')), path.join(fs.realpathSync.native(path.join(repo, 'src')), 'not', 'yet'));
});

// The Windows short (8.3) spelling of a folder, as cmd gives it; null when the volume keeps no short names.
function shortName(dir) {
  const r = spawnSync('cmd.exe', ['/d', '/s', '/c', `for %I in ("${dir}") do @echo %~sI`], { encoding: 'utf8', windowsVerbatimArguments: true });
  const short = r.status === 0 ? r.stdout.trim() : '';
  return short && short.toLowerCase() !== dir.toLowerCase() ? short : null;
}

test('paths: a Windows short name is read as the folder it names, so it cannot lead into the repository unseen', { skip: process.platform !== 'win32' && 'Windows only' }, (t) => {
  const repo = gitRepo('shop');
  const short = shortName(repo);
  if (!short) {
    t.skip('this volume keeps no short names');
    return;
  }
  assert.equal(realPath(short), fs.realpathSync.native(repo));
  assert.equal(isInside(path.join(short, 'src', 'new.txt'), repo), true);
  const r = runSp(repo, ['init', 'Orders'], { SCREENPLAY_HOME: path.join(short, 'home') });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /is inside the app's repository; choose a folder outside it/);
});

test('paths: a home or a result reached through a link into the repository is refused', () => {
  const repo = gitRepo('shop');
  const home = link(path.join(repo, 'src'), path.join(tempDir('sp-out-'), 'home'));
  const r = runSp(repo, ['init', 'Orders'], { SCREENPLAY_HOME: home });
  assert.equal(r.code, 2);
  assert.match(r.stderr, /is inside the app's repository; choose a folder outside it/);
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  assert.equal(runSp(repo, ['init', 'Orders'], env).code, 0);
  const side = link(path.join(repo, 'src'), path.join(tempDir('sp-out-'), 'side'));
  fs.writeFileSync(path.join(side, 'brands.json'), JSON.stringify(validJson('brands')));
  const saved = runSp(repo, ['save', 'brands', path.join(side, 'brands.json')], env);
  assert.equal(saved.code, 2);
  assert.match(saved.stderr, /is inside the app's repository; write it to the inbox/);
});

test('citations: a cited file reached through a link that leads out of the repository is refused', () => {
  const repo = gitRepo('shop');
  const outside = tempDir('sp-out-');
  fs.writeFileSync(path.join(outside, 'secret.ts'), 'export const key = 1;\n');
  link(outside, path.join(repo, 'src', 'away'));
  assert.deepEqual(checkCitations(repo, [{ at: 'x', path: 'src/away/secret.ts', line: 1, quote: 'export const key' }]), [
    'x: src/away/secret.ts:1: not a path inside the repository',
  ]);
});

test('save brands: in a folder that is not a git repository, citations are read from the working tree as it is', () => {
  const repo = shopRepo({ git: false });
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const save = () => runSp(repo, ['save', 'brands', inputFile(validJson('brands'), repo)], env);
  assert.equal(save().code, 0);
  const file = path.join(repo, 'src', 'theme', 'sample.ts');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace("primary: '#4a3fb5',", "primary: '#000000',"));
  const r = save();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /sample palette\.primary: src\/theme\/sample\.ts:8: the line does not hold the quote/);
});
