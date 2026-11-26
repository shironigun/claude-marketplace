'use strict';
const { timingTable, timingProblems } = require('./timing');
const { filmCss } = require('./filmcss');
const { packSurfaces, moduleProblems } = require('./modules');
const { brandOverlay } = require('./overlay');
const { kitBundle, kitCss } = require('./kit');
const { joined, attrValues } = require('./screen');
const { CATALOG, formatOf } = require('./catalog');

// A module's kind in the Motion store, by its name.
const KINDS = { '.js': 'js', '.css': 'css', '.json': 'json', '.html': 'html' };
const kindOf = (name) => KINDS[name.slice(name.lastIndexOf('.'))] || 'text';
const label = (mod, id) => CATALOG.mods.find((m) => m.id === mod).options.find((o) => o.id === id).label;

// Whether two beats share a target, from the screens: one element carries both their hooks (spec 5.11), or both sit in
// one dialog or toast, which the camera shows whole, so its parts share its shot and the callouts show them in turn.
function hooksTogether(screens) {
  const pairs = new Set();
  const together = (hooks) => { for (const a of hooks) for (const b of hooks) pairs.add(`${a}|${b}`); };
  for (const screen of screens) {
    for (const scene of screen.scenes) {
      for (const surface of scene.surfaces) {
        const values = attrValues(joined(surface.html), 'data-sp').map((v) => v.split(/\s+/).filter(Boolean));
        for (const hooks of values) together(hooks);
        if (['dialog', 'toast'].includes(surface.kind)) together(values.flat());
      }
    }
  }
  return (a, b, hookA, hookB) => pairs.has(`${hookA}|${hookB}`);
}

// A scene's name as the Motion page lists it: a card's kind, or its screen's title, in at most three words.
const sceneName = (s, map) => (s.kind === 'screen' ? map.find((m) => m.id === s.screen).title : `${s.kind[0].toUpperCase()}${s.kind.slice(1)} card`)
  .split(/\s+/).slice(0, 3).join(' ');

// A film's build (spec 5.12): the shared source every brand's film plays, and each brand's overlay.
// - `fc` is the approved film (lib/film.js); `screens` its saved screens, in the order the story shows them;
// - `theme` and `profile` the repository's theme and brand profile; `readRepo(path)` and `readProfile(file)` read a
//   logo, as lib/overlay.js says.
// The shared source is the timing table and the story (film.json), the kit (shared.js and the kit's CSS), one line of
// code per scene, the score unless the film is silent, and each screen's CSS and markup packed into modules. A brand's
// overlay is its film's title, the four colours and the font of its scenes.json and base.css, and its brand.json.
// Returns { modules, brands, table, problems }.
function filmBuild(fc, { screens, theme, profile, readRepo, readProfile }) {
  const table = timingTable(fc, hooksTogether(screens));
  const problems = [...timingProblems(table)];
  const modules = [];
  const where = {};
  for (const screen of screens) {
    const base = screen.screen.toLowerCase();
    const items = screen.scenes.flatMap((s) => s.surfaces.map((f, i) => [`${s.scene}/${i}`, joined(f.html)]));
    const packed = packSurfaces(base, items);
    modules.push({ name: `${base}.css`, kind: 'css', text: filmCss(joined(screen.css)) }, ...packed.modules);
    Object.assign(where, packed.where);
  }
  const scenes = {};
  for (const s of table.scenes) {
    const story = fc.beats.scenes.find((x) => x.id === s.id);
    if (s.kind !== 'screen') {
      scenes[s.id] = { id: s.id, kind: s.kind, motion: s.motion, start: s.start, dur: s.dur, text: story.text, line: story.line || null };
      continue;
    }
    const entry = screens.find((x) => x.screen === s.screen).scenes.find((x) => x.scene === s.id);
    scenes[s.id] = {
      id: s.id, kind: 'screen', motion: s.motion, start: s.start, dur: s.dur, screen: s.screen,
      prefix: `sp-${s.screen.toLowerCase()}`, css: `${s.screen.toLowerCase()}.css`, pattern: story.pattern || null,
      surfaces: entry.surfaces.map((f, i) => ({ kind: f.kind, action: f.action || null, module: where[`${s.id}/${i}`], key: `${s.id}/${i}` })),
      beats: s.beats.map((b, i) => {
        const caption = story.beats[i].caption;
        return { ...b, target: story.beats[i].target, text: story.beats[i].text || null, label: caption ? caption.label : null, value: caption ? caption.value : null };
      }),
    };
  }
  const chip = fc.mods.chip === 'none' ? null : label('chip', fc.mods.chip);
  const film = {
    v: 1, film: { title: fc.name, format: fc.format, length: table.length }, mods: fc.mods, tempo: table.tempo, chip, order: table.scenes.map((s) => s.id), scenes,
  };
  const scenesJson = {
    v: 1, stage: 'final', look: `${label('look', fc.mods.look)}: a ${fc.format} of ${fc.name}, plain`, width: 1920, height: 1080, fps: 60,
    scenes: table.scenes.map((s) => ({ id: s.motion, name: sceneName(s, fc.screens), dur: s.dur, desc: `${s.id}, ${s.kind === 'screen' ? `on ${s.screen}` : `the ${s.kind} card`}.` })),
  };
  modules.unshift(
    { name: 'scenes.json', kind: 'json', text: `${JSON.stringify(scenesJson, null, 2)}\n` },
    { name: 'base.css', kind: 'css', text: `.ground { background: var(--ground); }\n${kitCss()}` },
    { name: 'shared.js', kind: 'js', text: kitBundle() },
    ...table.scenes.map((s) => ({ name: `scene-${s.motion}.js`, kind: 'js', text: `kit.scene('${s.motion}', W.sp.scene('${s.id}'));\n` })),
    { name: 'film.json', kind: 'json', text: `${JSON.stringify(film)}\n` },
  );
  if (fc.mods.sound === 'score') modules.push({ name: 'score.js', kind: 'js', text: 'kit.score(function (S, T) { W.sp.score(S, T, kit); });\n' });
  const brands = {};
  for (const id of fc.mods.brands) {
    const brand = profile.brands.find((b) => b.id === id);
    const { overlay, problems: own } = brandOverlay({ brand, theme, mods: fc.mods, readRepo, readProfile });
    problems.push(...own);
    const c = overlay.colours;
    brands[id] = {
      brand: id,
      title: `${fc.name}, ${formatOf(fc.format).label.toLowerCase()} (${brand.name})`,
      scenes: {
        palettes: [[c.ground, c.main, c.second, c.accent]], theirs: 0, background: c.ground,
        fonts: { sans: { family: overlay.font.family, or: 'instrument-sans', weights: overlay.font.weights } },
      },
      colours: `#stage { --ground: ${c.ground}; --main: ${c.main}; --second: ${c.second}; --accent: ${c.accent}; }\n`,
      overlay,
    };
  }
  // The modules a brand's film holds, the shared ones and its brand.json, within the Motion type's limits: checked with
  // the largest brand.json, which is the one that could go over.
  const overlays = Object.values(brands).map((b) => JSON.stringify(b.overlay)).sort((a, b) => b.length - a.length);
  if (overlays.length) problems.push(...moduleProblems([...modules, { name: 'brand.json', kind: 'json', text: overlays[0] }]));
  return { modules, brands, table, problems };
}

module.exports = { kindOf, hooksTogether, filmBuild };
