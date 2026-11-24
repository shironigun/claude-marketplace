'use strict';
const fs = require('fs');
const { readJson } = require('./files');
const { readText } = require('./text');
const { sectionText, forbiddenNames } = require('./brief');
const { checkCitations, citationsOf } = require('./citations');
const { subjectFiles, brandStatus, brandLine } = require('./progress');

// What a film may not claim or show (spec 5.5).
const MUST_NOT_SHOW = ['does-not', 'never-populated', 'hidden'];

// The call ids a screen or one of its actions names that api-calls.json does not list.
function unknownCalls(screens, calls) {
  const known = new Set(calls.calls.map((c) => c.id));
  const problems = [];
  for (const s of screens.screens) {
    for (const id of s.calls) if (!known.has(id)) problems.push(`${s.id} calls ${id}, which api-calls.json does not list`);
    for (const a of s.actions) {
      for (const id of a.calls || []) {
        if (!known.has(id)) problems.push(`${s.id} action "${a.label}" calls ${id}, which api-calls.json does not list`);
      }
    }
  }
  return problems;
}

// A subject's dossier for gate 1 (spec 5.7): what the user checks before a film is planned, and what is still
// wrong with the analysis. The citations are checked again, and the ledger is re-checked against the code as it is
// now (the map's branch, or the working tree), not at the commits its citations name.
function buildDossier(repo, rp, subj, state) {
  // Every file of the subject's chain, stack.json included, in the order sp status gives.
  const missing = Object.entries(subjectFiles(rp, subj)).filter(([, saved]) => !saved).map(([f]) => f);
  const screens = readJson(subj.screens, null);
  const calls = readJson(subj.apiCalls, null);
  const truth = readJson(subj.truth, null);
  const brief = fs.existsSync(subj.brief) ? readText(fs.readFileSync(subj.brief)) : null;
  // A truth citation is read where the screen map is: at its branch when it names one, or in the working tree.
  const branch = screens ? screens.branch : undefined;
  const problems = [
    ...(screens && calls ? unknownCalls(screens, calls) : []),
    ...checkCitations(repo.dir, [
      ...(screens ? citationsOf('screens', screens) : []),
      ...(calls ? citationsOf('api-calls', calls) : []),
      ...(truth ? citationsOf('truth', truth).map((c) => ({ ...c, ref: branch })) : []),
    ]),
  ];
  const entries = truth ? truth.entries : [];
  const counts = {};
  for (const e of entries) counts[e.kind] = (counts[e.kind] || 0) + 1;
  return {
    subject: state.subject,
    name: state.name,
    kind: state.kind,
    repository: state.repository,
    ready: !missing.length && !problems.length,
    missing,
    problems,
    purpose: brief && sectionText(brief, 'Purpose'),
    screens: (screens ? screens.screens : []).map((s) => ({
      id: s.id, title: s.title, route: s.route, ...(s.feature ? { feature: s.feature } : {}),
    })),
    calls: calls ? calls.calls.length : 0,
    truth: counts,
    mustNotShow: entries.filter((e) => MUST_NOT_SHOW.includes(e.kind)).map((e) => ({ id: e.id, kind: e.kind, statement: e.statement })),
    open: entries.filter((e) => e.confidence === 'open').map((e) => ({ id: e.id, statement: e.statement, boundary: e.boundary })),
    brand: brandStatus(rp),
    names: brief ? forbiddenNames(brief) : null,
  };
}

function readiness(d) {
  if (d.ready) return 'ready for gate 1';
  const parts = [];
  if (d.missing.length) parts.push(`missing ${d.missing.join(', ')}`);
  if (d.problems.length) parts.push(`${d.problems.length} problem${d.problems.length === 1 ? '' : 's'}`);
  return `not ready: ${parts.join('; ')}`;
}

function renderDossier(d) {
  const list = (items, show) => (items.length ? items.map((x) => `  ${show(x)}`) : ['  none']);
  return [
    `${d.name} (${d.subject}, ${d.kind}) in ${d.repository}`,
    readiness(d),
    `purpose: ${d.purpose || '(no brief yet)'}`,
    'screens:', ...list(d.screens, (s) => `${s.id} ${s.title} ${s.route}${s.feature ? ` (${s.feature})` : ''}`),
    `api calls: ${d.calls}`,
    `truth: ${Object.entries(d.truth).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`,
    'must not show:', ...list(d.mustNotShow, (e) => `${e.id} ${e.kind}: ${e.statement}`),
    'open:', ...list(d.open, (e) => `${e.id}: ${e.statement} (stops at ${e.boundary})`),
    brandLine(d.brand),
    `names no film shows: ${d.names ? d.names.join(', ') || 'none' : '(no brief yet)'}`,
    ...(d.problems.length ? ['problems:', ...d.problems.map((p) => `  ${p}`)] : []),
  ].join('\n');
}

module.exports = { MUST_NOT_SHOW, buildDossier, renderDossier };
