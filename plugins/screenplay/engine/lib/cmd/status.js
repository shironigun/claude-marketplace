'use strict';
const fs = require('fs');
const path = require('path');
const { usageError } = require('../errors');
const { readJson } = require('../files');
const { repoInfo, repoPaths, workspaceKey, subjectPaths, filmPaths, checkSlug, SLUG_RE } = require('../paths');
const { readState, phaseLabel } = require('../state');
const { subjectFiles, subjectNext, filmFiles, filmNext, brandStatus, brandLine } = require('../progress');

// Stray entries (a .DS_Store, a hand-made folder) are ignored. A subject whose state.md cannot be read is listed
// with its error, so one bad subject does not hide the others.
function listSubjects(ctx, key, rp) {
  if (!fs.existsSync(rp.subjects)) return [];
  return fs.readdirSync(rp.subjects).sort()
    .filter((s) => SLUG_RE.test(s) && fs.statSync(path.join(rp.subjects, s)).isDirectory()
      && fs.existsSync(subjectPaths(ctx.home, key, s).state))
    .map((s) => {
      try {
        const st = readState(subjectPaths(ctx.home, key, s).state);
        return { subject: s, name: st.name, kind: st.kind, phase: st.phase, updated: st.updated };
      } catch (e) {
        return { subject: s, error: e.message };
      }
    });
}

// A subject's films, each with its next step. Like a subject, a film whose state.md cannot be read is listed with
// its error.
function listFilms(ctx, key, rp, slug, subj, subjectState) {
  if (!fs.existsSync(subj.films)) return [];
  return fs.readdirSync(subj.films).sort()
    .filter((f) => SLUG_RE.test(f) && fs.existsSync(path.join(subj.films, f, 'state.md')))
    .map((f) => {
      const fp = filmPaths(ctx.home, key, slug, f);
      try {
        const st = readState(fp.state);
        const next = filmNext(rp, subj, subjectState, fp, st);
        return { film: f, name: st.name, format: st.format, phase: st.phase, updated: st.updated, next };
      } catch (e) {
        return { film: f, error: e.message };
      }
    });
}

const nextLabel = (next) => (next === 'done' ? 'done (gate 1 passed)' : phaseLabel(next));
// A film's next step in words. The two analyses it waits for are run by their own skills.
const FILM_NEXT = {
  brand: 'the brand profile (brand-profile)',
  map: "the subject's analysis to gate 1 (app-map)",
  ui: `${phaseLabel('ui')} (gate 2 passed)`,
  build: `${phaseLabel('build')} (the screens are saved)`,
};
const filmNextLabel = (next) => FILM_NEXT[next] || phaseLabel(next);

module.exports = {
  name: 'status',
  usage: 'status [subject slug] [--film <film slug>] [--repo <dir>]',
  summary: "List the app's subjects and its brand profile, or show one subject's files, films and next step, or one film's with --film.",
  flags: { film: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const brand = brandStatus(rp);
    const [slug] = args._;
    if (!slug) {
      const subjects = listSubjects(ctx, key, rp);
      const lines = subjects.length
        ? subjects.map((s) => (s.error
          ? `${s.subject}  unreadable: ${s.error}`
          : `${s.subject}  ${s.kind}  ${phaseLabel(s.phase)}  (${s.updated})`))
        : [`No subjects for ${key} under ${ctx.home}`];
      return { json: { repository: key, subjects, brand }, text: [...lines, brandLine(brand)].join('\n') };
    }
    checkSlug(slug);
    const subj = subjectPaths(ctx.home, key, slug);
    if (!fs.existsSync(subj.state)) throw usageError(`no subject "${slug}" for ${key}; run sp init first`);
    const state = readState(subj.state);
    if (args.flags.film) {
      const fp = filmPaths(ctx.home, key, slug, args.flags.film);
      if (!fs.existsSync(fp.state)) throw usageError(`no film "${args.flags.film}" of ${slug}; run sp film first`);
      const film = readState(fp.state);
      const files = filmFiles(fp);
      const next = filmNext(rp, subj, state, fp, film);
      return {
        json: {
          repository: key, subject: slug, film: film.film, name: film.name, format: film.format, phase: film.phase,
          updated: film.updated, next, files, pending: film.pending, brand, ...(film.gate2 ? { gate2: film.gate2 } : {}),
          ...(film.gate3 ? { gate3: film.gate3 } : {}),
          urls: Object.fromEntries(Object.entries(readJson(fp.films, {})).filter(([, e]) => e.url).map(([b, e]) => [b, e.url])),
        },
        text: [
          `${film.name} (${slug}/${film.film}, ${film.format}) in ${key}`,
          `phase: ${phaseLabel(film.phase)}`,
          `next: ${filmNextLabel(next)}`,
          ...Object.entries(files).map(([f, ok]) => `  ${ok ? 'has' : 'missing'} ${f}`),
          ...film.pending.map((p) => `  pending: ${p}`),
          brandLine(brand),
        ].join('\n'),
      };
    }
    const files = subjectFiles(rp, subj);
    const next = subjectNext(rp, subj, state);
    const films = listFilms(ctx, key, rp, slug, subj, state);
    return {
      json: {
        repository: key, subject: slug, name: state.name, kind: state.kind, phase: state.phase, updated: state.updated,
        next, files, pending: state.pending, films, brand, ...(state.gate1 ? { gate1: state.gate1 } : {}),
      },
      text: [
        `${state.name} (${slug}, ${state.kind}) in ${key}`,
        `phase: ${phaseLabel(state.phase)}`,
        `next: ${nextLabel(next)}`,
        ...Object.entries(files).map(([f, ok]) => `  ${ok ? 'has' : 'missing'} ${f}`),
        ...state.pending.map((p) => `  pending: ${p}`),
        ...(films.length ? ['films:'] : []),
        ...films.map((f) => (f.error
          ? `  ${f.film}  unreadable: ${f.error}`
          : `  ${f.film}  ${f.format}  ${phaseLabel(f.phase)}  next: ${filmNextLabel(f.next)}`)),
        brandLine(brand),
      ].join('\n'),
    };
  },
};
