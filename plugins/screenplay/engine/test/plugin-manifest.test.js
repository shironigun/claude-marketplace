'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PLUGIN, SKILLS_DIR, foreignNames, frontmatter } = require('./plugin-files');

// The marketplace's rules: the author is the marketplace's account, the licence MIT, and nothing names a person.
const AUTHOR = { name: 'shironigun' };

test('plugin manifest: screenplay, in development, by the marketplace account under MIT, naming no other plugin', () => {
  const file = path.join(PLUGIN, '.claude-plugin', 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(manifest.name, 'screenplay');
  assert.match(manifest.version, /^0\.0\.\d+$/);
  assert.match(manifest.description, /^IN DEVELOPMENT, not yet registered in the marketplace\./);
  for (const word of ['promo', 'walkthrough', 'trailer', 'module']) assert.ok(manifest.description.includes(word), word);
  assert.deepEqual(manifest.author, AUTHOR);
  assert.equal(manifest.license, 'MIT');
  assert.deepEqual(manifest.network, { hosts: ['registry.npmjs.org'] }, "the one host the renderer's install reaches");
  assert.deepEqual(foreignNames(file), []);
});

test('plugin manifest: the README and every skill name no person', () => {
  const readme = path.join(PLUGIN, 'README.md');
  assert.doesNotMatch(fs.readFileSync(readme, 'utf8'), /Made by/);
  assert.deepEqual(foreignNames(readme), []);
  const skills = fs.existsSync(SKILLS_DIR) ? fs.readdirSync(SKILLS_DIR) : [];
  for (const skill of skills) {
    const fm = frontmatter(path.join(SKILLS_DIR, skill, 'SKILL.md'));
    assert.ok(fm, `skills/${skill}/SKILL.md starts with a frontmatter block`);
    assert.deepEqual([fm.data['metadata.author'], fm.data['metadata.url']], [undefined, undefined], skill);
  }
});
