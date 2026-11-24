'use strict';

// A request's `when` in one spelling (spec 5.9), whatever the order of its keys, so two answers for the same request
// read the same.
function canonicalWhen(when) {
  const sorted = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  const out = {};
  for (const part of ['params', 'query']) {
    if (when && when[part] && Object.keys(when[part]).length) out[part] = sorted(when[part]);
  }
  return JSON.stringify(out);
}

// The calls a screen scene makes: its screen's own, then those of the actions its beats name, or an earlier scene of
// the same screen named, since a layer one of them opened may still be open (spec 5.11); each once.
function sceneCalls(scene, screen, earlier = []) {
  const named = new Set([scene, ...earlier].flatMap((s) => s.beats.map((b) => b.action)).filter(Boolean));
  const actions = screen.actions.filter((a) => named.has(a.label));
  return [...new Set([...screen.calls, ...actions.flatMap((a) => a.calls || [])])];
}

// The demo answers a screen scene shows (spec 5.9): for each call it makes, one answer per request, the last whose
// `from` is this scene or an earlier one in the story; an answer with no `from` holds from the start. A request with
// no answer in effect yet is left out. Null when the story has no such screen scene.
function sceneAnswers(fc, sceneId) {
  const order = new Map(fc.beats.scenes.map((s, i) => [s.id, i]));
  const scene = fc.beats.scenes.find((s) => s.id === sceneId && s.kind === 'screen');
  if (!scene) return null;
  const screen = fc.screens.find((s) => s.id === scene.screen);
  const at = order.get(sceneId);
  const earlier = fc.beats.scenes.slice(0, at).filter((s) => s.kind === 'screen' && s.screen === scene.screen);
  return sceneCalls(scene, screen, earlier).map((id) => {
    const call = fc.calls.find((c) => c.id === id);
    const held = new Map();
    for (const answer of fc.demo.calls[id] || []) {
      const from = answer.from ? order.get(answer.from) : -1;
      if (from === undefined || from > at) continue;
      const request = canonicalWhen(answer.when);
      if (!held.has(request) || from >= held.get(request).from) held.set(request, { from, answer });
    }
    return { id, method: call.method, path: call.path, answers: [...held.values()].map((h) => h.answer) };
  });
}

module.exports = { canonicalWhen, sceneCalls, sceneAnswers };
