'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PLUGIN, SKILLS_DIR, frontmatter } = require('./plugin-files');

const EVALS = path.join(PLUGIN, 'evals');
// The trigger, guard and pipeline cases of spec 11.3: [tag, the skill a trigger starts].
const CASES = {
  'guard-code-question': ['guard'],
  'guard-explainer-page': ['guard'],
  'guard-record-screen': ['guard'],
  'guard-release-notes': ['guard'],
  'guard-short-film': ['guard'],
  'guard-test-cases': ['guard'],
  'pipeline-promo-reminders': ['pipeline'],
  'trigger-brand-colours': ['trigger', 'brand-profile'],
  'trigger-build-films': ['trigger', 'app-film'],
  'trigger-promo-feature': ['trigger', 'app-film'],
  'trigger-rebuild-screens': ['trigger', 'app-film'],
  'trigger-trailer-module': ['trigger', 'app-film'],
  'trigger-walkthrough-module': ['trigger', 'app-film'],
  'trigger-what-module-does': ['trigger', 'app-map'],
};

test('plugin evals: the trigger and guard cases, read-only, each graded on the skill it starts or on none; the pipeline, judged on its summary', () => {
  const dirs = fs.readdirSync(EVALS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(dirs, Object.keys(CASES));
  for (const [name, [tag, skill]] of Object.entries(CASES)) {
    const prompt = frontmatter(path.join(EVALS, name, 'prompt.md'));
    assert.ok(prompt, `${name}/prompt.md starts with a frontmatter block`);
    assert.ok(prompt.data.description && prompt.body.trim(), name);
    assert.equal(prompt.data.tags, `[${tag}]`, name);
    const graders = fs.readdirSync(path.join(EVALS, name, 'graders'));
    const grader = (file) => frontmatter(path.join(EVALS, name, 'graders', file)).data;
    if (tag === 'pipeline') {
      // The whole workflow on a copy of example-desk: it writes and runs the engine, but creates no Motion film.
      assert.equal(prompt.data.allowed_tools, '[Read, Write, Edit, Glob, Grep, Bash, Skill, Agent]', name);
      assert.match(prompt.body, /outside any git\s+repository/);
      assert.match(prompt.body, /Do not create any\s+Motion film/);
      assert.deepEqual(graders, ['analysis.md', 'film.md'], name);
      for (const g of graders) assert.equal(grader(g).type, 'llm', `${name}/${g}`);
      continue;
    }
    assert.equal(prompt.data.allowed_tools, '[Read, Glob, Grep, Skill]', name);
    if (tag === 'trigger') {
      assert.deepEqual(graders, ['skill-fired.md'], name);
      const g = grader('skill-fired.md');
      assert.deepEqual([g.type, g.tool, g.arm], ['tool_used', 'Skill', 'both'], name);
      assert.ok(g.input_match.includes(`)?${skill}"`), `${name} is graded on ${skill}`);
      assert.ok(fs.existsSync(path.join(SKILLS_DIR, skill, 'SKILL.md')), skill);
    } else {
      assert.deepEqual(graders, ['no-skill-fired.md'], name);
      const g = grader('no-skill-fired.md');
      assert.deepEqual([g.type, g.tool, g.min, g.max, g.arm], ['tool_used', 'Skill', '0', '0', 'both'], name);
    }
  }
  const readme = fs.readFileSync(path.join(EVALS, 'README.md'), 'utf8');
  for (const name of Object.keys(CASES)) assert.ok(readme.includes(`| \`${name}\` |`), `the README lists ${name}`);
  assert.equal(fs.readFileSync(path.join(EVALS, '.gitignore'), 'utf8').replace(/\r\n/g, '\n'), 'results/\n');
});
