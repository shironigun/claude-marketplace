'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { slugify } = require('./text');
const { usageError } = require('./errors');
const { readJson, writeJson } = require('./files');

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// What a film can be about (spec 1): one feature, a whole module, or a flow across modules.
const KINDS = ['feature', 'module', 'flow'];
// Folders the engine keeps for itself under $SCREENPLAY_HOME (spec 4.2), so no workspace may take their name.
const RESERVED = new Set(['tools']);

// A subject's or a film's slug, which names its folder.
function checkSlug(slug, what = 'subject') {
  if (!slug) throw usageError(`missing <${what} slug>`);
  if (!SLUG_RE.test(slug) || slug.length > 64) {
    throw usageError(`bad ${what} slug "${slug}": use lowercase letters, digits and single hyphens`);
  }
  return slug;
}

function checkKind(kind) {
  if (!KINDS.includes(kind)) throw usageError(`unknown kind "${kind}"; use one of: ${KINDS.join(', ')}`);
  return kind;
}

// The app's repository: its top folder (git's, when it is a git repository) and the slug of its name, which is
// empty when the name has no letters or digits (workspaceKey names the workspace).
function repoInfo(dir) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw usageError(`no such folder: ${dir}`);
  const git = spawnSync('git', ['-C', abs, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  const top = git.status === 0 ? path.resolve(git.stdout.trim()) : abs;
  return { dir: top, name: path.basename(top), key: slugify(path.basename(top)), git: git.status === 0 };
}

// A path's real spelling: symbolic links and junctions followed, and a Windows short (8.3) name made long, for the
// part of it that exists; the rest is kept as written. Two spellings of one folder then compare as one.
function realPath(p) {
  const rest = [];
  let head = path.resolve(p);
  while (!fs.existsSync(head)) {
    const parent = path.dirname(head);
    if (parent === head) break;
    rest.unshift(path.basename(head));
    head = parent;
  }
  return path.join(fs.existsSync(head) ? fs.realpathSync.native(head) : head, ...rest);
}

// Whether `child` is `parent` or inside it, by their real paths (spec P2), so no link, junction or short name leads
// into or out of the repository unseen.
function isInside(child, parent) {
  const r = path.relative(realPath(parent), realPath(child));
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
}

// Spec P2: nothing is written inside the app's repository, so the workspace home may not sit in it.
function checkHome(home, repo) {
  if (isInside(home, repo.dir)) {
    throw usageError(`SCREENPLAY_HOME (${home}) is inside the app's repository; choose a folder outside it`);
  }
  return home;
}

function repoPaths(home, key) {
  const root = path.join(home, key);
  const profile = path.join(root, 'profile');
  return {
    root,
    profile,
    repository: path.join(profile, 'repository.json'),
    stack: path.join(profile, 'stack.json'),
    brands: path.join(profile, 'brands.json'),
    theme: path.join(profile, 'theme.json'),
    houseStyle: path.join(profile, 'house-style.json'),
    subjects: path.join(root, 'subjects'),
    // Where a skill writes a subagent's result for `sp save` to read: outside the app's repository (spec P2, P11).
    inbox: path.join(root, 'inbox'),
  };
}

// One spelling of a repository's folder, to compare and hash it: absolute, and lowercase on Windows.
function normalPath(dir) {
  const abs = path.resolve(dir);
  return process.platform === 'win32' ? abs.toLowerCase() : abs;
}

// The folder under the home that holds a repository's workspace: the slug of its name, or, when that slug is
// empty, reserved, claimed by another folder's profile/repository.json, or names a folder that is the repository or
// inside it (spec P2; a home that is the repository's parent), the slug (`repo` when empty) followed by six hex
// characters of the repository's path.
function workspaceKey(home, repo) {
  const base = repo.key || 'repo';
  const here = normalPath(repo.dir);
  const claim = repoPaths(home, base).repository;
  const recorded = (owner) => (owner && typeof owner.path === 'string' ? normalPath(owner.path) : null);
  const hashed = RESERVED.has(base) || base === 'repo' || isInside(path.join(home, base), repo.dir)
    || (fs.existsSync(claim) && recorded(readJson(claim)) !== here);
  return hashed ? `${base}-${crypto.createHash('sha256').update(here).digest('hex').slice(0, 6)}` : base;
}

// Records which repository a workspace belongs to, before anything else is written in it.
function claimWorkspace(home, repo, key) {
  const claim = repoPaths(home, key).repository;
  if (!fs.existsSync(claim)) writeJson(claim, { path: repo.dir, name: repo.name });
}

// One subject's files (spec 4.2).
function subjectPaths(home, key, slug) {
  checkSlug(slug);
  const root = path.join(home, key, 'subjects', slug);
  const map = path.join(root, 'map');
  return {
    root,
    map,
    state: path.join(root, 'state.md'),
    subject: path.join(root, 'subject.json'),
    screens: path.join(map, 'screens.json'),
    apiCalls: path.join(map, 'api-calls.json'),
    truth: path.join(map, 'truth.json'),
    brief: path.join(map, 'brief.md'),
    films: path.join(root, 'films'),
  };
}

// One film's files (spec 4.2).
function filmPaths(home, key, subject, film) {
  const root = path.join(subjectPaths(home, key, subject).films, checkSlug(film, 'film'));
  const story = path.join(root, 'story');
  return {
    root,
    story,
    state: path.join(root, 'state.md'),
    mods: path.join(root, 'mods.json'),
    beats: path.join(story, 'beats.json'),
    demoData: path.join(story, 'demo-data.json'),
    storyboard: path.join(story, 'storyboard.md'),
    screens: path.join(root, 'screens'),
    // The build (spec 4.2, 5.12): the shared source, each brand's overlay, and each brand's film in the store.
    film: path.join(root, 'film'),
    modules: path.join(root, 'film', 'modules'),
    brands: path.join(root, 'film', 'brands'),
    films: path.join(root, 'film', 'films.json'),
  };
}

module.exports = {
  SLUG_RE, KINDS, RESERVED, checkSlug, checkKind, repoInfo, realPath, isInside, checkHome, repoPaths, workspaceKey,
  claimWorkspace, subjectPaths, filmPaths,
};
