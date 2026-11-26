'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { EXAMPLES } = require('./helpers');
const { PACE, LAYERS, GLIDE, TEMPO, beatPhases, timingTable, timingProblems, lengthProblems } = require('../lib/timing');

const expected = (...parts) => require(path.join(EXAMPLES, 'expected', 'example-desk', ...parts));
// The example promo's film context: what the timing table reads.
const promo = () => ({
  beats: expected('reminders', 'promo', 'beats.json'),
  mods: expected('reminders', 'promo', 'mods.json'),
  screens: expected('reminders', 'screens.json').screens,
});

test('timing: every scene starts where the one before ends, in the Motion type\'s ids, and the film runs their sum', () => {
  const silent = { ...promo(), mods: { ...promo().mods, sound: 'silent' } };
  const table = timingTable(silent);
  assert.equal(table.fps, 60);
  assert.equal(table.length, 35.2);
  assert.equal(table.tempo, null);
  assert.deepEqual(table.scenes.map((s) => [s.id, s.motion, s.start, s.dur]), [
    ['S-01', 's-01', 0, 3], ['S-02', 's-02', 3, 11.1], ['S-03', 's-03', 14.1, 5.2], ['S-04', 's-04', 19.3, 12.9], ['S-05', 's-05', 32.2, 3],
  ]);
});

test("timing: the camera glides at its pacing's speed, and a beat that glides lasts at least twice its glide", () => {
  assert.deepEqual(GLIDE, { standard: 0.8, calm: 1, brisk: 0.5 });
  // The mods form says what each pacing glides, so the user picks the speed knowingly.
  const pacing = require('../catalog/mods.json').mods.find((m) => m.id === 'pacing');
  for (const o of pacing.options) assert.ok(o.preview.includes('the camera glides ' + GLIDE[o.id] + ' s between shots'), o.id);
  const at = (pacing, transitions = 'glide') => timingTable({ ...promo(), mods: { ...promo().mods, pacing, transitions, sound: 'silent' } });
  const moves = (table) => table.scenes[1].beats.map((b) => [b.dur, b.move]);
  // The story gives S-02 beats of 3, 1.4, 1.2, 3 and 1.2 s; the third acts on the second's target, so the camera stays.
  // The fifth opens the Send reminder dialog, so it also runs long enough for the dialog to open (D39).
  assert.deepEqual(moves(at('brisk')), [[3, [0, 0.5]], [1.4, [0, 0.5]], [1.2, null], [3, [0, 0.5]], [2, [0, 0.5]]]);
  assert.deepEqual(moves(at('standard')), [[3, [0, 0.8]], [1.6, [0, 0.8]], [1.2, null], [3, [0, 0.8]], [2.3, [0, 0.8]]]);
  assert.deepEqual(moves(at('calm')), [[3, [0, 1]], [2, [0, 1]], [1.2, null], [3, [0, 1]], [2.5, [0, 1]]]);
  assert.deepEqual([at('brisk').length, at('standard').length, at('calm').length], [33.6, 35.2, 36.8]);
  // A cut lands at once: it lengthens only a click that opens a layer, so the layer has time to open.
  assert.equal(at('standard', 'cut').length, 32.6);
});

test('timing: a film with a score cuts on its beat: every scene but the last lasts whole beats of the tempo its pacing sets', () => {
  const table = timingTable(promo());
  assert.deepEqual(table.tempo, { bpm: TEMPO.standard, t0: 0 });
  // At 100 beats a minute a beat is 0.6 s: S-02's 11.1 s ends on the next beat, and the time goes to its last beat.
  assert.deepEqual(table.scenes.map((s) => [s.id, s.start, s.dur]), [
    ['S-01', 0, 3], ['S-02', 3, 11.4], ['S-03', 14.4, 5.4], ['S-04', 19.8, 13.2], ['S-05', 33, 3],
  ]);
  assert.equal(table.length, 36);
  assert.equal(table.scenes[1].beats.at(-1).dur, 2.6);
  const beat = 60 / TEMPO.standard;
  assert.ok(table.scenes.every((s) => Math.abs(s.start / beat - Math.round(s.start / beat)) < 1e-6), JSON.stringify(table.scenes.map((s) => s.start)));
  // A calm film's beats are longer; its starts stay on its own grid, to the millisecond.
  const calm = timingTable({ ...promo(), mods: { ...promo().mods, pacing: 'calm' } });
  assert.equal(calm.tempo.bpm, TEMPO.calm);
  assert.ok(calm.scenes.every((s) => Math.abs(s.start * TEMPO.calm / 60 - Math.round(s.start * TEMPO.calm / 60)) < 0.002));
  // Ending each scene on the beat can take a story inside its format past it: the film's length is checked again.
  assert.deepEqual(lengthProblems({ length: 60.6 }, { label: 'Promo', seconds: { min: 30, max: 60 } }), [
    'the film runs 60.6 s once each scene starts on its beat; a promo runs at most 60 s',
  ]);
  assert.deepEqual(lengthProblems({ length: 60 }, { label: 'Promo', seconds: { min: 30, max: 60 } }), []);
  assert.deepEqual(lengthProblems({ length: 400 }, { label: 'Walkthrough', seconds: null }), []);
  // The last scene keeps its own length, so an end card of 2 s holds 2 s, not the beat's 2.4.
  const story = promo();
  const short = { ...story, beats: { ...story.beats, scenes: story.beats.scenes.map((s, i, all) => (i === all.length - 1 ? { ...s, ms: 2000 } : s)) } };
  const ended = timingTable(short);
  assert.deepEqual([ended.scenes.at(-1).start, ended.scenes.at(-1).dur, ended.length], [33, 2, 35]);
});

test('timing: each screen scene opens on the whole window, and a new target moves the camera', () => {
  const [, s2, s3, s4] = timingTable(promo()).scenes;
  // Beat 3 clicks the reminder that beat 2 points at, so the camera holds; every other beat names a new target.
  assert.deepEqual(s2.beats.map((b) => b.move !== null), [true, true, false, true, true]);
  // Each scene's first beat moves in from the whole window; S-04's third beat holds on the list its tab click showed, a
  // new target, so the camera moves to it.
  assert.deepEqual([s3.beats[0].move !== null, s4.beats[0].move !== null, s4.beats[2].move !== null], [true, true, true]);
});

test('timing: a beat moves first, acts once the camera has landed, and its caption is gone before the beat ends', () => {
  for (const scene of timingTable(promo()).scenes.filter((s) => s.kind === 'screen')) {
    for (const b of scene.beats) {
      const landed = b.move ? b.move[1] : 0;
      if (b.move) assert.ok(b.move[0] === 0 && b.move[1] <= b.dur, `${b.hook} moves inside its beat`);
      if (b.do === 'hold') assert.equal(b.act, null, `${b.hook} holds`);
      else assert.ok(b.act >= landed && b.act < b.dur, `${b.hook} acts after landing`);
      if (b.caption) {
        assert.ok(b.caption[0] >= landed && b.caption[0] < b.caption[1], `${b.hook} shows its caption after landing`);
        assert.ok(b.caption[1] <= b.dur - PACE.captionExit + 1e-9, `${b.hook} drops its caption before the next move`);
      }
    }
  }
});

test('timing: a click names the layer it opens or the tab it selects, and a typed beat its typing span', () => {
  const [, s2, s3, s4] = timingTable(promo()).scenes;
  assert.deepEqual(s2.beats[2].opens, { kind: 'drawer', action: 'Details' });
  assert.deepEqual(s2.beats[4].opens, { kind: 'dialog', action: 'Send reminder' });
  assert.equal(s4.beats[1].tab, 'Sent');
  assert.deepEqual(s4.beats[3].opens, { kind: 'drawer', action: 'Notifications' });
  const typed = s3.beats[0];
  assert.deepEqual(typed.typing, [typed.act, Math.round((typed.act + 'Follow up by phone on Thursday.'.length / PACE.cps) * 1000) / 1000]);
  assert.ok(typed.typing[1] <= typed.dur, 'the note is typed inside its beat');
});

test('timing: whether two beats share a target can come from the screens, where one element carries both hooks', () => {
  // In S-04 the click on the Sent tab and the hold on what it shows have the same words but not the same element.
  const together = (a, b, hookA, hookB) => [['S-02.2', 'S-02.3']].some((pair) => pair.includes(hookA) && pair.includes(hookB));
  const [, s2, , s4] = timingTable(promo(), together).scenes;
  assert.deepEqual(s2.beats.map((b) => b.move !== null), [true, true, false, true, true]);
  assert.notEqual(s4.beats[4].move, null);
});

test('timing: a cut lands at once, and a beat with nothing to move to holds the last shot', () => {
  const glide = beatPhases({ do: 'click', ms: 1200 }, true, false);
  const cut = beatPhases({ do: 'click', ms: 1200 }, true, true);
  assert.ok(glide.move[1] > glide.move[0]);
  assert.equal(cut.move[1], cut.move[0]);
  assert.equal(beatPhases({ do: 'hold', ms: 3000 }, false, false).move, null);
});

test('timing: the Motion type takes at most 24 scenes and 300 s, and no scene under a second', () => {
  const scene = (i, dur) => ({ id: `S-${String(i).padStart(2, '0')}`, dur });
  assert.deepEqual(timingProblems({ length: 30, scenes: [scene(1, 3)] }), []);
  const many = { length: 75, scenes: Array.from({ length: 25 }, (_, i) => scene(i + 1, 3)) };
  assert.deepEqual(timingProblems(many), ['the film has 25 scenes; a Motion film takes at most 24']);
  assert.deepEqual(timingProblems({ length: 300.5, scenes: [scene(1, 300.5)] }), ['the film runs 300.5 s; a Motion film runs at most 300 s']);
  assert.deepEqual(timingProblems({ length: 0.8, scenes: [scene(1, 0.8)] }), ['S-01 runs 0.8 s; a Motion scene runs at least 1 s']);
});

test('timing: typing ends before its beat does, and a scroll waits until the kit plays one', () => {
  const beats = [
    { hook: 'S-01.1', do: 'type', dur: 2, typing: [0.85, 4.532] },
    { hook: 'S-01.2', do: 'type', dur: 3, typing: [0.85, 2.7] },
    { hook: 'S-01.3', do: 'scroll', dur: 2 },
  ];
  assert.deepEqual(timingProblems({ length: 7, scenes: [{ id: 'S-01', dur: 7, beats }] }), [
    'S-01.1 types until 4.532 s into a 2 s beat; make it at least 4900 ms, or its text shorter',
    'S-01.3 scrolls, which a film does not play yet; hold on what the scroll shows instead',
  ]);
});

test('timing: a click that opens a layer acts early enough for the layer to open and hold before the beat ends', () => {
  // As the kit draws it: a layer shows 0.1 s after the click and opens over 0.25 s.
  assert.equal(PACE.open, 0.35);
  for (const pacing of ['brisk', 'standard', 'calm']) {
    const table = timingTable({ ...promo(), mods: { ...promo().mods, pacing } });
    const opening = table.scenes.flatMap((s) => s.beats || []).filter((b) => b.do === 'click' && b.opens && LAYERS.includes(b.opens.kind));
    assert.deepEqual(opening.map((b) => b.hook), ['S-02.3', 'S-02.5', 'S-04.4'], pacing);
    for (const b of opening) {
      assert.ok(b.dur - b.act >= PACE.open + PACE.tail - 1e-9, `${pacing} ${b.hook} acts at ${b.act} s of ${b.dur} s`);
      // The time is added to the beat, not taken from the cursor: it still settles and travels before the click.
      if (b.move) assert.ok(b.act - b.move[1] >= PACE.settle + PACE.travel - 1e-9, `${pacing} ${b.hook} leaves the cursor ${b.act - b.move[1]} s`);
    }
  }
});
