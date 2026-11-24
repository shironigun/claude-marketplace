'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, filmRepo, validJson, inputFile } = require('./helpers');
const { readState } = require('../lib/state');

const NOW = '2026-11-12T10:00:00.000Z';

// The sample app's promo with its mods, story and demo data saved from the valid examples.
function planned() {
  const f = filmRepo();
  for (const kind of ['mods', 'beats', 'demo-data']) {
    const r = runSp(f.repo, ['save', kind, inputFile(validJson(kind), f.repo), '--subject', 'orders', '--film', 'promo'], f.env);
    assert.equal(r.code, 0, `${kind}: ${r.stderr}`);
  }
  return f;
}

const STORYBOARD = `# Storyboard: Orders, promo

A promo of Orders (a feature), 30.6 s of the 30-60 s a promo runs. Approving it passes gate 2.

## Mods

| Mod | Choice |
|---|---|
| Format | Promo |
| Look | Floating desk |
| Ground | Light |
| Callouts | Focus-pop with chip and leader |
| Pointer | Cursor with click ripple, pinned |
| Transitions | Glide between shots |
| Pacing | Standard |
| Intro | Boom |
| End card status chip | New |
| Demo-data note | On |
| Sound | Score on the beat |
| Product polish | As is |
| Walkthrough patterns | Dialog step-through on Orders list (SCR-01) |
| Brands | Sample |

## Personas

- Dana Reyes, Sales lead (P-01)

## Scenes

### S-01 Title card, 3.0 s

**Orders**: Every order, one click away

### S-02 Orders list (SCR-01), populated, 24.6 s

Persona: Dana Reyes. Pattern: dialog step-through.

| # | Beat | Caption | Truth | Time |
|---|---|---|---|---|
| 1 | Hold on the orders list |  |  | 8.0 s |
| 2 | Point at the first order |  |  | 1.4 s |
| 3 | Click the first order (drawer: Open order) |  |  | 1.2 s |
| 4 | Hold on the order drawer | Approval: only when someone presses Approve | T-01 manual-only | 6.0 s |
| 5 | Hold on the Approve button |  |  | 8.0 s |

### S-03 End card, 3.0 s

**Orders**: Approve with confidence

## Demo data

| Call | Answers |
|---|---|
| API-01 GET /api/orders | any request, 2 items |
| API-02 GET /api/orders/:id | id=O-1001 |

## Must not show

- nothing in the ledger
`;

test('storyboard: the mods, personas, scenes with their beats, captions, truth links and timings, the demo data and the must-not-show list', () => {
  const f = planned();
  const r = runSp(f.repo, ['storyboard', 'orders', '--film', 'promo', '--json'], f.env);
  assert.equal(r.code, 0, r.stderr);
  const saved = path.join(f.film, 'story', 'storyboard.md');
  assert.deepEqual(r.json, { subject: 'orders', film: 'promo', saved, scenes: 3, captions: 1, seconds: 30.6 });
  assert.match(runSp(f.repo, ['storyboard', 'orders', '--film', 'promo'], f.env).stdout, /^Saved the storyboard \(3 scenes, 1 caption, 30\.6 s\) to /);
  assert.equal(fs.readFileSync(saved, 'utf8'), STORYBOARD);
  assert.equal(runSp(f.repo, ['status', 'orders', '--film', 'promo', '--json'], f.env).json.files['storyboard.md'], true);
});

test('storyboard: a < in a card or a table cell is escaped, so a renderer that drops tags still shows it', () => {
  const f = planned();
  const story = validJson('beats');
  story.scenes[0].line = 'Every <order>, one click away';
  story.scenes[1].beats[3].caption.value = 'only when <someone> presses Approve';
  assert.equal(runSp(f.repo, ['save', 'beats', inputFile(story, f.repo), '--subject', 'orders', '--film', 'promo'], f.env).code, 0);
  const r = runSp(f.repo, ['storyboard', 'orders', '--film', 'promo', '--json'], f.env);
  assert.equal(r.code, 0, r.stderr);
  const board = fs.readFileSync(r.json.saved, 'utf8');
  assert.match(board, /^\*\*Orders\*\*: Every \\<order>, one click away$/m);
  assert.match(board, /^\| 4 \| Hold on the order drawer \| Approval: only when \\<someone> presses Approve \| T-01 manual-only \| 6\.0 s \|$/m);
});

test('storyboard: when the story\'s screens make no call, the demo data section says there is none', () => {
  const f = filmRepo();
  const save = (kind, value, ...rest) => runSp(f.repo, ['save', kind, inputFile(value, f.repo), '--subject', 'orders', ...rest], f.env);
  const screens = validJson('screens');
  for (const s of screens.screens) {
    s.calls = [];
    for (const a of s.actions) delete a.calls;
  }
  assert.equal(save('screens', screens).code, 0);
  for (const [kind, value] of [['mods', validJson('mods')], ['beats', validJson('beats')], ['demo-data', { calls: {} }]]) {
    assert.equal(save(kind, value, '--film', 'promo').code, 0, kind);
  }
  const r = runSp(f.repo, ['storyboard', 'orders', '--film', 'promo', '--json'], f.env);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(/^## Demo data\n\n(.+)$/m.exec(fs.readFileSync(r.json.saved, 'utf8'))[1],
    "None: the story's screens make no calls, so there is no demo data.");
});

test('storyboard: a film with a file not saved, or one that no longer passes against the subject, gets none', () => {
  const f = filmRepo();
  const early = runSp(f.repo, ['storyboard', 'orders', '--film', 'promo'], f.env);
  assert.equal(early.code, 1);
  assert.match(early.stderr, /the film has 3 problems:\n {2}mods: not saved yet; save it with sp save mods\n {2}beats: not saved yet/);
  const g = planned();
  const truth = validJson('truth');
  truth.entries[0].kind = 'does-not'; // the analysis now says the approval caption shows something the app does not do
  assert.equal(runSp(g.repo, ['save', 'truth', inputFile(truth, g.repo), '--subject', 'orders'], g.env).code, 0);
  const stale = runSp(g.repo, ['storyboard', 'orders', '--film', 'promo'], g.env);
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /beats: \/scenes\/1\/beats\/3\/caption: T-01 is a does-not entry; a caption rests on a does, manual-only or limit entry/);
  assert.equal(fs.existsSync(path.join(g.film, 'story', 'storyboard.md')), false);
});

test('confirm gate-2: after the story, and only for the storyboard the film\'s files give now', () => {
  const f = filmRepo();
  const confirm = (...rest) => runSp(f.repo, ['confirm', 'gate-2', ...rest], f.env);
  const early = confirm('--subject', 'orders', '--film', 'promo');
  assert.equal(early.code, 1);
  assert.match(early.stderr, /gate 2 comes after the story; the next step is mods/);
  assert.equal(confirm('--film', 'promo').code, 2);
  assert.match(confirm('--subject', 'orders').stderr, /missing --film <film slug>/);
  for (const kind of ['mods', 'beats', 'demo-data']) {
    assert.equal(runSp(f.repo, ['save', kind, inputFile(validJson(kind), f.repo), '--subject', 'orders', '--film', 'promo'], f.env).code, 0);
  }
  const unseen = confirm('--subject', 'orders', '--film', 'promo');
  assert.equal(unseen.code, 1);
  assert.match(unseen.stderr, /the storyboard is not the one the film's files give now: run sp storyboard orders --film promo, show it, and ask again/);
  assert.equal(runSp(f.repo, ['storyboard', 'orders', '--film', 'promo'], f.env).code, 0);
  const board = path.join(f.film, 'story', 'storyboard.md');
  fs.appendFileSync(board, '\nA line the engine did not write.\n');
  assert.equal(confirm('--subject', 'orders', '--film', 'promo').code, 1);
  assert.equal(runSp(f.repo, ['storyboard', 'orders', '--film', 'promo'], f.env).code, 0);
  const ok = confirm('--subject', 'orders', '--film', 'promo', '--json');
  assert.deepEqual(ok.json, { confirmed: 'gate-2', subject: 'orders', film: 'promo', at: NOW });
  assert.equal(readState(path.join(f.film, 'state.md')).gate2, NOW);
  assert.equal(runSp(f.repo, ['status', 'orders', '--film', 'promo', '--json'], f.env).json.next, 'ui');
});

test('storyboard: it names the subject as gate 1\'s Name decision does, when there is one', () => {
  const f = planned();
  assert.equal(runSp(f.repo, ['state', 'orders', '--decision', 'Name: Order desk'], f.env).code, 0);
  assert.equal(runSp(f.repo, ['storyboard', 'orders', '--film', 'promo'], f.env).code, 0);
  const board = fs.readFileSync(path.join(f.film, 'story', 'storyboard.md'), 'utf8');
  assert.match(board, /^# Storyboard: Order desk, promo\n\nA promo of Order desk \(a feature\)/);
});

test('storyboard: a story the Motion type or the kit cannot play is refused before gate 2', () => {
  const f = filmRepo();
  const beats = validJson('beats');
  beats.scenes[1].beats[4].do = 'scroll';
  for (const [kind, value] of [['mods', validJson('mods')], ['beats', beats], ['demo-data', validJson('demo-data')]]) {
    assert.equal(runSp(f.repo, ['save', kind, inputFile(value, f.repo), '--subject', 'orders', '--film', 'promo'], f.env).code, 0, kind);
  }
  const r = runSp(f.repo, ['storyboard', 'orders', '--film', 'promo'], f.env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /beats: S-02\.5 scrolls, which a film does not play yet; hold on what the scroll shows instead/);
});
