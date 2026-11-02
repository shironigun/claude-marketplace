'use strict';
const { loadWorkspace, withLock } = require('../workspace');
const { setAsideChunks } = require('../coverage');
const { usageError } = require('../errors');

module.exports = {
  name: 'set-aside',
  usage: 'set-aside <slug> <chunk...> --reason <text>',
  summary: 'Mark chunks that carry nothing to model, with the reason, so coverage counts them',
  flags: { reason: 'string' },
  run(ctx, args) {
    const [slug, ...chunks] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    if (!chunks.length) throw usageError('name at least one chunk, like SRC-002#5');
    const reason = String(args.flags.reason || '').trim();
    if (!reason) throw usageError('--reason is required');
    const n = withLock(paths, () => setAsideChunks(paths, chunks, reason));
    return { text: `Set aside ${n} chunks: ${chunks.join(', ')} (${reason})`, json: { setAside: chunks, reason } };
  },
};
