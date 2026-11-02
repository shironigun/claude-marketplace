'use strict';
const { loadWorkspace, loadModel } = require('../workspace');
const { MODEL_TYPES, STATUSES } = require('../schema');
const { SECTION_TYPES, queryNodes, nodeLine } = require('../query');
const { numberFlag, listFlag } = require('../args');
const { usageError } = require('../errors');

module.exports = {
  name: 'query',
  usage: 'query <slug> [--type T,..] [--status S,..] [--section A-K] [--text <words>] [--id ID,..] [--limit 50] [--all]',
  summary: 'Compact slices of the model, one line per node; superseded nodes only with --all',
  flags: { type: 'string', status: 'string', section: 'string', text: 'string', id: 'string', limit: 'string', all: 'boolean' },
  run(ctx, args) {
    const [slug] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    const f = args.flags;
    const section = f.section === undefined ? undefined : String(f.section).toUpperCase();
    if (section !== undefined && !SECTION_TYPES[section]) throw usageError(`--section must be one of ${Object.keys(SECTION_TYPES).join(', ')}`);
    const limit = numberFlag(f, 'limit', { min: 1, max: 100000, integer: true, fallback: 50 });
    const found = queryNodes(loadModel(paths).nodes, {
      types: listFlag(f, 'type', MODEL_TYPES),
      statuses: listFlag(f, 'status', STATUSES),
      ids: listFlag(f, 'id'),
      text: f.text,
      section,
      all: Boolean(f.all),
    });
    const shown = found.slice(0, limit);
    const lines = shown.map(nodeLine);
    if (found.length > shown.length) lines.push(`... and ${found.length - shown.length} more (use --limit)`);
    return { text: lines.length ? lines.join('\n') : 'No nodes match.', json: { total: found.length, nodes: shown } };
  },
};
