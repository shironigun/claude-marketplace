'use strict';
const { kitSandbox } = require('./kit');

// One frame of a film at 60 fps: a cut, a sound or a still sits on its moment when it is within one frame of it.
const FRAME = 1 / 60;
const ms = (t) => Math.round(t * 1000) / 1000;

// The moments verify renders and measures (spec 5.13), from the film's timing table as film.json holds it: each
// scene's first frame and the frame before each cut; for each beat, the frame before its camera move and the middle
// of the move, the moment it acts (its caption's middle when it holds), its caption's middle, and the start and end
// of the shot it holds; a card's middle; and the film's last frame. Each is { t, kind, scene, hook? }, in film order.
function framePlan(film) {
  const out = [];
  const add = (t, kind, scene, hook) => out.push({ t: ms(Math.max(0, t)), kind, scene, ...(hook ? { hook } : {}) });
  let prev = null;
  for (const id of film.order) {
    const sc = film.scenes[id];
    if (prev) add(sc.start - FRAME, 'before-cut', prev);
    add(sc.start, 'cut', id);
    if (!sc.beats) add(sc.start + sc.dur / 2, 'card', id);
    for (const b of sc.beats || []) {
      const at = sc.start + b.start;
      // A glide moves the camera; a cut lands at once, so it has no middle to measure.
      if (b.move && b.move[1] > b.move[0]) {
        if (b.start + b.move[0] > 0) add(at + b.move[0] - FRAME, 'before-move', id, b.hook);
        add(at + (b.move[0] + b.move[1]) / 2, 'move', id, b.hook);
      }
      const middle = b.caption ? (b.caption[0] + b.caption[1]) / 2 : b.dur / 2;
      add(at + (b.act !== null ? b.act : middle), 'beat', id, b.hook);
      if (b.caption && b.act !== null) add(at + middle, 'caption', id, b.hook);
      // The shot the beat holds, from the camera's landing to the beat's end: still from one end to the other.
      const landed = at + (b.move ? b.move[1] : 0);
      if (at + b.dur - landed > 0.3) {
        add(landed + 0.05, 'hold', id, b.hook);
        add(at + b.dur - 0.05, 'hold', id, b.hook);
      }
    }
    prev = id;
  }
  if (prev) add(film.film.length - FRAME, 'end', prev);
  return out.sort((a, b) => a.t - b.t);
}

// What the player plays against the timing table (spec 5.13's timing check). `played` is what the player reports:
// { duration, chapters: [scene start, ...], events: [{ t, kind, patch }], unknown: [sound names it lacks] }. The film
// runs the table's length; each scene starts where the table starts it, and, with a score, on its beat; the score
// names no sound the player lacks; and each click, caption pop and typed character has its sound on its frame.
function playedProblems(film, played) {
  const problems = [];
  if (Math.abs(played.duration - film.film.length) > FRAME) {
    problems.push(`the player plays ${played.duration} s; the timing table runs ${film.film.length} s`);
  }
  film.order.forEach((id, i) => {
    const sc = film.scenes[id];
    const at = played.chapters[i];
    if (at === undefined || Math.abs(at - sc.start) > FRAME) {
      problems.push(`${id} starts at ${at === undefined ? 'no time' : `${at} s`} in the player; the timing table starts it at ${sc.start} s`);
    }
    if (film.tempo) {
      const beats = ((sc.start - film.tempo.t0) * film.tempo.bpm) / 60;
      if ((Math.abs(beats - Math.round(beats)) * 60) / film.tempo.bpm > FRAME) {
        problems.push(`${id} starts at ${sc.start} s, off the score's beat (${film.tempo.bpm} a minute)`);
      }
    }
  });
  if (film.tempo) {
    for (const name of played.unknown) problems.push(`the score names the sound "${name}", which the player lacks, so it is silent`);
    const cues = kitSandbox().cues(film);
    const at = (t) => (t === null ? [] : [t]);
    const cued = [
      ['fx', 'click', 'click', cues.clicks], ['fx', 'pop', 'caption', cues.pops], ['fx', 'tick', 'typed character', cues.ticks],
      ['fx', 'ding', "title's ring", at(cues.ring)], ['fx', 'chime', "end card's chord", at(cues.end)],
      ['drum', 'kick', "title's hit", film.mods.intro === 'boom' ? at(cues.hit) : []],
    ];
    for (const [kind, patch, what, times] of cued) {
      const heard = played.events.filter((e) => e.kind === kind && e.patch === patch).map((e) => e.t);
      for (const t of times) {
        if (!heard.some((h) => Math.abs(h - t) <= FRAME)) problems.push(`no ${patch} sounds at ${ms(t)} s, the frame of its ${what}`);
      }
    }
  }
  return problems;
}

module.exports = { FRAME, framePlan, playedProblems };
