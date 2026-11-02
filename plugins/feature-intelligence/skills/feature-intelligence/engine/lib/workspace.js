'use strict';
const fs = require('fs');
const path = require('path');
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
  if (fs.existsSync(p.manifest)) throw checkError(`workspace ${slug} already exists; see fi status ${slug}`);
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
  const gitignoreUpdated = ensureGitignore(p.gitignore);
  return { paths: p, manifest, profileCreated, gitignoreUpdated };
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

// One writer at a time per workspace. A lock older than a minute is from a process that died.
function withLock(p, fn) {
  fs.mkdirSync(p.cache, { recursive: true });
  const deadline = Date.now() + 15000;
  for (;;) {
    try {
      fs.writeFileSync(p.lock, String(process.pid), { flag: 'wx' });
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let age;
      try {
        age = Date.now() - fs.statSync(p.lock).mtimeMs;
      } catch {
        continue;
      }
      if (age > 60000) {
        fs.rmSync(p.lock, { force: true });
        continue;
      }
      if (Date.now() > deadline) throw checkError(`workspace ${p.slug} is busy (${p.lock}); retry, or delete the lock if no fi is running`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(p.lock, { force: true });
  }
}

module.exports = {
  MODES, PROFILE_STUB, initWorkspace, loadWorkspace, saveManifest, loadSources, saveSources, loadChunks, saveChunks,
  loadModel, saveModel, loadDecisions, saveDecisions, linkKey, withLock,
};
