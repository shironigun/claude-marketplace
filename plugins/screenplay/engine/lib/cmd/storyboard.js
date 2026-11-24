'use strict';
const { checkError } = require('../errors');
const { writeFileAtomic } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, filmContext, planProblems } = require('../film');
const { renderStoryboard } = require('../storyboard');
const { storyMs } = require('../story');

const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

module.exports = {
  name: 'storyboard',
  usage: 'storyboard <subject slug> --film <film slug> [--repo <dir>]',
  summary: "Check a film's mods, story and demo data against the subject as it is now, and write its storyboard for gate 2 (spec 5.9, 5.10).",
  flags: { film: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const film = loadFilm(ctx.home, key, args._[0], args.flags.film);
    const fc = filmContext(repoPaths(ctx.home, key), film);
    const problems = planProblems(fc);
    if (problems.length) {
      throw checkError(`the film has ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  ${problems.join('\n  ')}`);
    }
    writeFileAtomic(film.fp.storyboard, renderStoryboard(fc));
    const scenes = fc.beats.scenes.length;
    const captions = fc.beats.scenes.flatMap((s) => s.beats || []).filter((b) => b.caption).length;
    const seconds = storyMs(fc.beats) / 1000;
    return {
      json: { subject: fc.subject, film: fc.film, saved: film.fp.storyboard, scenes, captions, seconds },
      text: `Saved the storyboard (${count(scenes, 'scene')}, ${count(captions, 'caption')}, ${seconds.toFixed(1)} s) to ${film.fp.storyboard}`,
    };
  },
};
