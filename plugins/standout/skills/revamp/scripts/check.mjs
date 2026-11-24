#!/usr/bin/env node
// Checks a LinkedIn revamp draft against its fact ledger before anything is pasted.
//
//   node check.mjs <ledger.md> <draft.md>
//
// For every "## Section" in the draft it takes the first ```text block (what the user pastes) and the
// "Facts:" line, then checks: the ledger is approved, every cited fact is CONFIRMED and not INTERNAL ONLY,
// every number in the text appears in a cited fact, LinkedIn's length limits, and the house typography.
// Exit code 1 when there is any error. Offline: reads the two files and prints.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Limits LinkedIn shows in its edit forms. Its own counter wins if it ever disagrees.
// LinkedIn counts UTF-16 units, so a Unicode bold letter costs 2; String.length counts the same way.
const LIMITS = { headline: 220, about: 2600, experience: 2000 };
const SKILL_MAX = 80;

const INVISIBLE = /[­᠎\u200B-‏‪-‮⁠-⁤﻿]/;
const LEFTOVER = /\[F\d+\]|\{\{|\bTODO\b|\bTBD\b|\bXX+\b/;
const POINTER_TITLE = /^(my (post|article|video) (on|about)|link to|check out|click here)/i;

// Bold and italic Unicode letters and digits fold back to ASCII under NFKC, so 𝟭𝟴 reads as 18.
const plain = (s) => s.normalize('NFKC');
const numbersIn = (s) => (plain(s).match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,(?=\d{3}\b)/g, ''));

export function parseLedger(text) {
  const facts = new Map();
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 6 || !/^F\d+$/.test(cells[1])) continue;
    facts.set(cells[1], { id: cells[1], fact: cells[2], source: cells[3], status: cells[4].toUpperCase(), sensitivity: cells[5].toUpperCase() });
  }
  const status = (text.match(/^Status:\s*(.+)$/im) || [])[1] || '';
  return { facts, approved: /^approved\b/i.test(status.trim()), status: status.trim() };
}

export function parseDraft(text) {
  const sections = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^## (.+)$/);
    if (h) { cur = { title: h[1].trim(), lines: [] }; sections.push(cur); } else if (cur) cur.lines.push(line);
  }
  return sections.map(({ title, lines }) => {
    const body = lines.join('\n');
    const fence = body.match(/```text\n([\s\S]*?)\n```/);
    const facts = ((body.match(/^Facts:\s*(.*)$/m) || [])[1] || '').split(/[,\s]+/).filter(Boolean);
    const kind = title.split(':')[0].trim().toLowerCase();
    return { title, kind, item: title.includes(':') ? title.slice(title.indexOf(':') + 1).trim() : '', text: fence ? fence[1] : null, facts };
  });
}

export function check(ledgerText, draftText) {
  const ledger = parseLedger(ledgerText);
  const global = [];
  if (!ledger.facts.size) global.push('The ledger has no fact rows ("| F1 | fact | source | STATUS | SENSITIVITY |").');
  if (!ledger.approved) global.push(`The ledger is not approved (Status: ${ledger.status || 'missing'}). Get the user's OK on the facts before drafting.`);

  const sections = parseDraft(draftText).map((s) => {
    const errors = [], warnings = [];
    const text = s.text;
    if (text === null) return { ...s, length: 0, limit: null, errors, warnings, skipped: true };

    if (!s.facts.length) errors.push('No "Facts:" line. Cite the ledger facts this section uses.');
    const cited = [];
    for (const id of s.facts) {
      const f = ledger.facts.get(id);
      if (!f) { errors.push(`${id} is not in the ledger.`); continue; }
      if (f.status !== 'CONFIRMED') errors.push(`${id} is ${f.status}. Only CONFIRMED facts go on the profile.`);
      if (f.sensitivity.startsWith('INTERNAL')) errors.push(`${id} is INTERNAL ONLY and must not appear.`);
      cited.push(f);
    }
    const known = new Set(cited.flatMap((f) => numbersIn(f.fact)));
    for (const n of new Set(numbersIn(text))) {
      if (!known.has(n)) errors.push(`"${n}" is not in any cited fact (${s.facts.join(', ') || 'none'}). Cite the fact that holds it, or remove it.`);
    }

    const length = text.length;
    const limit = LIMITS[s.kind] ?? null;
    if (limit && length > limit) errors.push(`${length.toLocaleString('en-US')} characters, over LinkedIn's ${limit.toLocaleString('en-US')}.`);
    if (s.kind === 'skills') {
      text.split('\n').filter((l) => l.trim().length > SKILL_MAX).forEach((l) => errors.push(`Skill over ${SKILL_MAX} characters: "${l.trim()}"`));
    }

    if (text.includes('\u2014')) errors.push('Em dash found. Use a comma, colon or full stop.');
    if (text.includes('\u2013')) warnings.push('En dash found. Prefer "to" or a hyphen.');
    if (INVISIBLE.test(text)) errors.push('Invisible character found (zero-width, soft hyphen or similar). Delete it.');
    if (/r\u00e9sum\u00e9|r\u00e9sume|resum\u00e9/i.test(plain(text))) errors.push('Write "Resume", without accents.');
    if (LEFTOVER.test(text)) errors.push('Leftover marker (a fact ID, {{placeholder}}, TODO or TBD) in the paste text.');
    if (['featured', 'project', 'certification'].includes(s.kind) && (POINTER_TITLE.test(s.item) || POINTER_TITLE.test(text.trim()))) {
      warnings.push('Title the item as itself ("<Talk title> (<Event> <Year>)"), not as a pointer like "My post on...".');
    }
    if (s.kind === 'experience' && /\bI(?:'m| am)\b/.test(plain(text))) warnings.push('Experience is resume voice: drop "I\'m" / "I am".');
    return { ...s, length, limit, errors, warnings };
  });
  // Banner variants exist to give the user a choice, so each one carries different proof.
  const seen = new Map();
  for (const s of sections.filter((x) => x.kind === 'banner brief' && x.text !== null)) {
    for (const n of new Set(numbersIn(s.text))) {
      if (seen.has(n)) s.warnings.push(`"${n}" is also on ${seen.get(n)}. Give each banner variant different facts.`);
      else seen.set(n, s.title);
    }
  }
  return { ledger, global, sections };
}

function report(r) {
  const c = { CONFIRMED: 0, UNCONFIRMED: 0, PLANNED: 0 };
  r.ledger.facts.forEach((f) => { c[f.status] = (c[f.status] || 0) + 1; });
  const out = [`Ledger: ${r.ledger.status || 'no status'} · ${r.ledger.facts.size} facts (${Object.entries(c).map(([k, v]) => `${v} ${k}`).join(', ')})`, ''];
  r.global.forEach((e) => out.push(`ERROR  ${e}`));
  for (const s of r.sections) {
    if (s.skipped) { out.push(`${s.title.padEnd(44)} no \`\`\`text block, not checked`); continue; }
    const size = s.limit ? `${s.length.toLocaleString('en-US')} / ${s.limit.toLocaleString('en-US')}` : `${s.length.toLocaleString('en-US')} chars`;
    const n = s.errors.length + s.warnings.length;
    out.push(`${s.title.padEnd(44)} ${size.padEnd(14)} ${n ? `${n} to fix` : 'ok'}`);
    s.errors.forEach((e) => out.push(`  ERROR  ${e}`));
    s.warnings.forEach((w) => out.push(`  WARN   ${w}`));
  }
  const errors = r.global.length + r.sections.reduce((a, s) => a + s.errors.length, 0);
  const warnings = r.sections.reduce((a, s) => a + s.warnings.length, 0);
  out.push('', errors || warnings ? `${errors} error(s), ${warnings} warning(s).` : 'All checks passed.');
  return { text: out.join('\n'), errors };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [ledgerPath, draftPath] = process.argv.slice(2);
  if (!ledgerPath || !draftPath) { console.log('Usage: node check.mjs <ledger.md> <draft.md>'); process.exitCode = 2; } else {
    try {
      const { text, errors } = report(check(readFileSync(ledgerPath, 'utf8'), readFileSync(draftPath, 'utf8')));
      console.log(text);
      process.exitCode = errors ? 1 : 0;
    } catch (e) { console.error(e.message); process.exitCode = 1; }
  }
}
