'use strict';
const path = require('path');
const { usageError } = require('../errors');
const { installTools } = require('../tools');

module.exports = {
  name: 'render',
  usage: 'render --install <player folder>',
  summary: "Install the renderer verify needs (spec 12): the Motion player's files the skill read into a folder, playwright-core, and the user's own Chromium.",
  flags: { install: 'string' },
  run(ctx, args) {
    if (!args.flags.install) throw usageError('give --install <player folder>');
    const r = installTools(ctx.home, path.resolve(ctx.cwd, args.flags.install), ctx.env);
    return {
      json: r,
      text: `The renderer is installed: the Motion player, playwright-core ${r.playwright}, and ${r.chromium}`,
    };
  },
};
