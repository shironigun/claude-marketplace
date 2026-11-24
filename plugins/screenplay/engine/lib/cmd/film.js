'use strict';
const fs = require('fs');
const { usageError } = require('../errors');
const { repoInfo, checkHome, workspaceKey, subjectPaths, filmPaths, checkSlug } = require('../paths');
const { readState, writeState } = require('../state');
const { FORMAT_IDS, formatOf } = require('../catalog');

module.exports = {
  name: 'film',
  usage: 'film <subject slug> <format> [--film <film slug>] [--repo <dir>]',
  summary: "Create a film of a subject in a format, with its own Working State, or report the one that exists. The film's slug is its format unless --film names one.",
  flags: { film: 'string', repo: 'string' },
  run(ctx, args) {
    const [slug, format] = args._;
    checkSlug(slug);
    if (!formatOf(format)) {
      throw usageError(`${format ? `unknown format "${format}"` : 'missing <format>'}; use one of: ${FORMAT_IDS.join(', ')}`);
    }
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const subj = subjectPaths(ctx.home, key, slug);
    if (!fs.existsSync(subj.state)) throw usageError(`no subject "${slug}" for ${key}; run sp init first`);
    const film = args.flags.film || format;
    const fp = filmPaths(ctx.home, key, slug, film);
    const created = !fs.existsSync(fp.state);
    if (created) {
      const subject = readState(subj.state);
      writeState(fp.state, {
        name: `${subject.name}, ${formatOf(format).label.toLowerCase()}`, subject: slug, film, format, kind: subject.kind,
        repository: key, phase: 'mods', updated: ctx.now, decisions: [], pending: [],
      });
    }
    const state = readState(fp.state);
    // One film has one format (spec 4.2): another format is another film.
    if (state.format !== format) {
      throw usageError(`film "${film}" of ${slug} is a ${state.format}; name a new film with --film <slug>`);
    }
    return {
      json: {
        repository: key, subject: slug, film, format, name: state.name, workspace: fp.root, created, phase: state.phase,
      },
      text: created
        ? `Created ${fp.root} (${state.name})`
        : `Film exists: ${fp.root} (${state.name}, phase ${state.phase}); resume from its state.md`,
    };
  },
};
