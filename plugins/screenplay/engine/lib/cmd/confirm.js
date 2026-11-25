'use strict';
const fs = require('fs');
const { usageError, checkError } = require('../errors');
const { readJson, writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey, claimWorkspace, subjectPaths, checkSlug } = require('../paths');
const { readState, writeState } = require('../state');
const { subjectNext, filmNext, pastGate2 } = require('../progress');
const { buildDossier } = require('../dossier');
const { loadFilm, filmContext, planProblems, storyboardCurrent } = require('../film');

// Gate 1 (spec 5.7): the user has seen the dossier; it is passed only after the analysis, with no problem left.
function passGate1(ctx, repo, key, rp, slug) {
  const subj = subjectPaths(ctx.home, key, slug);
  if (!fs.existsSync(subj.state)) throw usageError(`no subject "${slug}" for ${key}; run sp init first`);
  const state = readState(subj.state);
  const next = subjectNext(rp, subj, state);
  if (next !== 'gate-1' && next !== 'done') throw checkError(`gate 1 comes after the analysis; the next step is ${next}`);
  const { problems } = buildDossier(repo, rp, subj, state);
  if (problems.length) {
    throw checkError(`the dossier has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ${problems.join('\n  ')}`);
  }
  writeState(subj.state, { ...state, gate1: ctx.now, updated: ctx.now });
  return { json: { confirmed: 'gate-1', subject: slug, at: ctx.now }, text: `${slug}: gate 1 passed at ${ctx.now}` };
}

// Gate 2 (spec 5.10): the user approved the storyboard. It is passed only after the story, with no problem left,
// and only when the storyboard on disk is the one the film's files give now, so what was approved is the film.
function passGate2(ctx, key, rp, subject, film) {
  const f = loadFilm(ctx.home, key, subject, film);
  const next = filmNext(rp, f.subj, f.subjectState, f.fp, f.filmState);
  if (next !== 'gate-2' && !pastGate2(next)) throw checkError(`gate 2 comes after the story; the next step is ${next}`);
  const fc = filmContext(rp, f);
  const problems = planProblems(fc);
  if (problems.length) {
    throw checkError(`the film has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ${problems.join('\n  ')}`);
  }
  if (!storyboardCurrent(fc, f.fp)) {
    throw checkError(`the storyboard is not the one the film's files give now: run sp storyboard ${subject} --film ${film}, show it, and ask again`);
  }
  writeState(f.fp.state, { ...f.filmState, gate2: ctx.now, updated: ctx.now });
  return { json: { confirmed: 'gate-2', subject, film, at: ctx.now }, text: `${subject}/${film}: gate 2 passed at ${ctx.now}` };
}

// Gate 3 (spec 5.14): the user has the films of a verified cut, with what was checked; from then on, the comment loop.
function passGate3(ctx, key, rp, subject, film) {
  const f = loadFilm(ctx.home, key, subject, film);
  const next = filmNext(rp, f.subj, f.subjectState, f.fp, f.filmState);
  if (next !== 'gate-3' && next !== 'review') throw checkError(`gate 3 comes once the films pass verify; the next step is ${next}`);
  writeState(f.fp.state, { ...f.filmState, gate3: ctx.now, updated: ctx.now });
  return { json: { confirmed: 'gate-3', subject, film, at: ctx.now }, text: `${subject}/${film}: gate 3 passed at ${ctx.now}` };
}

module.exports = {
  name: 'confirm',
  usage: 'confirm <brands|gate-1|gate-2|gate-3> [--subject <slug>] [--film <film slug>] [--repo <dir>]',
  summary: "Record the user's confirmation of the brand profile (spec 5.3), a subject's gate 1 (spec 5.7), a film's gate 2 (spec 5.10), or the films handed to the user at gate 3 (spec 5.14).",
  flags: { subject: 'string', film: 'string', repo: 'string' },
  run(ctx, args) {
    const [what] = args._;
    if (!['brands', 'gate-1', 'gate-2', 'gate-3'].includes(what)) {
      throw usageError('confirm what? use: brands; gate-1 with --subject <slug>; or gate-2 or gate-3 with --subject <slug> --film <film slug>');
    }
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    if (what === 'gate-1') {
      if (!args.flags.subject) throw usageError('confirm gate-1 needs --subject <slug>');
      return passGate1(ctx, repo, key, rp, checkSlug(args.flags.subject));
    }
    if (what === 'gate-2') {
      if (!args.flags.subject) throw usageError('confirm gate-2 needs --subject <slug> and --film <film slug>');
      return passGate2(ctx, key, rp, args.flags.subject, args.flags.film);
    }
    if (what === 'gate-3') {
      if (!args.flags.subject) throw usageError('confirm gate-3 needs --subject <slug> and --film <film slug>');
      return passGate3(ctx, key, rp, args.flags.subject, args.flags.film);
    }
    if (!fs.existsSync(rp.brands)) throw usageError('no brand profile saved yet; save it with sp save brands first');
    // Every place shows its logo before the user confirms the brands: one the repository does not hold is the user's
    // file (spec 5.3, D23), so it comes now, not after gate 2.
    const missing = readJson(rp.brands).brands.flatMap((b) => Object.entries(b.chrome || {})
      .filter(([, p]) => !Object.hasOwn(b.logos, p.logo))
      .map(([place, p]) => `${b.id} shows the ${p.logo} logo in its ${place}, which it has not; supply its file with sp logo ${b.id} ${p.logo} <file>`));
    if (missing.length) throw checkError(`the brand profile cannot be confirmed yet:\n  ${missing.join('\n  ')}`);
    claimWorkspace(ctx.home, repo, key);
    writeJson(rp.repository, { ...readJson(rp.repository, {}), brandsConfirmedAt: ctx.now });
    return { json: { confirmed: 'brands', at: ctx.now }, text: `Brand profile confirmed at ${ctx.now}` };
  },
};
