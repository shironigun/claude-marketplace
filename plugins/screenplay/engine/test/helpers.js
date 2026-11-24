'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SP = path.join(__dirname, '..', 'sp.js');
// Outside test/, so a bare `node --test` never runs a fixture's code as a test.
const FIXTURES = path.join(__dirname, '..', 'fixtures');
const EXAMPLES = path.join(__dirname, '..', '..', 'examples');

function tempDir(prefix = 'sp-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Runs the CLI in `cwd` with a fixed clock and, unless `env` names one, a fresh workspace home.
// With --json, the parsed output is in `json`.
function runSp(cwd, args, env = {}) {
  const r = spawnSync(process.execPath, [SP, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, SP_NOW: '2026-11-12T10:00:00.000Z', SCREENPLAY_HOME: tempDir('sp-home-'), ...env },
  });
  let json;
  if (args.includes('--json')) {
    try {
      json = JSON.parse(r.stdout);
    } catch {
      json = undefined;
    }
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

// Every file under `dir` outside .git, relative and sorted: what a check that nothing was written in a repository
// compares, at every depth.
function repoFiles(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)))
    .filter((f) => !f.split(path.sep).includes('.git'))
    .sort();
}

// git must not climb above the temp folder, or a repository around it would answer for the test folders.
// The native realpath gives the long form of a Windows short (8.3) temp path, which is the form git compares.
process.env.GIT_CEILING_DIRECTORIES = fs.realpathSync.native(os.tmpdir());

// A fresh git repository named `name` with an empty src/ folder.
function gitRepo(name) {
  const dir = path.join(tempDir(), name);
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  spawnSync('git', ['init', '-q', dir]);
  return dir;
}

// Makes `dir` a git repository of its own with everything in it committed.
function commitAll(dir, message) {
  const git = ['-C', dir, '-c', 'user.name=fixture', '-c', 'user.email=fixture@localhost'];
  for (const args of [['init', '-q'], ['add', '-A'], ['commit', '-q', '-m', message]]) {
    const r = spawnSync('git', [...git, ...args], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`git ${args[0]} failed in ${dir}: ${r.stderr}`);
  }
  return dir;
}

// An example app as its README says to analyse it: a copy in a fresh temp folder of its name, committed to a git
// repository of its own.
function fixtureRepo(name = 'example-desk') {
  const dir = path.join(tempDir(), name);
  fs.cpSync(path.join(EXAMPLES, name), dir, { recursive: true });
  return commitAll(dir, name);
}

// The sample app the valid examples cite (fixtures/shop), copied to a fresh temp folder named shop: a committed git
// repository, or with `{ git: false }` a plain folder.
function shopRepo({ git = true } = {}) {
  const dir = path.join(tempDir(), 'shop');
  fs.cpSync(path.join(FIXTURES, 'shop'), dir, { recursive: true });
  return git ? commitAll(dir, 'shop') : dir;
}

// A valid example (fixtures/valid/<kind>.json), parsed.
const validJson = (kind) => JSON.parse(fs.readFileSync(path.join(FIXTURES, 'valid', `${kind}.json`), 'utf8'));

// An analysis result as a temp file outside the repository, for `sp save`. Every quoted citation names the
// repository's HEAD commit, or no commit when `repo` has none (a plain folder).
function inputFile(value, repo) {
  const head = spawnSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  const commit = head.status === 0 ? head.stdout.trim() : null;
  const text = JSON.stringify(value, (k, v) => {
    if (v === null || typeof v !== 'object' || Array.isArray(v) || typeof v.quote !== 'string') return v;
    const cited = { ...v };
    delete cited.commit;
    return commit ? { ...cited, commit } : cited;
  }, 2);
  const file = path.join(tempDir('sp-in-'), 'input.json');
  fs.writeFileSync(file, text);
  return file;
}

// Runs sp in `repo` for a test's setup, which fails loudly instead of going on.
function spOk(repo, env) {
  return (...args) => {
    const r = runSp(repo, args, env);
    if (r.code !== 0) throw new Error(`sp ${args.join(' ')} failed: ${r.stderr}`);
    return r;
  };
}

// A brief of the sample app's Orders subject, in the shape `sp save brief` takes.
const ORDERS_BRIEF = [
  '# Orders', '', '## Purpose', 'Lists the orders and opens one in a drawer.', '', '## Users', 'Sales staff.', '',
  '## Payoff', 'An order opened from the list.', '', '## Release status', 'New in this release.', '',
  '## Must not show', '- Real customer names.', '',
].join('\n');

// The sample app ready for a film's planning (spec 5.1): the Orders subject analysed from the valid examples and
// past gate 1, the brand profile confirmed, the release status recorded (left out when null), and a film of the
// subject in `format`.
function filmRepo({ format = 'promo', release = 'new' } = {}) {
  const repo = shopRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const sp = spOk(repo, env);
  const { workspace } = sp('init', 'Orders', '--json').json;
  sp('detect');
  sp('save', 'brands', inputFile(validJson('brands'), repo));
  sp('confirm', 'brands');
  for (const kind of ['screens', 'api-calls', 'truth']) sp('save', kind, inputFile(validJson(kind), repo), '--subject', 'orders');
  const brief = path.join(tempDir('sp-in-'), 'orders.brief.md');
  fs.writeFileSync(brief, ORDERS_BRIEF);
  sp('save', 'brief', brief, '--subject', 'orders');
  sp('confirm', 'gate-1', '--subject', 'orders');
  if (release) sp('state', 'orders', '--decision', `Release: ${release}`);
  sp('film', 'orders', format);
  return { repo, env, workspace, film: path.join(workspace, 'films', format) };
}

// The subjects of example-desk that the expected outputs analyse: [name, kind].
const DESK_SUBJECTS = { reminders: ['Reminders', 'feature'], 'the-desk': ['The Desk', 'module'] };

// example-desk as a committed copy, with a subject's expected analysis saved through sp save; `sp` runs more.
function analysedFixture(subject) {
  const repo = fixtureRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const sp = spOk(repo, env);
  const expected = path.join(EXAMPLES, 'expected', 'example-desk', subject);
  const [name, kind] = DESK_SUBJECTS[subject];
  sp('init', name, '--kind', kind);
  sp('detect');
  for (const k of ['screens', 'api-calls', 'truth']) {
    const value = JSON.parse(fs.readFileSync(path.join(expected, `${k}.json`), 'utf8'));
    sp('save', k, inputFile(value, repo), '--subject', subject);
  }
  sp('save', 'brief', path.join(expected, 'brief.md'), '--subject', subject);
  return { repo, env, sp };
}

// An example film of example-desk ready for the build (spec 5.11): its subject analysed, the brand profile confirmed,
// its plan saved past gate 2 on the expected storyboard, and the theme and its screens saved. `film` is its folder.
function readyFilm(subject, format) {
  const { repo, env, sp } = analysedFixture(subject);
  const expected = path.join(EXAMPLES, 'expected', 'example-desk');
  const json = (...p) => JSON.parse(fs.readFileSync(path.join(expected, ...p), 'utf8'));
  sp('save', 'brands', inputFile(json('brands.json'), repo));
  sp('confirm', 'brands');
  sp('confirm', 'gate-1', '--subject', subject);
  sp('state', subject, '--decision', 'Release: new');
  const { workspace } = sp('film', subject, format, '--json').json;
  for (const kind of ['mods', 'beats', 'demo-data']) sp('save', kind, path.join(expected, subject, format, `${kind}.json`), '--subject', subject, '--film', format);
  sp('storyboard', subject, '--film', format);
  sp('confirm', 'gate-2', '--subject', subject, '--film', format);
  sp('save', 'theme', inputFile(json('theme.json'), repo));
  for (const file of fs.readdirSync(path.join(expected, subject, format, 'screens'))) {
    sp('save', 'screen', inputFile(json(subject, format, 'screens', file), repo), '--subject', subject, '--film', format);
  }
  return { repo, env, sp, film: workspace, runSp };
}

module.exports = {
  SP, FIXTURES, EXAMPLES, ORDERS_BRIEF, tempDir, runSp, repoFiles, gitRepo, fixtureRepo, shopRepo, filmRepo,
  analysedFixture, readyFilm, validJson, inputFile,
};
