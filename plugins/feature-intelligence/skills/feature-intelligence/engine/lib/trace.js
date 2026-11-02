'use strict';

// The chain around one node: links out (what it rests on) and links in (what rests on it), breadth first.
function traceNode(state, id, depth = 2) {
  const nodes = new Map(state.nodes.map((n) => [n.id, n]));
  const start = nodes.get(id);
  if (!start) return null;
  const decisions = new Map(state.decisions.map((d) => [d.id, d]));
  const sources = new Map(state.sources.map((s) => [s.id, s]));
  const describe = (x) => {
    if (nodes.has(x)) {
      const n = nodes.get(x);
      return { title: n.title, status: n.status, ...(n.supersededBy ? { supersededBy: n.supersededBy } : {}) };
    }
    if (decisions.has(x)) return { title: decisions.get(x).answer, status: 'decision' };
    if (sources.has(x)) return { title: sources.get(x).title, status: 'source' };
    return { title: '', status: /^F-\d+$/.test(x) ? 'board flag' : 'missing' };
  };
  const linksOut = (x) => [
    ...state.links.filter((l) => l.from === x).map((l) => ({ type: l.type, id: l.to })),
    ...((nodes.get(x) && nodes.get(x).derivedFrom) || []).map((d) => ({ type: 'derived from', id: d })),
  ];
  const linksIn = (x) => [
    ...state.links.filter((l) => l.to === x).map((l) => ({ type: l.type, id: l.from })),
    ...state.nodes.filter((n) => (n.derivedFrom || []).includes(x)).map((n) => ({ type: 'derived from', id: n.id })),
  ];
  const walk = (edgesOf) => {
    const out = [];
    const seen = new Set([id]);
    let frontier = [id];
    for (let level = 1; level <= depth && frontier.length; level += 1) {
      const next = [];
      for (const x of frontier) {
        for (const e of edgesOf(x)) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          out.push({ depth: level, via: x, type: e.type, id: e.id, ...describe(e.id) });
          next.push(e.id);
        }
      }
      frontier = next;
    }
    return out;
  };
  const quotes = (start.provenance || []).map((pv) => ({ src: pv.src, anchor: pv.anchor, quote: pv.quote, from: describe(pv.src).title }));
  return { node: start, quotes, out: walk(linksOut), in: walk(linksIn) };
}

module.exports = { traceNode };
