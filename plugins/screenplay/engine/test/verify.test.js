'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { EXAMPLES } = require('./helpers');
const { timingTable } = require('../lib/timing');
const { FRAME, framePlan, playedProblems } = require('../lib/verify');

const expected = (...parts) => require(path.join(EXAMPLES, 'expected', 'example-desk', ...parts));
// The example promo as film.json holds its timing: the table's scenes by id, with the film's length and tempo.
function promoFilm() {
  const fc = { beats: expected('reminders', 'promo', 'beats.json'), mods: expected('reminders', 'promo', 'mods.json'), screens: expected('reminders', 'screens.json').screens };
  const table = timingTable(fc);
  return { film: { length: table.length }, mods: fc.mods, tempo: table.tempo, order: table.scenes.map((s) => s.id), scenes: Object.fromEntries(table.scenes.map((s) => [s.id, s])) };
}
const at = (plan, kind) => plan.filter((p) => p.kind === kind).map((p) => (p.hook ? [p.hook, p.t] : p.t));

test('verify: a still at every cut, every beat and the frame before every camera move, in film order', () => {
  const film = promoFilm();
  const plan = framePlan(film);
  assert.deepEqual(plan.map((p) => p.t), [...plan.map((p) => p.t)].sort((a, b) => a - b));
  assert.ok(plan.every((p) => p.t >= 0 && p.t < film.film.length));
  // Each scene's first frame, the frame before each cut, a card's middle, and the film's last frame.
  assert.deepEqual(at(plan, 'cut'), [0, 3, 13.8, 19.2, 31.8]);
  assert.deepEqual(at(plan, 'before-cut'), [2.983, 13.783, 19.183, 31.783]);
  assert.deepEqual(at(plan, 'card'), [1.5, 33.3]);
  assert.deepEqual(at(plan, 'end'), [34.783]);
  // Every beat once: when it acts, or its caption's middle when it holds.
  assert.deepEqual(at(plan, 'beat').slice(0, 3), [['S-02.1', 4.85], ['S-02.2', 7.3], ['S-02.3', 7.85]]);
  assert.equal(at(plan, 'beat').length, 12);
  // A beat that acts and has a caption is measured again while its caption shows.
  assert.deepEqual(at(plan, 'caption'), [['S-03.1', 15.95]]);
  // The frame before each glide inside a scene, and each glide's middle; a beat on the shot before moves nothing.
  assert.deepEqual(at(plan, 'before-move').slice(0, 2), [['S-02.2', 5.983], ['S-02.4', 8.783]]);
  assert.deepEqual(at(plan, 'move').slice(0, 2), [['S-02.1', 3.4], ['S-02.2', 6.4]]);
  assert.ok(!at(plan, 'move').some(([hook]) => hook === 'S-02.3'));
  // The shot each beat holds, from the camera's landing to the beat's end.
  assert.deepEqual(at(plan, 'hold').filter(([hook]) => hook === 'S-04.5'), [['S-04.5', 28.45], ['S-04.5', 31.75]]);
});

test('verify: the player plays the timing table: its length, its cuts on the beat, and every sound on its frame', () => {
  const film = {
    film: { length: 12 },
    mods: { intro: 'boom' },
    tempo: { bpm: 100, t0: 0 },
    order: ['S-01', 'S-02', 'S-03'],
    scenes: {
      'S-01': { kind: 'title', start: 0, dur: 3 },
      'S-02': { kind: 'screen', start: 3, dur: 6, beats: [
        { start: 0, do: 'hold', act: null, label: 'Open', caption: [0.7, 2.8] },
        { start: 3, do: 'click', act: 0.9 },
        { start: 4.2, do: 'type', act: 0.25, typing: [0.25, 0.4], text: 'Hi.' },
      ] },
      'S-03': { kind: 'end', start: 9, dur: 3 },
    },
  };
  const fx = (patch, t) => ({ t, kind: 'fx', patch });
  // The title's ring and hit, each caption's pop, the click, each typed character's tick, and the end card's chime.
  const events = [fx('ding', 0.15), { t: 0.8, kind: 'drum', patch: 'kick' }, fx('pop', 3.7), fx('click', 6.9), fx('tick', 7.5), fx('tick', 7.55), fx('tick', 7.6), fx('chime', 9.15)];
  const played = { duration: 12, chapters: [0, 3, 9], unknown: [], events };
  assert.deepEqual(playedProblems(film, played), []);
  // A sound within a frame of its moment is on it.
  assert.deepEqual(playedProblems(film, { ...played, events: events.map((e) => ({ ...e, t: e.t + FRAME / 2 })) }), []);
  const wrong = { duration: 11.5, chapters: [0, 3.2], unknown: ['cowbel'], events: events.filter((e) => !['click', 'chime', 'kick'].includes(e.patch) && e.t !== 7.55) };
  assert.deepEqual(playedProblems(film, wrong), [
    'the player plays 11.5 s; the timing table runs 12 s',
    'S-02 starts at 3.2 s in the player; the timing table starts it at 3 s',
    'S-03 starts at no time in the player; the timing table starts it at 9 s',
    'the score names the sound "cowbel", which the player lacks, so it is silent',
    'no click sounds at 6.9 s, the frame of its click',
    'no tick sounds at 7.55 s, the frame of its typed character',
    "no chime sounds at 9.15 s, the frame of its end card's chord",
    "no kick sounds at 0.8 s, the frame of its title's hit",
  ]);
  // The hit sounds only with the boom intro.
  assert.deepEqual(playedProblems({ ...film, mods: { intro: 'calm-reveal' } }, { ...played, events: events.filter((e) => e.patch !== 'kick') })
    .filter((p) => /kick/.test(p)), []);
  // A scene off the score's beat; a silent film has no beat and no sounds to check.
  const off = { ...film, scenes: { ...film.scenes, 'S-03': { ...film.scenes['S-03'], start: 9.1 } } };
  const offEvents = events.map((e) => (e.patch === 'chime' ? { ...e, t: 9.25 } : e));
  assert.deepEqual(playedProblems(off, { ...played, chapters: [0, 3, 9.1], events: offEvents }), ['S-03 starts at 9.1 s, off the score\'s beat (100 a minute)']);
  assert.deepEqual(playedProblems({ ...off, tempo: null }, { ...played, chapters: [0, 3, 9.1], events: [] }), []);
});
