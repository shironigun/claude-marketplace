'use strict';
const path = require('path');
const { usageError } = require('../errors');
const { readJson, writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, approvedFilm } = require('../film');
const { filmNext } = require('../progress');
const { codeSource, neededScreens, screensStatus, screenBrief, themeBrief } = require('../screens');

const kib = (n) => `${Math.ceil(n / 1024)} KiB`;

module.exports = {
  name: 'screens',
  usage: 'screens <subject slug> --film <film slug> [--brief <screen id|theme>] [--repo <dir>]',
  summary: "Where a film's screens from code stand once gate 2 has passed (spec 5.11): the theme and each screen the story shows; with --brief, the UI builder's brief for one of them, written to the inbox.",
  flags: { film: 'string', brief: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    const fc = approvedFilm(rp, f);
    const what = args.flags.brief;
    if (what) {
      const shown = neededScreens(fc).map((s) => s.id);
      if (what !== 'theme' && !shown.includes(what)) {
        throw usageError(`the story shows no screen "${what}"; use theme or one of: ${shown.join(', ')}`);
      }
      // A screen is read where its subject's map is: at the branch it names, or at HEAD; the theme at HEAD.
      const brief = what === 'theme' ? themeBrief(rp, codeSource(repo, rp))
        : screenBrief(fc, readJson(rp.theme, null), what, codeSource(repo, rp, readJson(f.subj.screens).branch || null));
      const out = path.join(rp.inbox, `${fc.subject}.${fc.film}.${what}.brief.json`);
      const result = path.join(rp.inbox, what === 'theme' ? 'theme.json' : `${fc.subject}.${fc.film}.${what}.json`);
      writeJson(out, brief);
      return {
        json: { brief: out, result },
        text: `Wrote the UI builder's brief for ${what} to ${out}; its result goes to ${result}`,
      };
    }
    const status = screensStatus(fc, rp, f.fp);
    const next = filmNext(rp, f.subj, f.subjectState, f.fp, f.filmState);
    return {
      json: { subject: fc.subject, film: fc.film, ...status, next },
      text: [
        `Screens of the film ${fc.film} of ${fc.subject}:`,
        `theme: ${status.theme.saved ? 'saved' : 'not saved'}`,
        ...status.theme.problems.map((p) => `  ${p}`),
        ...status.screens.flatMap((s) => [
          `${s.id} ${s.title} (${s.scenes.join(', ')}): ${s.saved ? 'saved' : 'not saved'}`, ...s.problems.map((p) => `  ${p}`),
        ]),
        `size: ${kib(status.bytes)} of ${kib(status.limit)}`,
        status.ready ? 'ready for the build' : 'not ready for the build',
      ].join('\n'),
    };
  },
};
