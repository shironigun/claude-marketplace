'use strict';
const { loadWorkspace } = require('../workspace');
const { loadState, validateModel } = require('../validate');

module.exports = {
  name: 'validate',
  usage: 'validate <slug>',
  summary: 'Check the whole model: schema, unique ids, references, provenance quotes and link rules',
  flags: {},
  run(ctx, args) {
    const [slug] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    const state = loadState(paths);
    const errors = validateModel(state);
    const counts = { nodes: state.nodes.length, links: state.links.length, decisions: state.decisions.length };
    return {
      text: errors.length
        ? `${errors.length} problems:\n${errors.map((e) => `  ${e}`).join('\n')}`
        : `The model is valid: ${counts.nodes} nodes, ${counts.links} links, ${counts.decisions} decisions.`,
      json: { valid: !errors.length, errors, counts },
      exitCode: errors.length ? 1 : 0,
    };
  },
};
