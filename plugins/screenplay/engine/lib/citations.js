'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readText } = require('./text');
const { isInside } = require('./paths');

// A commit hash or a branch name, never something git would read as an option.
const REF_RE = /^\w[\w./-]*$/;
const squash = (s) => s.replace(/\s+/g, ' ').trim();

// A file of the repository as lines: at a commit or branch through `git cat-file blob` (read-only), or from the
// working tree. Null when there is no such file there; a folder is not a file.
function readLines(repoDir, rel, ref) {
  let text;
  if (ref) {
    const r = spawnSync('git', ['-C', repoDir, 'cat-file', 'blob', `${ref}:${rel}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) return null;
    text = r.stdout;
  } else {
    const abs = path.join(repoDir, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
    text = fs.readFileSync(abs);
  }
  const lines = readText(text).split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// Checks citations {at, path, line?, quote?, ref?} against the repository (spec 5.3-5.5): the path is a file in it
// (at `ref` when given), the line exists, and the quote, when given, is one line found on that line. Runs of white
// space count as one space, and a quote needs at least 3 other characters, since a shorter one matches almost any
// line. Returns one problem per citation that does not hold.
function checkCitations(repoDir, citations) {
  const cache = new Map();
  const read = (rel, ref) => {
    const key = `${ref || ''}:${rel}`;
    if (!cache.has(key)) cache.set(key, readLines(repoDir, rel, ref));
    return cache.get(key);
  };
  const problems = [];
  for (const c of citations) {
    const where = `${c.at}: ${c.path}${c.line === undefined ? '' : `:${c.line}`}${c.ref ? `@${c.ref}` : ''}`;
    if (path.isAbsolute(c.path) || c.path.includes('\\') || !isInside(path.join(repoDir, c.path), repoDir)) {
      problems.push(`${where}: not a path inside the repository`);
      continue;
    }
    if (c.ref && !REF_RE.test(c.ref)) {
      problems.push(`${where}: not a commit or branch name`);
      continue;
    }
    const lines = read(c.path, c.ref);
    if (!lines) problems.push(`${where}: no such file`);
    else if (c.line !== undefined && c.line > lines.length) {
      problems.push(`${where}: the file has ${lines.length} line${lines.length === 1 ? '' : 's'}`);
    } else if (c.quote !== undefined && /[\r\n]/.test(c.quote)) problems.push(`${where}: a quote is one line`);
    else if (c.quote !== undefined && c.quote.replace(/\s/g, '').length < 3) {
      problems.push(`${where}: a quote needs at least 3 characters`);
    } else if (c.quote !== undefined && !squash(lines[c.line - 1]).includes(squash(c.quote))) {
      problems.push(`${where}: the line does not hold the quote "${c.quote}"`);
    }
  }
  return problems;
}

const cite = (at, { path: p, line, quote }, ref) => ({
  at, path: p, ...(line === undefined ? {} : { line }), ...(quote === undefined ? {} : { quote }), ...(ref ? { ref } : {}),
});

// The citations in an analysis result. The screen map and its API calls are read at their `branch` when they name
// one; a brand value, a truth entry, a theme or a screen at its evidence's `commit`. A logo in a repository file is
// cited by its file alone; one drawn in code by its evidence, and one the user supplied not at all.
function citationsOf(kind, value) {
  if (kind === 'brands') {
    return [
      ...value.rule.evidence.map((ev, j) => cite(`rule evidence ${j + 1}`, ev, ev.commit)),
      ...value.brands.flatMap((b) => [
        ...Object.entries(b.evidence).map(([k, ev]) => cite(`${b.id} ${k}`, ev, ev.commit)),
        ...Object.entries(b.logos).filter(([, logo]) => logo.path).map(([k, logo]) => cite(`${b.id} logos.${k}`, { path: logo.path })),
      ]),
    ];
  }
  if (kind === 'screens') {
    return [
      ...value.entryPoints.map((e, i) => cite(`entryPoints/${i}`, e, value.branch)),
      ...value.screens.map((s) => cite(s.id, s.evidence, value.branch)),
      ...value.neighbours.map((n, i) => cite(`neighbours/${i}`, n.evidence, value.branch)),
    ];
  }
  if (kind === 'api-calls') return value.calls.map((c) => cite(c.id, c.caller, value.branch));
  if (kind === 'truth') {
    return value.entries.flatMap((e) => e.evidence.map((ev, j) => cite(`${e.id} evidence ${j + 1}`, ev, ev.commit)));
  }
  if (kind === 'theme') {
    return Object.entries(value.brands).flatMap(([id, b]) => b.evidence.map((ev, j) => cite(`${id} evidence ${j + 1}`, ev, ev.commit)));
  }
  if (kind === 'screen') return value.evidence.map((ev, j) => cite(`evidence ${j + 1}`, ev, ev.commit));
  return [];
}

module.exports = { checkCitations, citationsOf };
