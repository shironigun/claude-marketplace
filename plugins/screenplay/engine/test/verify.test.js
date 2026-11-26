'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { EXAMPLES, readyFilm } = require('./helpers');
const { timingTable } = require('../lib/timing');
const { FRAME, framePlan, playedProblems, alphaOf, imageOpaque, measuredProblems, purityProblems, logFindings, verifyReport, reviewVote } = require('../lib/verify');

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
  assert.deepEqual(at(plan, 'cut'), [0, 3, 14.4, 19.8, 33]);
  assert.deepEqual(at(plan, 'before-cut'), [2.983, 14.383, 19.783, 32.983]);
  assert.deepEqual(at(plan, 'card'), [1.5, 34.5]);
  assert.deepEqual(at(plan, 'end'), [35.983]);
  // Every beat once: when it acts, or its caption's middle when it holds.
  assert.deepEqual(at(plan, 'beat').slice(0, 3), [['S-02.1', 4.85], ['S-02.2', 7.3], ['S-02.3', 7.85]]);
  assert.equal(at(plan, 'beat').length, 12);
  // A beat that acts and has a caption is measured again while its caption shows.
  assert.deepEqual(at(plan, 'caption'), [['S-03.1', 16.55]]);
  // The frame before each glide inside a scene, and each glide's middle; a beat on the shot before moves nothing.
  assert.deepEqual(at(plan, 'before-move').slice(0, 2), [['S-02.2', 5.983], ['S-02.4', 8.783]]);
  assert.deepEqual(at(plan, 'move').slice(0, 2), [['S-02.1', 3.4], ['S-02.2', 6.4]]);
  assert.ok(!at(plan, 'move').some(([hook]) => hook === 'S-02.3'));
  // The shot each beat holds, from the camera's landing to the beat's end.
  assert.deepEqual(at(plan, 'hold').filter(([hook]) => hook === 'S-04.5'), [['S-04.5', 30.55], ['S-04.5', 32.95]]);
});

test('verify: the reference cut\'s expected check results: every moment its plan renders, each brand, and no problem', () => {
  const { sp, film } = readyFilm('reminders', 'promo');
  sp('build', 'reminders', '--film', 'promo');
  const built = JSON.parse(fs.readFileSync(path.join(film, 'film', 'modules', 'film.json'), 'utf8'));
  const want = expected('reminders', 'promo', 'check.json');
  assert.equal(framePlan(built).length, want.moments);
  assert.deepEqual(Object.keys(want.brands), built.mods.brands);
  for (const r of Object.values(want.brands)) assert.deepEqual(r.problems, []);
  // S-03 types into the Send dialog and then clicks its Send: two parts of one dialog share its shot, so the camera holds.
  assert.deepEqual(built.scenes['S-03'].beats.map((b) => b.move !== null), [true, false]);
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

test('verify: the same frame cold and after others, the player\'s own log, and the report', () => {
  const frame = (t, bytes, hook) => ({ t, scene: 'S-02', hook, png: Buffer.from(bytes) });
  const warm = [frame(4.75, 'a', 'S-02.1'), frame(7.1, 'b', 'S-02.2')];
  assert.deepEqual(purityProblems(warm, [frame(7.1, 'b', 'S-02.2'), frame(4.75, 'a', 'S-02.1')]), []);
  assert.deepEqual(purityProblems(warm, [frame(7.1, 'c', 'S-02.2'), frame(4.75, 'a', 'S-02.1')]), [
    'S-02.2 at 7.1 s: the frame is not the same cold as after other frames (an animated image, or a render that keeps state)',
  ]);
  const log = [
    { level: 'warn', text: 'modules/scenes.json: "fonts"."sans" names no family in the player\'s list of Google Fonts families' },
    { level: 'error', text: 'raster-safety: an image the player cannot draw' },
    { level: 'warn', text: 'a scene ran long' },
  ];
  const found = logFindings(log);
  assert.deepEqual(found.problems, ['the player reported an error: raster-safety: an image the player cannot draw']);
  assert.equal(found.notes.length, 1);
  assert.match(found.notes[0], /the live player is the reference for type/);
  assert.deepEqual(found.warnings, ['a scene ran long']);
  assert.deepEqual(logFindings([]), { problems: [], notes: [], warnings: [] });
  const report = verifyReport({ title: 'Reminders, promo (Harbor)', inputs: '0123456789abcdef', at: '2026-11-23T10:00:00.000Z', moments: 68, ...found, sheets: ['sheets/S-01.png'] });
  assert.match(report, /^# Verify: Reminders, promo \(Harbor\)\n/);
  assert.match(report, /Build 0123456789ab, checked 2026-11-23T10:00:00\.000Z with the Motion player's own renderer: 68 moments/);
  assert.match(report, /## Problems\n\n- the player reported an error: raster-safety/);
  // The player's words are quoted in a section of their own.
  assert.match(report, /## The player's warnings\n\n- "a scene ran long"\n/);
  assert.match(report, /## Sheets\n\n- sheets\/S-01\.png\n$/);
  assert.match(verifyReport({ title: 'T', inputs: 'x', at: 'now', moments: 1, problems: [], notes: [], warnings: [], sheets: [] }), /## Problems\n\nNone\.\n\n## Not verified here\n\nNothing\.\n\n## The player's warnings\n\nNone\./);
});

test('verify: a background image hides what is under it only when every colour it names is opaque', () => {
  assert.equal(imageOpaque('none', alphaOf), false);
  assert.equal(imageOpaque('linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))', alphaOf), true);
  assert.equal(imageOpaque('linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))', alphaOf), false);
  assert.equal(imageOpaque('linear-gradient(hsla(10, 50%, 50%, 0.4), white)', alphaOf), false);
  assert.equal(imageOpaque('linear-gradient(oklch(0.7 0.1 200 / 0.4), rgb(255, 255, 255))', alphaOf), false);
  assert.equal(imageOpaque('linear-gradient(transparent, rgb(255, 255, 255))', alphaOf), false);
  assert.equal(imageOpaque('url("data:image/svg+xml;utf8,<svg fill=\'transparent\'/>")', alphaOf), true);
  assert.equal(imageOpaque('url("panel.png"), linear-gradient(rgba(0, 0, 0, 0.2), rgb(0, 0, 0))', alphaOf), false);
});

test('verify: a layer a beat opens lies wholly in the frame from when it shows to the beat end', () => {
  // The frame plan marks each moment of an opening beat after its layer shows: 0.1 s after a click acts.
  const film = {
    film: { length: 6 },
    order: ['S-01'],
    scenes: { 'S-01': { kind: 'screen', start: 0, dur: 6, beats: [
      { hook: 'S-01.1', start: 0, dur: 3, do: 'hold', act: null, move: null, caption: null },
      { hook: 'S-01.2', start: 3, dur: 3, do: 'click', act: 1.65, move: [0, 0.8], caption: null, opens: { kind: 'dialog', action: 'Send' } },
    ] } },
  };
  const marked = framePlan(film).filter((p) => p.layer);
  assert.deepEqual(marked.map((p) => [p.kind, p.t, p.layer]), [['hold', 5.95, 'Send']]);
  // Measured there: a dialog cut by the frame's edge is a problem; one wholly in the frame, or one that has not opened
  // in the frame, is not.
  const frame = (layers) => ({ camera: [1, 0, 0, 1, 0, 0], scale: 1, window: { x: 0, y: 0, w: 1920, h: 1080 }, hooks: [], callouts: [], cards: [], layers, logos: [] });
  const dialog = (x, y, more = {}) => ({ kind: 'dialog', action: 'Send', x, y, w: 700, h: 400, shown: true, opaque: true, ...more });
  const sample = (m, kind = 'hold') => [{ t: 5.95, kind, scene: 'S-01', hook: 'S-01.2', layer: 'Send', layerKind: 'dialog', m }];
  const overlay = { name: 'Harbor', logos: {}, places: {} };
  assert.deepEqual(measuredProblems(sample(frame([dialog(-300, -120)])), overlay), ['S-01.2 at 5.95 s: the dialog it opens is cut by the frame\'s edge']);
  assert.deepEqual(measuredProblems(sample(frame([dialog(600, 300)])), overlay), []);
  assert.deepEqual(measuredProblems(sample(frame([dialog(-300, -120, { shown: false })])), overlay), []);
  // Checked only once the camera is still: mid-glide a layer may sit across the frame's edge.
  assert.deepEqual(measuredProblems(sample(frame([dialog(-300, -120)]), 'move'), overlay), []);
  // The layer is the one of that kind and name: a toast named Send is not the dialog.
  assert.deepEqual(measuredProblems(sample(frame([{ ...dialog(600, 300), kind: 'toast' }, dialog(-300, -120)])), overlay), ['S-01.2 at 5.95 s: the dialog it opens is cut by the frame\'s edge']);
  // Another layer cut by the frame is no problem: a close-up of part of a drawer is a shot, not a flaw.
  assert.deepEqual(measuredProblems(sample(frame([dialog(600, 300), { kind: 'drawer', action: 'Details', x: 1500, y: 0, w: 600, h: 1080, shown: true, opaque: true }])), overlay), []);
});

test('verify: a dialog or toast that shows is never cut by the frame\'s edge', () => {
  const frame = (layers) => ({ camera: [1, 0, 0, 1, 0, 0], scale: 1, window: { x: 0, y: 0, w: 1920, h: 1080 }, hooks: [], callouts: [], cards: [], layers, logos: [] });
  const layer = (kind, x, y) => ({ kind, action: null, x, y, w: 600, h: 300, shown: true, opaque: true });
  const at = (kind, layers) => measuredProblems([{ t: 18.25, kind, scene: 'S-03', hook: 'S-03.2', m: frame(layers) }], { name: 'Harbor', logos: {}, places: {} });
  assert.deepEqual(at('hold', [layer('dialog', 40, -60)]), ['S-03 at 18.25 s: the dialog is cut by the frame\'s edge']);
  assert.deepEqual(at('caption', [layer('toast', 1500, 900)]), ['S-03 at 18.25 s: the toast is cut by the frame\'s edge']);
  // Wholly in the frame, or wholly out of it, is fine; so is a drawer, whose close-ups show a part of it.
  assert.deepEqual(at('hold', [layer('dialog', 600, 300), layer('toast', 2200, 900), layer('drawer', 1500, -40)]), []);
});

test('verify: three reviews vote, and a flaw blocks the cut only when two of them name it', () => {
  const f = (brand, scene, rule, at = 1) => ({ brand, scene, at, rule, text: `${brand} ${scene} rule ${rule}` });
  const pass = { verdict: 'PASS', findings: [] };
  const block = (...findings) => ({ verdict: 'BLOCKED', findings });
  assert.deepEqual(reviewVote([pass, pass, pass]), { verdict: 'PASS', findings: [] });
  // Two reviews block on different flaws and one passes: no flaw has two votes, so each is that review's noise.
  assert.deepEqual(reviewVote([block(f('harbor', 'S-02', '1')), block(f('harbor', 'S-04', '8')), pass]), { verdict: 'PASS', findings: [] });
  // Two name the same brand, scene and rule, at other moments and in other words: it blocks, as the first says it.
  const a = f('harbor', 'S-02', '4', 13.75);
  const b = { ...f('harbor', 'S-02', '4', 13.8), text: 'In other words' };
  assert.deepEqual(reviewVote([pass, block(a), block(b, f('lumen', 'S-03', '2'))]), { verdict: 'BLOCKED', findings: [{ ...a, votes: 2 }] });
  // A review that names one flaw twice gives it one vote.
  assert.equal(reviewVote([block(a, b), pass, pass]).verdict, 'PASS');
});
