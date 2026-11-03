'use strict';
const fs = require('fs');
const { loadSources, loadModel, loadDecisions } = require('./workspace');
const { loadClaims } = require('./claims');
const { pendingClaims } = require('./consolidate');
const { computeCoverage } = require('./coverage');
const { rankQuestions } = require('./questions');

function tally(items, key) {
  const out = {};
  for (const x of items) out[x[key]] = (out[x[key]] || 0) + 1;
  return out;
}

function nextStep(s) {
  const { slug } = s;
  if (!s.sources.total) return `fi ingest ${slug} <file>`;
  if (!s.claims.total) return `extract claims from the chunks, then fi claims add ${slug} <file>`;
  if (s.claims.pending) {
    return s.proposal ? `decide the proposed clusters, then fi consolidate ${slug} --apply <decisions.json>` : `fi consolidate ${slug} --propose`;
  }
  const unaccounted = s.coverage.chunks - s.coverage.covered - s.coverage.setAside;
  if (unaccounted) return `fi coverage ${slug}: ${unaccounted} chunks unaccounted`;
  if (s.openQuestions) return `fi questions ${slug}: ask the top five`;
  return 'analyse the model, then derive what the lens needs';
}

function workspaceStatus(p, manifest) {
  const sources = loadSources(p);
  const { nodes, links } = loadModel(p);
  const live = nodes.filter((n) => !n.supersededBy);
  const coverage = computeCoverage(p);
  const s = {
    slug: manifest.slug, name: manifest.name, mode: manifest.mode, lensDefault: manifest.lensDefault, version: manifest.version,
    sources: { total: sources.length, kinds: tally(sources, 'kind'), unreadable: sources.filter((x) => x.status === 'unreadable').length },
    claims: { total: loadClaims(p).length, pending: pendingClaims(p).length },
    proposal: fs.existsSync(p.proposals),
    nodes: { live: live.length, superseded: nodes.length - live.length, byStatus: tally(live, 'status') },
    links: links.length,
    decisions: loadDecisions(p).length,
    coverage: { chunks: coverage.chunks, covered: coverage.covered, setAside: coverage.setAside, ratio: coverage.ratio },
    openQuestions: rankQuestions({ nodes, links }).length,
  };
  return { ...s, next: nextStep(s) };
}

module.exports = { workspaceStatus, nextStep };
