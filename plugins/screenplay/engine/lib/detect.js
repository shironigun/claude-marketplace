'use strict';
const fs = require('fs');
const path = require('path');
const { readText } = require('./text');
const { RULES } = require('./detect-tables');

// Dependency, build and tool folders are never read.
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'bin', 'obj', '.next', '.nuxt', '.svelte-kit',
  'coverage', 'vendor', 'target', '.venv', 'venv', '__pycache__']);
const MAX_FILES = 20000;
const MAX_BYTES = 256 * 1024;
const MAX_EVIDENCE = 3;
const FRONTEND = ['frameworks', 'routing', 'apiStyles', 'contracts', 'auth', 'theming', 'devServers', 'i18n', 'fonts'];
const MONOREPO_FILES = new Set(['pnpm-workspace.yaml', 'lerna.json', 'nx.json', 'turbo.json']);

// The repository's files as relative paths with forward slashes, in a stable order. A folder it cannot read, and
// the stop at `maxFiles`, go into `skipped`.
function listFiles(root, maxFiles = MAX_FILES, skipped = []) {
  const out = [];
  const rel = (abs) => path.relative(root, abs).split(path.sep).join('/') || '.';
  let full = false;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      skipped.push({ path: rel(dir), reason: 'unreadable' });
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      if (full) return;
      if (e.isDirectory()) {
        if (!IGNORE.has(e.name)) walk(path.join(dir, e.name));
      } else if (e.isFile()) {
        if (out.length >= maxFiles) {
          full = true;
          skipped.push({ path: '.', reason: `stopped after ${maxFiles} files` });
          return;
        }
        out.push(rel(path.join(dir, e.name)));
      }
    }
  };
  walk(root);
  return out;
}

const globRe = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);

function matches(rel, glob) {
  return globRe(glob).test(glob.includes('/') ? rel : path.posix.basename(rel));
}

// A package.json's fields, or the reason it cannot be used.
function readPackage(file) {
  let text;
  try {
    text = readText(fs.readFileSync(file));
  } catch {
    return { reason: 'unreadable' };
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { reason: 'invalid JSON' };
  }
  return json !== null && typeof json === 'object' && !Array.isArray(json) ? { json } : { reason: 'not a JSON object' };
}

function readPackages(root, files, skipped) {
  const packages = [];
  for (const f of files.filter((x) => path.posix.basename(x) === 'package.json')) {
    const { json, reason } = readPackage(path.join(root, f));
    if (reason) {
      skipped.push({ path: f, reason });
      continue;
    }
    const deps = {};
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const name of Object.keys(json[field] || {})) if (!deps[name]) deps[name] = field;
    }
    packages.push({ path: f, deps, workspaces: json.workspaces });
  }
  return packages;
}

function layoutOf(files, packages) {
  const root = packages.find((p) => p.path === 'package.json');
  const mono = Boolean(root && root.workspaces) || files.some((f) => MONOREPO_FILES.has(f));
  const nested = packages.filter((p) => p.path !== 'package.json').map((p) => path.posix.dirname(p.path)).sort();
  return mono ? { kind: 'monorepo', packages: nested } : { kind: 'single', packages: [] };
}

// Every file left out of the scan, and why, goes into `skipped`; the scan goes on without it.
function detectStack(root, { repository, now, maxFiles = MAX_FILES }) {
  const skipped = [];
  const files = listFiles(root, maxFiles, skipped);
  const packages = readPackages(root, files, skipped);
  const cache = new Map();
  const content = (f) => {
    if (!cache.has(f)) {
      const abs = path.join(root, f);
      let text = '';
      try {
        if (fs.statSync(abs).size <= MAX_BYTES) text = readText(fs.readFileSync(abs));
      } catch {
        skipped.push({ path: f, reason: 'unreadable' });
      }
      cache.set(f, text);
    }
    return cache.get(f);
  };
  const evidenceFor = (signal) => {
    if (signal.dep) {
      const prefix = signal.dep.endsWith('*') ? signal.dep.slice(0, -1) : null;
      const out = [];
      for (const p of packages) {
        for (const [name, field] of Object.entries(p.deps)) {
          if (prefix ? name.startsWith(prefix) : name === signal.dep) out.push(`${p.path}: ${field}.${name}`);
        }
      }
      return out;
    }
    if (signal.file) return files.filter((f) => matches(f, signal.file));
    const out = [];
    for (const f of files) {
      if (!signal.in.some((g) => matches(f, g))) continue;
      const m = signal.grep.exec(content(f));
      if (m) out.push(`${f}: ${m[0].trim().slice(0, 60)}`);
      if (out.length >= MAX_EVIDENCE) break;
    }
    return out;
  };
  const group = (key) => RULES[key]
    .map((rule) => ({ id: rule.id, evidence: [...new Set(rule.any.flatMap(evidenceFor))].slice(0, MAX_EVIDENCE) }))
    .filter((finding) => finding.evidence.length);
  const frontend = {};
  for (const k of FRONTEND) frontend[k] = group(`frontend.${k}`);
  if (!frontend.frameworks.length) {
    const page = files.find((f) => f.endsWith('.html'));
    if (page) frontend.frameworks.push({ id: 'static-html', evidence: [page] });
  }
  const stack = {
    repository,
    detectedAt: now,
    frontend,
    backend: { languages: group('backend.languages'), frameworks: group('backend.frameworks') },
    layout: layoutOf(files, packages),
  };
  return { stack, skipped };
}

const idsOf = (list) => (list.length ? list.map((f) => f.id).join(', ') : 'none');

// The bootstrap's one line (spec 5.2).
function summarize(s) {
  const f = s.frontend;
  const backend = s.backend.languages.length ? `${idsOf(s.backend.languages)} (${idsOf(s.backend.frameworks)})` : 'none';
  return `${idsOf(f.frameworks)} on ${idsOf(f.devServers)}; API: ${idsOf(f.apiStyles)}; auth: ${idsOf(f.auth)}; `
    + `theme: ${idsOf(f.theming)}; backend: ${backend}; layout: ${s.layout.kind}`;
}

module.exports = { IGNORE, listFiles, matches, detectStack, summarize };
