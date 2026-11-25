#!/usr/bin/env node
// Self-check for the secret scan in lint-content.js:  node lint-content.test.js
// It must stay clean on the shipped example and fail on a secret anywhere the page shows text.
'use strict';
const assert = require('assert');
const path = require('path');
const { lint } = require('./lint-content');
const example = require(path.join(__dirname, '..', 'examples', 'example-content.js'));

const secretFails = (C) => lint(C).filter((r) => r.level === 'fail' && /token, key or password/.test(r.msg));
assert.strictEqual(secretFails(example).length, 0, 'the shipped example must lint clean');

const token = 'Bearer ' + 'a'.repeat(30);
const places = { hero: { title: 'x', sub: token }, glossary: [['term', token]], meta: token, footer: 'api_key: "' + 'z'.repeat(10) + '"' };
for (const [field, value] of Object.entries(places)) {
  assert.strictEqual(secretFails(Object.assign({}, example, { [field]: value })).length, 1, 'a secret in ' + field + ' must fail');
}
console.log('lint-content: secret scan covers pages, hero, glossary, meta and footer');
