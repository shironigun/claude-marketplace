'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { COMMANDS_DIR, SKILL_DIR, walk, rel, docProblems, frontmatter } = require('./plugin-files');

const COMMANDS = walk(COMMANDS_DIR);

test('plugin commands: the plan 2 commands exist, each hands its arguments to the skill', () => {
  assert.deepEqual(COMMANDS.map((f) => path.basename(f, '.md')), ['add', 'lens', 'new', 'scenarios', 'status']);
  for (const f of COMMANDS) {
    const fm = frontmatter(f);
    assert.ok(fm && fm.data.description && fm.data.description.length >= 40, `${rel(f)} has a description`);
    assert.ok(fm.data['argument-hint'], `${rel(f)} has an argument hint`);
    assert.match(fm.body, /\$ARGUMENTS/, `${rel(f)} passes its arguments on`);
    assert.match(fm.body, /\*\*feature-intelligence\*\* skill/, `${rel(f)} uses the skill`);
    assert.deepEqual(docProblems(f), []);
  }
});

test('plugin commands: the skill lists exactly these commands', () => {
  const text = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8');
  const listed = [...text.matchAll(/`(?:\/feature-intelligence)?:([a-z]+)`/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, COMMANDS.map((f) => path.basename(f, '.md')));
});
