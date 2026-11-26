'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, filmRepo, validJson, inputFile } = require('./helpers');
const { preselect } = require('../lib/mods');
const { readState, writeState } = require('../lib/state');

const NOW = '2026-11-12T10:00:00.000Z';
const saveMods = ({ repo, env }, value, ...rest) => runSp(repo, ['save', 'mods', inputFile(value, repo), '--subject', 'orders', ...rest], env);

test('mods: the form starts from the defaults, then the format\'s, and the chip the release status calls for', () => {
  const { repo, env } = filmRepo();
  const m = runSp(repo, ['mods', 'orders', '--film', 'promo', '--json'], env);
  assert.equal(m.code, 0, m.stderr);
  assert.deepEqual(m.json.preselected, {
    format: 'promo', look: 'floating-desk', ground: 'light', callouts: 'focus-pop', pointer: 'cursor', transitions: 'glide',
    pacing: 'standard', intro: 'boom', chip: 'new', demoNote: 'on', sound: 'score', polish: 'as-is', patterns: [], brands: ['sample'],
  });
  assert.deepEqual([m.json.release, m.json.current], ['new', null]);
  assert.deepEqual(m.json.screens, [{ id: 'SCR-01', title: 'Orders list', actions: ['drawer'] }]);
  assert.deepEqual(m.json.brands, [{ id: 'sample', name: 'Sample' }]);
  assert.equal(m.json.catalog.formats.length, 7);
  assert.match(runSp(repo, ['mods', 'orders', '--film', 'promo'], env).stdout, /^ {2}End card status chip: New$/m);
  const fc = { format: 'how-to', release: 'unreleased', brands: [{ id: 'a' }, { id: 'b' }] };
  const howTo = preselect(fc);
  assert.deepEqual([howTo.pacing, howTo.callouts, howTo.chip, howTo.demoNote, howTo.brands], ['calm', 'numbered-steps', 'coming-soon', 'on', ['a', 'b']]);
  assert.deepEqual([preselect({ ...fc, format: 'teaser', release: null }).pacing, preselect({ ...fc, release: null }).chip], ['brisk', 'none']);
  assert.equal(runSp(repo, ['mods', 'orders', '--film', 'teaser'], env).code, 2);
  assert.equal(runSp(repo, ['mods', 'orders'], env).code, 2);
});

test('save mods: valid mods are saved to the film; unknown and release-2 options, another format, screens and brands are refused', () => {
  const f = filmRepo();
  const ok = saveMods(f, validJson('mods'), '--film', 'promo', '--json');
  assert.equal(ok.code, 0, ok.stderr);
  assert.deepEqual(ok.json, { kind: 'mods', saved: path.join(f.film, 'mods.json'), items: 14 });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.film, 'mods.json'), 'utf8')), validJson('mods'));
  assert.equal(runSp(f.repo, ['mods', 'orders', '--film', 'promo', '--json'], f.env).json.current.patterns[0].pattern, 'dialog-steps');
  const bad = saveMods(f, {
    ...validJson('mods'), format: 'teaser', look: 'device-frame', pointer: 'laser', ground: 'deep',
    patterns: [{ screen: 'SCR-09', pattern: 'tab-tour' }, { screen: 'SCR-01', pattern: 'spin' }, { screen: 'SCR-09', pattern: 'tab-tour' }],
    brands: ['sample', 'other', 'sample'],
  }, '--film', 'promo');
  assert.equal(bad.code, 1);
  for (const problem of [
    '/format: this film is a promo; make a teaser as another film: sp film orders teaser',
    '/look: Device frame arrives in release 2; use one of: floating-desk, full-bleed\n',
    '/pointer: "laser" is not an option; use one of: cursor, none',
    "/ground: a deep ground's cards show each brand's dark logo, which Sample has not; choose the light ground, or supply one with sp logo sample dark <file>",
    '/patterns/0: the screen map has no SCR-09',
    '/patterns/1: "spin" is not a pattern; use one of: column-sweep, section-tour, tab-tour,',
    '/patterns/2: tab-tour on SCR-09 twice',
    '/brands/1: the brand profile has no brand "other"',
    '/brands/2: "sample" twice',
  ]) assert.ok(bad.stderr.includes(problem), problem);
  assert.match(bad.stderr, /^sp save: mods has 10 problems:/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.film, 'mods.json'), 'utf8')), validJson('mods'), 'nothing was written');
});

test('save mods: the release status comes first, and unreleased work has a chip', () => {
  const f = filmRepo({ release: null });
  const missing = saveMods(f, validJson('mods'), '--film', 'promo');
  assert.equal(missing.code, 1);
  assert.ok(missing.stderr.includes('the release status is not recorded: sp state orders --decision "Release: <released|new|beta|unreleased>"'));
  assert.match(missing.stderr, /^sp save: mods has 1 problem:/);
  assert.equal(runSp(f.repo, ['state', 'orders', '--decision', 'Release: unreleased'], f.env).code, 0);
  const wrong = saveMods(f, { ...validJson('mods'), chip: 'none' }, '--film', 'promo');
  assert.equal(wrong.code, 1);
  assert.ok(wrong.stderr.includes('/chip: unreleased work carries a status chip (spec 8, rule 10)'));
  assert.equal(saveMods(f, { ...validJson('mods'), chip: 'coming-soon' }, '--film', 'promo').code, 0);
});

test('save mods: it needs the film, and a new save asks for gate 2 again but leaves gate 1 alone', () => {
  const f = filmRepo();
  const none = saveMods(f, validJson('mods'));
  assert.equal(none.code, 2);
  assert.match(none.stderr, /saving mods needs --film <film slug>/);
  assert.equal(saveMods(f, validJson('mods'), '--film', 'nope').code, 2);
  assert.equal(saveMods(f, validJson('mods'), '--film', 'promo').code, 0);
  const state = path.join(f.film, 'state.md');
  writeState(state, { ...readState(state), gate2: NOW });
  assert.equal(saveMods(f, validJson('mods'), '--film', 'promo').code, 0);
  assert.equal(readState(state).gate2, undefined);
  assert.equal(readState(path.join(f.workspace, 'state.md')).gate1, NOW);
});
