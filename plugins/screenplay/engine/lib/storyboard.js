'use strict';
const { CATALOG, formatOf } = require('./catalog');
const { modChoices } = require('./mods');
const { sceneMs, storyMs, seconds } = require('./story');
const { MUST_NOT_SHOW } = require('./dossier');

const DO = { hold: 'Hold on', point: 'Point at', click: 'Click', scroll: 'Scroll' };
const CARD = { title: 'Title card', act: 'Act card', end: 'End card' };
// A `<` is escaped, so a renderer that drops tags still shows `<customer>`; in a table cell, a `|` too.
const shown = (text) => String(text).replace(/</g, '\\<');
const cell = (text) => shown(text).replace(/\|/g, '\\|');

// A beat in words: what happens, and the screen action it opens or shows.
function beatLine(beat, screen) {
  const what = beat.do === 'type' ? `Type "${beat.text}" in ${beat.target}` : `${DO[beat.do]} ${beat.target}`;
  const action = beat.action && screen.actions.find((a) => a.label === beat.action);
  return action ? `${what} (${action.kind}: ${action.label})` : what;
}

// One demo answer in words: what it answers and from which scene, its status when not 200, and how many items a
// list holds.
function answerLine(r) {
  const when = r.when ? Object.entries({ ...r.when.params, ...r.when.query }).map(([k, v]) => `${k}=${v}`) : [];
  const parts = [when.length ? when.join(' ') : 'any request'];
  if (r.from) parts.push(`from ${r.from}`);
  if (r.status !== undefined && r.status !== 200) parts.push(`status ${r.status}`);
  if (Array.isArray(r.body)) parts.push(`${r.body.length} item${r.body.length === 1 ? '' : 's'}`);
  return parts.join(', ');
}

function sceneLines(scene, fc, personas) {
  if (scene.kind !== 'screen') {
    const text = `**${shown(scene.text)}**`;
    return [`### ${scene.id} ${CARD[scene.kind]}, ${seconds(scene.ms)}`, '', scene.line ? `${text}: ${shown(scene.line)}` : text, ''];
  }
  const screen = fc.screens.find((s) => s.id === scene.screen);
  const pattern = scene.pattern ? ` Pattern: ${CATALOG.patterns.find((p) => p.id === scene.pattern).label.toLowerCase()}.` : '';
  return [
    `### ${scene.id} ${screen.title} (${screen.id}), ${scene.state}, ${seconds(sceneMs(scene))}`, '',
    `Persona: ${personas.get(scene.persona).name}.${pattern}`, '',
    '| # | Beat | Caption | Truth | Time |', '|---|---|---|---|---|',
    ...scene.beats.map((b, i) => {
      const caption = b.caption ? `${b.caption.label}: ${b.caption.value}` : '';
      const truth = b.caption ? `${b.caption.truth} ${fc.truth.find((e) => e.id === b.caption.truth).kind}` : '';
      return `| ${i + 1} | ${cell(beatLine(b, screen))} | ${cell(caption)} | ${truth} | ${seconds(b.ms)} |`;
    }),
    '',
  ];
}

// A film's storyboard (spec 5.9, 5.10): the mods it is shown against, the personas, every scene with its beats,
// captions, truth links and timings, the demo data, and what the film must not show. The same files always give
// the same text, so gate 2 can tell whether the storyboard the user approved is still the film's.
function renderStoryboard(fc) {
  const format = formatOf(fc.format);
  const label = format.label.toLowerCase();
  const limit = !format.seconds ? '; its length follows the content'
    : format.seconds.min ? ` of the ${format.seconds.min}-${format.seconds.max} s a ${label} runs`
      : ` of the ${format.seconds.max} s or less a ${label} runs`;
  const personas = new Map(fc.beats.personas.map((p) => [p.id, p]));
  const answers = Object.entries(fc.demo.calls);
  const hidden = fc.truth.filter((e) => MUST_NOT_SHOW.includes(e.kind));
  return [
    `# Storyboard: ${fc.name}, ${label}`, '',
    `A ${label} of ${fc.name} (a ${fc.kind}), ${seconds(storyMs(fc.beats))}${limit}. Approving it passes gate 2.`, '',
    '## Mods', '',
    '| Mod | Choice |', '|---|---|',
    ...modChoices(fc.mods, fc).map(([mod, choice]) => `| ${mod} | ${cell(choice)} |`), '',
    '## Personas', '',
    ...(fc.beats.personas.length ? fc.beats.personas.map((p) => `- ${p.name}, ${p.role} (${p.id})`) : ['- none']), '',
    '## Scenes', '',
    ...fc.beats.scenes.flatMap((scene) => sceneLines(scene, fc, personas)),
    '## Demo data', '',
    ...(answers.length
      ? ['| Call | Answers |', '|---|---|', ...answers.map(([id, list]) => {
        const call = fc.calls.find((c) => c.id === id);
        return `| ${id} ${call.method} ${call.path} | ${cell(list.map(answerLine).join('; '))} |`;
      })]
      : ['None: the story\'s screens make no calls, so there is no demo data.']), '',
    '## Must not show', '',
    ...(hidden.length ? hidden.map((e) => `- ${e.id} ${e.kind}: ${e.statement}`) : ['- nothing in the ledger']), '',
  ].join('\n');
}

module.exports = { answerLine, renderStoryboard };
