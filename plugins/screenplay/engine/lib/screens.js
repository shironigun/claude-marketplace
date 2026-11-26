'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
const { readJson } = require('./files');
const { check } = require('./schema');
const { themeProblems } = require('./theme');
const { MUST_NOT_SHOW } = require('./dossier');
const { sceneAnswers } = require('./answers');
const {
  SCREEN_LIMITS, screenPrefix, screenBytes, openedLayers, clickedTabs, filmPlaces, filmReadyProblems, screenFilmProblems,
} = require('./screen');

const ENGINE = path.join(__dirname, '..');
// The window the film shows the app in, which the screens are laid out for and the build frames (spec 7.1).
const WINDOW = { width: 1440, height: 900 };

// Where the UI builder reads the code (spec 5.11, 13.1): the repository; the branch the subject's screen map names,
// if any; the commit every citation names, that branch's or HEAD's; and the stack findings that say how the app draws
// its screens.
function codeSource(repo, rp, branch = null) {
  const commit = repo.git ? spawnSync('git', ['-C', repo.dir, 'rev-parse', '--short', branch || 'HEAD'], { encoding: 'utf8' }) : null;
  const stack = readJson(rp.stack, null);
  return {
    repository: repo.dir,
    branch,
    commit: commit && commit.status === 0 ? commit.stdout.trim() : null,
    stack: stack && {
      frameworks: stack.frontend.frameworks, theming: stack.frontend.theming, i18n: stack.frontend.i18n,
      fonts: stack.frontend.fonts, layout: stack.layout,
    },
  };
}

// The JSON a result is checked against, and its example: the engine's own, wherever the plugin is installed.
const shape = (kind) => ({
  schema: path.join(ENGINE, 'schemas', `${kind}.schema.json`),
  example: path.join(ENGINE, 'fixtures', 'valid', `${kind}.json`),
});

// The screens a film's story shows, in the order it first shows them, each with its scenes (spec 5.11).
function neededScreens(fc) {
  const out = [];
  for (const scene of fc.beats.scenes.filter((s) => s.kind === 'screen')) {
    let entry = out.find((e) => e.id === scene.screen);
    if (!entry) {
      entry = { id: scene.screen, scenes: [] };
      out.push(entry);
    }
    entry.scenes.push(scene.id);
  }
  return out;
}

// What is wrong with a saved theme as the brand profile is now: its schema, then its brands and variables.
function savedThemeProblems(theme, brands) {
  const errors = check('theme', theme);
  return errors.length ? errors : themeProblems(theme, brands);
}

// What is wrong with a saved screen as the film and the theme are now: its schema, then whether it is film-ready and
// fits the film. A missing theme counts as one with no variables.
function savedScreenProblems(screen, fc, theme) {
  const errors = check('screen', screen);
  return errors.length ? errors : [...filmReadyProblems(screen), ...screenFilmProblems(screen, fc, theme || { brands: {} })];
}

// Where a film's screens stand (spec 5.11): the theme, then each screen the story shows, saved or not, with what is
// wrong with it as the film and the theme are now; their size; and whether the build can start.
function screensStatus(fc, rp, fp) {
  const theme = readJson(rp.theme, null);
  const brands = readJson(rp.brands, { brands: [] }).brands.map((b) => b.id);
  let bytes = 0;
  const screens = neededScreens(fc).map(({ id, scenes }) => {
    const map = fc.screens.find((s) => s.id === id);
    const saved = readJson(path.join(fp.screens, `${id}.json`), null);
    const problems = saved ? savedScreenProblems(saved, fc, theme) : [];
    if (saved && !check('screen', saved).length) bytes += screenBytes(saved);
    return { id, title: map ? map.title : id, scenes, saved: Boolean(saved), problems };
  });
  const themeState = { saved: Boolean(theme), problems: theme ? savedThemeProblems(theme, brands) : [] };
  const ready = themeState.saved && !themeState.problems.length && screens.every((s) => s.saved && !s.problems.length)
    && bytes <= SCREEN_LIMITS.filmBytes;
  return { theme: themeState, screens, bytes, limit: SCREEN_LIMITS.filmBytes, ready };
}

// What the UI builder needs to rebuild one screen (spec 5.11): where to read the code (`source`, from codeSource);
// the shape to return and the window to lay it out for; its map entry and class prefix; each scene the story shows
// it in, with its persona, its beats and their hooks, the surfaces they open and the demo answers in effect; the
// theme's variables; the places a logo slot may name, with what each brand shows there; what must not show; and the
// limits.
function screenBrief(fc, theme, id, source = {}) {
  const map = fc.screens.find((s) => s.id === id);
  const personas = new Map(fc.beats.personas.map((p) => [p.id, p]));
  const layer = (a) => ({ kind: a.kind, action: a.label });
  let before = [];
  const scenes = fc.beats.scenes.filter((s) => s.kind === 'screen' && s.screen === id).map((scene) => {
    const opened = openedLayers(scene, map);
    const entry = {
      scene: scene.id,
      state: scene.state,
      persona: personas.get(scene.persona),
      beats: scene.beats.map((b, n) => ({ hook: `${scene.id}.${n + 1}`, ...b })),
      surfaces: [{ kind: 'page' }, ...opened.map(layer)],
      openBefore: before.map(layer),
      tabs: clickedTabs(scene, map),
      answers: sceneAnswers(fc, scene.id),
    };
    before = [...before, ...opened.filter((a) => !before.includes(a))];
    return entry;
  });
  return {
    kind: 'screen',
    subject: fc.subject,
    film: fc.film,
    format: fc.format,
    ...source,
    ...shape('screen'),
    window: WINDOW,
    screen: map,
    prefix: screenPrefix(id),
    scenes,
    theme: theme ? [...new Set(Object.values(theme.brands).flatMap((b) => Object.keys(b.vars)))] : null,
    places: Object.fromEntries(filmPlaces(fc).map((p) => [p, Object.fromEntries(fc.mods.brands.map((id) => [id, fc.brands.find((b) => b.id === id).chrome[p]]))])),
    mustNotShow: fc.truth.filter((e) => MUST_NOT_SHOW.includes(e.kind)).map((e) => ({ id: e.id, kind: e.kind, statement: e.statement })),
    forbidden: fc.forbidden,
    limits: SCREEN_LIMITS,
  };
}

// What the UI builder needs to rebuild the brands' theme (spec 5.11): where to read the code, the shape to return,
// and each brand of the profile with its palette and type and the evidence of both, which points at the theme's
// sources.
function themeBrief(rp, source = {}) {
  return {
    kind: 'theme',
    ...source,
    ...shape('theme'),
    brands: readJson(rp.brands).brands.map((b) => ({
      id: b.id,
      name: b.name,
      palette: b.palette,
      type: b.type,
      evidence: Object.fromEntries(Object.entries(b.evidence).filter(([k]) => /^(palette|type)\./.test(k))),
    })),
  };
}

module.exports = { WINDOW, codeSource, neededScreens, screensStatus, screenBrief, themeBrief };
