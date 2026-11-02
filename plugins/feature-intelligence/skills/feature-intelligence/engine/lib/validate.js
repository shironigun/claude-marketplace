'use strict';
const { validateNode, validateLink, validateDecision } = require('./schema');
const { normalizeQuote } = require('./text');
const { loadModel, loadSources, loadChunks, loadDecisions } = require('./workspace');

const FLAG_RE = /^F-\d+$/;

// Everything a whole-model check needs. Chunks are read per source, on first use.
function loadState(p) {
  const cache = new Map();
  const chunksAt = (srcId) => {
    if (!cache.has(srcId)) cache.set(srcId, new Map(loadChunks(p, srcId).map((c) => [c.anchor, c])));
    return cache.get(srcId);
  };
  return { ...loadModel(p), sources: loadSources(p), decisions: loadDecisions(p), chunksAt };
}

function checkProvenance(n, state, sources, decisions, errors) {
  (Array.isArray(n.provenance) ? n.provenance : []).forEach((pv, i) => {
    if (!pv || typeof pv !== 'object' || Array.isArray(pv)) return; // validateNode reports an entry that is not an object
    const at = `${n.id}: provenance[${i}]`;
    if (!/[\p{L}\p{N}]/u.test(normalizeQuote(String(pv.quote || '')))) {
      errors.push(`${at}: quote has no words`); // an empty quote would match any text
      return;
    }
    const decision = decisions.get(pv.src);
    if (decision) {
      if (pv.anchor !== 'answer') errors.push(`${at} cites ${pv.src}; its anchor must be "answer"`);
      else if (!normalizeQuote(decision.answer).includes(normalizeQuote(pv.quote))) errors.push(`${at}: quote not found in the answer of ${pv.src}`);
      return;
    }
    const src = sources.get(pv.src);
    if (!src) {
      errors.push(`${at}: source ${pv.src} does not exist`);
      return;
    }
    if (src.kind === 'repo') return; // code anchors (path:line@commit) have no chunks to check
    const chunk = state.chunksAt(pv.src).get(pv.anchor);
    if (!chunk) errors.push(`${at}: ${pv.src} has no chunk at "${pv.anchor}"`);
    else if (chunk.text != null && !normalizeQuote(chunk.text).includes(normalizeQuote(pv.quote))) errors.push(`${at}: quote not found in ${pv.src} ${pv.anchor}`);
  });
}

// The whole-model checks behind fi validate and fi add. Returns every problem found.
function validateModel(state) {
  const errors = [];
  const nodes = new Map();
  for (const n of state.nodes) {
    if (nodes.has(n.id)) errors.push(`${n.id}: duplicate id`);
    nodes.set(n.id, n);
    for (const e of validateNode(n)) errors.push(`${n.id || '(no id)'}: ${e}`);
  }
  const sources = new Map(state.sources.map((s) => [s.id, s]));
  const decisions = new Map();
  for (const d of state.decisions) {
    if (decisions.has(d.id)) errors.push(`${d.id}: duplicate decision id`);
    decisions.set(d.id, d);
    for (const e of validateDecision(d)) errors.push(`${d.id || '(decision)'}: ${e}`);
  }
  const known = (id) => nodes.has(id) || decisions.has(id) || sources.has(id);
  for (const n of state.nodes) {
    for (const id of Array.isArray(n.derivedFrom) ? n.derivedFrom : []) if (!known(id)) errors.push(`${n.id}: derivedFrom ${id} does not exist`);
    if (n.supersededBy && !nodes.has(n.supersededBy)) errors.push(`${n.id}: supersededBy ${n.supersededBy} does not exist`);
    if (n.type === 'REC' && n.status !== 'recommended') errors.push(`${n.id}: a REC node must be recommended`);
    checkProvenance(n, state, sources, decisions, errors);
  }
  for (const l of state.links) {
    const name = `link ${l.from} ${l.type} ${l.to}`;
    for (const e of validateLink(l)) errors.push(`${name}: ${e}`);
    const toFlag = l.type === 'answers' && FLAG_RE.test(String(l.to));
    if (!known(l.from)) errors.push(`${name}: ${l.from} does not exist`);
    if (!toFlag && !known(l.to)) errors.push(`${name}: ${l.to} does not exist`);
    const from = nodes.get(l.from);
    const to = nodes.get(l.to);
    if (l.type === 'blocks' && from && from.type !== 'Q') errors.push(`${name}: only questions block`);
    if (l.type === 'covers' && from && from.type !== 'TS') errors.push(`${name}: only test scenarios cover`);
    if (l.type === 'answers' && known(l.from) && !decisions.has(l.from)) errors.push(`${name}: only decisions answer`);
    if (l.type === 'answers' && to && to.type !== 'Q') errors.push(`${name}: a decision answers a question or a board flag`);
  }
  return errors;
}

module.exports = { loadState, validateModel };
