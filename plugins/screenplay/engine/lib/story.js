'use strict';
const { CATALOG, formatOf } = require('./catalog');
const { namesShown } = require('./brief');
const { canonicalWhen, sceneCalls } = require('./answers');

// The truth kinds a caption may rest on (spec 5.9): what the subject does, does only when a user acts, or limits.
const CAPTIONED = ['does', 'manual-only', 'limit'];
// The fields of a card (a title, act or end card) and of a screen scene; neither kind takes the other's.
const FIELDS = { card: ['text', 'line', 'ms'], screen: ['screen', 'state', 'persona', 'pattern', 'beats'] };
const NEEDS = { card: ['text', 'ms'], screen: ['screen', 'state', 'persona', 'beats'] };

// A pacing's callout time, or none for an option the catalog lacks: the mods check reports that one.
const holdMs = (pacing) => (CATALOG.mods.find((m) => m.id === 'pacing').options.find((o) => o.id === pacing) || {}).ms;
// A scene's length: a card's own, or its beats'.
const sceneMs = (scene) => (scene.kind === 'screen' ? (scene.beats || []).reduce((n, b) => n + b.ms, 0) : scene.ms || 0);
const storyMs = (beats) => beats.scenes.reduce((n, s) => n + sceneMs(s), 0);
const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;

// A screen scene's own problems: its screen, state, persona and pattern, and each beat's text, action, caption and
// hold.
function screenProblems(scene, at, fc, personas) {
  const screen = fc.screens.find((s) => s.id === scene.screen);
  if (!screen) return [`${at}: the screen map has no ${scene.screen}`];
  const problems = [];
  if (!screen.states.includes(scene.state)) problems.push(`${at}: ${scene.screen} has no ${scene.state} state; it has ${screen.states.join(', ')}`);
  if (!personas.includes(scene.persona)) problems.push(`${at}: no persona ${scene.persona}`);
  if (scene.pattern && !fc.mods.patterns.some((p) => p.screen === scene.screen && p.pattern === scene.pattern)) {
    problems.push(`${at}: the mods put no ${scene.pattern} on ${scene.screen}`);
  }
  const hold = holdMs(fc.mods.pacing);
  scene.beats.forEach((beat, j) => {
    const here = `${at}/beats/${j}`;
    if ((beat.do === 'type') !== Object.hasOwn(beat, 'text')) {
      problems.push(`${here}: ${beat.do === 'type' ? 'a type beat needs the text it types' : 'only a type beat has text'}`);
    }
    if (beat.action && !screen.actions.some((a) => a.label === beat.action)) problems.push(`${here}: ${scene.screen} has no action "${beat.action}"`);
    if (!beat.caption) return;
    const entry = fc.truth.find((e) => e.id === beat.caption.truth);
    if (!entry) problems.push(`${here}/caption: the ledger has no ${beat.caption.truth}`);
    else if (!CAPTIONED.includes(entry.kind)) problems.push(`${here}/caption: ${entry.id} is a ${entry.kind} entry; a caption rests on a does, manual-only or limit entry`);
    else if (entry.confidence === 'open') problems.push(`${here}/caption: ${entry.id} is open, so the ledger does not know it yet`);
    if (hold && beat.ms < hold) problems.push(`${here}: a captioned beat holds at least ${hold} ms at ${fc.mods.pacing} pacing`);
  });
  return problems;
}

// A module's walkthrough opens each feature with an act card (spec 7.7): the first screen scene, and each one whose
// screen is in another feature than the screen scene's before it, comes right after one.
function featureActProblems(scenes, screens) {
  const problems = [];
  let before = null;
  scenes.forEach((scene, i) => {
    const screen = scene.kind === 'screen' && screens.find((s) => s.id === scene.screen);
    if (!screen) return;
    if ((!before || screen.feature !== before.feature) && (i === 0 || scenes[i - 1].kind !== 'act')) {
      problems.push(`/scenes/${i}: a module walkthrough opens each feature with an act card (add one before ${screen.feature || screen.title})`);
    }
    before = screen;
  });
  return problems;
}

// What is wrong with a film's story beyond its schema (spec 5.9): each scene against the screen map, the personas,
// the mods and the ledger; the cards' order; the format's arc and length (spec 9); and no name the brief's
// must-not-show list gives, in any text (spec 13.3).
function beatsProblems(beats, fc) {
  if (!fc.mods) return [`the film has no mods yet; save them first: sp save mods <file> --subject ${fc.subject} --film ${fc.film}`];
  const problems = [];
  const personas = beats.personas.map((p) => p.id);
  beats.scenes.forEach((scene, i) => {
    const at = `/scenes/${i}`;
    const kind = scene.kind === 'screen' ? 'screen' : 'card';
    const extra = FIELDS[kind === 'screen' ? 'card' : 'screen'].filter((k) => Object.hasOwn(scene, k));
    const missing = NEEDS[kind].filter((k) => !Object.hasOwn(scene, k));
    if (extra.length) problems.push(`${at}: a ${scene.kind} scene has no ${extra.join(', ')}`);
    if (missing.length) problems.push(`${at}: a ${scene.kind} scene needs ${missing.join(', ')}`);
    if (kind === 'screen' && !missing.length) problems.push(...screenProblems(scene, at, fc, personas));
  });
  const where = (kind) => beats.scenes.flatMap((s, i) => (s.kind === kind ? [i] : []));
  const last = beats.scenes.length - 1;
  if (where('title').some((i) => i !== 0) || where('title').length > 1) problems.push('/scenes: a film has at most one title card, and it comes first');
  if (where('end').length !== 1 || where('end')[0] !== last) problems.push('/scenes: a film ends with its one end card');
  if (!where('screen').length) problems.push('/scenes: a film shows at least one screen');
  const format = formatOf(fc.format);
  if (fc.format === 'walkthrough') {
    const toured = [...new Set(beats.scenes.filter((s) => s.kind === 'screen').map((s) => s.screen))];
    const all = fc.screens.map((s) => s.id);
    if (toured.join() !== all.join()) problems.push(`/scenes: a walkthrough tours every screen of the subject in order: ${all.join(', ')}`);
    if (fc.kind === 'module') problems.push(...featureActProblems(beats.scenes, fc.screens));
  }
  if (fc.format === 'trailer' && !where('act').length) problems.push('/scenes: a trailer cuts its highlights into acts, with act cards');
  const ms = storyMs(beats);
  if (format.seconds && (ms < (format.seconds.min || 0) * 1000 || ms > format.seconds.max * 1000)) {
    const range = format.seconds.min ? `${format.seconds.min}-${format.seconds.max} s` : `${format.seconds.max} s or less`;
    problems.push(`/scenes: a ${format.label.toLowerCase()} runs ${range}; this story runs ${seconds(ms)}`);
  }
  const end = beats.scenes[last];
  if (format.endCardSeconds && end.kind === 'end' && end.ms > format.endCardSeconds * 1000) {
    problems.push(`/scenes/${last}: a ${format.label.toLowerCase()}'s end card holds ${format.endCardSeconds} s or less`);
  }
  problems.push(...namesShown(beats, fc.forbidden));
  return problems;
}

// What is wrong with a film's demo data beyond its schema (spec 5.9, 5.11): every answer is for a call in the
// subject's API calls; a parameter its path has, a list where the call returns one, a screen scene to start from,
// and one answer per request and scene; and every call of the story's screens is answered, a sign-in or session call
// too, since the screens show demo data only (spec D21). An answer with `from` takes over at that scene, so the data
// can follow the story (a sent reminder leaves the Open list). No answer shows a name the brief's must-not-show
// list gives (spec 13.3).
function demoProblems(demo, fc) {
  if (!fc.beats) return [`the film has no story yet; save its beats first: sp save beats <file> --subject ${fc.subject} --film ${fc.film}`];
  const problems = [];
  const scenes = fc.beats.scenes.filter((s) => s.kind === 'screen');
  const request = (r) => `${canonicalWhen(r.when)} ${r.from || ''}`;
  for (const [id, responses] of Object.entries(demo.calls)) {
    const call = fc.calls.find((c) => c.id === id);
    if (!call) {
      problems.push(`/calls/${id}: api-calls.json has no ${id}`);
    } else {
      const params = [...call.path.matchAll(/:(\w+)/g)].map((m) => m[1]);
      responses.forEach((r, i) => {
        if (r.from && !scenes.some((s) => s.id === r.from)) problems.push(`/calls/${id}/${i}/from: the story has no screen scene ${r.from}`);
        const first = responses.findIndex((q) => request(q) === request(r));
        if (first !== i) problems.push(`/calls/${id}/${i}: answers the same request from the same scene as answer ${first}`);
        for (const p of Object.keys((r.when && r.when.params) || {})) {
          if (!params.includes(p)) problems.push(`/calls/${id}/${i}/when/params: ${call.path} has no :${p}`);
        }
        const ok = r.status === undefined || (r.status >= 200 && r.status < 300);
        if (ok && (call.responseType || '').endsWith('[]') && !Array.isArray(r.body)) problems.push(`/calls/${id}/${i}/body: ${call.responseType} is a list`);
      });
    }
  }
  const used = new Set();
  for (const scene of scenes) {
    const screen = fc.screens.find((s) => s.id === scene.screen);
    for (const id of screen ? [...screen.calls, ...screen.actions.flatMap((a) => a.calls || [])] : []) used.add(id);
  }
  for (const id of [...used].sort()) {
    const call = fc.calls.find((c) => c.id === id);
    if (call && !Object.hasOwn(demo.calls, id)) {
      problems.push(`/calls: ${id} (${call.method} ${call.path}) has no demo data, and the story's screens call it`);
    }
  }
  // Every call a screen scene makes has an answer that holds there (spec 5.9): one with no `from`, or one from that
  // scene or an earlier one.
  const order = new Map(fc.beats.scenes.map((s, i) => [s.id, i]));
  scenes.forEach((scene, n) => {
    const screen = fc.screens.find((s) => s.id === scene.screen);
    const earlier = scenes.slice(0, n).filter((s) => s.screen === scene.screen);
    for (const id of screen ? sceneCalls(scene, screen, earlier) : []) {
      const answers = demo.calls[id];
      if (answers && !answers.some((r) => !r.from || order.get(r.from) <= order.get(scene.id))) {
        problems.push(`/calls/${id}: ${scene.id} makes this call, but no answer holds there; give one with no from, or one from ${scene.id} or an earlier scene`);
      }
    }
  });
  problems.push(...namesShown(demo, fc.forbidden));
  return problems;
}

module.exports = { CAPTIONED, holdMs, sceneMs, storyMs, seconds, beatsProblems, demoProblems };
