'use strict';
const { loadWorkspace } = require('../workspace');
const { workspaceStatus } = require('../status');

const list = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';

module.exports = {
  name: 'status',
  usage: 'status <slug>',
  summary: 'Where the workspace stands, for resuming, and the next step',
  flags: {},
  run(ctx, args) {
    const [slug] = args._;
    const { paths, manifest } = loadWorkspace(ctx.root, slug);
    const s = workspaceStatus(paths, manifest);
    const lines = [
      `${s.slug} "${s.name}" (mode ${s.mode}, lens ${s.lensDefault}, version ${s.version})`,
      `Sources: ${s.sources.total} (${list(s.sources.kinds)})${s.sources.unreadable ? `, ${s.sources.unreadable} unreadable` : ''}`,
      `Claims: ${s.claims.total}, ${s.claims.pending} pending`,
      `Model: ${s.nodes.live} nodes (${list(s.nodes.byStatus)}), ${s.nodes.superseded} superseded, ${s.links} links, ${s.decisions} decisions`,
      `Coverage: ${s.coverage.covered + s.coverage.setAside}/${s.coverage.chunkCount} chunks (${(s.coverage.ratio * 100).toFixed(1)}%)`,
      `Open questions: ${s.openQuestions}`,
      `Next: ${s.next}`,
    ];
    return { text: lines.join('\n'), json: s };
  },
};
