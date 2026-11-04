'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runFi, tempDir } = require('./helpers');
const { buildModel, write, DECISIONS } = require('./model-fixture');
const { validateNode } = require('../lib/schema');
const { SKILL_DIR, walk, rel, docProblems } = require('./plugin-files');

const PLAYBOOKS = walk(path.join(SKILL_DIR, 'references'));

test('plugin docs: playbooks name only real fi commands and flags, listed ADO tools and existing playbooks', () => {
  assert.ok(PLAYBOOKS.length >= 8);
  for (const f of PLAYBOOKS) assert.match(fs.readFileSync(f, 'utf8'), /^(?:<!--[^\n]*-->\r?\n)?# \S/, `${rel(f)} starts with a title`);
  assert.deepEqual(PLAYBOOKS.flatMap(docProblems), []);
});

test('plugin docs: the fi add example in model.md runs against a model', () => {
  const md = fs.readFileSync(path.join(SKILL_DIR, 'references', 'model.md'), 'utf8');
  const example = JSON.parse(/```json\r?\n([\s\S]*?)\r?\n```/.exec(md)[1]);
  const root = buildModel();
  const r = runFi(root, ['add', 'csv', write(root, 'example.json', example), '--json']);
  assert.equal(r.code, 0, r.stdout);
  assert.deepEqual(r.json.changed, ['RULE-006', 'AC-001']);
});

test('plugin docs: the checker catches what it is for', () => {
  const file = path.join(tempDir(), 'bad.md');
  fs.writeFileSync(file, [
    '# Bad', 'Run `fi coverage x --min 0.9` and `fi coverge x`, then `fi render x` and `fi status x --deep`.',
    'Plan 3 adds `fi render <slug> workspace`. Call wit_delete_work_item. Read references/nowhere.md.',
    'Hand it to the qa-orchestrator.',
  ].join('\n'));
  const problems = docProblems(file).map((p) => p.replace(/^.*?:(\d+:)?\s*/, ''));
  assert.deepEqual(problems.sort(), [
    'no fi command "coverge"', 'no fi command "render"', 'fi status has no --deep', 'qa-orchestrator',
    'references/nowhere.md does not exist', 'wit_delete_work_item is not in ado-expected-tools.txt',
  ].sort());
});

test('plugin docs: the consolidation decisions in requirements.md are the ones the test model applies', () => {
  const md = fs.readFileSync(path.join(SKILL_DIR, 'references', 'requirements.md'), 'utf8');
  const example = JSON.parse(/```json\r?\n([\s\S]*?)\r?\n```/.exec(md)[1]);
  assert.deepEqual(example, DECISIONS);
});

test('plugin docs: node examples in playbooks pass the engine schema', () => {
  let checked = 0;
  for (const f of PLAYBOOKS) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/```json\r?\n([\s\S]*?)\r?\n```/g)) {
      const ex = JSON.parse(m[1]);
      if (!('type' in ex && 'statement' in ex)) continue;
      assert.deepEqual(validateNode({ ...ex, id: `${ex.type}-001`, rev: 1, updated: '2026-11-04' }), [], `${rel(f)} node example`);
      checked += 1;
    }
  }
  assert.ok(checked >= 1);
});
