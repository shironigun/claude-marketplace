'use strict';
const fs = require('fs');
const { usageError } = require('../errors');
const { repoInfo, repoPaths, workspaceKey, subjectPaths, checkSlug } = require('../paths');
const { readState } = require('../state');
const { buildDossier, renderDossier } = require('../dossier');

module.exports = {
  name: 'dossier',
  usage: 'dossier <subject slug> [--repo <dir>]',
  summary: "A subject's dossier for gate 1: purpose, screens, must-not-show list and names, brands, and what is still wrong.",
  flags: { repo: 'string' },
  run(ctx, args) {
    const slug = checkSlug(args._[0]);
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    const key = workspaceKey(ctx.home, repo);
    const subj = subjectPaths(ctx.home, key, slug);
    if (!fs.existsSync(subj.state)) throw usageError(`no subject "${slug}" for ${key}; run sp init first`);
    const dossier = buildDossier(repo, repoPaths(ctx.home, key), subj, readState(subj.state));
    return { json: dossier, text: renderDossier(dossier) };
  },
};
