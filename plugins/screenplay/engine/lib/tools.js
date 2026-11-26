'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { checkError, usageError } = require('./errors');
const { readJson, writeJson } = require('./files');

// What verify renders with (spec 12), in $SCREENPLAY_HOME/tools/: playwright-core at the version the engine was
// tested with, the Motion type's own player (its three files, which the skill reads from one of the user's films),
// and the user's own Chromium browser, found where it is installed. Nothing here is ever in the plugin.
const PLAYWRIGHT = '1.65.1';
const PLAYER_FILES = ['index.html', 'artifact-type/app.js', 'artifact-type/app.css'];

function toolsPaths(home) {
  const root = path.join(home, 'tools');
  return { root, player: path.join(root, 'player'), record: path.join(root, 'tools.json'), playwrightDir: path.join(root, 'node_modules', 'playwright-core') };
}

// The user's own Chromium browser: CHROMIUM_PATH when it names a file, then Chrome, Edge and Chromium where each
// platform installs them. `exists` says whether a file is there. Null when none is.
function findChromium(env, platform, exists) {
  if (env.CHROMIUM_PATH) return exists(env.CHROMIUM_PATH) ? env.CHROMIUM_PATH : null;
  const win = (base, rest) => (base ? [path.win32.join(base, ...rest)] : []);
  const places = {
    win32: [
      ...win(env.PROGRAMFILES, ['Google', 'Chrome', 'Application', 'chrome.exe']),
      ...win(env['PROGRAMFILES(X86)'], ['Google', 'Chrome', 'Application', 'chrome.exe']),
      ...win(env.LOCALAPPDATA, ['Google', 'Chrome', 'Application', 'chrome.exe']),
      ...win(env['PROGRAMFILES(X86)'], ['Microsoft', 'Edge', 'Application', 'msedge.exe']),
      ...win(env.PROGRAMFILES, ['Microsoft', 'Edge', 'Application', 'msedge.exe']),
    ],
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
  };
  return (places[platform] || places.linux).find(exists) || null;
}

// npm's own script, so npm runs without a shell (a .cmd needs one on Windows, and a shell would split a home with a
// space in it): the one npm itself named when it started the engine, else beside the node running it (next to node.exe
// on Windows, under lib/ elsewhere), else a distribution's own (Debian's /usr/share/nodejs).
function npmCli(execPath, exists, env = {}) {
  const dir = path.dirname(execPath);
  const places = [
    ...(env.npm_execpath && env.npm_execpath.endsWith('npm-cli.js') ? [env.npm_execpath] : []),
    path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(dir, '..', 'share', 'nodejs', 'npm', 'bin', 'npm-cli.js'),
  ];
  return places.find(exists) || null;
}

// What is wrong with a folder the skill saved the player's files in: a file missing, or a page that is not the
// player's (its tools entry is what verify drives).
function playerProblems(dir) {
  const problems = PLAYER_FILES.filter((f) => !fs.existsSync(path.join(dir, f)) || !fs.statSync(path.join(dir, f)).isFile())
    .map((f) => `${f} is not in ${dir}`);
  if (!problems.length && !fs.readFileSync(path.join(dir, 'artifact-type', 'app.js'), 'utf8').includes('__animation')) {
    problems.push(`${dir} holds no Motion player: its app.js has no offline renderer (window.__animation)`);
  }
  return problems;
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const installed = (t) => fs.existsSync(path.join(t.playwrightDir, 'package.json')) && readJson(path.join(t.playwrightDir, 'package.json')).version === PLAYWRIGHT;

// Installs the tools (spec 12): the player's three files copied from `dir`, playwright-core at the tested version
// when it is not there yet (npm, with no install scripts, and nothing from the caller's NODE_PATH or NODE_OPTIONS),
// and the user's Chromium found. `run(args, env)` runs npm with those arguments; the engine's own finds npm and spawns
// it. Records what it installed in tools.json and returns it.
function installTools(home, dir, env, run = spawnNpm) {
  const problems = playerProblems(dir);
  if (problems.length) throw usageError(`the player's files are not all there:\n  ${problems.join('\n  ')}`);
  const t = toolsPaths(home);
  const chromium = findChromium(env, process.platform, (p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!chromium) throw checkError('no Chrome, Edge or Chromium found; install one, or set CHROMIUM_PATH to the browser\'s program (a snap Chromium cannot open the workspace\'s hidden folder)');
  fs.rmSync(t.player, { recursive: true, force: true });
  for (const f of PLAYER_FILES) {
    fs.mkdirSync(path.dirname(path.join(t.player, f)), { recursive: true });
    fs.copyFileSync(path.join(dir, f), path.join(t.player, f));
  }
  if (!installed(t)) {
    const clean = { ...env, NODE_PATH: '', NODE_OPTIONS: '' };
    const r = run(['install', '--prefix', t.root, '--ignore-scripts', '--no-audit', '--no-fund', `playwright-core@${PLAYWRIGHT}`], clean);
    if (r.status !== 0 || !installed(t)) throw checkError(`npm could not install playwright-core ${PLAYWRIGHT}:\n${String(r.stderr || '').trim().slice(-2000)}`);
  }
  const record = {
    playwright: PLAYWRIGHT,
    chromium,
    player: Object.fromEntries(PLAYER_FILES.map((f) => [f, sha256(path.join(t.player, f))])),
  };
  writeJson(t.record, record);
  return record;
}

function spawnNpm(args, env) {
  const cli = npmCli(process.execPath, fs.existsSync, env);
  if (!cli) throw checkError('npm was not found beside node; install Node.js with npm');
  return spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8', windowsHide: true });
}

// The tools as installed, or a refusal that says how to install them: verify needs every part, and the player's
// files as they were copied.
function readyTools(home) {
  const t = toolsPaths(home);
  const record = readJson(t.record, null);
  const ok = record && installed(t) && fs.existsSync(record.chromium)
    && PLAYER_FILES.every((f) => fs.existsSync(path.join(t.player, f)) && sha256(path.join(t.player, f)) === record.player[f]);
  if (!ok) throw checkError('the renderer is not installed; read the Motion player\'s files into a folder and run sp render --install <folder>');
  return { ...t, chromium: record.chromium, version: record.playwright };
}

module.exports = { PLAYWRIGHT, PLAYER_FILES, toolsPaths, findChromium, npmCli, playerProblems, installTools, readyTools };
