'use strict';
const { repoInfo, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, filmContext } = require('../film');
const { CATALOG } = require('../catalog');
const { preselect, modChoices } = require('../mods');

module.exports = {
  name: 'mods',
  usage: 'mods <subject slug> --film <film slug> [--repo <dir>]',
  summary: "What a film's mods form needs (spec 5.8): the catalog, the preselected options, the saved mods, the subject's screens, the brands, and the release status.",
  flags: { film: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    const key = workspaceKey(ctx.home, repo);
    const fc = filmContext(repoPaths(ctx.home, key), loadFilm(ctx.home, key, args._[0], args.flags.film));
    const preselected = preselect(fc);
    const screens = fc.screens.map((s) => ({
      id: s.id, title: s.title, ...(s.feature ? { feature: s.feature } : {}), actions: [...new Set(s.actions.map((a) => a.kind))],
    }));
    const shown = fc.mods || preselected;
    return {
      json: {
        subject: fc.subject, film: fc.film, format: fc.format, release: fc.release, preselected,
        current: fc.mods, screens, brands: fc.brands.map((b) => ({ id: b.id, name: b.name })), catalog: CATALOG,
      },
      text: [
        `Mods of the film ${fc.film} of ${fc.subject} (${fc.mods ? 'saved' : 'preselected'}):`,
        ...modChoices(shown, fc).map(([label, choice]) => `  ${label}: ${choice}`),
        `release status: ${fc.release || 'not recorded'}`,
        ...screens.map((s) => `screen ${s.id} ${s.title}: ${s.actions.join(', ') || 'no actions'}`),
      ].join('\n'),
    };
  },
};
