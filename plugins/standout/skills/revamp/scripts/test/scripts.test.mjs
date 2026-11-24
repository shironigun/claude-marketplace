// From the skill folder: node --test scripts/test/scripts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, find, cite } from '../chats.mjs';
import { check } from '../check.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'fixtures');
const EX = join(HERE, '..', '..', 'examples');
// A Windows checkout may hand back CRLF; the mutations below match on "\n".
const read = (f) => readFileSync(join(EX, f), 'utf8').replace(/\r\n/g, '\n');
const ledger = read('ledger.md');
const draft = read('draft.md');
const errorsOf = (r) => [...r.global, ...r.sections.flatMap((s) => s.errors)];

test('chats: reads both export formats from their folders, newest first', () => {
  const { convs } = load([join(FIX, 'chatgpt'), join(FIX, 'claude')]);
  assert.deepEqual(convs.map((c) => c.title), ['Q4 support review', 'Triage assistant spec', 'Image only']);
  const gpt = convs[0];
  assert.equal(gpt.tool, 'chatgpt');
  assert.deepEqual(gpt.messages.map((m) => m.role), ['user', 'assistant']); // tool turn dropped
  const claude = convs[1];
  assert.equal(claude.messages[0].role, 'user'); // "human" becomes user
  assert.match(claude.messages[0].text, /4 most common ticket types/); // text from content blocks
  assert.equal(claude.messages.length, 2); // tool_use-only message dropped
  assert.equal(convs[2].messages.length, 0); // image-only parts dropped
});

test('chats: skips files and entries that are not conversations', () => {
  assert.equal(load([join(FIX, 'claude', 'users.json')]).skipped, 1);
  assert.equal(load([join(FIX, 'claude')]).skipped, 1);
});

test('chats: find returns a citable snippet, filtered by role', () => {
  const { convs } = load([join(FIX, 'chatgpt'), join(FIX, 'claude')]);
  const hits = find(convs, ['queue redesign'], { role: 'user' });
  assert.equal(hits.length, 1);
  assert.match(hits[0].snippet, /11 hours to 3 hours/);
  assert.equal(cite(hits[0]), 'chatgpt chat "Q4 support review", 2025-12-18, user message (id conv-100)');
  assert.equal(find(convs, ['QUEUE']).length, 2); // case-insensitive, both roles
  assert.throws(() => find(convs, ['  ']), /at least one search term/);
});

test('check: the shipped example passes', () => {
  const r = check(ledger, draft);
  assert.deepEqual(errorsOf(r), []);
  assert.deepEqual(r.sections.flatMap((s) => s.warnings), []);
  assert.ok(r.sections.find((s) => s.kind === 'about').length > 1000);
});

test('check: counts Unicode bold as 2 units and reads bold digits as numbers', () => {
  const bold = '𝟭𝟴 𝗺𝗼𝗻𝘁𝗵𝘀';
  assert.equal(bold.length, 17); // 8 bold characters at 2 units each, plus a space
  const r = check(ledger, draft.replace('Customer Champion award (Q3 2025)\n✔ Speaker', `Customer Champion award (Q3 2025)\n✔ ${bold}\n✔ Speaker`));
  assert.ok(errorsOf(r).some((e) => e.startsWith('"18" is not in any cited fact')));
});

test('check: blocks invented numbers, unconfirmed, planned and internal facts', () => {
  const invented = check(ledger, draft.replace('from 11 hours to 3 hours in 2025', 'from 12 hours to 3 hours in 2025'));
  assert.ok(errorsOf(invented).some((e) => e.startsWith('"12" is not in any cited fact')));
  const cited = check(ledger, draft.replace('Facts: F15\n', 'Facts: F15, F7, F10, F11, F99\n'));
  const errs = errorsOf(cited);
  assert.ok(errs.includes('F7 is UNCONFIRMED. Only CONFIRMED facts go on the profile.'));
  assert.ok(errs.includes('F11 is PLANNED. Only CONFIRMED facts go on the profile.'));
  assert.ok(errs.includes('F10 is INTERNAL ONLY and must not appear.'));
  assert.ok(errs.includes('F99 is not in the ledger.'));
});

test('check: gate, limits and house typography', () => {
  assert.ok(check(ledger.replace('Status: approved', 'Status: draft'), draft).global.some((e) => e.includes('not approved')));
  const long = check(ledger, draft.replace('Support Operations Lead | Faster', `Support Operations Lead | ${'x'.repeat(200)} Faster`));
  assert.ok(errorsOf(long).some((e) => e.includes("over LinkedIn's 220")));
  const typo = check(ledger, draft.replace('Two pages on', 'Two pages \u2014 my r\u00e9sum\u00e9\u200B on'));
  const errs = errorsOf(typo);
  for (const want of ['Em dash', 'without accents', 'Invisible character']) assert.ok(errs.some((e) => e.includes(want)), want);
  const pointer = check(ledger, draft.replace('## Featured: Triage before you automate (Example Support Summit 2025)', '## Featured: My post on the talk'));
  assert.ok(pointer.sections.some((s) => s.warnings.some((w) => w.includes('Title the item as itself'))));
  const repeat = check(ledger, draft.replace('Customer Champion award 2025 ·', 'Customer Champion award 2025 · a team of 9 ·').replace('Facts: F14, F15, F16', 'Facts: F3, F14, F15, F16'));
  assert.ok(repeat.sections.find((s) => s.title === 'Banner brief: Variant B').warnings.some((w) => w.startsWith('"9" is also on Banner brief: Variant A')));
});
