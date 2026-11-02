'use strict';
const { compareIds } = require('./ids');

const WEIGHTS = { BR: 3, FR: 3, NFR: 3, RULE: 3, STORY: 2, AC: 2, SCR: 1, MSG: 1, CNT: 1 };
// A --type--> B with one of these types means A rests on B, so a question blocking B reaches A too (spec 7).
const RESTS_ON = new Set(['derives-from', 'refines', 'implements', 'covers', 'part-of', 'maps-to']);

function rankQuestions({ nodes, links }) {
  const live = new Map(nodes.filter((n) => !n.supersededBy).map((n) => [n.id, n]));
  const dependents = new Map();
  const depend = (on, id) => {
    if (!dependents.has(on)) dependents.set(on, new Set());
    dependents.get(on).add(id);
  };
  for (const l of links) if (RESTS_ON.has(l.type) && live.has(l.from)) depend(l.to, l.from);
  for (const n of live.values()) for (const d of n.derivedFrom || []) depend(d, n.id);
  const answered = new Set(links.filter((l) => l.type === 'answers').map((l) => l.to));
  const blocks = new Map();
  for (const l of links) {
    if (l.type !== 'blocks' || !live.has(l.to)) continue;
    if (!blocks.has(l.from)) blocks.set(l.from, []);
    blocks.get(l.from).push(l.to);
  }
  const ranked = [...live.values()].filter((n) => n.type === 'Q' && !answered.has(n.id)).map((q) => {
    const blocked = blocks.get(q.id) || [];
    const radius = new Set([q.id]);
    const queue = [...blocked];
    while (queue.length) {
      const id = queue.shift();
      if (radius.has(id)) continue;
      radius.add(id);
      for (const d of dependents.get(id) || []) if (!radius.has(d)) queue.push(d);
    }
    const severity = Math.max(...[...radius].map((id) => WEIGHTS[live.get(id).type] || 1));
    return {
      id: q.id, title: q.title, statement: q.statement, blocks: blocked,
      radius: radius.size, severity, score: radius.size * severity, nodes: [...radius].sort(compareIds),
    };
  });
  return ranked.sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
}

module.exports = { WEIGHTS, rankQuestions };
