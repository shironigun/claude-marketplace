'use strict';

// The Motion type's own limits on a film (its film-api page): at most 24 scenes and 300 s in all, and no scene under
// a second. A scene id there is lower case, a letter first, at most 32 characters.
const MOTION = { scenes: 24, seconds: 300, sceneSeconds: 1 };
// The house numbers for a beat, in seconds (spec 7.2-7.5, 8): the camera's glide to a new shot, the pause before an act
// once it lands, the cursor's travel, the time a click leaves before the next beat, the lead before a caption shows
// and the margin it leaves before the beat ends, and the typing speed in characters per second.
const PACE = { move: 0.6, settle: 0.25, travel: 0.6, tail: 0.3, captionLead: 0.1, captionExit: 0.2, cps: 22 };

// A scene's id as the Motion type spells it: `S-02` is `s-02`.
const motionId = (id) => id.toLowerCase();
// Seconds, kept to the millisecond, so sums of beats never drift.
const sec = (ms) => Math.round(ms) / 1000;
const round = (s) => Math.round(s * 1000) / 1000;

// How one beat spends its time (spec 7.2-7.5, 8.3-8.4), in seconds from the beat's start. `beat` is the story's beat
// ({ do, ms, caption?, text? }); `moves` says whether the camera first moves to this beat's target; `cut` whether the
// move is a cut rather than a glide. Returns { move, act, caption }:
// - `move`: [start, end] of the camera's move to this beat's shot, or null when it holds the last shot;
// - `act`: when the beat acts (the click, the start of typing, the moment a point lands), or null for a hold;
// - `caption`: [in, out] of its caption chip, or null; it must be gone before the beat ends, so nothing shows while the
//   camera moves to the next shot (film rule 4).
function beatPhases(beat, moves, cut, pace = PACE) {
  const dur = beat.ms / 1000;
  // A short beat glides faster rather than overrun: the move takes at most a third of it. A cut lands at once.
  const landed = moves && !cut ? Math.min(pace.move, dur / 3) : 0;
  const move = moves ? [0, round(landed)] : null;
  // The cursor travels only once the shot has settled, so it never moves with the camera; it stays put when the target
  // does. A beat too short for all of it shortens the travel, and still leaves the click its tail before the next beat.
  const lead = pace.settle + (moves && (beat.do === 'point' || beat.do === 'click') ? pace.travel : 0);
  const act = beat.do === 'hold' ? null : round(landed + Math.min(lead, Math.max(0, dur - landed - pace.tail)));
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
// whether two beats share a target; the build knows it from the screens, where one element carries both hooks.
function timingTable(fc, same = sameWords, pace = PACE) {
  const cut = fc.mods.transitions === 'cut';
  let start = 0;
  const scenes = fc.beats.scenes.map((scene) => {
    const entry = { id: scene.id, motion: motionId(scene.id), kind: scene.kind, start: round(start) };
    if (scene.kind !== 'screen') {
      entry.dur = sec(scene.ms);
    } else {
      const map = fc.screens.find((s) => s.id === scene.screen);
      entry.screen = scene.screen;
      let at = 0;
      entry.beats = scene.beats.map((beat, n) => {
        const hook = `${scene.id}.${n + 1}`;
        const moves = n === 0 || !same(scene.beats[n - 1], beat, `${scene.id}.${n}`, hook);
        const phases = beatPhases(beat, moves, cut, pace);
        const action = actionOf(beat, map);
        const out = { hook, do: beat.do, start: round(at), dur: sec(beat.ms), ...phases };
        if (beat.text) out.typing = [phases.act, round(phases.act + beat.text.length / pace.cps)];
        if (action && action.kind === 'tab') out.tab = action.label;
        else if (action) out.opens = { kind: action.kind, action: action.label };
        at += sec(beat.ms);
        return out;
      });
      entry.dur = round(at);
    }
    start += entry.dur;
    return entry;
  });
  return { fps: 60, length: round(start), scenes };
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

module.exports = { MOTION, PACE, motionId, beatPhases, timingTable, timingProblems };
