'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { EXAMPLES } = require('./helpers');
const { timingTable } = require('../lib/timing');
const { FRAME, framePlan, playedProblems, alphaOf, measuredProblems } = require('../lib/verify');

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

test('verify: what the frames measure against the film rules: layout, stillness, exit before a move, bleed-through, brand', () => {
  const overlay = { name: 'Harbor', logos: { full: 'data:image/svg+xml,H', mark: 'data:image/svg+xml,M' }, places: { rail: { logo: 'full', height: 32 } } };
  const win = { x: 240, y: 90, w: 1440, h: 900 };
  const frame = (more = {}) => ({ camera: [1, 0, 0, 1, 0, 0], scale: 1, window: win, hooks: [], callouts: [], cards: [], layers: [], logos: [], ...more });
  const el = (box, more = {}) => ({ x: box[0], y: box[1], w: box[2], h: box[3], shown: true, ...more });
  const good = [
    { t: 4.75, kind: 'beat', scene: 'S-02', hook: 'S-02.1', m: frame({
      hooks: [{ hook: 'S-02.1', ...el([300, 300, 900, 120]) }],
      callouts: [{ kind: 'chip', ...el([500, 480, 340, 64]) }, { kind: 'lifted card', ...el([288, 288, 924, 144]) }, { kind: 'leader', ...el([700, 432, 0, 48]) }],
      layers: [{ kind: 'drawer', ...el([1300, 90, 380, 900]), opaque: true }],
      logos: [{ place: 'rail', src: overlay.logos.full, ...el([250, 100, 128, 32]) }],
    }) },
    { t: 5, kind: 'hold', scene: 'S-02', hook: 'S-02.1', m: frame() },
    { t: 5.9, kind: 'hold', scene: 'S-02', hook: 'S-02.1', m: frame() },
    { t: 6.2, kind: 'move', scene: 'S-02', hook: 'S-02.2', m: frame({ callouts: [{ kind: 'chip', ...el([500, 480, 340, 64], { shown: false }) }] }) },
    { t: 1.5, kind: 'card', scene: 'S-01', m: frame({ camera: null, window: null, cards: [{ kind: 'card', ...el([700, 400, 520, 116]) }] }) },
  ];
  assert.deepEqual(measuredProblems(good, overlay), []);
  // Each rule broken once; a broken rule is said once, at its first moment.
  const bad = [
    { t: 4.75, kind: 'beat', scene: 'S-02', hook: 'S-02.1', m: frame({
      hooks: [{ hook: 'S-02.1', ...el([300, 300, 900, 120], { shown: false }) }],
      callouts: [{ kind: 'chip', ...el([1700, 480, 340, 64]) }],
      layers: [{ kind: 'drawer', ...el([1300, 90, 380, 900]), opaque: false }],
      logos: [{ place: 'rail', src: overlay.logos.mark, ...el([250, 100, 25, 25]) }],
    }) },
    { t: 7.1, kind: 'beat', scene: 'S-02', hook: 'S-02.2', m: frame({ hooks: [{ hook: 'S-02.2', ...el([300, 300, 0, 0]) }], layers: [{ kind: 'drawer', ...el([1300, 90, 380, 900]), opaque: false }] }) },
    { t: 8, kind: 'beat', scene: 'S-02', hook: 'S-02.3', m: frame({ hooks: [{ hook: 'S-02.3', ...el([1600, 300, 200, 40]) }], logos: [{ place: 'rail', src: overlay.logos.full, ...el([250, 100, 128, 40]) }] }) },
    { t: 5, kind: 'hold', scene: 'S-02', hook: 'S-02.1', m: frame() },
    { t: 5.9, kind: 'hold', scene: 'S-02', hook: 'S-02.1', m: frame({ camera: [1.2, 0, 0, 1.2, -90, -40] }) },
    { t: 6.2, kind: 'move', scene: 'S-02', hook: 'S-02.2', m: frame({ callouts: [{ kind: 'lifted card', ...el([288, 288, 924, 144]) }] }) },
    { t: 13.183, kind: 'before-cut', scene: 'S-02', m: frame({ callouts: [{ kind: 'caption', ...el([300, 960, 1200, 60]) }] }) },
    { t: 1.5, kind: 'card', scene: 'S-01', m: frame({ camera: null, window: null, cards: [{ kind: 'card', ...el([20, 400, 520, 116]) }] }) },
  ];
  assert.deepEqual(measuredProblems(bad, overlay), [
    'S-02.1 at 4.75 s: its target is not shown when the beat acts',
    'S-02 at 4.75 s: a chip reaches outside the safe area, 40 px in from each edge of the frame',
    'S-02 at 4.75 s: the page shows through the drawer, which nothing opaque covers',
    "S-02 at 4.75 s: the rail shows a logo that is not Harbor's logo for it",
    'S-02.2 at 7.1 s: its target measures 0 by 0 px',
    "S-02.3 at 8 s: its target lies outside the app's window or the frame",
    "S-02 at 8 s: the rail logo is 40 px high; Harbor's is 32 px",
    'S-02 at 6.2 s: a lifted card still shows while the camera moves',
    'S-02 at 13.183 s: a caption still shows in the last frame before the cut',
    'S-01 at 1.5 s: a card reaches outside the safe area, 40 px in from each edge of the frame',
    'S-02.1: the camera moves between 5 s and 5.9 s, in a hold',
  ]);
  // A logo's height is the brand's at the camera's zoom.
  const tall = [{ t: 8, kind: 'hold', scene: 'S-02', hook: 'S-02.3', m: frame({ scale: 1.5, logos: [{ place: 'rail', src: overlay.logos.full, ...el([250, 100, 192, 60]) }] }) }];
  assert.deepEqual(measuredProblems(tall, overlay), ["S-02 at 8 s: the rail logo is 40 px high; Harbor's is 32 px"]);
  assert.deepEqual(measuredProblems([{ ...tall[0], m: { ...tall[0].m, logos: [{ ...tall[0].m.logos[0], h: 48 }] } }], overlay), []);
  // The focus-pop's blur leaves before a move too; a frame that cannot be measured passes nothing.
  const blurred = [{ t: 6.2, kind: 'move', scene: 'S-02', hook: 'S-02.2', m: frame({ callouts: [{ kind: 'focus', ...el([240, 90, 1440, 900]) }] }) }];
  assert.deepEqual(measuredProblems(blurred, overlay), ['S-02 at 6.2 s: a focus still shows while the camera moves']);
  assert.deepEqual(measuredProblems([{ t: 5, kind: 'hold', scene: 'S-02', hook: 'S-02.1', m: frame({ camera: null }) }], overlay), ['S-02.1: the camera could not be measured at 5 s, so its hold is not checked']);
  assert.deepEqual(measuredProblems([{ t: 3, kind: 'cut', scene: 'S-02', m: null }, { t: 4, kind: 'beat', scene: 'S-02', hook: 'S-02.1', m: null }], overlay), [
    "S-02 at 3 s: the film's frame could not be measured, so none of its checks ran",
  ]);
});

test('verify: a background\'s alpha in every colour syntax a browser gives', () => {
  assert.deepEqual(['transparent', 'rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.5)', 'hsla(10, 50%, 50%, 40%)'].map(alphaOf), [0, 1, 0, 0.5, 0.4]);
  assert.deepEqual(['oklch(0.7 0.1 200 / 0.4)', 'color(srgb 1 1 1 / 50%)', 'lab(50 20 30)', 'color-mix(in srgb, red 40%, transparent)', 'color-mix(in srgb, red, blue)'].map(alphaOf), [0.4, 0.5, 1, 0.5, 1]);
});
