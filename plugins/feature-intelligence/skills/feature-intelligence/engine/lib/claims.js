'use strict';
const fs = require('fs');
const path = require('path');
const { readText, normalizeQuote } = require('./text');
const { readJsonl, writeJsonl } = require('./jsonl');
const { formatId, parseId } = require('./ids');
const { validateClaim, CHUNK_RE } = require('./schema');
const { loadSources, loadChunks } = require('./workspace');
const { usageError } = require('./errors');

const CODE_ANCHOR = /^[^:@\n]+:\d+(?:-\d+)?@[0-9a-f]{7,40}$/;
const BATCH_RE = /^batch-(\d+)\.jsonl$/;

// A JSON array, or one JSON object per line.
function readClaimsFile(file) {
  const text = readText(fs.readFileSync(file)).trim();
  if (!text) return [];
  if (text.startsWith('[')) return JSON.parse(text);
  return text.split('\n').filter((l) => l.trim()).map((l, i) => {
    try {
      return JSON.parse(l);
    } catch (e) {
      throw usageError(`line ${i + 1}: invalid JSON (${e.message})`);
    }
  });
}

const batchFiles = (p) => (fs.existsSync(p.claims) ? fs.readdirSync(p.claims).filter((f) => BATCH_RE.test(f)).sort() : []);
const loadClaims = (p) => batchFiles(p).flatMap((f) => readJsonl(path.join(p.claims, f)));

// Checks each claim against the registry and the chunk cache. Returns the claims enriched with
// src, hash and quoteVerified, and every problem found.
function checkClaims(p, input) {
  const sources = new Map(loadSources(p).map((s) => [s.id, s]));
  const cache = new Map();
  const chunksOf = (srcId) => {
    if (!cache.has(srcId)) cache.set(srcId, new Map(loadChunks(p, srcId).map((c) => [c.id, c])));
    return cache.get(srcId);
  };
  const errors = [];
  const claims = [];
  input.forEach((claim, i) => {
    const fail = (message) => errors.push(`claim ${i + 1}: ${message}`);
    const problems = validateClaim(claim);
    if (problems.length) {
      problems.forEach(fail);
      return;
    }
    // An empty quote matches any text (includes('') is true), so it needs at least one letter or digit.
    if (!/[\p{L}\p{N}]/u.test(normalizeQuote(claim.quote))) return fail('quote has no words');
    const srcId = claim.chunk.split('#')[0];
    const src = sources.get(srcId);
    if (!src) return fail(`no source ${srcId}`);
    if (src.kind === 'repo') {
      if (claim.chunk !== srcId) return fail(`code claims cite the source id ${srcId}, not a chunk`);
      if (!CODE_ANCHOR.test(claim.anchor)) return fail(`code anchor "${claim.anchor}" must look like path/file.ts:42@1a2b3c4`);
      // An anchor must name the commit the registry recorded; a short prefix of it is fine.
      const at = claim.anchor.slice(claim.anchor.lastIndexOf('@') + 1).toLowerCase();
      const commit = String(src.origin.commit).toLowerCase();
      if (!commit.startsWith(at)) return fail(`anchor commit ${at} is not ${srcId}'s commit ${commit.slice(0, 7)}`);
      claims.push({ ...claim, src: srcId, hash: null, quoteVerified: false });
      return undefined;
    }
    if (!CHUNK_RE.test(claim.chunk)) return fail(`cite a chunk of ${srcId}, like ${srcId}#1`);
    const chunk = chunksOf(srcId).get(claim.chunk);
    if (!chunk) return fail(`no chunk ${claim.chunk}`);
    if (claim.anchor !== chunk.anchor) return fail(`anchor "${claim.anchor}" does not match ${claim.chunk} ("${chunk.anchor}")`);
    const checkable = chunk.text != null;
    if (checkable && !normalizeQuote(chunk.text).includes(normalizeQuote(claim.quote))) return fail(`quote not found in ${claim.chunk}`);
    claims.push({ ...claim, src: srcId, hash: chunk.hash, quoteVerified: checkable });
    return undefined;
  });
  return { claims, errors };
}

// Stores a checked file as the next batch. All or nothing.
function addClaims(p, input) {
  const { claims, errors } = checkClaims(p, input);
  if (errors.length) return { added: [], batch: null, errors };
  const batchNo = batchFiles(p).reduce((max, f) => Math.max(max, Number(BATCH_RE.exec(f)[1])), 0) + 1;
  const batch = `batch-${String(batchNo).padStart(3, '0')}`;
  let n = loadClaims(p).reduce((max, c) => Math.max(max, (parseId(c.id) || { num: 0 }).num), 0);
  const added = claims.map((c) => {
    n += 1;
    return { id: formatId('CL', n), batch, ...c };
  });
  writeJsonl(path.join(p.claims, `${batch}.jsonl`), added);
  return { added, batch, errors: [] };
}

module.exports = { CODE_ANCHOR, readClaimsFile, loadClaims, checkClaims, addClaims };
