'use strict';
const { nextId } = require('./ids');
const { MODEL_TYPES } = require('./schema');
const { validateModel } = require('./validate');
const { linkKey } = require('./workspace');
const { checkError, usageError } = require('./errors');

const TEMP_RE = /^\+[\w-]+$/;
const KEYS = ['nodes', 'links', 'removeLinks', 'decisions'];
const isTemp = (id) => TEMP_RE.test(String(id));

// Applies an add file to a loaded state and returns the next state; nothing is written here.
function applyAdd(state, input, { now }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw usageError('an add file is an object: {nodes, links, removeLinks, decisions}');
  for (const k of Object.keys(input)) if (!KEYS.includes(k)) throw usageError(`unknown key "${k}" in the add file`);
  const [nodesIn, linksIn, removeIn, decisionsIn] = KEYS.map((k) => {
    const v = input[k] === undefined ? [] : input[k];
    if (!Array.isArray(v) || v.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) throw usageError(`${k} must be a list of objects`);
    return v;
  });
  const counts = new Map();
  for (const n of state.nodes) counts.set(n.id, (counts.get(n.id) || 0) + 1);
  const twins = [...counts].filter(([, c]) => c > 1).map(([id]) => id);
  if (twins.length) {
    throw checkError(`the model holds ${twins.join(', ')} more than once; fix model/nodes.jsonl by hand first, since any write would keep only one copy`);
  }
  const today = now.slice(0, 10);
  const nodes = new Map(state.nodes.map((n) => [n.id, n]));
  const nodeIds = state.nodes.map((n) => n.id);
  const decisionIds = state.decisions.map((d) => d.id);
  const ids = {};
  const assign = (tmp, id) => {
    if (ids[tmp]) throw usageError(`${tmp} is used twice`);
    ids[tmp] = id;
  };

  const decisions = decisionsIn.map((d) => {
    if (d.id !== undefined && !isTemp(d.id)) throw usageError(`decision "${d.id}": a new decision takes a temporary id like +d1, or none`);
    const id = nextId('DL', decisionIds);
    decisionIds.push(id);
    if (d.id !== undefined) assign(d.id, id);
    const rest = { ...d };
    delete rest.id;
    return { id, ...rest, decidedAt: rest.decidedAt || now };
  });
  const patched = new Set();
  for (const n of nodesIn) {
    if (isTemp(n.id)) {
      if (!MODEL_TYPES.has(n.type)) throw usageError(`${n.id}: a new node needs a node type`);
      const id = nextId(n.type, nodeIds);
      nodeIds.push(id);
      assign(n.id, id);
    } else if (!nodes.has(n.id)) {
      throw usageError(`unknown node ${n.id}; a new node takes a temporary id like +q1`);
    } else if (patched.has(n.id)) {
      throw usageError(`${n.id} is patched twice in one file`);
    } else {
      patched.add(n.id);
    }
  }

  const real = (id) => {
    if (typeof id !== 'string' || !id.startsWith('+')) return id;
    if (!ids[id]) throw usageError(`unknown temporary id ${id}`);
    return ids[id];
  };
  const resolve = (node) => {
    const out = { ...node };
    if (Array.isArray(out.derivedFrom)) out.derivedFrom = out.derivedFrom.map(real);
    if (typeof out.supersededBy === 'string') out.supersededBy = real(out.supersededBy);
    if (Array.isArray(out.provenance)) out.provenance = out.provenance.map((pv) => (pv && typeof pv === 'object' ? { ...pv, src: real(pv.src) } : pv));
    return out;
  };

  const changed = [];
  for (const n of nodesIn) {
    if (isTemp(n.id)) {
      const node = { ...resolve(n), id: ids[n.id], rev: 1, updated: today };
      nodes.set(node.id, node);
      changed.push(node.id);
      continue;
    }
    const old = nodes.get(n.id);
    const next = { ...old };
    for (const [k, v] of Object.entries(resolve(n))) {
      if (k === 'id') continue;
      if (v === null) delete next[k];
      else next[k] = v;
    }
    if (next.type !== old.type) throw usageError(`${n.id}: a node keeps its type`);
    if (JSON.stringify(next) === JSON.stringify(old)) continue; // nothing changed: no new revision
    next.rev = old.rev + 1;
    next.updated = today;
    nodes.set(n.id, next);
    changed.push(n.id);
  }

  const removing = new Set(removeIn.map((l) => linkKey({ from: real(l.from), type: l.type, to: real(l.to) })));
  const present = new Set(state.links.map(linkKey));
  const missing = [...removing].filter((k) => !present.has(k));
  if (missing.length) throw usageError(`no such link to remove: ${missing.join('; ')}`);
  const added = linksIn.map((l) => ({ ...l, from: real(l.from), to: real(l.to) }));
  const next = {
    ...state,
    nodes: [...nodes.values()],
    links: [...state.links.filter((l) => !removing.has(linkKey(l))), ...added],
    decisions: [...state.decisions, ...decisions],
  };
  const before = new Set(validateModel(state));
  const problems = validateModel(next).filter((e) => !before.has(e));
  if (problems.length) throw checkError(`nothing was written:\n${problems.map((e) => `  ${e}`).join('\n')}`);
  return { next, ids, changed, links: added.length, removed: removing.size, decisions: decisions.map((d) => d.id) };
}

module.exports = { applyAdd };
