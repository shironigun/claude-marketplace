'use strict';
const { tokens } = require('./text');

// One line per item: titles and statements may hold line breaks.
const oneLine = (s) => String(s).replace(/\s+/g, ' ').trim();

// Section letters and the node types they hold (spec 6.6). L, the release-note drafts, is phase 2.
const SECTION_TYPES = {
  A: ['GOAL', 'PRB', 'SCOPE', 'ACT', 'MET'],
  B: ['BR', 'FR', 'NFR', 'RULE', 'CON', 'ASM', 'DEP'],
  C: ['EPIC', 'FEATURE', 'STORY', 'AC'],
  D: ['WF', 'STEP', 'DP', 'STATE', 'TRANS', 'UC'],
  E: ['SCR', 'MSG', 'CNT'],
  F: ['API', 'ENT', 'INT', 'MOD', 'FLAG'],
  G: ['TS'],
  H: ['DEP', 'RISK', 'ASM'],
  I: ['Q', 'FND'],
  J: ['REC'],
  K: ['EPIC', 'FEATURE', 'STORY', 'TASK'],
};

function hasWords(n, words) {
  if (!words.length) return true;
  const have = tokens(`${n.id} ${n.title} ${n.statement}`);
  return words.every((w) => have.has(w));
}

function queryNodes(nodes, { types, statuses, text, section, ids, all } = {}) {
  const words = text ? [...tokens(text)] : [];
  return nodes.filter((n) => (all || !n.supersededBy)
    && (!section || SECTION_TYPES[section].includes(n.type))
    && (!types || types.includes(n.type))
    && (!statuses || statuses.includes(n.status))
    && (!ids || ids.includes(n.id))
    && hasWords(n, words));
}

function nodeLine(n) {
  const quotes = (n.provenance || []).length;
  return `${n.id} [${n.status}] ${oneLine(n.title)}: ${oneLine(n.statement)}`
    + `${quotes ? ` (${quotes} quote${quotes === 1 ? '' : 's'})` : ''}${n.supersededBy ? ` (superseded by ${n.supersededBy})` : ''}`;
}

module.exports = { SECTION_TYPES, queryNodes, nodeLine, oneLine };
