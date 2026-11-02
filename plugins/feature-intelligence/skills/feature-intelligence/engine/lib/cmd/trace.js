'use strict';
const { loadWorkspace } = require('../workspace');
const { loadState } = require('../validate');
const { traceNode } = require('../trace');
const { oneLine } = require('../query');
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
    // Lines below the first level name their parent, since a flat list cannot show which node they hang from.
    const edge = (arrow) => (e) => `${'  '.repeat(e.depth)}${arrow} ${e.type} ${e.id} [${e.status}] ${oneLine(e.title)}`
      + `${e.supersededBy ? ` (superseded by ${e.supersededBy})` : ''}${e.depth > 1 ? ` (via ${e.via})` : ''}`;
    const lines = [
      `${n.id} [${n.status}] ${oneLine(n.title)}${n.supersededBy ? ` (superseded by ${n.supersededBy})` : ''}`,
      `  ${oneLine(n.statement)}`,
      ...t.quotes.map((q) => `  "${oneLine(q.quote)}" ${q.src} ${q.anchor} (${oneLine(q.from)})`),
      'Links out:',
      ...(t.out.length ? t.out.map(edge('→')) : ['  (none)']),
      'Links in:',
      ...(t.in.length ? t.in.map(edge('←')) : ['  (none)']),
    ];
    return { text: lines.join('\n'), json: t };
  },
};
