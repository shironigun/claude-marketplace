'use strict';
const { loadWorkspace, saveManifest, withLock } = require('../workspace');
const { computeCoverage } = require('../coverage');
const { numberFlag } = require('../args');

const pct = (r) => `${(r * 100).toFixed(1)}%`;
const short = (t) => (t == null ? '(no text: read the page or image)' : t.length > 80 ? `${t.slice(0, 77)}...` : t);

module.exports = {
  name: 'coverage',
  usage: 'coverage <slug> [--min 0.95]',
  summary: 'Chunks accounted for, per source; lists every unaccounted chunk; exits 1 below --min',
  flags: { min: 'string' },
  run(ctx, args) {
    const [slug] = args._;
    const { paths } = loadWorkspace(ctx.root, slug);
    const min = numberFlag(args.flags, 'min', { min: 0, max: 1 });
    const c = withLock(paths, () => {
      const result = computeCoverage(paths);
      const { manifest } = loadWorkspace(ctx.root, slug);
      saveManifest(paths, { ...manifest, coverage: { chunks: result.chunks, covered: result.covered, setAside: result.setAside } });
      return result;
    });
    const pass = min === undefined || c.ratio >= min;
    const lines = [`Coverage ${c.covered + c.setAside}/${c.chunks} chunks (${pct(c.ratio)}): ${c.covered} cited, ${c.setAside} set aside, ${c.unaccounted.length} unaccounted`];
    for (const s of c.perSource) lines.push(`  ${s.id} ${s.title}: ${s.covered + s.setAside}/${s.chunks}${s.status === 'unreadable' ? ' (unreadable)' : ''}`);
    if (c.unaccounted.length) {
      lines.push('Unaccounted:');
      for (const u of c.unaccounted) lines.push(`  ${u.id} ${u.anchor}: ${u.unreadable ? '(unreadable source)' : short(u.text)}`);
      lines.push(`Next: send these chunks to an extractor once; set aside what carries nothing: fi set-aside ${slug} <chunk...> --reason <text>`);
    }
    if (!pass) lines.push(`Below the minimum of ${pct(min)}.`);
    return { text: lines.join('\n'), json: { ...c, min: min === undefined ? null : min, pass }, exitCode: pass ? 0 : 1 };
  },
};
