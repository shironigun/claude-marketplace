'use strict';

// A reviewer's comment on a Motion film carries its pin (the Motion type's later.md), in one of two spellings:
//   "Anchor detail: at 12.4 s, the point at x 42.29% y 40.74% of the frame" (a box adds its width and height), or
//   "Anchor detail: from 2.1 s to 5.4 s of the film" for a stretch of the timeline; or, with neither,
//   "Element path: animation-v1 > at-12400ms > x4229-y4074 [> w1146-h0833]" (or "> to-5400ms"), in milliseconds and
//   ten-thousandths of the frame.
// The frame is the 1920 by 1080 stage.
const STAGE = { w: 1920, h: 1080 };
const num = '(\\d+(?:\\.\\d+)?)';
const px = (v, of) => Math.round((Number(v) / 100) * of * 10) / 10;

// The anchor as { t, to?, x?, y?, w?, h? }, in seconds and stage pixels, or null when the text holds none.
function parseAnchor(text) {
  const s = String(text);
  const stretch = new RegExp(`from ${num} s to ${num} s`).exec(s);
  if (stretch) return { t: Number(stretch[1]), to: Number(stretch[2]) };
  const at = new RegExp(`at ${num} s`).exec(s);
  if (at) {
    // The percentages after the time, in order: the point (a box's top-left corner), then a box's width and height.
    const out = { t: Number(at[1]) };
    const [x, y, w, h] = [...s.slice(at.index).matchAll(new RegExp(`${num}%`, 'g'))].map((m) => m[1]);
    if (y !== undefined) Object.assign(out, { x: px(x, STAGE.w), y: px(y, STAGE.h) });
    if (h !== undefined) Object.assign(out, { w: px(w, STAGE.w), h: px(h, STAGE.h) });
    return out;
  }
  const path = /at-(\d+)ms/.exec(s);
  if (path) {
    const out = { t: Number(path[1]) / 1000 };
    const to = /to-(\d+)ms/.exec(s);
    if (to) out.to = Number(to[1]) / 1000;
    const xy = /x(\d+)-y(\d+)/.exec(s);
    if (xy) Object.assign(out, { x: px(Number(xy[1]) / 100, STAGE.w), y: px(Number(xy[2]) / 100, STAGE.h) });
    const wh = /w(\d+)-h(\d+)/.exec(s);
    if (wh) Object.assign(out, { w: px(Number(wh[1]) / 100, STAGE.w), h: px(Number(wh[2]) / 100, STAGE.h) });
    return out;
  }
  return null;
}

// What the film shows at t, from its timing table (film.json): the scene, and on a screen the beat, with what the
// moment is in the beat: the camera's move, its caption, the moment it acts, or the shot it holds.
function momentAt(film, t) {
  const id = film.order.find((k) => t >= film.scenes[k].start && t < film.scenes[k].start + film.scenes[k].dur) || film.order.at(-1);
  const sc = film.scenes[id];
  const local = t - sc.start;
  const beat = (sc.beats || []).find((b) => local >= b.start && local < b.start + b.dur) || null;
  if (!beat) return { scene: id, kind: sc.kind, beat: null };
  const at = local - beat.start;
  let moment = 'hold';
  if (beat.move && at >= beat.move[0] && at < beat.move[1]) moment = 'move';
  else if (beat.caption && at >= beat.caption[0] && at < beat.caption[1]) moment = 'caption';
  else if (beat.act !== null && Math.abs(at - beat.act) < 0.25) moment = 'act';
  const { hook, do: does, target, label, value, text } = beat;
  return { scene: id, kind: sc.kind, moment, beat: { hook, do: does, target, ...(label ? { caption: `${label}: ${value}` } : {}), ...(text ? { text } : {}) } };
}

// The element at a point of the frame, from what measureFrame gave: a callout there, else the smallest element that
// carries a hook (its hooks, and its box), else nothing.
function pickAt(m, x, y) {
  const at = (e) => e.shown && x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h;
  const callout = (m.callouts || []).filter((c) => c.kind !== 'leader' && at(c))[0];
  if (callout) return { kind: callout.kind, box: { x: callout.x, y: callout.y, w: callout.w, h: callout.h } };
  const byBox = new Map();
  for (const h of (m.hooks || []).filter(at)) {
    const k = `${h.x},${h.y},${h.w},${h.h}`;
    byBox.set(k, { box: { x: h.x, y: h.y, w: h.w, h: h.h }, hooks: [...((byBox.get(k) || {}).hooks || []), h.hook] });
  }
  const smallest = [...byBox.values()].sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h)[0];
  return smallest ? { kind: 'target', hooks: smallest.hooks, box: smallest.box } : null;
}

// The crop round a comment's anchor, on the 1920 x 1080 stage: its box, kept inside the stage, or 640 x 360 round
// its point.
function anchorCrop(a) {
  if (a.w !== undefined) {
    const x = Math.min(Math.max(Math.round(a.x), 0), 1919);
    const y = Math.min(Math.max(Math.round(a.y), 0), 1079);
    return { x, y, w: Math.max(1, Math.min(Math.round(a.w), 1920 - x)), h: Math.max(1, Math.min(Math.round(a.h), 1080 - y)) };
  }
  const x = Math.round(Math.min(Math.max(a.x - 320, 0), 1920 - 640));
  const y = Math.round(Math.min(Math.max(a.y - 180, 0), 1080 - 360));
  return { x, y, w: 640, h: 360 };
}

module.exports = { parseAnchor, momentAt, pickAt, anchorCrop };
