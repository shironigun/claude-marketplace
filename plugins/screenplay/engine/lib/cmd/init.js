'use strict';
const fs = require('fs');
const { usageError } = require('../errors');
const { slugify } = require('../text');
const { writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey, claimWorkspace, subjectPaths, checkSlug, checkKind } = require('../paths');
const { readState, writeState } = require('../state');

module.exports = {
  name: 'init',
  usage: 'init <subject name> [--kind feature|module|flow] [--slug <slug>] [--repo <dir>]',
  summary: "Create a subject's workspace outside the app's repository (a feature by default), or report the one that exists.",
  flags: { kind: 'string', slug: 'string', repo: 'string' },
  run(ctx, args) {
    const name = args._.join(' ').trim();
    if (!name) throw usageError('missing <subject name>');
    // The name is the title line of state.md.
    if (/[\r\n]/.test(name)) throw usageError('the subject name must be one line');
    const kind = checkKind(args.flags.kind || 'feature');
    if (!args.flags.slug && !slugify(name)) {
      throw usageError(`the subject name "${name}" has no letters a-z or digits to make a slug from; give one with --slug <slug>`);
    }
    const slug = checkSlug(args.flags.slug || slugify(name));
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    claimWorkspace(ctx.home, repo, key);
    const subj = subjectPaths(ctx.home, key, slug);
    const created = !fs.existsSync(subj.state);
    if (created) {
      fs.mkdirSync(subj.map, { recursive: true });
      writeJson(subj.subject, { name, kind });
      writeState(subj.state, {
        name, subject: slug, kind, repository: key, phase: 'bootstrap', updated: ctx.now, decisions: [], pending: [],
      });
    }
    const { inbox } = repoPaths(ctx.home, key);
    fs.mkdirSync(inbox, { recursive: true });
    const state = readState(subj.state);
    return {
      json: {
        repository: key, repositoryDir: repo.dir, subject: slug, kind: state.kind, workspace: subj.root, inbox, created,
        phase: state.phase,
      },
      text: created
        ? `Created ${subj.root} (${kind})`
        : `Workspace exists: ${subj.root} (${state.kind}, phase ${state.phase}); resume from its state.md`,
    };
  },
};
