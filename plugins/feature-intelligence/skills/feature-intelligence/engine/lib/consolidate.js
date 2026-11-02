'use strict';
const fs = require('fs');
const { tokens, jaccard, numbers, normalizeQuote } = require('./text');
const { nextId, formatId } = require('./ids');
const { sha256 } = require('./hash');
const { readJson, writeJson } = require('./jsonl');
const { validateNode, CLAIM_TYPES } = require('./schema');
const { loadModel, saveModel } = require('./workspace');
const { loadClaims } = require('./claims');
const { checkError, usageError } = require('./errors');

const CLUSTER_MIN = 0.5; // similar enough to review together
const SAME_MIN = 0.85; // near-identical statements (spec 5.5)

const modelHash = (p) => sha256(fs.existsSync(p.nodes) ? fs.readFileSync(p.nodes) : '');
const loadRecord = (p) => readJson(p.consolidated, { claims: {} });
const numberKey = (s) => [...numbers(s)].sort().join(',');
// Words that flip or soften a requirement: two statements that differ only in these say different things.
const MODALITY = new Set(['must', 'shall', 'should', 'may', 'might', 'can', 'cannot', 'could', 'will', 'would', 'not', 'no',
  'never', 'none', 'without', 'optional', 'required']);
const modalityKey = (s) => [...new Set((String(s).toLowerCase().replace(/n't\b/g, ' not').match(/[a-z]+/g) || [])
  .filter((w) => MODALITY.has(w)))].sort().join(',');

function pendingClaims(p) {
  const done = loadRecord(p).claims;
  return loadClaims(p).filter((c) => !Object.prototype.hasOwnProperty.call(done, c.id));
}

// The live node of the claim's type it most likely speaks about: the same source anchor first, else the most similar
// statement. A match below SAME_MIN is weak: it is shown for a decision, never applied by default.
function matchExisting(claim, nodes, nodeTokens) {
  const ct = tokens(claim.statement);
  let best = null;
  for (const n of nodes) {
    if (n.type !== claim.type) continue;
    const sim = jaccard(ct, nodeTokens.get(n.id));
    const sameAnchor = (n.provenance || []).some((pv) => pv.src === claim.src && pv.anchor === claim.anchor);
    if (!sameAnchor && sim < CLUSTER_MIN) continue;
    const score = (sameAnchor ? 1 : 0) + sim;
    if (!best || score > best.score) best = { id: n.id, sim, score, sameAnchor };
  }
  return best;
}

// The engine's suggestion. "new", "same" and "merge" apply by default; "update?", "merge?" and "conflict?" need a decision.
function suggestFor(members, existing, match, toks) {
  const statements = members.map((c) => c.statement).concat(existing ? [existing.statement] : []);
  const numbersDiffer = new Set(statements.map(numberKey)).size > 1;
  const modalityDiffers = new Set(statements.map(modalityKey)).size > 1;
  const differs = numbersDiffer || modalityDiffers;
  const whyDiffers = numbersDiffer ? 'the numbers differ' : 'one says must, may or not where another does not';
  if (!existing && members.length === 1) return { suggest: 'new', why: '' };
  if (existing) {
    const restates = members.every((c) => match.has(c.id) && match.get(c.id).id === existing.id && match.get(c.id).sim >= SAME_MIN);
    if (restates && !differs) return { suggest: 'same', why: `restates ${existing.id}` };
    if (members.length === 1) {
      const m = match.get(members[0].id);
      if (m && m.sameAnchor) return { suggest: 'update?', why: differs ? `${whyDiffers} (${existing.id})` : `same anchor as ${existing.id}, different wording` };
      return { suggest: differs ? 'conflict?' : 'update?', why: differs ? `${whyDiffers} (${existing.id})` : `similar to ${existing.id}` };
    }
  }
  if (differs) return { suggest: 'conflict?', why: whyDiffers };
  const repeats = members.every((a, i) => members.every((b, j) => j <= i || jaccard(toks.get(a.id), toks.get(b.id)) >= SAME_MIN));
  if (!existing && repeats) return { suggest: 'merge', why: 'the same statement more than once' };
  return { suggest: 'merge?', why: existing ? `similar to each other and to ${existing.id}` : 'similar statements' };
}

function propose(p, { now }) {
  const claims = pendingClaims(p);
  const live = loadModel(p).nodes.filter((n) => !n.supersededBy);
  const byId = new Map(live.map((n) => [n.id, n]));
  const nodeTokens = new Map(live.map((n) => [n.id, tokens(n.statement)]));
  const toks = new Map(claims.map((c) => [c.id, tokens(c.statement)]));
  const match = new Map();
  for (const c of claims) {
    const m = matchExisting(c, live, nodeTokens);
    if (m) match.set(c.id, m);
  }
  // Union-find over claims of one type. A cluster never holds two different existing nodes.
  const parent = new Map(claims.map((c) => [c.id, c.id]));
  const existingOf = new Map(claims.map((c) => [c.id, match.has(c.id) ? match.get(c.id).id : null]));
  const find = (x) => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    const ea = existingOf.get(ra);
    const eb = existingOf.get(rb);
    if (ra === rb || (ea && eb && ea !== eb)) return;
    parent.set(rb, ra);
    existingOf.set(ra, ea || eb);
  };
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i];
      const b = claims[j];
      if (a.type !== b.type) continue;
      const sameNode = match.has(a.id) && match.has(b.id) && match.get(a.id).id === match.get(b.id).id;
      if (sameNode || jaccard(toks.get(a.id), toks.get(b.id)) >= CLUSTER_MIN) union(a.id, b.id);
    }
  }
  const groups = new Map();
  for (const c of claims) {
    const root = find(c.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(c);
  }
  const clusters = [...groups.entries()].map(([root, members], i) => {
    const existing = existingOf.get(root) ? byId.get(existingOf.get(root)) : null;
    return {
      id: formatId('K', i + 1),
      type: members[0].type,
      claims: members.map((c) => c.id),
      existing: existing ? existing.id : null,
      ...suggestFor(members, existing, match, toks),
      statements: [
        ...(existing ? [{ id: existing.id, statement: existing.statement }] : []),
        ...members.map((c) => ({ id: c.id, src: c.src, anchor: c.anchor, statement: c.statement })),
      ],
    };
  });
  const proposal = { createdAt: now, modelHash: modelHash(p), claims: claims.map((c) => c.id), clusters };
  writeJson(p.proposals, proposal);
  return proposal;
}

const ACTIONS = { new: 'separate', separate: 'separate', merge: 'merge', conflict: 'conflict', existing: 'existing', same: 'existing', drop: 'drop' };
const DEFAULTS = { new: 'separate', same: 'existing', merge: 'merge' };
const DECISION_FIELDS = new Set(['action', 'reason', 'title', 'statement', 'type']);

// The action for one cluster: the decision given, or the default when the suggestion needs no judgment.
function decide(cluster, d) {
  if (d === undefined) return DEFAULTS[cluster.suggest] ? { action: DEFAULTS[cluster.suggest] } : null;
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw usageError(`${cluster.id}: a decision is an object like {"action": "merge"}`);
  const unknown = Object.keys(d).filter((k) => !DECISION_FIELDS.has(k));
  if (unknown.length) throw usageError(`${cluster.id}: unknown decision field ${unknown.join(', ')}`);
  const action = typeof d.action === 'string' && Object.hasOwn(ACTIONS, d.action) ? ACTIONS[d.action] : null;
  if (!action) throw usageError(`${cluster.id}: action must be merge, conflict, separate, existing or drop`);
  for (const f of ['reason', 'title', 'statement']) {
    if (d[f] !== undefined && !(typeof d[f] === 'string' && d[f].trim())) throw usageError(`${cluster.id}: ${f} must be text`);
  }
  if (action === 'existing' && !cluster.existing) throw usageError(`${cluster.id}: there is no existing node to update`);
  if (action === 'drop' && !d.reason) throw usageError(`${cluster.id}: drop needs a reason`);
  if (action === 'separate' && cluster.claims.length > 1 && (d.title || d.statement)) {
    throw usageError(`${cluster.id}: separate makes ${cluster.claims.length} nodes, so a title or statement cannot apply`);
  }
  if (d.type !== undefined && (!CLAIM_TYPES.has(d.type) || (cluster.existing && action !== 'separate'))) {
    throw usageError(`${cluster.id}: type must be a node type, and an existing node keeps its own`);
  }
  return { ...d, action };
}

const provenanceOf = (c) => ({ src: c.src, anchor: c.anchor, quote: c.quote, ...(c.hash ? { hash: c.hash } : {}) });

function addProvenance(list, more) {
  const out = [...list];
  for (const pv of more) {
    const known = out.some((x) => x.src === pv.src && x.anchor === pv.anchor && normalizeQuote(x.quote) === normalizeQuote(pv.quote));
    if (!known) out.push(pv);
  }
  return out;
}

function apply(p, decisions, { now }) {
  const proposal = readJson(p.proposals, null);
  if (!proposal) throw usageError('no proposal to apply; run fi consolidate <slug> --propose first');
  if (!decisions || typeof decisions !== 'object' || Array.isArray(decisions)) {
    throw usageError('decisions are an object keyed by cluster id, like {"K-002": {"action": "conflict"}}');
  }
  if (pendingClaims(p).map((c) => c.id).join() !== proposal.claims.join() || modelHash(p) !== proposal.modelHash) {
    throw checkError('the claims or the model changed since --propose; run --propose again');
  }
  const known = new Set(proposal.clusters.map((k) => k.id));
  const strays = Object.keys(decisions).filter((k) => !known.has(k));
  if (strays.length) throw usageError(`no cluster ${strays.join(', ')} in the proposal`);
  const plan = proposal.clusters.map((cluster) => ({ cluster, d: decide(cluster, decisions[cluster.id]) }));
  const undecided = plan.filter((x) => !x.d).map((x) => `${x.cluster.id} (${x.cluster.suggest})`);
  if (undecided.length) {
    throw checkError(`these clusters need a decision (merge, conflict, separate, existing or drop): ${undecided.join(', ')}`);
  }

  const claims = new Map(loadClaims(p).map((c) => [c.id, c]));
  const model = loadModel(p);
  const nodes = new Map(model.nodes.map((n) => [n.id, n]));
  const ids = model.nodes.map((n) => n.id);
  const record = loadRecord(p);
  const today = now.slice(0, 10);
  const created = [];
  const updated = new Set();
  let dropped = 0;
  const check = (cluster, node) => {
    const errors = validateNode(node);
    if (errors.length) throw checkError(`${cluster.id} would make an invalid ${node.id}: ${errors.join('; ')}`);
  };
  const create = (cluster, type, fields) => {
    const node = { id: nextId(type, ids), type, ...fields, rev: 1, updated: today };
    check(cluster, node);
    ids.push(node.id);
    nodes.set(node.id, node);
    created.push(node.id);
    return node.id;
  };

  for (const { cluster, d } of plan) {
    const members = cluster.claims.map((id) => claims.get(id));
    if (d.action === 'drop') {
      for (const c of members) record.claims[c.id] = { dropped: d.reason };
      dropped += members.length;
      continue;
    }
    if (d.action === 'separate') {
      for (const c of members) {
        record.claims[c.id] = create(cluster, d.type || c.type, { title: d.title || c.title, statement: d.statement || c.statement, status: c.status, provenance: [provenanceOf(c)] });
      }
      continue;
    }
    const confirmed = members.some((c) => c.status === 'confirmed');
    const existing = cluster.existing ? nodes.get(cluster.existing) : null;
    if (existing) {
      const next = { ...existing, provenance: addProvenance(existing.provenance || [], members.map(provenanceOf)) };
      if (d.title) next.title = d.title;
      if (d.statement) next.statement = d.statement;
      if (d.action === 'conflict') next.status = 'conflict';
      else if (confirmed && next.status !== 'conflict') next.status = 'confirmed';
      if (next.status !== 'inferred') delete next.confidence;
      if (JSON.stringify(next) !== JSON.stringify(existing)) {
        next.rev = existing.rev + 1;
        next.updated = today;
        check(cluster, next);
        nodes.set(next.id, next);
        updated.add(next.id);
      }
      for (const c of members) record.claims[c.id] = existing.id;
      continue;
    }
    const first = members[0];
    const id = create(cluster, d.type || cluster.type, {
      title: d.title || first.title,
      statement: d.statement || first.statement,
      status: d.action === 'conflict' ? 'conflict' : confirmed ? 'confirmed' : 'open',
      provenance: addProvenance([], members.map(provenanceOf)),
    });
    for (const c of members) record.claims[c.id] = id;
  }

  // Terms resolve against the glossary: a claim term matching a TERM title links that TERM to the node.
  const glossary = new Map([...nodes.values()].filter((n) => n.type === 'TERM' && !n.supersededBy).map((n) => [normalizeQuote(n.title), n.id]));
  const links = [...model.links];
  for (const id of proposal.claims) {
    const target = record.claims[id];
    if (typeof target !== 'string') continue;
    for (const t of claims.get(id).terms || []) {
      const term = glossary.get(normalizeQuote(t));
      if (term && term !== target) links.push({ from: term, type: 'defines', to: target });
    }
  }

  saveModel(p, { nodes: [...nodes.values()], links });
  writeJson(p.consolidated, record);
  fs.rmSync(p.proposals, { force: true });
  return { clusters: plan.length, created, updated: [...updated], dropped };
}

module.exports = { pendingClaims, propose, apply };
