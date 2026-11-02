'use strict';
const { loadWorkspace, withLock } = require('../workspace');
const { propose, apply } = require('../consolidate');
const { readJsonFile } = require('../args');
const { usageError } = require('../errors');

const NEEDS_DECISION = new Set(['update?', 'merge?', 'conflict?']);

function proposalText(slug, proposal) {
  const { clusters } = proposal;
  if (!clusters.length) return 'No pending claims to consolidate.';
  const count = (s) => clusters.filter((k) => k.suggest === s).length;
  const open = clusters.filter((k) => NEEDS_DECISION.has(k.suggest));
  const lines = [`${proposal.claims.length} pending claims in ${clusters.length} clusters: ${count('new')} new, `
    + `${count('same')} restating a node, ${count('merge')} exact repeats, ${open.length} needing a decision.`];
  for (const k of open) {
    lines.push(`${k.id} ${k.type} ${k.suggest} ${k.why}`);
    for (const s of k.statements) lines.push(`  ${s.id}${s.src ? ` ${s.src} ${s.anchor}` : ' (existing)'}: ${s.statement}`);
  }
  for (const k of clusters.filter((c) => c.suggest === 'same' || c.suggest === 'merge')) {
    lines.push(`${k.id} ${k.type} ${k.suggest} ${k.why} (applies unless decided otherwise)`);
  }
  lines.push(open.length
    ? `Decide each with merge, conflict, separate, existing or drop (optional title, statement, type), then: fi consolidate ${slug} --apply <decisions.json>`
    : `Nothing needs a decision; apply the suggestions with a decisions file holding {}: fi consolidate ${slug} --apply <decisions.json>`);
  return lines.join('\n');
}

module.exports = {
  name: 'consolidate',
  usage: 'consolidate <slug> --propose | --apply <decisions.json>',
  summary: 'Cluster pending claims and suggest merges and conflicts; apply the decisions with stable ids',
  flags: { propose: 'boolean', apply: 'string' },
  run(ctx, args) {
    const [slug] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    if (Boolean(args.flags.propose) === Boolean(args.flags.apply)) throw usageError('give --propose or --apply <decisions.json>');
    if (args.flags.propose) {
      const proposal = withLock(paths, () => propose(paths, { now: ctx.now }));
      return { text: proposalText(slug, proposal), json: proposal };
    }
    const decisions = readJsonFile(ctx.root, args.flags.apply);
    const r = withLock(paths, () => apply(paths, decisions, { now: ctx.now }));
    return {
      text: `Applied ${r.clusters} clusters: created ${r.created.join(', ') || 'none'}; updated ${r.updated.join(', ') || 'none'}; `
        + `dropped ${r.dropped} claims.\nNext: fi coverage ${slug}`,
      json: r,
    };
  },
};
