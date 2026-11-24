'use strict';
const fs = require('fs');
const path = require('path');
const { usageError, checkError } = require('../errors');
const { readTextFile, readJsonFile } = require('../args');
const { readJson, writeJson, writeFileAtomic } = require('../files');
const { repoInfo, checkHome, isInside, repoPaths, workspaceKey, claimWorkspace, subjectPaths, checkSlug } = require('../paths');
const { check } = require('../schema');
const { checkCitations, citationsOf } = require('../citations');
const { SECTIONS, checkBrief } = require('../brief');
const { readState, writeState } = require('../state');
const { loadFilm, filmContext, filmProblems, approvedFilm } = require('../film');
const { themeProblems } = require('../theme');
const { profileLogoProblems, keepSuppliedLogos } = require('../logos');
const { themeCssProblems } = require('../overlay');
const { filmReadyProblems, screenFilmProblems, filmSizeProblems } = require('../screen');

// Where each kind is saved (spec 4.2): the brand profile and the theme belong to the repository, a film's results to
// the film, the rest to one subject.
const TARGETS = {
  brands: (rp) => rp.brands,
  theme: (rp) => rp.theme,
  screens: (rp, subj) => subj.screens,
  'api-calls': (rp, subj) => subj.apiCalls,
  truth: (rp, subj) => subj.truth,
  brief: (rp, subj) => subj.brief,
  mods: (rp, subj, fp) => fp.mods,
  beats: (rp, subj, fp) => fp.beats,
  'demo-data': (rp, subj, fp) => fp.demoData,
  screen: (rp, subj, fp, value) => path.join(fp.screens, `${value.screen}.json`),
};
const ITEMS = { brands: 'brands', screens: 'screens', 'api-calls': 'calls', truth: 'entries' };
// The results that belong to the repository rather than to one subject.
const REPOSITORY_KINDS = ['brands', 'theme'];
// A film's results, each with what its save message counts. A screen comes after gate 2 and leaves it passed
// (spec 5.11); the others ask for it again.
const FILM_KINDS = {
  mods: (v) => [Object.keys(v).length, 'choice'],
  beats: (v) => [v.scenes.length, 'scene'],
  'demo-data': (v) => [Object.keys(v.calls).length, 'call'],
  screen: (v) => [v.scenes.length, 'scene'],
};

// What a save message counts: a film result's own unit, a brief's sections, a theme's brands, or a list's items.
function counted(kind, value) {
  if (FILM_KINDS[kind]) return FILM_KINDS[kind](value);
  if (kind === 'brief') return [SECTIONS.length, 'section'];
  if (kind === 'theme') return [Object.keys(value.brands).length, 'brand'];
  return [value[ITEMS[kind]].length, 'item'];
}

// Where a result's evidence lists sit, for the kinds whose citations name a commit: [pointer, list] pairs.
const EVIDENCE = {
  truth: (v) => v.entries.map((e, i) => [`/entries/${i}`, e.evidence]),
  theme: (v) => Object.entries(v.brands).map(([id, b]) => [`/brands/${id}`, b.evidence]),
  screen: (v) => [['', v.evidence]],
};

// In a git repository, a citation of the truth ledger, the theme or a screen is path:line@commit (spec 5.5, 5.11);
// elsewhere there is no commit to name.
function missingCommits(kind, value) {
  return EVIDENCE[kind](value).flatMap(([at, evidence]) => evidence.flatMap((ev, j) => (Object.hasOwn(ev, 'commit') ? []
    : [`${at}/evidence/${j}: missing "commit" (needed in a git repository)`])));
}

// Every problem with a result: its schema and cross-checks, then the citations, which must hold in the repository.
function problemsOf(kind, value, repo) {
  if (kind === 'brief') return checkBrief(value);
  const errors = check(kind, value);
  if (!errors.length && EVIDENCE[kind] && repo.git) errors.push(...missingCommits(kind, value));
  if (!errors.length) errors.push(...checkCitations(repo.dir, citationsOf(kind, value)));
  return errors;
}

// A screen's problems (spec 5.11): its schema, then whether it is film-ready, its fit with the film the user approved
// and with the theme, the film's screens' size with it, and its citations, with commits in git.
function screenProblems(value, fc, theme, repo, fp) {
  const errors = check('screen', value);
  if (errors.length) return errors;
  errors.push(...filmReadyProblems(value), ...screenFilmProblems(value, fc, theme));
  // The other screens the story shows, as saved: a file of a screen it no longer shows does not count.
  const shown = new Set(fc.beats.scenes.filter((s) => s.kind === 'screen' && s.screen !== value.screen).map((s) => s.screen));
  const others = [...shown].map((id) => readJson(path.join(fp.screens, `${id}.json`), null)).filter(Boolean);
  errors.push(...filmSizeProblems(value, others));
  if (repo.git) errors.push(...missingCommits('screen', value));
  errors.push(...checkCitations(repo.dir, citationsOf('screen', value)));
  return errors;
}

module.exports = {
  name: 'save',
  usage: `save <${Object.keys(TARGETS).join('|')}> <file> [--subject <slug>] [--film <film slug>] [--repo <dir>]`,
  summary: 'Check a result against its schema, the repository and the subject, and save it; nothing is written if any check fails.',
  flags: { subject: 'string', film: 'string', repo: 'string' },
  run(ctx, args) {
    const [kind, file] = args._;
    if (!TARGETS[kind]) throw usageError(`unknown kind "${kind}"; use one of: ${Object.keys(TARGETS).join(', ')}`);
    if (!file) throw usageError('missing <file>');
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    // Spec P2: a result waits in the inbox, never in the app's repository.
    if (isInside(path.resolve(ctx.cwd, file), repo.dir)) {
      throw usageError(`${file} is inside the app's repository; write it to the inbox, ${rp.inbox}`);
    }
    const value = kind === 'brief' ? readTextFile(ctx.cwd, file) : readJsonFile(ctx.cwd, file);
    // A logo the user supplied stays in a new brand profile that does not give that logo itself (spec D23).
    if (kind === 'brands') keepSuppliedLogos(value, readJson(rp.brands, null));
    let subj = null;
    if (!REPOSITORY_KINDS.includes(kind)) {
      if (!args.flags.subject) throw usageError(`saving ${kind} needs --subject <slug>`);
      subj = subjectPaths(ctx.home, key, checkSlug(args.flags.subject));
      if (!fs.existsSync(subj.state)) throw usageError(`no subject "${args.flags.subject}" for ${key}; run sp init first`);
    }
    let film = null;
    if (FILM_KINDS[kind]) {
      if (!args.flags.film) throw usageError(`saving ${kind} needs --film <film slug>`);
      film = loadFilm(ctx.home, key, args.flags.subject, args.flags.film);
    }
    // A theme has one entry per brand of the profile (spec 5.11), so it comes after the brand profile.
    if (kind === 'theme' && !fs.existsSync(rp.brands)) {
      throw usageError('save the brand profile first: the theme has one entry per brand (sp save brands)');
    }
    // A screen's brand values are the theme's variables (spec 5.11), so it comes after the theme.
    if (kind === 'screen' && !fs.existsSync(rp.theme)) {
      throw usageError("save the theme first: a screen's brand values are its variables (sp save theme)");
    }
    let errors;
    if (kind === 'screen') errors = screenProblems(value, approvedFilm(rp, film), readJson(rp.theme), repo, film.fp);
    else errors = film ? filmProblems(kind, value, filmContext(rp, film)) : problemsOf(kind, value, repo);
    if (kind === 'theme' && !errors.length) errors.push(...themeProblems(value, readJson(rp.brands).brands.map((b) => b.id)));
    // A theme value the film's CSS refuses is refused now, not first at the build (spec 5.12).
    if (kind === 'theme' && !errors.length) errors.push(...themeCssProblems(value));
    if (kind === 'brands' && !errors.length) errors.push(...profileLogoProblems(value));
    if (errors.length) {
      throw checkError(`${kind} has ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n  ${errors.join('\n  ')}`);
    }
    const target = TARGETS[kind](rp, subj, film && film.fp, value);
    claimWorkspace(ctx.home, repo, key);
    // A new brand profile has not been confirmed by the user yet (spec 5.3).
    let removed = null;
    if (kind === 'brands') {
      const claim = readJson(rp.repository, {});
      if (Object.hasOwn(claim, 'brandsConfirmedAt')) {
        delete claim.brandsConfirmedAt;
        writeJson(rp.repository, claim);
      }
      // The theme is rebuilt from the brand profile (spec 5.11), so a changed profile takes the old theme with it.
      if (fs.existsSync(rp.theme) && JSON.stringify(readJson(rp.brands, null)) !== JSON.stringify(value)) {
        removed = rp.theme;
        fs.rmSync(removed);
      }
    }
    // A changed analysis needs gate 1 again (spec 5.7), and a changed plan gate 2 (spec 5.10). A screen comes after
    // gate 2 and changes neither.
    if (film) {
      const state = readState(film.fp.state);
      if (state.gate2 && kind !== 'screen') {
        delete state.gate2;
        writeState(film.fp.state, { ...state, updated: ctx.now });
      }
    } else if (subj) {
      const state = readState(subj.state);
      if (state.gate1) {
        delete state.gate1;
        writeState(subj.state, { ...state, updated: ctx.now });
      }
    }
    // The result is written last, so a failure above leaves it unsaved, and a new result is never left marked
    // confirmed or passed.
    if (kind === 'brief') writeFileAtomic(target, `${value.trimEnd()}\n`);
    else writeJson(target, value);
    const [n, unit] = counted(kind, value);
    const text = `Saved ${kind} (${n} ${unit}${n === 1 ? '' : 's'}) to ${target}`;
    if (!removed) return { json: { kind, saved: target, items: n }, text };
    return {
      json: { kind, saved: target, items: n, removed },
      text: `${text}; the theme rebuilt from the old brand profile is removed, and app-film rebuilds it before a film's screens`,
    };
  },
};
