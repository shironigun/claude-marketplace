'use strict';
const fs = require('fs');
const path = require('path');
const { readJson } = require('./files');
const { PHASE_IDS } = require('./state');
const { filmBuilt, filmVerified } = require('./built');

// The analysis chain a subject walks (spec 5.1), with the files each step leaves behind. The brand profile is not
// in it: it belongs to the repository, and app-map works without it (spec 4.1).
function chain(rp, subj) {
  return [
    ['bootstrap', [rp.stack]],
    ['screens', [subj.screens, subj.apiCalls]],
    ['backend', [subj.truth]],
    ['context', [subj.brief]],
  ];
}

// Which of the subject's files exist, by base name.
function subjectFiles(rp, subj) {
  const files = {};
  for (const [, list] of chain(rp, subj)) for (const f of list) files[path.basename(f)] = fs.existsSync(f);
  return files;
}

// The next step: the first step with a missing file, then gate 1 until the user passes it, then done.
function subjectNext(rp, subj, state) {
  for (const [step, list] of chain(rp, subj)) if (list.some((f) => !fs.existsSync(f))) return step;
  return state.gate1 ? 'done' : 'gate-1';
}

// The repository's brand profile: saved, and confirmed by the user since it was last saved (spec 5.3).
function brandStatus(rp) {
  const saved = fs.existsSync(rp.brands);
  const claim = readJson(rp.repository, {});
  const out = { saved, confirmed: saved && typeof claim.brandsConfirmedAt === 'string' };
  if (out.confirmed) out.confirmedAt = claim.brandsConfirmedAt;
  if (saved) out.brands = readJson(rp.brands).brands.map((b) => b.id);
  return out;
}

// Which of a film's files exist, by base name (spec 4.2).
function filmFiles(fp) {
  return Object.fromEntries([fp.mods, fp.beats, fp.demoData, fp.storyboard].map((f) => [path.basename(f), fs.existsSync(f)]));
}

// A film's next step (spec 5.1): a confirmed brand profile and the subject's analysis to gate 1 come first, then the
// mods, the story and gate 2, then the screens from code (`ui`), the build, verify once every brand's film holds the
// build, gate 3 once its checks and the reviewer pass it, and the comment loop (`review`) once the user has the films.
// A gate 2 passed before the latest gate 1 or brand confirmation is passed again, and a gate 3 before the latest
// review.
function filmNext(rp, subj, subjectState, fp, filmState) {
  const brand = brandStatus(rp);
  if (!brand.confirmed) return 'brand';
  if (subjectNext(rp, subj, subjectState) !== 'done') return 'map';
  if (!fs.existsSync(fp.mods)) return 'mods';
  if (!fs.existsSync(fp.beats) || !fs.existsSync(fp.demoData)) return 'story';
  const current = filmState.gate2 && filmState.gate2 >= subjectState.gate1 && filmState.gate2 >= brand.confirmedAt;
  if (!current) return 'gate-2';
  // The screens from code (spec 5.11): the theme, and a saved file for every screen the story shows. Whether they still
  // pass is `sp screens`'s to say.
  const shown = new Set((readJson(fp.beats).scenes || []).filter((s) => s.kind === 'screen').map((s) => s.screen));
  const saved = fs.existsSync(rp.theme) && [...shown].every((id) => fs.existsSync(path.join(fp.screens, `${id}.json`)));
  if (!saved) return 'ui';
  if (!filmBuilt(rp, fp, [...shown], subj)) return 'build';
  const { inputs } = readJson(path.join(fp.film, 'build.json'));
  if (!filmVerified(fp, readJson(fp.mods).brands, inputs)) return 'verify';
  const review = readJson(path.join(fp.verify, 'review.json'));
  return filmState.gate3 && filmState.gate3 >= review.at ? 'review' : 'gate-3';
}

// Whether a film's next step comes after gate 2 (spec 5.1), when its storyboard is approved.
const pastGate2 = (next) => PHASE_IDS.indexOf(next) > PHASE_IDS.indexOf('gate-2');

function brandLine(b) {
  if (!b.saved) return 'brand profile: none yet';
  return `brand profile: ${b.confirmed ? 'confirmed' : 'saved, not confirmed'} (${b.brands.join(', ')})`;
}

module.exports = { chain, subjectFiles, subjectNext, filmFiles, filmNext, pastGate2, brandStatus, brandLine };
