'use strict';
const path = require('path');
const { checkForks } = require('../forks');

const STATES = {
  current: () => 'up to date',
  behind: (f) => `${f.commits.length} upstream commit${f.commits.length === 1 ? '' : 's'} since the stamp`,
  'source-absent': () => 'the source is not in this repository (fine when the plugin is installed on its own)',
  'no-repo': () => 'not in a git repository, so nothing to compare',
  'unknown-commit': () => 'the stamp commit is not in this repository (rewritten history?); check the source and re-stamp',
};

module.exports = {
  name: 'forks',
  usage: 'forks [--strict] [--plugin <dir>]',
  summary: 'List forked files, their stamps, and upstream commits since each stamp; --strict exits 1 when one is behind',
  flags: { strict: 'boolean', plugin: 'string' },
  run(ctx, args) {
    const pluginRoot = args.flags.plugin ? path.resolve(ctx.root, args.flags.plugin) : ctx.pluginRoot;
    const forks = checkForks(pluginRoot);
    const lines = forks.length ? [] : ['No forked files.'];
    for (const f of forks) {
      lines.push(`${f.file} <- ${f.source} @ ${f.commit} (${f.forkedOn}): ${STATES[f.state](f)}`);
      for (const c of f.commits) lines.push(`    ${c}`);
    }
    const stale = forks.filter((f) => f.state === 'behind' || f.state === 'unknown-commit');
    return { text: lines.join('\n'), json: { forks }, exitCode: args.flags.strict && stale.length ? 1 : 0 };
  },
};
