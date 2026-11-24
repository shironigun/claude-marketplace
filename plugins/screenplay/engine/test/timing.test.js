'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { EXAMPLES } = require('./helpers');
const { PACE, beatPhases, timingTable, timingProblems } = require('../lib/timing');

const expected = (...parts) => require(path.join(EXAMPLES, 'expected', 'example-desk', ...parts));
// The example promo's film context: what the timing table reads.
const promo = () => ({
  beats: expected('reminders', 'promo', 'beats.json'),
  mods: expected('reminders', 'promo', 'mods.json'),
  screens: expected('reminders', 'screens.json').screens,
});

test('timing: every scene starts where the one before ends, in the Motion type\'s ids, and the film runs their sum', () => {
  const table = timingTable(promo());
  assert.equal(table.fps, 60);
  assert.equal(table.length, 32);
  assert.deepEqual(table.scenes.map((s) => [s.id, s.motion, s.start, s.dur]), [
    ['S-01', 's-01', 0, 3], ['S-02', 's-02', 3, 9.8], ['S-03', 's-03', 12.8, 4.8], ['S-04', 's-04', 17.6, 11.4], ['S-05', 's-05', 29, 3],
  ]);
});

test('timing: each screen scene opens on the whole window, and a new target moves the camera', () => {
  const [, s2, s3, s4] = timingTable(promo()).scenes;
  // Beat 3 clicks the reminder that beat 2 points at, so the camera holds; every other beat names a new target.
  assert.deepEqual(s2.beats.map((b) => b.move !== null), [true, true, false, true, true]);
  // Each scene's first beat moves in from the whole window; S-04's last beat holds on the tab its click selected.
  assert.deepEqual([s3.beats[0].move !== null, s4.beats[0].move !== null, s4.beats[4].move], [true, true, null]);
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
  assert.equal(s4.beats[3].tab, 'Sent');
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
