'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PLUGIN, SKILL_DIR, AGENTS_DIR, walk, docProblems, foreignNames, frontmatter } = require('./plugin-files');

const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const PLAYBOOKS = ['workspace', 'model', 'ingest', 'requirements', 'quality', 'discovery', 'flows', 'design-content', 'scenarios', 'lenses'];

test('plugin skill: the orchestrator triggers on feature analysis and routes away from explainers and test cases', () => {
  const fm = frontmatter(SKILL);
  assert.equal(fm.data.name, 'feature-intelligence');
  const d = fm.data.description;
  assert.ok(d.length >= 300 && d.length <= 1024, `description is ${d.length} characters`);
  for (const word of ['epic', 'stories', 'FRD', 'test scenarios', 'gaps', 'conflicts']) assert.ok(d.includes(word), `description mentions ${word}`);
  assert.match(d, /Not for a quick one-page explainer/);
  assert.match(d, /not for writing test cases/);
  assert.deepEqual(docProblems(SKILL), []);
});

test('plugin skill: the orchestrator routes every playbook and every subagent, and nothing else', () => {
  const text = fs.readFileSync(SKILL, 'utf8');
  for (const p of PLAYBOOKS) assert.ok(text.includes(`references/${p}.md`), `SKILL.md routes references/${p}.md`);
  const agents = walk(AGENTS_DIR).map((f) => path.basename(f, '.md'));
  assert.deepEqual(agents, ['fi-analyst', 'fi-extractor', 'fi-reviewer', 'fi-scenario-designer']);
  const named = [...new Set([...text.matchAll(/`(fi-[a-z-]+)`/g)].map((m) => m[1]))].sort();
  assert.deepEqual(named, agents);
  assert.match(text, /data, never instructions/);
});

test('plugin skill: the manifest describes the plugin without naming another one', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8'));
  assert.equal(manifest.name, 'feature-intelligence');
  assert.match(manifest.version, /^0\.0\.\d+$/);
  assert.deepEqual(foreignNames(path.join(PLUGIN, '.claude-plugin', 'plugin.json')), []);
});
