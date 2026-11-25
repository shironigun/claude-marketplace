'use strict';
const fs = require('fs');
const { readText } = require('./text');
const { writeFileAtomic } = require('./files');
const { checkError, usageError } = require('./errors');

// The workflow's phases and gates in order (spec 5.1): [id, number, title].
const PHASES = [
  ['bootstrap', '0', 'Bootstrap'],
  ['brand', '1', 'Brand profile'],
  ['screens', '2', 'Screen map'],
  ['backend', '3', 'Backend trace'],
  ['context', '4', 'Context'],
  ['gate-1', 'G1', 'Dossier check'],
  ['mods', '5', 'Mods'],
  ['story', '6', 'Story and demo data'],
  ['gate-2', 'G2', 'Storyboard'],
  ['ui', '7', 'Screens from code'],
  ['build', '8', 'Build'],
  ['verify', '9', 'Verify'],
  ['gate-3', 'G3', 'First cut'],
  ['review', '10', 'Comment loop'],
];
const PHASE_IDS = PHASES.map((p) => p[0]);
// A subject's Working State covers the analysis; each film keeps its own for phases 5-10.
const SUBJECT_PHASES = PHASE_IDS.slice(0, PHASE_IDS.indexOf('gate-1') + 1);
const FILM_PHASES = PHASE_IDS.slice(PHASE_IDS.indexOf('mods'));
const NONE = /^\(none(?: yet)?\)$/;

function phaseLabel(id) {
  const p = PHASES.find((x) => x[0] === id);
  return p ? `${p[1]} ${p[2]}` : id;
}

function checkPhase(id, allowed = PHASE_IDS) {
  if (!allowed.includes(id)) throw usageError(`unknown phase "${id}"; use one of: ${allowed.join(', ')}`);
  return id;
}

// The decisions a skill records under a key (spec 5.6, 5.7), with the values allowed where they are fixed. A new
// answer to a key replaces the old one; any other decision is kept once. A film shows demo data only and the app
// never runs (spec D21), so there is no data or run decision.
const DECISION_KEYS = {
  Stack: null,
  Branch: null,
  Name: null,
  Release: ['released', 'new', 'beta', 'unreleased'],
};

function decisionKey(text) {
  const m = /^([A-Z][a-z]+): /.exec(text);
  return m && Object.hasOwn(DECISION_KEYS, m[1]) ? m[1] : null;
}

function checkDecision(text) {
  const key = decisionKey(text);
  const allowed = key && DECISION_KEYS[key];
  if (allowed && !allowed.includes(text.slice(key.length + 2).trim())) {
    throw usageError(`a ${key} decision is one of: ${allowed.join(', ')} (as "${key}: ${allowed[0]}")`);
  }
  return text;
}

// The decisions with `text` recorded: in place of an earlier answer to its key, or of the same text, else last.
function setDecision(decisions, text) {
  const key = decisionKey(text);
  const same = (d) => (key ? decisionKey(d) === key : d === text);
  const i = decisions.findIndex(same);
  if (i === -1) return [...decisions, text];
  return decisions.flatMap((d, j) => (j === i ? [text] : same(d) ? [] : [d]));
}

// The recorded answer to a key, or null when there is none or it is not one of the key's values.
function decisionValue(decisions, key) {
  const d = decisions.find((x) => decisionKey(x) === key);
  if (d === undefined) return null;
  const value = d.slice(key.length + 2).trim();
  return DECISION_KEYS[key] && !DECISION_KEYS[key].includes(value) ? null : value;
}

// state.md: a short Markdown file the user can read, and the resume point (spec 4.2).
function renderState(s) {
  const list = (items, empty) => (items.length ? items.map((i) => `- ${i}`) : [`- ${empty}`]);
  return [
    `# Working State: ${s.name}`, '',
    `- subject: ${s.subject}`,
    ...(s.film ? [`- film: ${s.film}`, `- format: ${s.format}`] : []),
    `- kind: ${s.kind}`,
    `- repository: ${s.repository}`,
    `- phase: ${s.phase} (${phaseLabel(s.phase)})`,
    `- updated: ${s.updated}`,
    ...(s.gate1 ? [`- gate-1: passed ${s.gate1}`] : []),
    ...(s.gate2 ? [`- gate-2: passed ${s.gate2}`] : []),
    ...(s.gate3 ? [`- gate-3: passed ${s.gate3}`] : []), '',
    '## Decisions', ...list(s.decisions, '(none yet)'), '',
    '## Pending', ...list(s.pending, '(none)'), '',
  ].join('\n');
}

function parseState(text) {
  const lines = readText(text).split('\n');
  const title = /^# Working State: (.+)$/.exec(lines[0] || '');
  // Fields sit above the first section, so a decision or a pending item is never read as one.
  const end = lines.findIndex((l) => l.startsWith('## '));
  const head = end === -1 ? lines : lines.slice(0, end);
  const field = (k) => {
    const line = head.find((l) => l.startsWith(`- ${k}: `));
    return line ? line.slice(k.length + 4).trim() : undefined;
  };
  const section = (name) => {
    const start = lines.indexOf(`## ${name}`);
    if (start === -1) return [];
    const out = [];
    for (const l of lines.slice(start + 1)) {
      if (l.startsWith('## ')) break;
      const m = /^- (.+)$/.exec(l);
      if (m && !NONE.test(m[1])) out.push(m[1]);
    }
    return out;
  };
  const phase = (field('phase') || '').split(' ')[0];
  const passed = (gate) => {
    const value = field(gate);
    return value && value.startsWith('passed ') ? value.slice('passed '.length) : undefined;
  };
  if (!title || !field('subject') || !PHASE_IDS.includes(phase) || (field('film') && !field('format'))) {
    throw checkError('state.md is not a Working State file');
  }
  return {
    name: title[1].trim(),
    subject: field('subject'),
    ...(field('film') ? { film: field('film'), format: field('format') } : {}),
    kind: field('kind'),
    repository: field('repository'),
    phase,
    updated: field('updated'),
    decisions: section('Decisions'),
    pending: section('Pending'),
    ...(passed('gate-1') ? { gate1: passed('gate-1') } : {}),
    ...(passed('gate-2') ? { gate2: passed('gate-2') } : {}),
    ...(passed('gate-3') ? { gate3: passed('gate-3') } : {}),
  };
}

function readState(file) {
  if (!fs.existsSync(file)) throw checkError(`no Working State at ${file}`);
  return parseState(fs.readFileSync(file));
}

function writeState(file, s) {
  writeFileAtomic(file, renderState(s));
}

module.exports = {
  PHASES, PHASE_IDS, SUBJECT_PHASES, FILM_PHASES, DECISION_KEYS, phaseLabel, checkPhase, decisionKey, checkDecision,
  setDecision, decisionValue, renderState, parseState, readState, writeState,
};
