'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PLUGIN, SKILL_DIR, frontmatter } = require('./plugin-files');

const EVALS = path.join(PLUGIN, 'evals');
const CASES = fs.readdirSync(EVALS, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== 'results').map((e) => e.name).sort();
const READ_ONLY = ['Read', 'Glob', 'Grep', 'Skill'];

const list = (v) => (v || '').replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
const graders = (c) => fs.readdirSync(path.join(EVALS, c, 'graders')).sort().map((g) => ({ name: g, ...frontmatter(path.join(EVALS, c, 'graders', g)) }));
const pattern = (g) => new RegExp(g.data.input_match.replace(/^'|'$/g, ''));

test('plugin evals: every case has a prompt and graders; trigger and guard cases use read-only tools', () => {
  assert.deepEqual(CASES, ['fixture-formats', 'fixture-new-feature', 'guard-quick-explainer', 'guard-test-cases', 'trigger-analyze-epic', 'trigger-idea-to-stories']);
  for (const c of CASES) {
    const p = frontmatter(path.join(EVALS, c, 'prompt.md'));
    assert.ok(p && p.data.description && p.body.trim(), `${c} has a prompt`);
    const [tag] = list(p.data.tags);
    assert.equal(tag, c.startsWith('fixture-') ? 'pipeline' : c.split('-')[0], `${c} tag`);
    if (tag !== 'pipeline') assert.deepEqual(list(p.data.allowed_tools), READ_ONLY, `${c} tools`);
    else assert.ok(list(p.data.allowed_tools).includes('Bash'), `${c} runs the engine`);
    const gs = graders(c);
    assert.ok(gs.length, `${c} has graders`);
    for (const g of gs) assert.ok(['llm', 'tool_used'].includes(g.data.type), `${c}/${g.name} type`);
  }
});

test('plugin evals: the skill-fired pattern matches this skill and nothing else', () => {
  for (const c of ['trigger-analyze-epic', 'trigger-idea-to-stories']) {
    const re = pattern(graders(c).find((g) => g.name === 'skill-fired.md'));
    assert.match('{"skill": "feature-intelligence"}', re);
    assert.match('{"skill":"feature-intelligence:feature-intelligence"}', re);
    assert.doesNotMatch('{"skill": "feature-intelligence-lite"}', re);
  }
  const other = pattern(graders('fixture-new-feature').find((g) => g.name === 'no-other-plugins.md'));
  assert.match('{"skill": "qa-engineering:story-intelligence"}', other);
  assert.doesNotMatch('{"skill": "feature-intelligence"}', other);
});

test('plugin evals: the findings grader lists every planted fault of the fixture', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, 'examples', 'csv-importer', 'expected-findings.json'), 'utf8'));
  const grader = fs.readFileSync(path.join(EVALS, 'fixture-new-feature', 'graders', 'findings.md'), 'utf8');
  const listed = [...grader.matchAll(/^- (PF-\d+) ([a-z][a-z -]*?):/gm)].map((m) => [m[1], m[2].replace(/ /g, '-').replace('behaviour', 'behavior')]);
  assert.deepEqual(listed, expected.faults.map((f) => [f.id, f.kind]));
  assert.match(grader, new RegExp(`at least ${Math.ceil(expected.faults.length * 0.9)} of the ${expected.faults.length}`));
});
