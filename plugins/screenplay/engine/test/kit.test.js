'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { kitBundle, kitCss, kitSandbox: kit } = require('../lib/kit');
const FLOATING = { x: 240, y: 90, s: 1 };
// A value the kit made, as plain JSON: its objects come from the sandbox's own Object.
const plain = (v) => JSON.parse(JSON.stringify(v));

test('kit: one script that defines the film\'s W with the kit, and CSS that keeps the window\'s layers inside it', () => {
  const SP = kit();
  for (const name of ['scene', 'screen', 'card', 'world', 'shotFor', 'pose', 'layerTimes', 'measureAt']) assert.equal(typeof SP[name], 'function', name);
  assert.match(kitCss(), /\.sp-window \{[^}]*contain: layout paint/);
  // Every surface is window-sized, as the app's viewport is to its root and its portals, each layer above the page.
  assert.match(kitCss(), /\.sp-surface \{ position: absolute; inset: 0; z-index: 1; \}\r?\n\.sp-surface\[data-kind=page\] \{ z-index: 0; \}/);
  // In an early layer, the kit's important rules outrank any the screen's CSS has: nothing animates by the clock, and
  // what the kit hides stays hidden.
  const layer = /@layer sp-kit \{([\s\S]*?)\n\}/.exec(kitCss())[1];
  assert.match(layer, /\.sp-window \*[^{]*\{ transition: none !important; animation: none !important;/);
  assert.match(layer, /\.sp-window \[data-sp-hide\] \{ visibility: hidden !important; opacity: 0 !important; \}/);
  assert.match(layer, /\.sp-window \[data-sp-off\] \{ display: none !important; \}/);
});

test('kit camera: a shot frames its target with room, zooms a small one close, and keeps the frame in the window', () => {
  const SP = kit();
  assert.deepEqual(plain(SP.shotFor(null, FLOATING)), { cx: 960, cy: 540, z: 1 });
  assert.deepEqual(plain(SP.shotFor({ x: 0, y: 0, w: 1440, h: 900 }, FLOATING)), { cx: 960, cy: 540, z: 1 });
  const button = SP.shotFor({ x: 600, y: 400, w: 120, h: 40 }, FLOATING);
  assert.equal(button.z, 2.4);
  assert.deepEqual([button.cx, button.cy], [240 + 660, 90 + 420]);
  // A box in the window's corner: the frame may show the safe margin and the card's padding past the window's edge.
  const corner = SP.shotFor({ x: 4, y: 4, w: 100, h: 30 }, FLOATING);
  assert.deepEqual([corner.cx, corner.cy].map((v) => Math.round(v * 1000) / 1000), [618.333, 293.333]);
  // Whatever the box and the look, its shot keeps it and its lifted card's 12 px inside the safe area (film rule 8): a
  // table nearly the window's width, a button in its corner, a header the full width of a full-bleed window.
  const boxes = [{ x: 600, y: 400, w: 120, h: 40 }, { x: 4, y: 4, w: 100, h: 30 }, { x: 24, y: 120, w: 1232, h: 126 }, { x: 1300, y: 0, w: 140, h: 900 }, { x: 1330, y: 860, w: 106, h: 36 }, { x: 0, y: 0, w: 1440, h: 60 }, { x: 0, y: 150, w: 1440, h: 140 }];
  for (const look of [FLOATING, { x: 0, y: 0, s: 4 / 3 }]) {
    for (const b of boxes) {
      const shot = SP.shotFor(b, look);
      const a = SP.project(shot, look.x + b.x * look.s, look.y + b.y * look.s);
      const k = look.s * shot.z;
      const inSafe = a.x - 12 >= 39.5 && a.y - 12 >= 39.5 && a.x + b.w * k + 12 <= 1880.5 && a.y + b.h * k + 12 <= 1040.5;
      assert.ok(inSafe, JSON.stringify({ look, b, shot: plain(shot), a: plain(a) }));
    }
  }
  // A narrow box on the right edge (a drawer) sits right of centre, leaving the left free for its caption.
  const drawer = SP.shotFor({ x: 1300, y: 200, w: 140, h: 300 }, FLOATING);
  assert.ok(drawer.cx < 240 + 1370, 'the frame moves left of the drawer');
  // Every shot puts its centre on the frame's centre, and the world's transform (from its top-left corner, as
  // .sp-world's transform-origin sets it) takes any point where project puts it, so cards, chips and cursor agree.
  for (const shot of [SP.wide(), button, corner]) {
    assert.deepEqual(plain(SP.project(shot, shot.cx, shot.cy)), { x: 960, y: 540 });
    const [tx, ty, z] = /^translate\((.+)px, (.+)px\) scale\((.+)\)$/.exec(SP.transform(shot)).slice(1).map(Number);
    const p = SP.project(shot, 300, 200);
    assert.ok(Math.abs(tx + z * 300 - p.x) < 1e-9 && Math.abs(ty + z * 200 - p.y) < 1e-9, SP.transform(shot));
  }
});

test('kit camera: holds are still, a move eases between shots, and a long move draws back on its way', () => {
  const SP = kit();
  const a = { cx: 500, cy: 400, z: 2.4 };
  const b = { cx: 1500, cy: 900, z: 2.4 };
  const cam = SP.cameraKeys([{ start: 1, move: [0, 0.6] }, { start: 3, move: null }], [a, a], SP.wide());
  assert.equal(cam.keys.length, 1);
  assert.deepEqual(plain(SP.pose(cam, 0.5)), plain(SP.wide()));
  assert.deepEqual(plain(SP.pose(cam, 1.6)), a);
  assert.deepEqual(plain(SP.pose(cam, 2.9)), plain(SP.pose(cam, 4)));
  const long = SP.cameraKeys([{ start: 0, move: [0, 1] }], [b], a);
  const mid = SP.pose(long, 0.5);
  assert.ok(mid.z < 2.4 && mid.z >= 1, `the move draws back, z ${mid.z}`);
  assert.deepEqual([mid.cx, mid.cy], [1000, 650]);
});

test('kit callouts: a chip sits in clear space inside the safe area, and its leader ends on the target\'s edge', () => {
  const SP = kit();
  const chip = { w: 300, h: 60 };
  const mid = { x: 700, y: 400, w: 200, h: 80 };
  const right = plain(SP.chipSpot(mid, chip));
  assert.deepEqual(right, { side: 'right', x: 944, y: 410 });
  assert.deepEqual(plain(SP.leader(mid, right, chip)), { x1: 944, y1: 440, x2: 900, y2: 440 });
  // Against the frame's right edge it goes left; a wide target near the bottom gets it above.
  assert.equal(SP.chipSpot({ x: 1500, y: 400, w: 380, h: 80 }, chip).side, 'left');
  const wide = SP.chipSpot({ x: 40, y: 760, w: 1840, h: 200 }, chip);
  assert.equal(wide.side, 'above');
  assert.ok(wide.y >= 40 && wide.x >= 40 && wide.x + chip.w <= 1880, 'inside the safe area');
  // Each callout comes in, holds, and is gone by the end of its caption window.
  assert.deepEqual([0.9, 1, 1.5, 2.8].map((t) => Math.round(SP.envelope(t, [0.9, 2.8]) * 1000) / 1000), [0, 0.5, 1, 0]);
  const film = { order: ['S-01', 'S-02'], scenes: { 'S-01': { kind: 'title' }, 'S-02': { beats: [{ label: 'A' }, {}, { label: 'B' }] } } };
  assert.deepEqual([SP.stepOf(film, 'S-02', 0), SP.stepOf(film, 'S-02', 2)], [1, 2]);
});

test('kit pointer and typing: the cursor comes in and rests on each target; words appear on pace; beats on one target add up', () => {
  const SP = kit();
  const keys = [{ t0: 1, t1: 1.6, at: { x: 500, y: 400 } }, { t0: 3, t1: 3.6, at: { x: 900, y: 600 } }];
  assert.equal(SP.cursorAt(keys, 0.5), null);
  const start = plain(SP.cursorAt(keys, 1));
  assert.deepEqual(start, { x: 640, y: 510, alpha: 0 });
  assert.deepEqual(plain(SP.cursorAt(keys, 2)), { x: 500, y: 400, alpha: 1 });
  assert.deepEqual(plain(SP.cursorAt(keys, 9)), { x: 900, y: 600, alpha: 1 });
  assert.equal(SP.typed('Follow up', [1, 2], 0.5), '');
  assert.equal(SP.typed('Follow up', [1, 2], 1.5), 'Foll');
  assert.equal(SP.typed('Follow up', [1, 2], 5), 'Follow up');
  // A point and then a click on one row: its looks come from both beats, so the point's hover is not lost.
  const point = { start: 0, act: 0.5, dur: 2, do: 'point' };
  const click = { start: 2, act: 0.9, dur: 2, do: 'click' };
  assert.deepEqual(plain(SP.statesAt([point, click], 1, true)), { hover: true, press: false });
  assert.deepEqual(plain(SP.statesAt([point, click], 2.95, true)), { hover: true, press: true });
  assert.deepEqual(plain(SP.statesAt([point, click], 1, false)), { hover: false, press: false });
  // Two typings into one field: what the screen drew until the first starts, then the latest that has started.
  const first = { start: 0, typing: [0.5, 1.5], text: 'Hi' };
  const second = { start: 3, typing: [0.5, 1.5], text: 'Bye' };
  assert.deepEqual([0.2, 1, 2, 4].map((t) => SP.fieldAt([first, second], t)), [null, 'H', 'Hi', 'B']);
});

test('kit patterns: a sweep crosses the columns over its window, and a timeline builds one event at a time', () => {
  const SP = kit();
  assert.deepEqual([0.5, 1, 1.9, 2.6, 4, 5].map((t) => SP.sweepAt(4, [1, 5], t)), [-1, 0, 0, 1, 3, -1]);
  // A timeline spreads its events over its window, so even a long history is whole by the window's end.
  assert.deepEqual([0.9, 1, 2, 3, 9].map((t) => SP.builtAt(3, [1, 4], t)), [0, 1, 2, 3, 3]);
  assert.deepEqual([SP.builtAt(40, [1, 3], 2.99), SP.builtAt(3, [2, 2], 2)], [40, 3]);
  // On stand-in nodes: the beat a pattern acts on is kept, so no callout lifts it; a row that has popped in and the
  // events a timeline has built show the screen's own inline look again, and the timeline is whole by its window's end.
  const beats = [{ start: 0, dur: 2, move: [0, 0.6], act: null }, { start: 2, dur: 3, move: [0, 0.6], act: null, caption: [0.7, 2.8] }];
  const node = (more) => ({ matches: () => true, closest: () => null, style: { opacity: '', translate: '', scale: '', visibility: '' }, ...more });
  const row = node();
  const w = { targets: [{ node: null }, { node: row }] };
  const pop = SP.patterns(null, null, { pattern: 'row-pop-in', beats }, w);
  assert.equal(w.patternBeat, 1);
  pop(2.7);
  assert.notEqual(row.style.opacity, '');
  pop(4);
  assert.deepEqual([row.style.opacity, row.style.translate, row.style.scale], ['', '', '']);
  const events = [node(), node(), node()];
  const build = SP.patterns(null, null, { pattern: 'timeline-build', beats }, { targets: [{ node: null }, { node: node({ querySelectorAll: () => events }) }] });
  build(3);
  assert.deepEqual(events.map((e) => e.style.visibility), ['', 'hidden', 'hidden']);
  build(4.79);
  assert.deepEqual(events.map((e) => e.style.visibility), ['', '', '']);
});

test('kit score: every sound sits on its frame of the timing table, and the groove plays under the screens', () => {
  const SP = kit();
  const film = {
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
  const c = plain(SP.cues(film));
  assert.deepEqual([c.ring, c.hit, c.end, c.groove], [0.15, 0.8, 9.15, [3, 9]]);
  assert.deepEqual(c.clicks, [6.9]);
  assert.deepEqual(c.pops, [3.7]);
  // Each tick sits on the frame its character lands on, so the last one falls as the typing ends.
  assert.deepEqual(c.ticks.map((t) => Math.round(t * 100) / 100), [7.5, 7.55, 7.6]);
  // A calm reveal rings as its logo comes in and hits as its title lands, on the card's own times.
  const calm = plain(SP.cues({ ...film, mods: { intro: 'calm-reveal' } }));
  assert.deepEqual([calm.ring, calm.hit], [SP.INTROS['calm-reveal'].logo[0], SP.INTROS['calm-reveal'].words]);
  // The score asks the player's score builder only for what it has, and for what the timing table gives.
  const API = ['tempo', 'beat', 'program', 'note', 'chord', 'drum', 'fx', 'ticks', 'master'];
  const calls = [];
  const sounds = [];
  const vels = [];
  const S = new Proxy({}, {
    get: (_, name) => {
      assert.ok(API.includes(name), `the score builder has no ${String(name)}`);
      return (...args) => {
        calls.push(name);
        const opts = args[args.length - 1];
        if (['chord', 'note', 'drum'].includes(name)) sounds.push(opts);
        if (opts && opts.vel !== undefined) vels.push(opts.vel);
        return name === 'beat' ? args[0] * 0.6 : S;
      };
    },
  });
  const tempo = [];
  SP.score(new Proxy(S, { get: (t, name) => (name === 'tempo' ? (...args) => { tempo.push(args); return S; } : t[name]) }), {}, { json: () => film });
  // The tempo and its grid come from the timing table, which cut the scenes on the same beat.
  assert.deepEqual(plain(tempo), [[100, { t0: 0 }]]);
  calls.push('tempo');
  assert.ok(['tempo', 'program', 'chord', 'note', 'drum', 'fx', 'ticks', 'master'].every((n) => calls.includes(n)), calls.join());
  // The groove stops with the screens: nothing of it sounds on under the end card's chord.
  const groove = sounds.filter((o) => o.t >= c.groove[0] && o.t < c.end);
  assert.ok(groove.length > 0 && groove.every((o) => o.t + (o.dur || 0) <= c.groove[1] + 1e-9), JSON.stringify(groove));
  // Every velocity is on the player's own scale, where its sound reference plays a soft pad at 30, never a fraction of 1.
  assert.ok(vels.length > 0 && vels.every((v) => v >= 1 && v <= 127), vels.join());
});

test('kit world: a layer shows when its click lands, a named layer from its beat, and a tab state from its click', () => {
  const SP = kit();
  const sc = {
    surfaces: [{ kind: 'page' }, { kind: 'drawer', action: 'Details' }, { kind: 'toast', action: 'Sent' }, { kind: 'dialog', action: 'Send' }],
    beats: [
      { start: 0, do: 'click', act: 0.85, opens: { kind: 'drawer', action: 'Details' } },
      { start: 1.2, do: 'hold', act: null, opens: { kind: 'toast', action: 'Sent' } },
      { start: 4.2, do: 'click', act: 0.9, tab: 'Sent' },
    ],
  };
  assert.deepEqual(SP.layerTimes(sc).map((t) => Math.round(t * 100) / 100), [0, 0.95, 1.2, 0]);
  const switches = SP.tabSwitches(sc);
  assert.deepEqual(switches.map((s) => s.label), ['Sent']);
  assert.equal(SP.tabAt(switches, ['Open', 'Sent'], 5), null);
  assert.equal(SP.tabAt(switches, ['Open', 'Sent'], 5.3), 'Sent');
  assert.equal(SP.tabAt(switches, ['Details', 'History'], 9), null);
  // A beat's target is measured in the state its act sees: the tab it clicks is still in the strip shown before its
  // click, and the beat after sees the tab its click selected.
  assert.equal(SP.tabAt(switches, ['Open', 'Sent'], SP.measureAt(sc.beats[2])), null);
  assert.equal(SP.tabAt(switches, ['Open', 'Sent'], SP.measureAt({ start: 6.4, do: 'hold', act: null })), 'Sent');
});

test('kit camera: a beat that opens a layer frames its target and the layer together, so the layer opens in frame', () => {
  const SP = kit();
  const sc = {
    surfaces: [{ kind: 'page' }, { kind: 'drawer', action: 'Details' }, { kind: 'dialog', action: 'Send' }],
    beats: [{ start: 0, do: 'click', act: 1, opens: { kind: 'dialog', action: 'Send' } }, { start: 2, do: 'hold', act: null }],
  };
  assert.equal(SP.openedSurface(sc, sc.beats[0]), 2);
  assert.equal(SP.openedSurface(sc, sc.beats[1]), -1);
  // A button at the window's bottom right opens a dialog in its middle: the shot frames both.
  const button = { x: 1300, y: 860, w: 120, h: 36 };
  const dialog = { x: 470, y: 300, w: 500, h: 240 };
  assert.deepEqual(plain(SP.shotBox(button, null)), button);
  const box = plain(SP.shotBox(button, dialog));
  assert.deepEqual(box, { x: 470, y: 300, w: 950, h: 596 });
  const shot = SP.shotFor(box, FLOATING);
  for (const [x, y] of [[470, 300], [970, 540], [1300, 860], [1420, 896]]) {
    const p = SP.project(shot, FLOATING.x + x * FLOATING.s, FLOATING.y + y * FLOATING.s);
    assert.ok(p.x >= 0 && p.x <= SP.STAGE.w && p.y >= 0 && p.y <= SP.STAGE.h, `${x},${y} lands at ${p.x},${p.y}`);
  }
  // A click on the target the beat before pointed at keeps that beat's shot, so the layer joins that shot instead.
  const row = { x: 100, y: 200, w: 900, h: 30 };
  const drawer = { x: 1060, y: 0, w: 380, h: 900 };
  const beats = [{ move: [0, 0.8] }, { move: [0, 0.8] }, { move: null }];
  assert.deepEqual(plain(SP.shotBoxes(beats, [button, row, row], [null, null, drawer])), [button, { x: 100, y: 0, w: 1340, h: 900 }, row]);
  assert.deepEqual(plain(SP.shotBoxes(beats, [button, row, row], [null, null, null])), [button, row, row]);
  // The button alone gets a close-up that leaves the dialog's middle out of frame: the flaw this fixes.
  const alone = SP.shotFor(button, FLOATING);
  const middle = SP.project(alone, FLOATING.x + 720 * FLOATING.s, FLOATING.y + 420 * FLOATING.s);
  assert.ok(middle.x < 0 || middle.y < 0, `the dialog's middle lands at ${middle.x},${middle.y} in the button's close-up`);
});

test('kit world: a layer opens on the engine\'s timing, a toast leaves after its beat, and a shot with no target frames its layer', () => {
  const SP = kit();
  const { PACE } = require('../lib/timing');
  assert.deepEqual([SP.LAYER.show, SP.LAYER.show + SP.LAYER.open], [PACE.show, PACE.open]);
  const sc = {
    surfaces: [{ kind: 'page' }, { kind: 'toast', action: 'Sent' }, { kind: 'drawer', action: 'Details' }, { kind: 'toast', action: 'Saved' }],
    beats: [
      { start: 0, dur: 3, do: 'hold', act: null, opens: { kind: 'toast', action: 'Sent' } },
      { start: 3, dur: 2, do: 'click', act: 1, opens: { kind: 'drawer', action: 'Details' } },
    ],
  };
  // The toast its beat shows leaves at that beat's end; one left from an earlier scene, after the first beat; a drawer
  // stays.
  assert.deepEqual(SP.layerEnds(sc).map((v) => (v === Infinity ? 'stays' : v)), ['stays', 3, 'stays', 3]);
  const layer = { x: 100, y: 100, w: 400, h: 200 };
  assert.deepEqual(plain(SP.shotBoxes([{ move: [0, 0.8] }], [null], [layer])), [layer]);
});
