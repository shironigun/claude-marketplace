'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir } = require('./helpers');
const { PLAYWRIGHT, toolsPaths, findChromium, npmCli, playerProblems, installTools, readyTools } = require('../lib/tools');

// A folder like the one the skill saves the player's files in, and playwright-core as npm would install it.
function playerDir(app = 'window.__animation = {};') {
  const dir = tempDir('sp-player-');
  fs.mkdirSync(path.join(dir, 'artifact-type'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<script src="artifact-type/app.js"></script>');
  fs.writeFileSync(path.join(dir, 'artifact-type', 'app.js'), app);
  fs.writeFileSync(path.join(dir, 'artifact-type', 'app.css'), 'body{}');
  return dir;
}
function fakeNpm(calls, version = PLAYWRIGHT) {
  return (args, env) => {
    calls.push({ args, env });
    const prefix = args[args.indexOf('--prefix') + 1];
    const pkg = path.join(prefix, 'node_modules', 'playwright-core', 'package.json');
    fs.mkdirSync(path.dirname(pkg), { recursive: true });
    fs.writeFileSync(pkg, JSON.stringify({ version }));
    return { status: 0, stderr: '' };
  };
}

test('tools: the user\'s own Chromium, wherever the platform installs it, and npm without a shell', () => {
  const env = { PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)', LOCALAPPDATA: 'D:\\AppData\\Local' };
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  assert.equal(findChromium(env, 'win32', (p) => p === edge), edge);
  assert.equal(findChromium(env, 'win32', () => true), 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  assert.equal(findChromium({}, 'darwin', (p) => p.includes('Chromium')), '/Applications/Chromium.app/Contents/MacOS/Chromium');
  assert.equal(findChromium({}, 'linux', () => false), null);
  // CHROMIUM_PATH names the browser, and only that one.
  assert.equal(findChromium({ ...env, CHROMIUM_PATH: '/opt/c/chrome' }, 'win32', (p) => p === '/opt/c/chrome'), '/opt/c/chrome');
  assert.equal(findChromium({ ...env, CHROMIUM_PATH: '/opt/c/chrome' }, 'win32', () => false), null);
  const win = path.join('C:', 'node', 'node.exe');
  assert.equal(npmCli(win, (p) => p === path.join('C:', 'node', 'node_modules', 'npm', 'bin', 'npm-cli.js')), path.join('C:', 'node', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  const unix = path.join('/usr', 'local', 'bin', 'node');
  assert.equal(npmCli(unix, (p) => p === path.join('/usr', 'local', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')), path.join('/usr', 'local', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  assert.equal(npmCli(unix, () => false), null);
  // The npm that started the engine first; a distribution's own last.
  const own = path.join('/opt', 'npm', 'bin', 'npm-cli.js');
  assert.equal(npmCli(unix, () => true, { npm_execpath: own }), own);
  const debian = path.join('/usr', 'share', 'nodejs', 'npm', 'bin', 'npm-cli.js');
  assert.equal(npmCli(path.join('/usr', 'bin', 'node'), (p) => p === debian), debian);
});

test('tools: install copies the player, gets playwright-core once at its tested version, and records what it installed', () => {
  const home = tempDir('sp-home-');
  const dir = playerDir();
  const env = { CHROMIUM_PATH: process.execPath, NODE_OPTIONS: '--require x', NODE_PATH: '/elsewhere' };
  // A folder without the player's files, or with a page that is not the player's, is refused before anything is done.
  const empty = tempDir('sp-player-');
  assert.deepEqual(playerProblems(empty), ['index.html', 'artifact-type/app.js', 'artifact-type/app.css'].map((f) => `${f} is not in ${empty}`));
  assert.deepEqual(playerProblems(dir), []);
  assert.match(playerProblems(playerDir('console.log(1)'))[0], /holds no Motion player: its app\.js has no offline renderer/);
  assert.throws(() => installTools(home, empty, env, fakeNpm([])), /the player's files are not all there/);
  assert.throws(() => installTools(home, dir, { CHROMIUM_PATH: path.join(home, 'none.exe') }, fakeNpm([])), /no Chrome, Edge or Chromium found/);
  const calls = [];
  const record = installTools(home, dir, env, fakeNpm(calls));
  const t = toolsPaths(home);
  assert.equal(record.playwright, PLAYWRIGHT);
  assert.equal(record.chromium, process.execPath);
  assert.equal(fs.readFileSync(path.join(t.player, 'artifact-type', 'app.js'), 'utf8'), 'window.__animation = {};');
  assert.deepEqual(JSON.parse(fs.readFileSync(t.record, 'utf8')), record);
  // npm runs with no install scripts, at the pinned version, into the tools folder, and with none of the caller's
  // NODE_PATH or NODE_OPTIONS.
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['install', '--prefix', t.root, '--ignore-scripts', '--no-audit', '--no-fund', `playwright-core@${PLAYWRIGHT}`]);
  assert.deepEqual([calls[0].env.NODE_PATH, calls[0].env.NODE_OPTIONS], ['', '']);
  // Installed once: a second install copies the player again and runs no npm.
  installTools(home, dir, env, fakeNpm(calls));
  assert.equal(calls.length, 1);
  assert.equal(readyTools(home).chromium, process.execPath);
  // A player file changed since it was copied, or npm that installs another version, leaves the renderer not ready.
  fs.appendFileSync(path.join(t.player, 'artifact-type', 'app.js'), '\n');
  assert.throws(() => readyTools(home), /the renderer is not installed; read the Motion player's files into a folder and run sp render --install <folder>/);
  assert.throws(() => installTools(tempDir('sp-home-'), dir, env, fakeNpm([], '1.0.0')), /npm could not install playwright-core/);
});

test('sp render --install: the tools in the workspace home, never in the plugin', () => {
  const home = tempDir('sp-home-');
  const pkg = path.join(toolsPaths(home).playwrightDir, 'package.json');
  fs.mkdirSync(path.dirname(pkg), { recursive: true });
  fs.writeFileSync(pkg, JSON.stringify({ version: PLAYWRIGHT }));
  const dir = playerDir();
  const env = { SCREENPLAY_HOME: home, CHROMIUM_PATH: process.execPath };
  const r = runSp(dir, ['render', '--install', '.', '--json'], env);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(Object.keys(r.json.player), ['index.html', 'artifact-type/app.js', 'artifact-type/app.css']);
  assert.ok(fs.existsSync(path.join(home, 'tools', 'player', 'index.html')));
  const bad = runSp(tempDir('sp-player-'), ['render', '--install', '.'], env);
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /the player's files are not all there/);
  assert.equal(runSp(dir, ['render'], env).code, 2);
});
