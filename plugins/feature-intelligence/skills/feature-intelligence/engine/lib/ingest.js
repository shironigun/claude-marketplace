'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { readText } = require('./text');
const { sha256, shortHash } = require('./hash');
const { nextId } = require('./ids');
const { chunkMarkdown, chunksFromBlocks, textBlocks } = require('./blocks');
const { htmlBlocks } = require('./html');
const { readDocxBlocks } = require('./docx');
const { pdfPageCount } = require('./pdf');
const { adoChunks } = require('./ado');
const { relPath } = require('./paths');
const { loadSources, saveSources, saveChunks } = require('./workspace');
const { FiError, checkError, usageError } = require('./errors');

const IMAGES = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

// Chunks of one file by extension. A format the engine does not take is a usage error; a file of a known
// format that cannot be read throws a plain Error, and the caller registers it as unreadable.
function readFileChunks(file, buf, pages) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return { format: 'markdown', chunks: chunkMarkdown(readText(buf)) };
  if (ext === '.txt' || ext === '.text') return { format: 'text', chunks: chunksFromBlocks(textBlocks(readText(buf))) };
  if (ext === '.html' || ext === '.htm') return { format: 'html', chunks: chunksFromBlocks(htmlBlocks(readText(buf))) };
  if (ext === '.docx') return { format: 'docx', chunks: chunksFromBlocks(readDocxBlocks(buf)) };
  if (ext === '.pdf') {
    const n = pages || pdfPageCount(buf);
    if (!n) throw new Error('could not count the pages; ingest it again with --pages <n>');
    return { format: 'pdf', chunks: Array.from({ length: n }, (_, i) => ({ anchor: `p${i + 1}`, text: null })) };
  }
  if (IMAGES.has(ext)) return { format: 'image', chunks: [{ anchor: 'image', text: null }] };
  throw usageError(`cannot ingest "${ext || path.basename(file)}": use .md, .txt, .html, .docx, .pdf or an image`);
}

// Writes the chunk cache and adds (or, for an unreadable source read again, replaces) the registry entry.
function register(p, sources, fields, chunks, replace) {
  const id = replace ? replace.id : nextId('SRC', sources.map((s) => s.id));
  const cached = chunks.map((c, i) => ({
    id: `${id}#${i + 1}`, anchor: c.anchor, text: c.text, hash: c.text == null ? null : shortHash(c.text),
  }));
  const source = { id, ...fields, chunks: cached.map((c) => ({ id: c.id, anchor: c.anchor, hash: c.hash })) };
  saveChunks(p, id, cached);
  if (replace) sources[sources.indexOf(replace)] = source;
  else sources.push(source);
  return source;
}

function readInput(root, file) {
  const abs = path.resolve(root, file);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw usageError(`no such file: ${file}`);
  return { abs, buf: fs.readFileSync(abs) };
}

const phase2 = (what, id) => checkError(`${what} since it was ingested as ${id}; updating a source is fi sync (phase 2)`);

// A file, a screenshot or pasted text.
function ingestFile(p, file, { root, now, pages, paste, by, title }) {
  const { abs, buf } = readInput(root, file);
  const hash = sha256(buf);
  const rel = relPath(root, abs);
  const sources = loadSources(p);
  const same = paste
    ? sources.find((s) => s.kind === 'paste' && s.origin.sha256 === hash)
    : sources.find((s) => (s.kind === 'file' || s.kind === 'screenshot') && s.origin.path === rel);
  if (same && same.status !== 'unreadable') {
    if (same.origin.sha256 === hash) return { source: same, skipped: true };
    throw phase2(`${rel} changed`, same.id);
  }
  let read;
  let error = null;
  try {
    read = paste ? { format: 'markdown', chunks: chunkMarkdown(readText(buf)) } : readFileChunks(abs, buf, pages);
  } catch (e) {
    if (e instanceof FiError) throw e;
    error = e.message;
    read = { format: path.extname(abs).slice(1).toLowerCase(), chunks: [{ anchor: 'whole file', text: null }] };
  }
  const fields = {
    kind: paste ? 'paste' : read.format === 'image' ? 'screenshot' : 'file',
    origin: paste ? { pastedBy: by || null, pastedAt: now, sha256: hash } : { path: rel, sha256: hash },
    title: title || (paste ? 'Pasted text' : path.basename(abs)),
    fetchedAt: now,
    status: error ? 'unreadable' : 'ok',
    format: read.format,
    ...(error ? { error } : {}),
  };
  const source = register(p, sources, fields, read.chunks, same);
  saveSources(p, sources);
  return { source, skipped: false };
}

// Work items Claude fetched through the ADO server: one source each. All are checked before any is written.
function ingestAdo(p, file, { root, now }) {
  const { buf } = readInput(root, file);
  let data;
  try {
    data = JSON.parse(readText(buf));
  } catch (e) {
    throw usageError(`${file} is not valid JSON: ${e.message}`);
  }
  const shaped = (Array.isArray(data) ? data : [data]).map((entry, i) => {
    try {
      return adoChunks(entry);
    } catch (e) {
      throw usageError(`${file}, entry ${i + 1}: ${e.message}`);
    }
  });
  const sources = loadSources(p);
  const known = (a) => sources.find((s) => s.kind === 'ado' && s.origin.workItem === a.origin.workItem);
  for (const a of shaped) {
    const same = known(a);
    if (same && same.origin.rev !== a.origin.rev) {
      throw phase2(`work item ${a.origin.workItem} changed (rev ${same.origin.rev} to ${a.origin.rev})`, same.id);
    }
  }
  const results = shaped.map((a) => {
    const same = known(a);
    if (same) return { source: same, skipped: true };
    const fields = { kind: 'ado', origin: a.origin, title: a.title, fetchedAt: now, status: 'ok', format: 'ado' };
    return { source: register(p, sources, fields, a.chunks), skipped: false };
  });
  saveSources(p, sources);
  return results;
}

// A repository for existing-feature mode. Code facts cite path:line@commit anchors, so it has no chunks.
function ingestRepo(p, dir, { root, now, commit, title }) {
  const abs = path.resolve(root, dir);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw usageError(`no such folder: ${dir}`);
  let head = commit;
  if (!head) {
    try {
      head = execFileSync('git', ['-C', abs, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      throw usageError(`${dir} is not a git repository; pass --commit <sha>`);
    }
  }
  const rel = relPath(root, abs) || '.';
  const sources = loadSources(p);
  const same = sources.find((s) => s.kind === 'repo' && s.origin.path === rel);
  if (same && same.origin.commit === head) return { source: same, skipped: true };
  if (same) throw phase2(`${rel} moved from ${same.origin.commit.slice(0, 7)} to ${head.slice(0, 7)}`, same.id);
  const fields = {
    kind: 'repo', origin: { path: rel, commit: head }, title: title || path.basename(abs), fetchedAt: now,
    status: 'ok', format: 'repo', coverageExempt: true,
  };
  const source = register(p, sources, fields, []);
  saveSources(p, sources);
  return { source, skipped: false };
}

module.exports = { ingestFile, ingestAdo, ingestRepo };
