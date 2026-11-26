'use strict';

// The Motion type's own limits on a film (its film-api page): at most 24 scenes and 300 s in all, and no scene under
// a second. A scene id there is lower case, a letter first, at most 32 characters.
const MOTION = { scenes: 24, seconds: 300, sceneSeconds: 1 };
// The house numbers for a beat, in seconds (spec 7.2-7.5, 8): the camera's glide to a new shot, the pause before an act
// once it lands, the cursor's travel, the time a click leaves before the next beat, the lead before a caption shows
// and the margin it leaves before the beat ends, the typing speed in characters per second, when a layer shows after
// the click that opens it, and when it has finished opening (the kit's SP.LAYER: it shows 0.1 s after the click and
// opens over 0.25 s).
const PACE = { move: 0.8, settle: 0.25, travel: 0.6, tail: 0.3, captionLead: 0.1, captionExit: 0.2, cps: 22, show: 0.1, open: 0.35 };
// The kinds of action that open a layer over the page: the layers a screen draws.
const LAYERS = ['drawer', 'dialog', 'toast'];
// The camera's glide to a new shot for each pacing, in seconds (spec 7.2, D38): a calm film glides slower, a brisk one
// faster. `PACE.move` is the standard one.
const GLIDE = { standard: 0.8, calm: 1, brisk: 0.5 };
// The score's tempo for each pacing, in beats a minute (spec 9). A film with a score cuts on its beat (spec 5.13): each
// scene lasts whole beats, counted from the film's start, and the score's grid starts there too.
const TEMPO = { standard: 100, calm: 90, brisk: 108 };

// A scene's id as the Motion type spells it: `S-02` is `s-02`.
const motionId = (id) => id.toLowerCase();
// Seconds, kept to the millisecond, so sums of beats never drift.
const sec = (ms) => Math.round(ms) / 1000;
const round = (s) => Math.round(s * 1000) / 1000;

// How one beat spends its time (spec 7.2-7.5, 8.3-8.4), in seconds from the beat's start. `beat` is the story's beat
// ({ do, ms, caption?, text? }); `moves` says whether the camera first moves to this beat's target; `cut` whether the
// move is a cut rather than a glide; `opens` whether its click opens a layer. Returns { move, act, caption }:
// - `move`: [start, end] of the camera's move to this beat's shot, or null when it holds the last shot;
// - `act`: when the beat acts (the click, the start of typing, the moment a point lands), or null for a hold;
// - `caption`: [in, out] of its caption chip, or null; it must be gone before the beat ends, so nothing shows while the
//   camera moves to the next shot (film rule 4).
function beatPhases(beat, moves, cut, pace = PACE, opens = false) {
  const dur = beat.ms / 1000;
  // A short beat glides faster rather than overrun: the move takes at most half of it. The timing table lengthens a
  // beat that glides to twice its glide, so a film never hurries it. A cut lands at once.
  const landed = moves && !cut ? Math.min(pace.move, dur / 2) : 0;
  const move = moves ? [0, round(landed)] : null;
  // The cursor travels only once the shot has settled, so it never moves with the camera; it stays put when the target
  // does. A beat too short for all of it shortens the travel, and still leaves the click its tail before the next beat;
  // a click that opens a layer leaves the layer its time to open first, so it never opens while the camera moves on.
  const lead = pace.settle + (moves && (beat.do === 'point' || beat.do === 'click') ? pace.travel : 0);
  const tail = opens && beat.do === 'click' ? pace.open + pace.tail : pace.tail;
  const act = beat.do === 'hold' ? null : round(landed + Math.min(lead, Math.max(0, dur - landed - tail)));
  const caption = beat.caption ? [round(landed + pace.captionLead), round(dur - pace.captionExit)] : null;
  return { move, act, caption };
}

// The screen map's action a beat names, if any: a layer it opens, or a tab it selects.
const actionOf = (beat, map) => (beat.action && map ? map.actions.find((a) => a.label === beat.action) : null);

// Whether two beats of a scene act on one target: by the story's words, when nothing better is known.
const sameWords = (a, b) => a.target === b.target;

// The film's one timing table (spec P8, D8): every scene's start and length in the film, and every beat's place and
// events in its scene, in seconds. The scenes and the score both read it, so retiming can never leave a sound on the
// wrong frame. Each screen scene opens on the whole window, as nothing but a travelling object carries over a cut in a
// Motion film, and a beat moves the camera when its target is not the one before it. `same(a, b, hookA, hookB)` says
// whether two beats share a target; the build knows it from the screens, where one element carries both hooks. A film
// with a score starts each scene on a beat of its tempo: every scene but the last ends on the first beat at or after the
// time it needs, and gives the extra time to its last beat (a card's to the card). The last scene keeps its own length,
// so an end card holds what its format allows. The camera glides at its pacing's speed, and a beat that glides lasts at
// least twice its glide: a story's short beat is lengthened rather than hurried (D38). A click that opens a layer lasts
// long enough for the camera to land, the cursor to settle and travel, and the layer to open before its tail (D39).
function timingTable(fc, same = sameWords, pace = PACE) {
  const cut = fc.mods.transitions === 'cut';
  const glide = { ...pace, move: GLIDE[fc.mods.pacing] || pace.move };
  const bpm = fc.mods.sound === 'score' ? TEMPO[fc.mods.pacing] || TEMPO.standard : null;
  const onBeat = (t) => (bpm ? round(Math.ceil(t * bpm / 60 - 1e-6) * 60 / bpm) : round(t));
  const last = fc.beats.scenes.length - 1;
  let start = 0;
  const scenes = fc.beats.scenes.map((scene, i) => {
    const entry = { id: scene.id, motion: motionId(scene.id), kind: scene.kind, start: round(start) };
    const beats = scene.kind === 'screen' ? scene.beats : [];
    const map = scene.kind === 'screen' ? fc.screens.find((s) => s.id === scene.screen) : null;
    const moves = beats.map((b, n) => n === 0 || !same(beats[n - 1], b, `${scene.id}.${n}`, `${scene.id}.${n + 1}`));
    const opens = beats.map((b) => b.do === 'click' && LAYERS.includes((actionOf(b, map) || {}).kind));
    const timed = beats.map((b, n) => {
      const glides = moves[n] && !cut;
      const least = Math.max(glides ? 2 * glide.move : 0, opens[n] ? (glides ? glide.move : 0) + glide.settle + (moves[n] ? glide.travel : 0) + glide.open + glide.tail : 0);
      return { ...b, ms: Math.max(b.ms, Math.round(least * 1000)) };
    });
    const needs = scene.kind === 'screen' ? timed.reduce((n, b) => n + b.ms, 0) : scene.ms;
    const end = i === last ? round(start + sec(needs)) : onBeat(start + sec(needs));
    if (scene.kind !== 'screen') {
      entry.dur = round(end - start);
    } else {
      const extra = Math.round((end - start) * 1000) - needs;
      entry.screen = scene.screen;
      let at = 0;
      entry.beats = timed.map((story, n) => {
        const beat = n === timed.length - 1 ? { ...story, ms: story.ms + extra } : story;
        const hook = `${scene.id}.${n + 1}`;
        const action = actionOf(beat, map);
        const phases = beatPhases(beat, moves[n], cut, glide, opens[n]);
        const out = { hook, do: beat.do, start: round(at), dur: sec(beat.ms), ...phases };
        if (beat.text) out.typing = [phases.act, round(phases.act + beat.text.length / glide.cps)];
        if (action && action.kind === 'tab') out.tab = action.label;
        else if (action) out.opens = { kind: action.kind, action: action.label };
        at += sec(beat.ms);
        return out;
      });
      entry.dur = round(at);
    }
    start = end;
    return entry;
  });
  return { fps: 60, length: round(start), tempo: bpm ? { bpm, t0: 0 } : null, scenes };
}

// A film's length against its format (spec 9) once each scene starts on its beat, which can take a story just inside the
// format's length past it. `format` is the catalog's.
function lengthProblems(table, format) {
  const max = format.seconds && format.seconds.max;
  return max && table.length > max ? [`the film runs ${table.length} s once each scene starts on its beat; a ${format.label.toLowerCase()} runs at most ${max} s`] : [];
}

// What keeps a timing table out of the Motion type or the kit: too many scenes, too long a film, a scene under a
// second, typing that runs into the next beat (film rule 4), or a scroll, which the kit does not play yet.
function timingProblems(table, pace = PACE) {
  const problems = [];
  if (table.scenes.length > MOTION.scenes) {
    problems.push(`the film has ${table.scenes.length} scenes; a Motion film takes at most ${MOTION.scenes}`);
  }
  if (table.length > MOTION.seconds) {
    problems.push(`the film runs ${table.length} s; a Motion film runs at most ${MOTION.seconds} s`);
  }
  for (const s of table.scenes) {
    if (s.dur < MOTION.sceneSeconds) problems.push(`${s.id} runs ${s.dur} s; a Motion scene runs at least ${MOTION.sceneSeconds} s`);
    for (const b of s.beats || []) {
      if (b.do === 'scroll') problems.push(`${b.hook} scrolls, which a film does not play yet; hold on what the scroll shows instead`);
      if (b.typing && b.typing[1] > b.dur - pace.tail) {
        problems.push(`${b.hook} types until ${b.typing[1]} s into a ${b.dur} s beat; make it at least ${Math.ceil((b.typing[1] + pace.tail) * 10) * 100} ms, or its text shorter`);
      }
    }
  }
  return problems;
}

module.exports = { MOTION, PACE, LAYERS, GLIDE, TEMPO, motionId, beatPhases, timingTable, timingProblems, lengthProblems };
