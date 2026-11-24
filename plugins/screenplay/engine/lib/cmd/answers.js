'use strict';
const { usageError } = require('../errors');
const { repoInfo, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, approvedFilm } = require('../film');
const { sceneAnswers } = require('../answers');
const { answerLine } = require('../storyboard');

module.exports = {
  name: 'answers',
  usage: 'answers <subject slug> --film <film slug> --scene <scene id> [--repo <dir>]',
  summary: 'The demo answers a screen scene shows (spec 5.9, 5.11): for each call it makes, one answer per request, as the story has it there.',
  flags: { film: 'string', scene: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    const key = workspaceKey(ctx.home, repo);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    if (!args.flags.scene) throw usageError('missing --scene <scene id>');
    const fc = approvedFilm(repoPaths(ctx.home, key), f);
    const calls = sceneAnswers(fc, args.flags.scene);
    if (!calls) throw usageError(`the story has no screen scene "${args.flags.scene}"`);
    const scene = fc.beats.scenes.find((s) => s.id === args.flags.scene);
    const screen = fc.screens.find((s) => s.id === scene.screen);
    return {
      json: { subject: fc.subject, film: fc.film, scene: scene.id, screen: screen.id, calls },
      text: [
        `${scene.id} ${screen.title} (${screen.id}), ${scene.state}:`,
        ...calls.map((c) => `  ${c.id} ${c.method} ${c.path}: ${c.answers.map(answerLine).join('; ') || 'no answer yet'}`),
      ].join('\n'),
    };
  },
};
