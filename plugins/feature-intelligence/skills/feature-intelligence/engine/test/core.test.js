'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseId, formatId, nextId, compareIds } = require('../lib/ids');
const { readJsonl, writeJsonl, appendJsonl, readJson, writeJson } = require('../lib/jsonl');
const { sha256, shortHash } = require('../lib/hash');
const { readText, normalizeQuote, wordCount, tokens, jaccard, numbers } = require('../lib/text');
const { FiError, checkError, usageError } = require('../lib/errors');

test('ids: parse, format, next and natural order', () => {
  assert.deepEqual(parseId('RULE-003'), { prefix: 'RULE', num: 3 });
  assert.equal(parseId('not an id'), null);
  assert.equal(formatId('FR', 7), 'FR-007');
  assert.equal(formatId('CL', 1234), 'CL-1234');
  assert.equal(nextId('FR', ['FR-001', 'FR-009', 'RULE-020']), 'FR-010');
  assert.equal(nextId('Q', []), 'Q-001');
  assert.deepEqual(['RULE-010', 'FR-002', 'RULE-002'].sort(compareIds), ['FR-002', 'RULE-002', 'RULE-010']);
});

test('jsonl: write, read, append, and a bad line names its line number', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fi-core-'));
  const file = path.join(dir, 'a', 'rows.jsonl');
  assert.deepEqual(readJsonl(file), []);
  writeJsonl(file, [{ id: 'A' }, { id: 'B' }]);
  appendJsonl(file, [{ id: 'C' }]);
  assert.deepEqual(readJsonl(file).map((r) => r.id), ['A', 'B', 'C']);
  fs.appendFileSync(file, '{broken\n');
  assert.throws(() => readJsonl(file), /rows\.jsonl:4: invalid JSON/);
  const json = path.join(dir, 'x.json');
  assert.deepEqual(readJson(json, { empty: true }), { empty: true });
  writeJson(json, { b: 1 });
  assert.equal(fs.readFileSync(json, 'utf8'), '{\n  "b": 1\n}\n');
  const bom = path.join(dir, 'bom.jsonl');
  fs.writeFileSync(bom, '﻿{"id":"A"}\r\n{"id":"B"}\r{"id":"C"}\n');
  assert.deepEqual(readJsonl(bom).map((r) => r.id), ['A', 'B', 'C']);
  fs.writeFileSync(json, '﻿{"b": 2}\r\n');
  assert.deepEqual(readJson(json, null), { b: 2 });
});

test('hash: sha256 and the 12-character short form', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(shortHash('abc'), 'ba7816bf8f01');
});

test('text: read, normalize quotes, count words, tokens, similarity, numbers', () => {
  assert.equal(readText(Buffer.from('﻿a\r\nb\rc')), 'a\nb\nc');
  assert.equal(normalizeQuote('  “Files are   limited” '), 'files are limited');
  assert.equal(wordCount(' one two  three '), 3);
  assert.equal(wordCount(''), 0);
  assert.deepEqual([...tokens('The file MUST hold 10,000 rows')], ['file', 'hold', '10000', 'rows']);
  assert.equal(jaccard('files hold 10,000 rows', 'files hold 10,000 rows'), 1);
  assert.ok(jaccard('a file may hold 10,000 rows', 'a file may hold 5,000 rows') < 0.85);
  assert.equal(jaccard('', ''), 0);
  assert.deepEqual([...numbers('max 10,000 rows, 5 MB, 2.5%')], ['10000', '5', '2.5']);
});

test('errors: check errors exit 1, usage errors exit 2', () => {
  assert.equal(checkError('x').code, 1);
  assert.equal(usageError('y').code, 2);
  assert.ok(checkError('x') instanceof FiError);
});
