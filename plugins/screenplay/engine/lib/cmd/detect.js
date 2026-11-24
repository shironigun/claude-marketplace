'use strict';
const fs = require('fs');
const { writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey, claimWorkspace } = require('../paths');
const { detectStack, summarize } = require('../detect');
const { check } = require('../schema');

module.exports = {
  name: 'detect',
  usage: 'detect [--repo <dir>]',
  summary: "Run the detector tables on the app's repository and save the profile's stack.json (spec 6).",
  flags: { repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const { stack, skipped } = detectStack(repo.dir, { repository: key, now: ctx.now });
    const errors = check('stack', stack);
    // The engine made this file, so a schema failure is an engine bug (exit 3), not the user's input.
    if (errors.length) throw new Error(`stack.json failed its schema: ${errors.join('; ')}`);
    const rp = repoPaths(ctx.home, key);
    claimWorkspace(ctx.home, repo, key);
    writeJson(rp.stack, stack);
    fs.mkdirSync(rp.inbox, { recursive: true });
    const summary = summarize(stack);
    const text = [summary, ...skipped.map((s) => `skipped ${s.path}: ${s.reason}`)].join('\n');
    return { json: { saved: rp.stack, workspace: rp.root, inbox: rp.inbox, summary, stack, skipped }, text };
  },
};
