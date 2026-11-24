'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { FIXTURES } = require('./helpers');
const { SCHEMA_KINDS, validate, unsupportedKeywords, loadSchema, check } = require('../lib/schema');

const valid = (kind) => JSON.parse(fs.readFileSync(path.join(FIXTURES, 'valid', `${kind}.json`), 'utf8'));

test('schema: the validator checks types, required and unknown fields, enums, patterns, sizes and refs', () => {
  const s = {
    type: 'object', required: ['id', 'tags'], additionalProperties: false,
    properties: {
      id: { type: 'string', pattern: '^T-\\d{2,}$' }, n: { type: 'integer', minimum: 1, maximum: 3 },
      kind: { enum: ['a', 'b'] }, tags: { type: 'array', minItems: 1, items: { $ref: '#/$defs/tag' } },
    },
    $defs: { tag: { type: 'string', minLength: 2 } },
  };
  assert.deepEqual(validate(s, { id: 'T-07', tags: ['ok'] }), []);
  assert.deepEqual(validate(s, { id: 'X', n: 5, kind: 'c', tags: ['x'], extra: 1 }), [
    '/id: must match ^T-\\d{2,}$', '/n: must be at most 3', '/kind: must be one of "a", "b"',
    '/tags/0: is too short (minimum 2)', '/: unknown field "extra"',
  ]);
  assert.deepEqual(validate(s, { tags: [] }), ['/: missing "id"', '/tags: needs at least 1 item']);
  assert.deepEqual(validate(s, []), ['/: must be object']);
  assert.deepEqual(validate({ type: 'number' }, 1.5), []);
  assert.deepEqual(validate({ type: 'integer' }, 1.5), ['/: must be integer']);
  assert.deepEqual(validate({ $ref: '#/$defs/nope' }, 1), ['/: unknown $ref #/$defs/nope']);
  assert.deepEqual(unsupportedKeywords({ type: 'object', properties: { a: { oneOf: [] } } }), ['#/properties/a: unsupported keyword "oneOf"']);
  assert.deepEqual(validate(s, { id: 'T-07', tags: ['ok'], constructor: 1, toString: 2 }), ['/: unknown field "constructor"', '/: unknown field "toString"']);
  assert.deepEqual(validate(s, JSON.parse('{"id":"T-07","tags":["ok"],"__proto__":{"a":1}}')), ['/: unknown field "__proto__"']);
  assert.deepEqual(validate({ $ref: '#/$defs/constructor', $defs: {} }, 1), ['/: unknown $ref #/$defs/constructor']);
});

test('schema: const, maxLength, maxItems, and additionalProperties as a schema', () => {
  const s = {
    type: 'object',
    properties: { v: { const: 1 }, s: { type: 'string', maxLength: 2 }, a: { type: 'array', maxItems: 1 } },
    additionalProperties: { type: 'integer' },
  };
  assert.deepEqual(validate(s, { v: 1, s: 'ab', a: [1], extra: 2 }), []);
  assert.deepEqual(validate(s, { v: 2, s: 'abc', a: [1, 2], extra: 'x' }), [
    '/v: must be 1', '/s: is too long (maximum 2)', '/a: allows at most 1 item', '/extra: must be integer',
  ]);
});

test('schema: every schema uses only supported keywords and accepts its valid example', () => {
  for (const kind of SCHEMA_KINDS) {
    assert.deepEqual(unsupportedKeywords(loadSchema(kind)), [], kind);
    assert.deepEqual(check(kind, valid(kind)), [], kind);
  }
});

test('schema: the brand profile rejects a colour that is not hex, a logo with no source, and evidence that does not match the values', () => {
  const b = valid('brands');
  b.brands[0].palette.primary = 'blue';
  assert.deepEqual(check('brands', b), ['/brands/0/palette/primary: must match ^#[0-9a-fA-F]{6}$']);
  const l = valid('brands');
  delete l.brands[0].logos.full.path;
  assert.deepEqual(check('brands', l), [
    "/brands/0/logos/full: a logo has one of path (a file in the repository), svg (drawn in code) or file (the user's)",
  ]);
  const e = valid('brands');
  delete e.brands[0].evidence['palette.primary'];
  e.brands[0].evidence['palette.warning'] = { path: 'src/theme/sample.ts', line: 12 };
  assert.deepEqual(check('brands', e), [
    '/brands/0/evidence: missing "palette.primary"',
    '/brands/0/evidence: "palette.warning" names no value',
  ]);
});

test('schema: a palette needs only primary, since many themes set no background or text colour', () => {
  const b = valid('brands');
  for (const role of ['background', 'text']) {
    delete b.brands[0].palette[role];
    delete b.brands[0].evidence[`palette.${role}`];
  }
  assert.deepEqual(check('brands', b), []);
});

test('schema: cross-checks catch duplicate ids and the ledger rules of spec 5.5', () => {
  const t = valid('truth');
  t.entries.push({ ...t.entries[0] });
  t.entries.push({ id: 'T-90', kind: 'does', statement: 'x', evidence: [], confidence: 'confirmed' });
  t.entries.push({ id: 'T-91', kind: 'does', statement: 'y', evidence: [], confidence: 'open' });
  t.entries.push({ id: 'T-92', kind: 'does', statement: 'z', evidence: [], confidence: 'inferred' });
  assert.deepEqual(check('truth', t), [
    '/entries: duplicate id T-01',
    '/entries/3: a confirmed entry needs evidence',
    '/entries/4: an open entry names the boundary it stops at',
    '/entries/5: an inferred entry needs evidence',
  ]);
  const a = valid('api-calls');
  a.calls.push({ id: 'API-09', style: 'graphql', method: 'POST', path: '/graphql', caller: { path: 'src/x.js', line: 1 } });
  assert.deepEqual(check('api-calls', a), ['/calls/2: a GraphQL call needs its operation name']);
});
