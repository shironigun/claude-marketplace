'use strict';
const fs = require('fs');
const path = require('path');
const { usageError, checkError } = require('./errors');
const { readJson } = require('./files');
const { readText } = require('./text');
const { subjectPaths, filmPaths, checkSlug } = require('./paths');
const { readState, decisionValue } = require('./state');
const { check } = require('./schema');
const { modsProblems } = require('./mods');
const { forbiddenNames } = require('./brief');
const { renderStoryboard } = require('./storyboard');
const { houseStyle } = require('./house');
const { filmNext, pastGate2 } = require('./progress');
const { beatsProblems, demoProblems } = require('./story');
const { timingTable, timingProblems, lengthProblems } = require('./timing');
const { formatOf } = require('./catalog');

// The checks a film's result takes beyond its schema (spec 5.8, 5.9).
const FILM_CHECKS = { mods: modsProblems, beats: beatsProblems, 'demo-data': demoProblems };

// A subject's film: its paths and both Working States. A missing subject or film is a usage error.
function loadFilm(home, key, subject, film) {
  const subj = subjectPaths(home, key, checkSlug(subject));
  if (!fs.existsSync(subj.state)) throw usageError(`no subject "${subject}" for ${key}; run sp init first`);
  if (!film) throw usageError('missing --film <film slug>');
  const fp = filmPaths(home, key, subject, film);
  if (!fs.existsSync(fp.state)) throw usageError(`no film "${film}" of ${subject}; run sp film first`);
  return { subj, fp, subjectState: readState(subj.state), filmState: readState(fp.state) };
}

// What a film's checks read (spec 5.8-5.10): the subject's display name (its Name decision from gate 1, or the name it
// was started with), its analysis and the names its brief forbids, the brand profile's brands with their logo
// variants and the places they show one in, the release status, the house style (spec 10), and the film's own files,
// each null until it is saved.
function filmContext(rp, { subj, fp, subjectState, filmState }) {
  for (const file of [subj.screens, subj.apiCalls, subj.truth]) {
    if (!fs.existsSync(file)) throw checkError(`the subject has no ${path.basename(file)} yet; map it with app-map first`);
  }
  return {
    subject: subjectState.subject,
    name: decisionValue(subjectState.decisions, 'Name') || subjectState.name,
    kind: subjectState.kind,
    film: filmState.film,
    format: filmState.format,
    screens: readJson(subj.screens).screens,
    calls: readJson(subj.apiCalls).calls,
    truth: readJson(subj.truth).entries,
    forbidden: fs.existsSync(subj.brief) ? forbiddenNames(fs.readFileSync(subj.brief)) : [],
    brands: readJson(rp.brands, { brands: [] }).brands.map((b) => ({ id: b.id, name: b.name, chrome: b.chrome || {}, logos: Object.keys(b.logos || {}) })),
    release: decisionValue(subjectState.decisions, 'Release'),
    house: houseStyle(rp),
    mods: readJson(fp.mods, null),
    beats: readJson(fp.beats, null),
    demo: readJson(fp.demoData, null),
  };
}

// A film's result: its schema, then its checks against the subject's analysis, the brand profile, the decisions and
// the film's other files.
function filmProblems(kind, value, fc) {
  const errors = check(kind, value);
  return errors.length ? errors : FILM_CHECKS[kind](value, fc);
}

// What stands between a film and its storyboard (spec 5.10): a result not saved yet, or one that no longer passes
// its checks against the subject, the brand profile and the decisions as they are now.
function planProblems(fc) {
  const saved = { mods: fc.mods, beats: fc.beats, 'demo-data': fc.demo };
  const problems = Object.entries(saved).flatMap(([kind, value]) => (value
    ? filmProblems(kind, value, fc).map((p) => `${kind}: ${p}`)
    : [`${kind}: not saved yet; save it with sp save ${kind}`]));
  // A story that passes its own checks is timed as the build times it (spec 5.12), so what the Motion type or the kit
  // cannot play is refused before gate 2, not first at the build.
  if (!problems.length) {
    const table = timingTable(fc);
    problems.push(...[...timingProblems(table), ...lengthProblems(table, formatOf(fc.format))].map((p) => `beats: ${p}`));
  }
  return problems;
}

// Whether the saved storyboard is the one the film's files render now (spec 5.10).
function storyboardCurrent(fc, fp) {
  return fs.existsSync(fp.storyboard) && readText(fs.readFileSync(fp.storyboard)) === renderStoryboard(fc);
}

// What keeps gate 2 from holding now: a result that no longer passes its checks, or a storyboard that is not the one
// the film's files render. Either means the story the user approved is not the film any more.
function gate2Problems(fc, fp) {
  const problems = planProblems(fc);
  if (problems.length) return problems;
  return storyboardCurrent(fc, fp) ? [] : ["storyboard: not the one the film's files give now"];
}

// A film's context for the steps after gate 2 (spec 5.10, 5.11): only once gate 2 has passed, and only while it holds,
// so the screens are made from the story the user approved.
function approvedFilm(rp, f) {
  const next = filmNext(rp, f.subj, f.subjectState, f.fp, f.filmState);
  if (!pastGate2(next)) throw checkError(`the screens come after gate 2; the next step is ${next}`);
  const fc = filmContext(rp, f);
  const problems = gate2Problems(fc, f.fp);
  if (problems.length) {
    throw checkError(`gate 2 no longer holds, so the film is not the story the user approved:\n  ${problems.join('\n  ')}\n`
      + `run sp storyboard ${fc.subject} --film ${fc.film}, show it, and confirm gate 2 again`);
  }
  return fc;
}

module.exports = { loadFilm, filmContext, filmProblems, planProblems, storyboardCurrent, gate2Problems, approvedFilm };
