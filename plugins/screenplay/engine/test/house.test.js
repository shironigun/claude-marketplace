'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { readyFilm, tempDir } = require('./helpers');
const { repoPaths } = require('../lib/paths');
const { houseStyle, houseModProblems, nextId } = require('../lib/house');

test('house style: the user\'s rules, then the repository\'s, each later one\'s mods over the earlier\'s', () => {
  const rp = repoPaths(tempDir('sp-home-'), 'desk');
  assert.deepEqual(houseStyle(rp), { rules: [], mods: {} });
  fs.mkdirSync(path.dirname(rp.houseStyle), { recursive: true });
  fs.writeFileSync(path.join(path.dirname(rp.root), 'house-style.json'), JSON.stringify({ rules: [
    { id: 'U-01', text: 'Calm films.', scope: 'generic', mods: { pacing: 'calm', look: 'full-bleed' } },
  ] }));
  fs.writeFileSync(rp.houseStyle, JSON.stringify({ rules: [{ id: 'H-01', text: 'Brisk here.', scope: 'generic', mods: { pacing: 'brisk' } }] }));
  const h = houseStyle(rp);
  assert.deepEqual(h.rules.map((r) => [r.id, r.layer]), [['U-01', 'user'], ['H-01', 'repository']]);
  assert.deepEqual(h.mods, { pacing: 'brisk', look: 'full-bleed' });
  // A file that is not a house style is refused by its name.
  fs.writeFileSync(rp.houseStyle, '{}');
  assert.throws(() => houseStyle(rp), /house-style\.json is not a house style \(\/: missing "rules"\); fix it, or remove it/);
  // A rule sets a style the catalog offers in this release: not the format, brands, patterns or the release's chip.
  assert.deepEqual(houseModProblems({ pacing: 'calm' }), []);
  assert.deepEqual(houseModProblems(null), []);
  assert.match(houseModProblems({ chip: 'none' })[0], /^\/mods\/chip: a house rule sets a style: look, ground, callouts/);
  assert.match(houseModProblems({ look: 'split-panel' })[0], /^\/mods\/look: "split-panel" is not an option of look in this release; use one of: floating-desk, full-bleed$/);
  assert.match(houseModProblems({ pacing: 'slow' })[0], /^\/mods\/pacing: "slow" is not an option/);
  assert.deepEqual([nextId([], 'H'), nextId([{ id: 'H-01' }, { id: 'H-07' }], 'H'), nextId([], 'U')], ['H-01', 'H-08', 'U-01']);
});

test('sp house: a rule saved in the repository, promoted for every repository only when generic, and new films start from it', () => {
  const { sp, runSp, repo, env } = readyFilm('reminders', 'promo');
  const house = (...more) => runSp(repo, ['house', ...more], env);
  assert.equal(sp('house').stdout.trim(), 'No house rules yet.');
  assert.equal(sp('mods', 'reminders', '--film', 'promo', '--json').json.preselected.pacing, 'standard');
  const added = sp('house', 'add', '--text', 'Hold each caption a little longer.', '--scope', 'generic', '--mods', 'pacing=calm', '--json').json;
  assert.deepEqual(added, { id: 'H-01', text: 'Hold each caption a little longer.', scope: 'generic', mods: { pacing: 'calm' } });
  sp('house', 'add', '--text', "The dialog's Cancel is an outlined danger button.", '--scope', 'product');
  // The mods form of a film starts from the house style.
  assert.equal(sp('mods', 'reminders', '--film', 'promo', '--json').json.preselected.pacing, 'calm');
  assert.match(sp('house').stdout, /^H-01 \(repository, generic\): Hold each caption a little longer\. \[sets pacing calm\]\nH-02 \(repository, product\): The dialog's Cancel/);
  // Refused: no words, no scope, a mod that is no style, mods that are not pairs, a product rule promoted, an unknown id.
  assert.match(house('add', '--scope', 'generic').stderr, /house add needs --text/);
  assert.match(house('add', '--text', 'x', '--scope', 'all').stderr, /house add needs --scope generic or --scope product/);
  assert.match(house('add', '--text', 'x', '--scope', 'generic', '--mods', 'chip=none').stderr, /\/mods\/chip: a house rule sets a style/);
  assert.match(house('add', '--text', 'x', '--scope', 'generic', '--mods', 'pacing').stderr, /--mods takes <mod>=<option> pairs/);
  assert.match(house('add', '--text', 'a <b> c', '--scope', 'generic').stderr, /house style has 1 problem/);
  assert.match(house('promote', 'H-02').stderr, /H-02 is about this product; a product rule never leaves its repository/);
  assert.equal(house('promote', 'H-09').code, 2);
  assert.equal(house('fly').code, 2);
  // A generic rule promoted goes to the user's own file, once.
  assert.equal(sp('house', 'promote', 'H-01', '--json').json.id, 'U-01');
  const user = JSON.parse(fs.readFileSync(path.join(env.SCREENPLAY_HOME, 'house-style.json'), 'utf8'));
  assert.deepEqual(user.rules.map((r) => [r.id, r.text]), [['U-01', 'Hold each caption a little longer.']]);
  assert.match(house('promote', 'H-01').stderr, /already has/);
  sp('house', 'remove', 'H-01');
  sp('house', 'remove', 'U-01');
  assert.equal(sp('mods', 'reminders', '--film', 'promo', '--json').json.preselected.pacing, 'standard');
  assert.equal(house('remove', 'H-01').code, 2);
});
