'use strict';
const { loadWorkspace, withLock, saveModel, saveDecisions } = require('../workspace');
const { loadState } = require('../validate');
const { applyAdd } = require('../add');
const { readJsonFile } = require('../args');

module.exports = {
  name: 'add',
  usage: 'add <slug> <file>',
  summary: 'Add derived nodes (temporary ids like +q1), patch nodes, add or remove links, log decisions; validated as a whole',
  flags: {},
  run(ctx, args) {
    const [slug, file] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    const input = readJsonFile(ctx.root, file);
    const r = withLock(paths, () => {
      const result = applyAdd(loadState(paths), input, { now: ctx.now });
      // decisions first, so a crash between the writes leaves at worst an unused decision
      saveDecisions(paths, result.next.decisions);
      saveModel(paths, result.next);
      return result;
    });
    const ids = Object.entries(r.ids).map(([tmp, id]) => `${tmp} = ${id}`).join(', ');
    return {
      text: `Wrote ${r.changed.length} nodes (${r.changed.join(', ') || 'none'}), ${r.links} links, removed ${r.removed} links, `
        + `${r.decisions.length} decisions${ids ? `\nIds: ${ids}` : ''}`,
      json: { ids: r.ids, changed: r.changed, links: r.links, removed: r.removed, decisions: r.decisions },
    };
  },
};
