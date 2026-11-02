'use strict';
const { loadWorkspace } = require('../workspace');
const { loadState } = require('../validate');
const { traceNode } = require('../trace');
const { numberFlag } = require('../args');
const { usageError } = require('../errors');

module.exports = {
  name: 'trace',
  usage: 'trace <slug> <id> [--depth 2]',
  summary: 'The quotes behind one node, what it rests on, and what rests on it',
  flags: { depth: 'string' },
  run(ctx, args) {
    const [slug, id] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    if (!id) throw usageError('usage: fi trace <slug> <id>');
    const depth = numberFlag(args.flags, 'depth', { min: 1, max: 10, integer: true, fallback: 2 });
    const t = traceNode(loadState(paths), id, depth);
    if (!t) throw usageError(`no node ${id}`);
    const n = t.node;
    const edge = (arrow) => (e) => `${'  '.repeat(e.depth)}${arrow} ${e.type} ${e.id} [${e.status}] ${e.title}`;
    const lines = [
      `${n.id} [${n.status}] ${n.title}${n.supersededBy ? ` (superseded by ${n.supersededBy})` : ''}`,
      `  ${n.statement}`,
      ...t.quotes.map((q) => `  "${q.quote}" ${q.src} ${q.anchor} (${q.from})`),
      'Links out:',
      ...(t.out.length ? t.out.map(edge('→')) : ['  (none)']),
      'Links in:',
      ...(t.in.length ? t.in.map(edge('←')) : ['  (none)']),
    ];
    return { text: lines.join('\n'), json: t };
  },
};
