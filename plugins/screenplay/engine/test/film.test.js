'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, shopRepo, validJson, inputFile } = require('./helpers');
const { CATALOG, FORMAT_IDS } = require('../lib/catalog');
const { DECISION_KEYS, readState, writeState } = require('../lib/state');

const NOW = '2026-11-12T10:00:00.000Z';

function setup() {
  const repo = shopRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const init = runSp(repo, ['init', 'Orders', '--json'], env);
  assert.equal(init.code, 0, init.stderr);
  return { repo, env, workspace: init.json.workspace };
}

test('catalog: seven formats, every mod with its options and the default first, the pacing holds and a chip per release', () => {
  assert.deepEqual(FORMAT_IDS, ['walkthrough', 'promo', 'trailer', 'teaser', 'release-highlight', 'store-preview', 'how-to']);
  assert.deepEqual(CATALOG.mods.map((m) => m.id), [
    'look', 'ground', 'callouts', 'pointer', 'transitions', 'pacing', 'intro', 'chip', 'demoNote', 'sound', 'polish',
  ]);
  const options = (id) => CATALOG.mods.find((m) => m.id === id).options;
  for (const m of CATALOG.mods) {
    assert.equal(new Set(m.options.map((o) => o.id)).size, m.options.length, `${m.id}: option ids are unique`);
    assert.ok(m.label && m.options.every((o) => o.label && o.preview), `${m.id}: every option has a label and a preview`);
    assert.ok(!m.options[0].r2, `${m.id}: its default is in this release`);
  }
  for (const f of CATALOG.formats) {
    for (const [mod, option] of Object.entries(f.defaults || {})) {
      assert.ok(options(mod).some((o) => o.id === option), `${f.id}: its default ${mod} ${option} is an option`);
    }
  }
  assert.deepEqual(options('pacing').map((o) => [o.id, o.ms]), [['standard', 1400], ['calm', 1600], ['brisk', 1200]]);
  assert.deepEqual(options('chip').map((o) => o.release), DECISION_KEYS.Release);
  assert.deepEqual(CATALOG.mods.flatMap((m) => m.options.filter((o) => o.r2).map((o) => `${m.id} ${o.id}`)), ['look split-panel', 'look device-frame', 'pointer touch']);
  assert.equal(new Set(CATALOG.patterns.map((p) => p.id)).size, 9);
});

test('film: a film of a subject in a format has its own Working State; a second run resumes; one film has one format', () => {
  const { repo, env, workspace } = setup();
  const r = runSp(repo, ['film', 'orders', 'promo', '--json'], env);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual([r.json.film, r.json.name, r.json.workspace, r.json.created], ['promo', 'Orders, promo', path.join(workspace, 'films', 'promo'), true]);
  assert.deepEqual(readState(path.join(workspace, 'films', 'promo', 'state.md')), {
    name: 'Orders, promo', subject: 'orders', film: 'promo', format: 'promo', kind: 'feature', repository: 'shop',
    phase: 'mods', updated: NOW, decisions: [], pending: [],
  });
  assert.equal(runSp(repo, ['film', 'orders', 'promo', '--json'], env).json.created, false);
  const clash = runSp(repo, ['film', 'orders', 'teaser', '--film', 'promo'], env);
  assert.equal(clash.code, 2);
  assert.match(clash.stderr, /film "promo" of orders is a promo; name a new film with --film <slug>/);
  const short = runSp(repo, ['film', 'orders', 'teaser', '--film', 'promo-cut', '--json'], env);
  assert.deepEqual([short.json.film, short.json.format, short.json.name], ['promo-cut', 'teaser', 'Orders, teaser']);
  for (const [args, message] of [
    [['film', 'orders', 'movie'], /unknown format "movie"; use one of: walkthrough, promo, trailer/],
    [['film', 'orders'], /missing <format>; use one of: walkthrough/],
    [['film', 'nobody', 'promo'], /no subject "nobody"/],
    [['film', 'orders', 'promo', '--film', 'Cut 2'], /bad film slug "Cut 2"/],
  ]) {
    const bad = runSp(repo, args, env);
    assert.equal(bad.code, 2, args.join(' '));
    assert.match(bad.stderr, message);
  }
});

test('state and status: a film records its own phases and decisions, never the subject\'s keyed ones; the subject lists its films with their next steps', () => {
  const { repo, env, workspace } = setup();
  assert.equal(runSp(repo, ['film', 'orders', 'walkthrough'], env).code, 0);
  const s = runSp(repo, ['state', 'orders', '--film', 'walkthrough', '--phase', 'story', '--decision', 'Opens on the busiest day', '--json'], env);
  assert.equal(s.code, 0, s.stderr);
  assert.deepEqual([s.json.phase, s.json.decisions], ['story', ['Opens on the busiest day']]);
  const subject = readState(path.join(workspace, 'state.md'));
  assert.deepEqual([subject.phase, subject.decisions], ['bootstrap', []]); // the subject's own state is untouched
  const filmState = path.join(workspace, 'films', 'walkthrough', 'state.md');
  const before = fs.readFileSync(filmState, 'utf8');
  const keyed = runSp(repo, ['state', 'orders', '--film', 'walkthrough', '--phase', 'gate-2', '--decision', 'Release: new'], env);
  assert.equal(keyed.code, 2);
  assert.match(keyed.stderr, /Release is a decision of the subject: sp state orders --decision "Release: new"/);
  assert.equal(fs.readFileSync(filmState, 'utf8'), before, 'nothing was written');
  const bad = runSp(repo, ['state', 'orders', '--film', 'walkthrough', '--phase', 'screens'], env);
  assert.equal(bad.code, 2);
  assert.match(bad.stderr, /unknown phase "screens"; use one of: mods, story, gate-2, ui, build, verify, gate-3, review/);
  assert.equal(runSp(repo, ['state', 'orders', '--film', 'nope', '--phase', 'story'], env).code, 2);
  assert.deepEqual(runSp(repo, ['status', 'orders', '--json'], env).json.films, [
    { film: 'walkthrough', name: 'Orders, walkthrough', format: 'walkthrough', phase: 'story', updated: NOW, next: 'brand' },
  ]);
  assert.match(runSp(repo, ['status', 'orders'], env).stdout,
    /^films:\n {2}walkthrough {2}walkthrough {2}6 Story and demo data {2}next: the brand profile \(brand-profile\)$/m);
  const film = runSp(repo, ['status', 'orders', '--film', 'walkthrough', '--json'], env).json;
  assert.deepEqual(film.files, { 'mods.json': false, 'beats.json': false, 'demo-data.json': false, 'storyboard.md': false });
  assert.deepEqual([film.film, film.format, film.phase, film.next], ['walkthrough', 'walkthrough', 'story', 'brand']);
  assert.equal(runSp(repo, ['status', 'orders', '--film', 'nope'], env).code, 2);
});

test('status: a film waits for the brand profile and the analysis, then walks mods, story and gate 2 to its screens', () => {
  const { repo, env, workspace } = setup();
  assert.equal(runSp(repo, ['film', 'orders', 'promo'], env).code, 0);
  const next = () => runSp(repo, ['status', 'orders', '--film', 'promo', '--json'], env).json.next;
  assert.equal(next(), 'brand');
  assert.equal(runSp(repo, ['save', 'brands', inputFile(validJson('brands'), repo)], env).code, 0);
  assert.equal(next(), 'brand'); // saved, but not confirmed yet
  assert.equal(runSp(repo, ['confirm', 'brands'], env).code, 0);
  assert.equal(next(), 'map');
  assert.equal(runSp(repo, ['detect'], env).code, 0);
  for (const kind of ['screens', 'api-calls', 'truth']) {
    assert.equal(runSp(repo, ['save', kind, inputFile(validJson(kind), repo), '--subject', 'orders'], env).code, 0);
  }
  fs.writeFileSync(path.join(workspace, 'map', 'brief.md'), '# Orders\n'); // what the context step leaves
  const subject = path.join(workspace, 'state.md');
  writeState(subject, { ...readState(subject), gate1: NOW });
  assert.equal(next(), 'mods');
  // What the mods and story steps leave; later tasks save them through sp save.
  const film = path.join(workspace, 'films', 'promo');
  fs.writeFileSync(path.join(film, 'mods.json'), '{}\n');
  assert.equal(next(), 'story');
  fs.mkdirSync(path.join(film, 'story'));
  for (const f of ['beats.json', 'demo-data.json']) fs.writeFileSync(path.join(film, 'story', f), '{}\n');
  assert.equal(next(), 'gate-2');
  const state = path.join(film, 'state.md');
  writeState(state, { ...readState(state), gate2: NOW });
  assert.equal(next(), 'ui');
  assert.equal(runSp(repo, ['status', 'orders', '--film', 'promo', '--json'], env).json.gate2, NOW);
  assert.match(runSp(repo, ['status', 'orders', '--film', 'promo'], env).stdout, /^next: 7 Screens from code \(gate 2 passed\)$/m);
  // The analysis changed and passed gate 1 again after the storyboard was approved: gate 2 is passed again too.
  writeState(subject, { ...readState(subject), gate1: '2026-11-13T09:00:00.000Z' });
  assert.equal(next(), 'gate-2');
  // So it is when the brand profile is confirmed again after gate 2.
  writeState(state, { ...readState(state), gate2: '2026-11-13T10:00:00.000Z' });
  assert.equal(next(), 'ui');
  assert.equal(runSp(repo, ['confirm', 'brands'], { ...env, SP_NOW: '2026-11-13T11:00:00.000Z' }).code, 0);
  assert.equal(next(), 'gate-2');
});
