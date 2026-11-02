'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { readJson, writeJson, readJsonl, writeJsonl, writeFileAtomic } = require('./jsonl');
const { compareIds } = require('./ids');
const { workspacePaths } = require('./paths');
const { checkError, usageError } = require('./errors');

const MODES = ['new', 'existing'];

// The profile stub (spec 5.11): neutral defaults; product and tracker stay empty until the user fills them.
const PROFILE_STUB = {
  product: { name: '', domainNouns: [] },
  tracker: { kind: 'ado', org: '', project: '', team: '', areaPath: '', iterationPath: '' },
  story: { format: 'As a <role>, I want <goal>, so that <benefit>', acStyle: 'given-when-then' },
  tasks: { disciplines: ['design-content', 'frontend', 'backend', 'data', 'qa'], estimates: false },
  board: { categories: ['question', 'unclear', 'missing', 'risk', 'conflict', 'content', 'testability'] },
  lenses: { default: 'all' },
};

const IGNORE_LINES = ['.feature-intelligence', '.feature-intelligence/', '/.feature-intelligence', '/.feature-intelligence/'];

// Adds .feature-intelligence/ to .gitignore unless an equivalent line is there. Returns true when it wrote.
function ensureGitignore(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (text.split(/\r?\n/).some((l) => IGNORE_LINES.includes(l.trim()))) return false;
  fs.writeFileSync(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}.feature-intelligence/\n`);
  return true;
}

function initWorkspace(root, slug, { mode, name, now }) {
  if (!MODES.includes(mode)) throw usageError('--mode must be new or existing');
  const p = workspacePaths(root, slug);
  return withLock(p, () => {
    if (fs.existsSync(p.manifest)) throw checkError(`workspace ${slug} already exists; see fi status ${slug}`);
    // The .gitignore entry comes first, so the profile (which will hold org and project names) is never left un-ignored.
    const gitignoreUpdated = ensureGitignore(p.gitignore);
    const manifest = {
      slug, name: name || slug, mode, lensDefault: 'all', version: 0, artifactUrl: null,
      coverage: { chunks: 0, covered: 0, setAside: 0 }, created: now.slice(0, 10), lastSync: null, boardLastReviewed: null,
    };
    writeJson(p.sources, []);
    for (const f of [p.nodes, p.links, p.decisions]) writeFileAtomic(f, '');
    if (mode === 'new') writeJson(p.tickets, {});
    writeJson(p.manifest, manifest);
    const profileCreated = !fs.existsSync(p.profile);
    if (profileCreated) writeJson(p.profile, PROFILE_STUB);
    return { paths: p, manifest, profileCreated, gitignoreUpdated };
  });
}

function loadWorkspace(root, slug) {
  const p = workspacePaths(root, slug);
  if (!fs.existsSync(p.manifest)) throw usageError(`no workspace "${slug}"; run fi init ${slug} --mode new|existing`);
  return { paths: p, manifest: readJson(p.manifest) };
}

const saveManifest = (p, manifest) => writeJson(p.manifest, manifest);
const loadSources = (p) => readJson(p.sources, []);
const saveSources = (p, list) => writeJson(p.sources, list);
const loadChunks = (p, srcId) => readJsonl(path.join(p.chunks, `${srcId}.jsonl`));
const saveChunks = (p, srcId, chunks) => writeJsonl(path.join(p.chunks, `${srcId}.jsonl`), chunks);
const loadDecisions = (p) => readJsonl(p.decisions);
const saveDecisions = (p, list) => writeJsonl(p.decisions, list);
const loadModel = (p) => ({ nodes: readJsonl(p.nodes), links: readJsonl(p.links) });
const linkKey = (l) => `${l.from} ${l.type} ${l.to}`;

// Nodes sorted by id, links sorted and de-duplicated, so diffs of the committed files stay small.
function saveModel(p, { nodes, links }) {
  writeJsonl(p.nodes, [...nodes].sort((a, b) => compareIds(a.id, b.id)));
  const unique = new Map(links.map((l) => [linkKey(l), l]));
  const byType = (a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0);
  writeJsonl(p.links, [...unique.values()].sort((a, b) => compareIds(a.from, b.from) || byType(a, b) || compareIds(a.to, b.to)));
}

const LOCK_TIMEOUT_MS = 15000;
const LOCK_STALE_MS = 60000;
const GUARD_STALE_MS = 10000;

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function readLock(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

// Windows can refuse a delete for a moment while another process has the file open; retry briefly.
function removeQuietly(file) {
  for (let i = 0; i < 5; i += 1) {
    try {
      fs.rmSync(file, { force: true });
      return;
    } catch {
      sleep(20);
    }
  }
}

// Clears a lock whose holder died. Waiters that find it stale at the same moment are serialised by a second exclusive
// file; the one holding it deletes the lock only if the lock still holds the same token and is still old, so a live
// lock is never removed. Returns true when it deleted the lock.
function clearStale(lock, staleToken, staleMs) {
  const guard = `${lock}.takeover`;
  try {
    fs.writeFileSync(guard, String(process.pid), { flag: 'wx' });
  } catch {
    // Another waiter is clearing it. A guard left by a process that died while clearing is removed after a while.
    try {
      if (Date.now() - fs.statSync(guard).mtimeMs > GUARD_STALE_MS) removeQuietly(guard);
    } catch {
      // the guard is gone already
    }
    return false;
  }
  try {
    const stat = fs.statSync(lock);
    if (readLock(lock) !== staleToken || Date.now() - stat.mtimeMs <= staleMs) return false;
    removeQuietly(lock);
    return true;
  } catch {
    return false; // released meanwhile
  } finally {
    removeQuietly(guard);
  }
}

// One writer at a time per workspace: parallel subagents call fi together (spec 6.2). The lock file holds a token
// unique to its holder, and only that holder removes it. A lock older than staleMs belongs to a process that died.
// fn must be synchronous, and withLock is not reentrant.
function withLock(p, fn, { timeoutMs = LOCK_TIMEOUT_MS, staleMs = LOCK_STALE_MS } = {}) {
  fs.mkdirSync(p.cache, { recursive: true });
  const token = `${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  for (;;) {
    try {
      fs.writeFileSync(p.lock, token, { flag: 'wx' });
      break;
    } catch (e) {
      // EPERM and EBUSY: Windows refuses to create a file that is still being deleted.
      if (!['EEXIST', 'EPERM', 'EBUSY'].includes(e.code)) throw e;
      lastError = e;
    }
    if (Date.now() > deadline) {
      throw checkError(lastError.code === 'EEXIST'
        ? `workspace ${p.slug} is busy (${p.lock}); retry, or delete the lock if no fi is running`
        : `cannot create the lock ${p.lock}: ${lastError.message}`);
    }
    const seen = readLock(p.lock); // read the token before judging its age, so a fresh lock is never taken for the stale one
    let stat = null;
    try {
      stat = fs.statSync(p.lock);
    } catch {
      // released meanwhile
    }
    if (stat && seen !== null && Date.now() - stat.mtimeMs > staleMs) {
      if (!clearStale(p.lock, seen, staleMs)) sleep(20);
    } else {
      sleep(stat ? 50 : 5);
    }
  }
  try {
    return fn();
  } finally {
    if (readLock(p.lock) === token) removeQuietly(p.lock);
  }
}

module.exports = {
  MODES, PROFILE_STUB, initWorkspace, loadWorkspace, saveManifest, loadSources, saveSources, loadChunks, saveChunks,
  loadModel, saveModel, loadDecisions, saveDecisions, linkKey, withLock,
};
