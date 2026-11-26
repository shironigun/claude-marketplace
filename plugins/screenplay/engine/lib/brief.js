'use strict';
const { readText } = require('./text');

// brief.md (spec 5.6): a title line, then these sections in this order, each with at least one line of text. The app
// never runs (spec 13.2), so there are no run risks to record.
const SECTIONS = ['Purpose', 'Users', 'Payoff', 'Release status', 'Must not show'];

// The title and the `## ` sections of a brief, each with its text trimmed.
function parseBrief(text) {
  const lines = readText(text).split('\n');
  const title = /^# (\S.*)$/.exec(lines[0] || '');
  const sections = [];
  for (const line of lines.slice(1)) {
    const h = /^## (.*\S)\s*$/.exec(line);
    if (h) sections.push({ heading: h[1], lines: [] });
    else if (sections.length) sections[sections.length - 1].lines.push(line);
  }
  return {
    title: title ? title[1].trim() : null,
    sections: sections.map((s) => ({ heading: s.heading, text: s.lines.join('\n').trim() })),
  };
}

function checkBrief(text) {
  const { title, sections } = parseBrief(text);
  const errors = [];
  if (!title) errors.push('line 1: start with the title line "# <subject name>"');
  const headings = sections.map((s) => s.heading);
  if (headings.join('\n') !== SECTIONS.join('\n')) {
    errors.push(`the sections are ${SECTIONS.join(', ')}, in this order (found: ${headings.join(', ') || 'none'})`);
  }
  for (const s of sections) if (SECTIONS.includes(s.heading) && !s.text) errors.push(`## ${s.heading}: has no text`);
  for (const name of forbiddenNames(text)) {
    if (name.replace(/\s/g, '').length < 3) errors.push(`## Must not show: \`${name}\` names too little to look for; give at least 3 characters`);
    else if (/^[A-Z]{1,4}-\d+$/.test(name)) errors.push(`## Must not show: \`${name}\` is an id; a code span here names what no film shows, so write ids and labels as plain text`);
  }
  return errors;
}

// One section's text, or null when the brief has no such section.
function sectionText(text, heading) {
  const s = parseBrief(text).sections.find((x) => x.heading === heading);
  return s ? s.text : null;
}

// The names the brief's must-not-show list gives as code spans (spec 5.6, 13.3): the seed and fixture data's names,
// which no story, demo data or screen may contain.
function forbiddenNames(text) {
  const section = sectionText(text, 'Must not show') || '';
  return [...new Set([...section.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()))];
}

// A string as a viewer reads it, to compare: without the invisible characters (a soft hyphen, a zero-width space), in
// one Unicode form (an accent written as a mark of its own, a full-width letter) and in lower case.
const asRead = (s) => s.replace(/\p{Default_Ignorable_Code_Point}/gu, '').normalize('NFKC').toLowerCase();

// Each string in a JSON value that contains one of the names as a viewer reads it, as a problem at its JSON pointer
// (spec 13.3).
function namesShown(value, names, at = '') {
  const problems = [];
  const visit = (v, p) => {
    if (typeof v === 'string') {
      const read = asRead(v);
      for (const name of names) {
        if (read.includes(asRead(name))) problems.push(`${p || '/'}: shows "${name}", which the brief's must-not-show list names`);
      }
    } else if (v !== null && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) visit(x, `${p}/${k}`);
    }
  };
  visit(value, at);
  return problems;
}

module.exports = { SECTIONS, checkBrief, sectionText, forbiddenNames, namesShown };
