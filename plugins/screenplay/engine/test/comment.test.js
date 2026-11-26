'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAnchor, momentAt, pickAt, anchorCrop } = require('../lib/comment');

test('comment: an anchor in each spelling a reviewer\'s comment carries, in seconds and stage pixels', () => {
  assert.deepEqual(parseAnchor('Location: 0:12\nAnchor detail: at 12.4 s, the point at x 42.29% y 40.74% of the frame'), { t: 12.4, x: 812, y: 440 });
  assert.deepEqual(parseAnchor('Anchor detail: at 3 s, the box at x 10% y 20% of the frame, 50% wide and 25% high'), { t: 3, x: 192, y: 216, w: 960, h: 270 });
  assert.deepEqual(parseAnchor('Location: 0:02 to 0:05\nAnchor detail: from 2.1 s to 5.4 s of the film'), { t: 2.1, to: 5.4 });
  assert.deepEqual(parseAnchor('Element path: animation-v1:nth-of-type(1) > at-12400ms:nth-of-type(1) > x4229-y4074:nth-of-type(1)'), { t: 12.4, x: 812, y: 440 });
  assert.deepEqual(parseAnchor('Element path: animation-v1 > at-12400ms > x4229-y4074 > w1146-h0833'), { t: 12.4, x: 812, y: 440, w: 220, h: 90 });
  assert.deepEqual(parseAnchor('Element path: animation-v1 > at-2100ms > to-5400ms'), { t: 2.1, to: 5.4 });
  assert.equal(parseAnchor('Location: 0:12'), null);
});

test('comment: the scene, beat and moment at a time, and the element at a point of the frame', () => {
  const film = {
    order: ['S-01', 'S-02'],
    scenes: {
      'S-01': { kind: 'title', start: 0, dur: 3 },
      'S-02': { kind: 'screen', start: 3, dur: 6, beats: [
        { hook: 'S-02.1', do: 'hold', target: 'the Open queue', start: 0, dur: 3, move: [0, 0.6], act: null, caption: [0.7, 2.8], label: 'Open', value: 'soonest due first' },
        { hook: 'S-02.2', do: 'click', target: 'Send reminder', start: 3, dur: 3, move: null, act: 1.1, caption: null },
      ] },
    },
  };
  assert.deepEqual(momentAt(film, 1), { scene: 'S-01', kind: 'title', beat: null });
  assert.deepEqual(momentAt(film, 3.3), { scene: 'S-02', kind: 'screen', moment: 'move', beat: { hook: 'S-02.1', do: 'hold', target: 'the Open queue', caption: 'Open: soonest due first' } });
  assert.equal(momentAt(film, 4.5).moment, 'caption');
  assert.equal(momentAt(film, 5.9).moment, 'hold');
  assert.deepEqual(momentAt(film, 7.2), { scene: 'S-02', kind: 'screen', moment: 'act', beat: { hook: 'S-02.2', do: 'click', target: 'Send reminder' } });
  assert.equal(momentAt(film, 9).scene, 'S-02');
  const m = {
    hooks: [
      { hook: 'S-02.1', x: 100, y: 100, w: 800, h: 300, shown: true },
      { hook: 'S-02.2', x: 600, y: 300, w: 120, h: 40, shown: true },
      { hook: 'S-02.3', x: 600, y: 300, w: 120, h: 40, shown: true },
      { hook: 'S-02.4', x: 0, y: 0, w: 1920, h: 1080, shown: false },
    ],
    callouts: [{ kind: 'chip', x: 1000, y: 500, w: 300, h: 60, shown: true }, { kind: 'leader', x: 0, y: 0, w: 1920, h: 1080, shown: true }],
  };
  assert.deepEqual(pickAt(m, 650, 320), { kind: 'target', hooks: ['S-02.2', 'S-02.3'], box: { x: 600, y: 300, w: 120, h: 40 } });
  assert.deepEqual(pickAt(m, 200, 150).hooks, ['S-02.1']);
  assert.deepEqual(pickAt(m, 1100, 520), { kind: 'chip', box: { x: 1000, y: 500, w: 300, h: 60 } });
  assert.equal(pickAt(m, 1800, 1000), null);
});

test('comment: the crop round an anchor stays inside the stage, a box at its edge included', () => {
  assert.deepEqual(anchorCrop({ t: 1, x: 1500.5, y: 100, w: 419.5, h: 200 }), { x: 1501, y: 100, w: 419, h: 200 });
  assert.deepEqual(anchorCrop({ t: 1, x: -4, y: 1070, w: 30, h: 40 }), { x: 0, y: 1070, w: 30, h: 10 });
  assert.deepEqual(anchorCrop({ t: 1, x: 1900, y: 20 }), { x: 1280, y: 0, w: 640, h: 360 });
});
