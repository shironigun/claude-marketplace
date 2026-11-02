'use strict';
const { wordCount } = require('./text');

// Node types by family (spec 5.2).
const NODE_TYPES = {
  SRC: 'evidence', EXC: 'evidence',
  GOAL: 'business', PRB: 'business', ACT: 'business', SCOPE: 'business', BR: 'business', MET: 'business',
  FR: 'requirements', NFR: 'requirements', RULE: 'requirements', CON: 'requirements', ASM: 'requirements', DEP: 'requirements',
  EPIC: 'delivery', FEATURE: 'delivery', STORY: 'delivery', TASK: 'delivery', AC: 'delivery', UC: 'delivery',
  WF: 'behavior', STEP: 'behavior', DP: 'behavior', STATE: 'behavior', TRANS: 'behavior',
  SCR: 'experience', MSG: 'experience', CNT: 'experience',
  API: 'technical', ENT: 'technical', INT: 'technical', MOD: 'technical', FLAG: 'technical',
  TS: 'quality',
  Q: 'governance', DL: 'governance', FND: 'governance', RISK: 'governance', REC: 'governance', TERM: 'governance',
};
// Sources live in sources.json and decisions in decisions.jsonl, so neither is a model node.
const MODEL_TYPES = new Set(Object.keys(NODE_TYPES).filter((t) => t !== 'SRC' && t !== 'DL'));
// Extractors report facts from sources: an excerpt is never a fact of its own, and a recommendation (REC) is the
// system's suggestion.
const CLAIM_TYPES = new Set([...MODEL_TYPES].filter((t) => t !== 'EXC' && t !== 'REC'));
const LINK_TYPES = new Set(['derives-from', 'refines', 'implements', 'part-of', 'next', 'governs', 'shows', 'calls',
  'reads', 'writes', 'realized-by', 'covers', 'maps-to', 'depends-on', 'conflicts-with', 'duplicates', 'blocks',
  'answers', 'defines']);
const STATUSES = new Set(['confirmed', 'inferred', 'assumed', 'recommended', 'open', 'conflict']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const LENSES = new Set(['all', 'product', 'development', 'qa', 'design', 'sales']);
const MAX_QUOTE_WORDS = 40;

const ID_RE = /^[A-Z]+-\d+$/;
const CHUNK_RE = /^SRC-\d+#\d+$/;
const SRC_RE = /^SRC-\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const NODE_FIELDS = new Set(['id', 'type', 'title', 'statement', 'status', 'provenance', 'derivedFrom', 'confidence',
  'category', 'lenses', 'ado', 'rev', 'updated', 'supersededBy']);
const PROVENANCE_FIELDS = new Set(['src', 'anchor', 'quote', 'hash']);
const LINK_FIELDS = new Set(['from', 'type', 'to', 'src']);
const CLAIM_FIELDS = new Set(['chunk', 'type', 'title', 'statement', 'status', 'anchor', 'quote', 'terms']);
const DECISION_FIELDS = new Set(['id', 'question', 'answer', 'decidedBy', 'decidedAt', 'via']);

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// A value matches a pattern only when it is text: String(['RULE-003']) would otherwise pass.
const isMatch = (v, re) => typeof v === 'string' && re.test(v);

function unknownFields(obj, allowed, errors, prefix = '') {
  for (const k of Object.keys(obj)) if (!allowed.has(k)) errors.push(`${prefix}unknown field "${k}"`);
}

function checkQuote(quote, errors, label) {
  if (!isText(quote)) errors.push(`${label} is required`);
  else if (wordCount(quote) > MAX_QUOTE_WORDS) errors.push(`${label} has ${wordCount(quote)} words; the limit is ${MAX_QUOTE_WORDS}`);
}

function checkProvenance(list, errors) {
  if (!Array.isArray(list)) {
    errors.push('provenance must be a list');
    return;
  }
  list.forEach((p, i) => {
    const at = `provenance[${i}]`;
    if (!isObject(p)) {
      errors.push(`${at} must be an object`);
      return;
    }
    unknownFields(p, PROVENANCE_FIELDS, errors, `${at}: `);
    if (!isMatch(p.src, /^(SRC|DL)-\d+$/)) errors.push(`${at}.src must be a source or decision id`);
    if (!isText(p.anchor)) errors.push(`${at}.anchor is required`);
    checkQuote(p.quote, errors, `${at}.quote`);
    if (p.hash !== undefined && typeof p.hash !== 'string') errors.push(`${at}.hash must be text`);
  });
}

// One node on its own, including the evidence rules (spec P3). Cross-references are checked by validate.js.
function validateNode(node) {
  if (!isObject(node)) return ['node must be an object'];
  const errors = [];
  unknownFields(node, NODE_FIELDS, errors);
  if (!MODEL_TYPES.has(node.type)) errors.push(`type "${node.type}" is not a node type`);
  if (!isMatch(node.id, ID_RE)) errors.push(`id "${node.id}" must look like RULE-003`);
  else if (node.id.split('-')[0] !== node.type) errors.push(`id ${node.id} does not match type ${node.type}`);
  if (!isText(node.title)) errors.push('title is required');
  if (!isText(node.statement)) errors.push('statement is required');
  if (!STATUSES.has(node.status)) errors.push(`status "${node.status}" is not an evidence status`);
  const prov = node.provenance === undefined ? [] : node.provenance;
  const from = node.derivedFrom === undefined ? [] : node.derivedFrom;
  checkProvenance(prov, errors);
  if (!Array.isArray(from) || from.some((id) => !isMatch(id, ID_RE))) errors.push('derivedFrom must be a list of ids');
  else if (from.includes(node.id)) errors.push('derivedFrom cannot include the node itself');
  const nProv = Array.isArray(prov) ? prov.length : 0;
  const nFrom = Array.isArray(from) ? from.length : 0;
  if (node.status === 'confirmed' && nProv < 1) errors.push('a confirmed node needs provenance');
  if (node.status === 'conflict' && nProv < 2) errors.push('a conflict node needs at least two provenance entries');
  if (['inferred', 'assumed', 'recommended'].includes(node.status) && nFrom < 1) errors.push(`${node.status} nodes need derivedFrom`);
  if (node.status === 'open' && nProv + nFrom < 1) errors.push('an open node needs provenance or derivedFrom');
  if (node.status === 'inferred' && !CONFIDENCE.has(node.confidence)) errors.push('an inferred node needs confidence: high, medium or low');
  if (node.status !== 'inferred' && node.confidence !== undefined) errors.push('only inferred nodes carry confidence');
  if (node.category !== undefined && !isText(node.category)) errors.push('category must be text');
  if (node.lenses !== undefined && (!Array.isArray(node.lenses) || node.lenses.some((l) => !LENSES.has(l)))) {
    errors.push(`lenses must come from: ${[...LENSES].join(', ')}`);
  }
  if (node.ado !== undefined && !(isObject(node.ado) && Number.isInteger(node.ado.id))) errors.push('ado must be {id, type, rev, url}');
  if (!Number.isInteger(node.rev) || node.rev < 1) errors.push('rev must be a whole number from 1');
  if (!isMatch(node.updated, DATE_RE)) errors.push('updated must be a date like 2026-10-30');
  if (node.supersededBy !== undefined && (!isMatch(node.supersededBy, ID_RE) || node.supersededBy === node.id)) {
    errors.push('supersededBy must be another node id');
  }
  return errors;
}

function validateLink(link) {
  if (!isObject(link)) return ['link must be an object'];
  const errors = [];
  unknownFields(link, LINK_FIELDS, errors);
  if (!LINK_TYPES.has(link.type)) errors.push(`link type "${link.type}" is unknown`);
  if (!isMatch(link.from, ID_RE)) errors.push(`link from "${link.from}" is not an id`);
  if (!isMatch(link.to, ID_RE)) errors.push(`link to "${link.to}" is not an id`);
  if (isMatch(link.from, ID_RE) && link.from === link.to) errors.push('a link cannot point at its own node');
  if (link.src !== undefined && !isMatch(link.src, SRC_RE)) errors.push('link src must be a source id');
  return errors;
}

// Extractor output (spec 5.7). Code facts cite the repository source id with a path:line@commit anchor.
function validateClaim(claim) {
  if (!isObject(claim)) return ['claim must be an object'];
  const errors = [];
  unknownFields(claim, CLAIM_FIELDS, errors);
  if (!isMatch(claim.chunk, CHUNK_RE) && !isMatch(claim.chunk, SRC_RE)) {
    errors.push(`chunk "${claim.chunk}" must be a chunk id like SRC-001#4 (or a source id for code)`);
  }
  if (!CLAIM_TYPES.has(claim.type)) errors.push(`type "${claim.type}" cannot be extracted`);
  if (!isText(claim.title)) errors.push('title is required');
  if (!isText(claim.statement)) errors.push('statement is required');
  if (claim.status !== 'confirmed' && claim.status !== 'open') errors.push('status must be confirmed or open; extractors do not infer');
  if (!isText(claim.anchor)) errors.push('anchor is required');
  checkQuote(claim.quote, errors, 'quote');
  if (claim.terms !== undefined && (!Array.isArray(claim.terms) || claim.terms.some((t) => !isText(t)))) {
    errors.push('terms must be a list of words');
  }
  return errors;
}

// A decision log entry (spec 5.6). `via` is "session" or the board flag that raised it.
function validateDecision(d) {
  if (!isObject(d)) return ['decision must be an object'];
  const errors = [];
  unknownFields(d, DECISION_FIELDS, errors);
  if (!isMatch(d.id, /^DL-\d+$/)) errors.push(`decision id "${d.id}" must look like DL-001`);
  for (const f of ['question', 'answer', 'decidedBy']) if (!isText(d[f])) errors.push(`${f} is required`);
  if (Number.isNaN(Date.parse(d.decidedAt))) errors.push('decidedAt must be an ISO date');
  if (d.via !== 'session' && !isMatch(d.via, /^F-\d+$/)) errors.push('via must be "session" or a board flag id like F-12');
  return errors;
}

module.exports = {
  NODE_TYPES, MODEL_TYPES, CLAIM_TYPES, LINK_TYPES, STATUSES, CONFIDENCE, LENSES, MAX_QUOTE_WORDS,
  ID_RE, CHUNK_RE, SRC_RE, validateNode, validateLink, validateClaim, validateDecision,
};
