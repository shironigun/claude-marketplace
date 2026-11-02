'use strict';
const { loadWorkspace, loadModel } = require('../workspace');
const { rankQuestions } = require('../questions');
const { numberFlag } = require('../args');

module.exports = {
  name: 'questions',
  usage: 'questions <slug> [--top N]',
  summary: 'Open questions ranked by blast radius × severity: ask the top five, put the rest on the board',
  flags: { top: 'string' },
  run(ctx, args) {
    const [slug] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    const top = numberFlag(args.flags, 'top', { min: 1, max: 100000, integer: true });
    const ranked = rankQuestions(loadModel(paths));
    const shown = top ? ranked.slice(0, top) : ranked;
    const lines = [ranked.length ? `${ranked.length} open questions, ranked by blast radius × severity:` : 'No open questions.'];
    shown.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.id} score ${q.score} (radius ${q.radius} × severity ${q.severity}): ${q.statement}`);
      if (q.blocks.length) lines.push(`   blocks ${q.blocks.join(', ')}; reaches ${q.nodes.filter((id) => id !== q.id).join(', ')}`);
    });
    if (ranked.length) lines.push('Ask the top five in the session, each with options and a recommended answer; put the rest on the board.');
    return { text: lines.join('\n'), json: { total: ranked.length, questions: shown } };
  },
};
