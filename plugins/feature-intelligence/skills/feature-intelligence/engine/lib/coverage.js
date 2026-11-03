'use strict';
const { loadSources, saveSources, loadChunks, loadModel } = require('./workspace');
const { checkError, usageError } = require('./errors');

// Every "<source> <anchor>" a live node cites.
function citedAnchors(nodes) {
  const cited = new Set();
  for (const n of nodes) {
    if (n.supersededBy) continue;
    for (const pv of n.provenance || []) cited.add(`${pv.src} ${pv.anchor}`);
  }
  return cited;
}

// A chunk is accounted for when a live node cites it or it was set aside with a reason (spec P5).
function computeCoverage(p) {
  const cited = citedAnchors(loadModel(p).nodes);
  const perSource = [];
  const unaccounted = [];
  let chunks = 0;
  let covered = 0;
  let setAside = 0;
  for (const s of loadSources(p)) {
    if (s.coverageExempt) continue;
    const texts = new Map(loadChunks(p, s.id).map((c) => [c.id, c.text]));
    const row = { id: s.id, title: s.title, status: s.status, chunks: s.chunks.length, covered: 0, setAside: 0 };
    for (const c of s.chunks) {
      chunks += 1;
      if (cited.has(`${s.id} ${c.anchor}`)) {
        covered += 1;
        row.covered += 1;
      } else if (c.setAside) {
        setAside += 1;
        row.setAside += 1;
      } else {
        unaccounted.push({ id: c.id, anchor: c.anchor, text: texts.has(c.id) ? texts.get(c.id) : null, unreadable: s.status === 'unreadable' });
      }
    }
    perSource.push(row);
  }
  return { chunks, covered, setAside, ratio: chunks ? (covered + setAside) / chunks : 1, perSource, unaccounted };
}

// Marks chunks that carry nothing to model (a greeting, a sign-off), with the reason. All or nothing.
function setAsideChunks(p, chunkIds, reason) {
  const sources = loadSources(p);
  const byChunk = new Map();
  for (const s of sources) for (const c of s.chunks) byChunk.set(c.id, { s, c });
  const cited = citedAnchors(loadModel(p).nodes);
  const unknown = chunkIds.filter((id) => !byChunk.has(id));
  if (unknown.length) throw usageError(unknown.map((id) => `no chunk ${id}`).join('; '));
  const errors = [];
  for (const id of chunkIds) {
    const { s, c } = byChunk.get(id);
    if (cited.has(`${s.id} ${c.anchor}`)) errors.push(`${id} is cited by the model; nothing to set aside`);
  }
  if (errors.length) throw checkError(errors.join('; '));
  for (const id of chunkIds) byChunk.get(id).c.setAside = reason;
  saveSources(p, sources);
  return chunkIds.length;
}

module.exports = { citedAnchors, computeCoverage, setAsideChunks };
