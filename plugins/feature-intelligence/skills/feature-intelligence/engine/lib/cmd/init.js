'use strict';
const { initWorkspace } = require('../workspace');
const { relPath } = require('../paths');
const { usageError } = require('../errors');

module.exports = {
  name: 'init',
  usage: 'init <slug> --mode new|existing [--name <text>]',
  summary: 'Create a feature workspace, the profile stub and the .gitignore entry',
  flags: { mode: 'string', name: 'string' },
  run(ctx, args) {
    const [slug] = args._;
    if (!slug) throw usageError('usage: fi init <slug> --mode new|existing');
    const r = initWorkspace(ctx.root, slug, { mode: args.flags.mode, name: args.flags.name, now: ctx.now });
    const lines = [`Created workspace ${slug} (mode ${r.manifest.mode}) in ${relPath(ctx.root, r.paths.ws)}`];
    if (r.profileCreated) lines.push(`Created the profile stub ${relPath(ctx.root, r.paths.profile)}: fill in product and tracker`);
    if (r.gitignoreUpdated) lines.push('Added .feature-intelligence/ to .gitignore');
    lines.push(`Next: fi ingest ${slug} <file>`);
    return {
      text: lines.join('\n'),
      json: {
        slug, mode: r.manifest.mode, workspace: relPath(ctx.root, r.paths.ws),
        profileCreated: r.profileCreated, gitignoreUpdated: r.gitignoreUpdated,
      },
    };
  },
};
