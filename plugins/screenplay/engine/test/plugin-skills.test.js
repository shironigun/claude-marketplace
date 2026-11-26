'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SKILLS_DIR, AGENTS_DIR, COMMANDS_DIR, frontmatter } = require('./plugin-files');

// The three skills (spec 4.1): their playbooks and the scouts they dispatch.
const SKILLS = {
  'app-film': { references: ['build.md', 'film-rules.md', 'house-style.md', 'mods.md', 'review.md', 'screens.md', 'story.md', 'verify.md'], scouts: ['sp-ui-builder', 'sp-film-reviewer'] },
  'app-map': { references: ['backend-trace.md', 'context.md', 'dossier.md', 'screen-map.md'], scouts: ['sp-screen-scout', 'sp-backend-tracer'] },
  'brand-profile': { references: ['brand-profile.md'], scouts: ['sp-brand-scout'] },
};
// Each command and the skill it uses (spec 4.1).
const COMMANDS = { brand: 'brand-profile', build: 'app-film', check: 'app-film', map: 'app-map', mods: 'app-film', new: 'app-film', review: 'app-film', screens: 'app-film', status: 'app-map' };

test('plugin skills: brand-profile, app-map and app-film, with their playbooks, triggers and the scouts they dispatch', () => {
  assert.deepEqual(fs.readdirSync(SKILLS_DIR).sort(), Object.keys(SKILLS));
  for (const [skill, { references, scouts }] of Object.entries(SKILLS)) {
    const fm = frontmatter(path.join(SKILLS_DIR, skill, 'SKILL.md'));
    assert.ok(fm, `skills/${skill}/SKILL.md starts with a frontmatter block`);
    assert.equal(fm.data.name, skill);
    assert.ok(fm.data.description.length <= 1024, `${skill}: the description fits in 1024 characters`);
    assert.match(fm.data.description, / Use it when /);
    assert.match(fm.data.description, / Not for /);
    assert.ok(fm.body.includes('`shared/bootstrap.md`'), `${skill} starts from the bootstrap`);
    const dir = path.join(SKILLS_DIR, skill, 'references');
    assert.deepEqual(fs.readdirSync(dir).sort(), references);
    const books = references.map((r) => fs.readFileSync(path.join(dir, r), 'utf8'));
    for (const [i, text] of books.entries()) assert.match(text, /^# \S/, `${skill}/references/${references[i]} starts with a title`);
    const all = [fm.body, ...books].join('\n');
    for (const r of references) assert.ok(fm.body.includes(`references/${r}`), `${skill} points to references/${r}`);
    for (const scout of scouts) {
      assert.ok(all.includes(`\`screenplay:${scout}\``), `${skill} dispatches ${scout}`);
      assert.ok(fs.existsSync(path.join(AGENTS_DIR, `${scout}.md`)), scout);
    }
  }
});

test('plugin commands: brand, build, check, map, new, mods, review, screens and status, each with a description, an argument hint and the skill it uses', () => {
  assert.deepEqual(fs.readdirSync(COMMANDS_DIR).sort(), Object.keys(COMMANDS).map((c) => `${c}.md`));
  for (const [command, skill] of Object.entries(COMMANDS)) {
    const fm = frontmatter(path.join(COMMANDS_DIR, `${command}.md`));
    assert.ok(fm, `commands/${command}.md starts with a frontmatter block`);
    assert.ok(fm.data.description && fm.data['argument-hint'], command);
    assert.ok(fm.body.includes(`Use the **${skill}** skill`), `${command} uses ${skill}`);
    assert.ok(fm.body.includes('$ARGUMENTS'), command);
  }
});

test('plugin skills: app-film has a step for every next value a film can have, and hands the analyses to their skills', () => {
  const { body } = frontmatter(path.join(SKILLS_DIR, 'app-film', 'SKILL.md'));
  const rows = [...body.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual(rows, ['next', 'brand', 'map', 'mods', 'story', 'gate-2', 'ui', 'build', 'verify', 'gate-3', 'review']); // the header row first
  for (const skill of ['brand-profile', 'app-map']) assert.ok(body.includes(`screenplay:${skill}`), `app-film runs ${skill}`);
  const rules = fs.readFileSync(path.join(SKILLS_DIR, 'app-film', 'references', 'film-rules.md'), 'utf8');
  assert.deepEqual([...rules.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1])), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});
