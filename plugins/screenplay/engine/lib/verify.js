'use strict';
const { kitSandbox } = require('./kit');
const { PACE } = require('./timing');

// One frame of a film at 60 fps: a cut, a sound or a still sits on its moment when it is within one frame of it.
const FRAME = 1 / 60;
const ms = (t) => Math.round(t * 1000) / 1000;

// The moments verify renders and measures (spec 5.13), from the film's timing table as film.json holds it: each
// scene's first frame and the frame before each cut; for each beat, the frame before its camera move and the middle
// of the move, the moment it acts (its caption's middle when it holds), its caption's middle, and the start and end
// of the shot it holds; a card's middle; and the film's last frame. Each is { t, kind, scene, hook? }, in film order.
function framePlan(film) {
  const out = [];
  let layer = null;
  const add = (t, kind, scene, hook) => out.push({
    t: ms(Math.max(0, t)), kind, scene, ...(hook ? { hook } : {}), ...(layer && hook && t > layer.from ? { layer: layer.action, layerKind: layer.kind } : {}),
  });
  let prev = null;
  for (const id of film.order) {
    const sc = film.scenes[id];
    if (prev) add(sc.start - FRAME, 'before-cut', prev);
    add(sc.start, 'cut', id);
    if (!sc.beats) add(sc.start + sc.dur / 2, 'card', id);
    for (const b of sc.beats || []) {
      const at = sc.start + b.start;
      // A beat that opens a layer marks each of its moments once the layer shows, as the kit's layerTimes has it:
      // `PACE.show` after a click acts, or from the beat's start; the layer's place in the frame is checked there.
      layer = b.opens ? { action: b.opens.action, kind: b.opens.kind, from: at + (b.do === 'click' && b.act !== null ? b.act + PACE.show : 0) } : null;
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
    layer = null;
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

// The safe area (film rule 8): 40 px in from each edge of the 1920 by 1080 frame.
const SAFE = { x: 40, y: 40, w: 1840, h: 1000 };
const FULL = { x: 0, y: 0, w: 1920, h: 1080 };
const inside = (b, a) => b.x >= a.x - 0.5 && b.y >= a.y - 0.5 && b.x + b.w <= a.x + a.w + 0.5 && b.y + b.h <= a.y + a.h + 0.5;
const overlaps = (b, a) => b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y;
const visible = (e) => e.shown && e.w > 0 && e.h > 0;

// A colour's alpha as getComputedStyle gives it: 0 for transparent; the value after a slash in any colour function
// (`oklch(0.7 0.1 200 / 0.4)`, `color(srgb 1 1 1 / 50%)`); the fourth value of `rgba()` or `hsla()` written with commas;
// a mix with transparent (`color-mix()`) as half; and 1 otherwise. measureFrame runs it in the page.
function alphaOf(color) {
  const c = String(color).trim().toLowerCase();
  if (c === 'transparent') return 0;
  if (c.startsWith('color-mix(')) return c.includes('transparent') ? 0.5 : 1;
  const value = (v) => (v.endsWith('%') ? Number(v.slice(0, -1)) / 100 : Number(v));
  const slash = /\/\s*([\d.]+%?)\s*\)$/.exec(c);
  if (slash) return value(slash[1]);
  const legacy = /^(?:rgba|hsla)\(([^)]*)\)$/.exec(c);
  const parts = legacy ? legacy[1].split(',').map((s) => s.trim()) : [];
  return parts.length === 4 ? value(parts[3]) : 1;
}

// Whether a computed background-image hides what is under it: none hides nothing; an image whose colours are all fully
// opaque does, and a url() image, which names no colour, is taken as opaque. `transparent`, or any colour with alpha
// under 1, makes it see-through. The url() parts are set aside first, so a data URI's text is never read as a colour.
function imageOpaque(image, alphaOf) {
  if (!image || image === 'none') return false;
  const css = image.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, 'url()');
  if (/\btransparent\b/.test(css)) return false;
  const colours = css.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/g) || [];
  return colours.every((c) => alphaOf(c) >= 1);
}

// What the film's frames measure against the film rules (spec 5.13, 8): each sample is a moment of the plan with `m`,
// what measureFrame gave there. `overlay` is the brand's brand.json. Each problem is said once, at its first moment.
// - layout: a beat's target is shown when the beat acts, has a size, and lies in the app's window and the frame; a
//   chip, caption, lifted card, step badge or a card's words stay in the safe area;
// - stillness: the camera is where it was at both ends of a hold;
// - exit before move: no callout shows while the camera moves, in the frame before it moves, or before a cut;
// - a layer a beat opens lies wholly in the frame from when it shows to the beat's end, and a dialog or toast that
//   shows is never cut by the frame's edge;
// - bleed-through: something opaque covers each drawer, dialog or toast that shows;
// - brand: each logo place shows the brand's own logo for it, at the brand's height.
function measuredProblems(samples, overlay) {
  const problems = [];
  const said = new Set();
  const say = (key, text) => {
    if (!said.has(key)) problems.push(text);
    said.add(key);
  };
  for (const s of samples) {
    const { m } = s;
    const at = `${s.scene} at ${s.t} s`;
    // A frame that cannot be measured passes no check.
    if (!m) {
      say('frame', `${at}: the film's frame could not be measured, so none of its checks ran`);
      continue;
    }
    if (s.kind === 'beat') {
      const target = m.hooks.find((h) => h.hook === s.hook);
      if (!target || !target.shown) say(`shown ${s.hook}`, `${s.hook} at ${s.t} s: its target is not shown when the beat acts`);
      else if (target.w < 1 || target.h < 1) say(`size ${s.hook}`, `${s.hook} at ${s.t} s: its target measures ${target.w} by ${target.h} px`);
      else if (!inside(target, m.window || FULL) || !inside(target, FULL)) say(`out ${s.hook}`, `${s.hook} at ${s.t} s: its target lies outside the app's window or the frame`);
    }
    if (['beat', 'caption', 'hold', 'card'].includes(s.kind)) {
      for (const c of [...m.callouts, ...m.cards].filter((e) => visible(e) && !['leader', 'focus'].includes(e.kind) && !inside(e, SAFE))) {
        say(`safe ${s.scene} ${c.kind}`, `${at}: a ${c.kind} reaches outside the safe area, 40 px in from each edge of the frame`);
      }
    }
    if (['move', 'before-move', 'before-cut'].includes(s.kind)) {
      const left = m.callouts.filter(visible);
      if (left.length) say(`exit ${s.t}`, `${at}: a ${left[0].kind} still shows ${s.kind === 'before-cut' ? 'in the last frame before the cut' : 'while the camera moves'}`);
    }
    // A dialog or toast that shows is seen whole or not at all: one cut by the frame's edge reads as cropped. A drawer's
    // close-ups show a part of it, so a drawer is checked only by the beat that opens it (below).
    if (['beat', 'caption', 'hold'].includes(s.kind)) {
      for (const l of m.layers.filter((x) => visible(x) && ['dialog', 'toast'].includes(x.kind) && !(x.action === s.layer && x.kind === s.layerKind) && overlaps(x, FULL) && !inside(x, FULL))) {
        say(`cut ${s.scene} ${l.kind}`, `${at}: the ${l.kind} is cut by the frame's edge`);
      }
    }
    // A layer a beat opens lies wholly in the frame once it shows: one cut by the frame's edge opens off the shot.
    // Another layer cut by the frame is a close-up of part of it, which is a shot, not a flaw.
    if (s.layer && ['beat', 'caption', 'hold'].includes(s.kind)) {
      const l = m.layers.find((x) => x.action === s.layer && x.kind === s.layerKind);
      if (l && visible(l) && !inside(l, FULL)) say(`layer ${s.hook}`, `${s.hook} at ${s.t} s: the ${l.kind} it opens is cut by the frame's edge`);
    }
    for (const l of m.layers.filter((x) => visible(x) && !x.opaque)) {
      say(`bleed ${s.scene} ${l.kind}`, `${at}: the page shows through the ${l.kind}, which nothing opaque covers`);
    }
    for (const g of m.logos.filter(visible)) {
      const place = overlay.places[g.place];
      if (!place || g.src !== overlay.logos[place.logo]) {
        say(`logo ${g.place}`, `${at}: the ${g.place} shows a logo that is not ${overlay.name}'s logo for it`);
      } else if (Math.abs(g.h - place.height * m.scale) > 1) {
        say(`height ${g.place}`, `${at}: the ${g.place} logo is ${ms(g.h / m.scale)} px high; ${overlay.name}'s is ${place.height} px`);
      }
    }
  }
  // Stillness: each beat's hold is measured at both ends.
  for (const s of samples.filter((x) => x.kind === 'hold' && x.m && !x.m.camera)) say(`camera ${s.hook}`, `${s.hook}: the camera could not be measured at ${s.t} s, so its hold is not checked`);
  const holds = new Map();
  for (const s of samples.filter((x) => x.kind === 'hold' && x.m && x.m.camera)) holds.set(s.hook, [...(holds.get(s.hook) || []), s]);
  for (const [hook, [a, b]] of holds) {
    if (b && a.m.camera.some((v, i) => Math.abs(v - b.m.camera[i]) > 0.05)) problems.push(`${hook}: the camera moves between ${a.t} s and ${b.t} s, in a hold`);
  }
  return problems;
}

// Purity (film rule 12): the frames at the beats, rendered after the rest of the plan (`warm`) and again in a fresh
// player in the opposite order, its first cold after the load (`cold`), are the same. Each is { t, scene, hook, png }.
function purityProblems(warm, cold) {
  return warm.filter((w) => {
    const c = cold.find((x) => x.t === w.t);
    return c && !w.png.equals(c.png);
  }).map((w) => `${w.hook || w.scene} at ${w.t} s: the frame is not the same cold as after other frames (an animated image, or a render that keeps state)`);
}

// The player's own log (spec 5.13): an error is the film's own problem; a font it could not load is what could not be
// verified here, since the live player is the reference for type; any other warning is the player's own words, kept as
// it said them. The film's code writes some of these lines, so a reader takes them as data.
function logFindings(log) {
  const problems = log.filter((l) => l.level === 'error').map((l) => `the player reported an error: ${l.text}`);
  const fonts = log.some((l) => l.level !== 'error' && /font/i.test(l.text));
  const notes = fonts ? ["The renderer could not load the film's web font, so type in these frames is the player's stand-in; the live player is the reference for type."] : [];
  const warnings = log.filter((l) => l.level !== 'error' && !/font/i.test(l.text)).map((l) => l.text);
  return { problems, notes, warnings };
}

// A brand's report.md (spec 4.2, 5.13): what was checked and on which build, what failed, what could not be verified
// here, and the sheets the reviewer reads.
function verifyReport(r) {
  const lines = [
    `# Verify: ${r.title}`,
    '',
    `Build ${r.inputs.slice(0, 12)}, checked ${r.at} with the Motion player's own renderer: ${r.moments} moments, at every cut, every beat and the frame before every camera move.`,
    '',
    '## Checks',
    '',
    'Timing, layout, stillness, exit before a move or a cut, bleed-through, purity, brand, and the player\'s own log.',
    '',
    '## Problems',
    '',
    ...(r.problems.length ? r.problems.map((p) => `- ${p}`) : ['None.']),
    '',
    '## Not verified here',
    '',
    ...(r.notes.length ? r.notes.map((n) => `- ${n}`) : ['Nothing.']),
    '',
    '## The player\'s warnings',
    '',
    ...(r.warnings.length ? r.warnings.map((w) => `- "${w}"`) : ['None.']),
    '',
    '## Sheets',
    '',
    ...r.sheets.map((s) => `- ${s}`),
    '',
  ];
  return lines.join('\n');
}

module.exports = { FRAME, SAFE, framePlan, playedProblems, alphaOf, imageOpaque, measuredProblems, purityProblems, logFindings, verifyReport };
