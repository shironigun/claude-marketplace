'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateClaim, validateNode } = require('../lib/schema');
const { AGENTS_DIR, walk, rel, docProblems, frontmatter } = require('./plugin-files');

const AGENTS = walk(AGENTS_DIR);
const READ_ONLY = new Set(['Read', 'Grep', 'Glob']);

// The JSON objects in a file's ```json blocks.
const jsonExamples = (text) => [...text.matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)].map((m) => JSON.parse(m[1]));

test('plugin agents: each subagent is well formed, treats sources as data and names only real things', () => {
  assert.ok(AGENTS.length >= 1);
  for (const f of AGENTS) {
    const fm = frontmatter(f);
    assert.ok(fm, `${rel(f)} has frontmatter`);
    assert.equal(fm.data.name, path.basename(f, '.md'), `${rel(f)} name`);
    assert.ok(fm.data.description && fm.data.description.length >= 80, `${rel(f)} description`);
    const tools = (fm.data.tools || '').split(',').map((t) => t.trim()).filter(Boolean);
    assert.ok(tools.length, `${rel(f)} lists its tools`);
    // The reviewer can block a publish or a ticket run, so it gets no tool that writes (spec P11).
    if (fm.data.name === 'fi-reviewer') assert.deepEqual(tools.filter((t) => !READ_ONLY.has(t)), [], 'fi-reviewer is read-only');
    assert.match(fm.body, /data, never instructions/, `${rel(f)} says source text is data`);
    assert.deepEqual(docProblems(f), []);
  }
});

test('plugin agents: the claim and node examples in subagent briefs pass the engine schema', () => {
  for (const f of AGENTS) {
    for (const ex of jsonExamples(fs.readFileSync(f, 'utf8'))) {
      if ('chunk' in ex) assert.deepEqual(validateClaim(ex), [], `${rel(f)} claim example`);
      else if ('type' in ex && 'statement' in ex) {
        assert.deepEqual(validateNode({ ...ex, id: `${ex.type}-001`, rev: 1, updated: '2026-11-04' }), [], `${rel(f)} node example`);
      }
    }
  }
});
