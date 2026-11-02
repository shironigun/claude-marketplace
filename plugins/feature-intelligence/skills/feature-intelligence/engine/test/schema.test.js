'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LINK_TYPES, validateNode, validateLink, validateClaim, validateDecision } = require('../lib/schema');

const prov = (quote = 'Files are limited to 10,000 rows.') => ({ src: 'SRC-001', anchor: '§2 ¶1', quote, hash: 'abc' });
const node = (extra) => ({
  id: 'RULE-003', type: 'RULE', title: 'Row limit per file', statement: 'An import file may contain at most 10,000 rows.',
  status: 'confirmed', provenance: [prov()], rev: 1, updated: '2026-10-30', ...extra,
});

test('schema: a confirmed node with a quote is valid', () => {
  assert.deepEqual(validateNode(node()), []);
  assert.equal(LINK_TYPES.size, 19);
});

test('schema: evidence rules (P3)', () => {
  assert.match(validateNode(node({ provenance: [] })).join(), /confirmed node needs provenance/);
  assert.match(validateNode(node({ status: 'conflict' })).join(), /at least two provenance/);
  assert.deepEqual(validateNode(node({ status: 'conflict', provenance: [prov(), prov('Uploads over 5,000 rows are rejected.')] })), []);
  assert.match(validateNode(node({ status: 'assumed', provenance: undefined })).join(), /assumed nodes need derivedFrom/);
  assert.deepEqual(validateNode(node({ status: 'assumed', provenance: undefined, derivedFrom: ['Q-001'] })), []);
  assert.deepEqual(validateNode(node({ status: 'open' })), [], 'an open node may rest on a quote');
  assert.match(validateNode(node({ status: 'open', provenance: undefined })).join(), /open node needs provenance or derivedFrom/);
});

test('schema: confidence, ids, quotes and unknown fields', () => {
  const inferred = node({ status: 'inferred', provenance: undefined, derivedFrom: ['RULE-001'] });
  assert.match(validateNode(inferred).join(), /needs confidence/);
  assert.deepEqual(validateNode({ ...inferred, confidence: 'high' }), []);
  assert.match(validateNode(node({ confidence: 'high' })).join(), /only inferred nodes carry confidence/);
  assert.match(validateNode(node({ id: 'FR-003' })).join(), /does not match type/);
  assert.match(validateNode(node({ type: 'DL', id: 'DL-001' })).join(), /not a node type/);
  assert.match(validateNode(node({ provenance: [prov('word '.repeat(41))] })).join(), /41 words; the limit is 40/);
  assert.match(validateNode(node({ derivedfrom: ['FR-001'] })).join(), /unknown field "derivedfrom"/);
  assert.match(validateNode(node({ derivedFrom: ['RULE-003'] })).join(), /cannot include the node itself/);
  assert.match(validateNode(node({ lenses: ['marketing'] })).join(), /lenses must come from/);
});

test('schema: links', () => {
  assert.deepEqual(validateLink({ from: 'TS-001', type: 'covers', to: 'RULE-003' }), []);
  assert.match(validateLink({ from: 'TS-001', type: 'tests', to: 'RULE-003' }).join(), /link type "tests" is unknown/);
  assert.match(validateLink({ from: 'FR-001', type: 'refines', to: 'FR-001' }).join(), /own node/);
  assert.deepEqual(validateLink({ from: 'DL-001', type: 'answers', to: 'F-12' }), []);
});

test('schema: claims and decisions', () => {
  const claim = {
    chunk: 'SRC-001#2', type: 'RULE', title: 'Row limit', statement: 'At most 10,000 rows.', status: 'confirmed',
    anchor: '§2 ¶1', quote: 'Files are limited to 10,000 rows.', terms: ['row'],
  };
  assert.deepEqual(validateClaim(claim), []);
  assert.match(validateClaim({ ...claim, status: 'inferred' }).join(), /confirmed or open/);
  assert.match(validateClaim({ ...claim, type: 'DL' }).join(), /cannot be extracted/);
  assert.match(validateClaim({ ...claim, chunk: '4' }).join(), /chunk "4"/);
  assert.deepEqual(validateClaim({ ...claim, chunk: 'SRC-005', anchor: 'src/import/rows.ts:42@1a2b3c4' }), []);
  const dl = {
    id: 'DL-001', question: 'Which row limit applies?', answer: 'Use 10,000 rows.', decidedBy: 'Product owner',
    decidedAt: '2026-10-30T10:00:00.000Z', via: 'session',
  };
  assert.deepEqual(validateDecision(dl), []);
  assert.deepEqual(validateDecision({ ...dl, via: 'F-12' }), []);
  assert.match(validateDecision({ ...dl, via: 'email' }).join(), /via must be/);
});

test('schema: wrongly typed ids are errors, never exceptions; REC is never extracted', () => {
  assert.match(validateNode(node({ id: ['RULE-003'] })).join(), /must look like RULE-003/);
  assert.match(validateNode(node({ provenance: [{ ...prov(), src: ['SRC-001'] }] })).join(), /src must be a source or decision id/);
  assert.match(validateNode(node({ status: 'assumed', provenance: undefined, derivedFrom: [['RULE-001']] })).join(), /derivedFrom must be a list of ids/);
  assert.match(validateNode(node({ updated: ['2026-10-30'] })).join(), /updated must be a date/);
  assert.match(validateLink({ from: ['TS-001'], type: 'covers', to: ['RULE-003'] }).join(), /link from .* is not an id/);
  assert.deepEqual(validateLink({}).filter((e) => /own node/.test(e)), []);
  const claim = { chunk: ['SRC-001#2'], type: 'RULE', title: 't', statement: 's', status: 'confirmed', anchor: 'a', quote: 'q' };
  assert.match(validateClaim(claim).join(), /must be a chunk id/);
  assert.match(validateClaim({ ...claim, chunk: 'SRC-001#2', type: 'REC' }).join(), /cannot be extracted/);
  assert.match(validateDecision({ id: ['DL-001'], question: 'q', answer: 'a', decidedBy: 'b', decidedAt: '2026-10-30T10:00:00.000Z', via: ['F-1'] }).join(), /must look like DL-001/);
});
