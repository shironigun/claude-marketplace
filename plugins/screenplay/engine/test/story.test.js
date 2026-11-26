'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, filmRepo, validJson, inputFile, ORDERS_BRIEF } = require('./helpers');
const { check } = require('../lib/schema');
const { beatsProblems, demoProblems } = require('../lib/story');
const { readState, writeState } = require('../lib/state');

const NOW = '2026-11-12T10:00:00.000Z';
// What the checks read for the sample app's promo (lib/film.js filmContext), from the valid examples.
const context = (over = {}) => ({
  subject: 'orders', film: 'promo', format: 'promo', screens: validJson('screens').screens, calls: validJson('api-calls').calls,
  truth: validJson('truth').entries, forbidden: [], brands: [{ id: 'sample', name: 'Sample' }], release: 'new',
  mods: validJson('mods'), beats: validJson('beats'), demo: validJson('demo-data'), ...over,
});

test('save beats and demo-data: the story after the mods, its demo data after the story; a new save asks for gate 2 again', () => {
  const f = filmRepo();
  const save = (kind, value) => runSp(f.repo, ['save', kind, inputFile(value, f.repo), '--subject', 'orders', '--film', 'promo', '--json'], f.env);
  const early = save('beats', validJson('beats'));
  assert.equal(early.code, 1);
  assert.match(early.stderr, /the film has no mods yet; save them first: sp save mods <file> --subject orders --film promo/);
  assert.equal(save('mods', validJson('mods')).code, 0);
  assert.match(save('demo-data', validJson('demo-data')).stderr, /the film has no story yet; save its beats first/);
  assert.deepEqual(save('beats', validJson('beats')).json, { kind: 'beats', saved: path.join(f.film, 'story', 'beats.json'), items: 3 });
  assert.deepEqual(save('demo-data', validJson('demo-data')).json, { kind: 'demo-data', saved: path.join(f.film, 'story', 'demo-data.json'), items: 2 });
  const next = () => runSp(f.repo, ['status', 'orders', '--film', 'promo', '--json'], f.env).json.next;
  assert.equal(next(), 'gate-2');
  const state = path.join(f.film, 'state.md');
  writeState(state, { ...readState(state), gate2: NOW });
  assert.equal(next(), 'ui');
  assert.equal(save('demo-data', validJson('demo-data')).code, 0);
  assert.equal(next(), 'gate-2');
});

test('save beats: every text in the story is one line, so a line break is refused where it is', () => {
  const f = filmRepo();
  const save = (kind, value) => runSp(f.repo, ['save', kind, inputFile(value, f.repo), '--subject', 'orders', '--film', 'promo'], f.env);
  assert.equal(save('mods', validJson('mods')).code, 0);
  const story = validJson('beats');
  story.scenes[1].beats[3].caption.value = 'only when someone\npresses Approve';
  const r = save('beats', story);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /beats has 1 problem:\n {2}\/scenes\/1\/beats\/3\/caption\/value: must match /);
  const lines = validJson('beats');
  lines.personas[0].role = 'Sales\nlead';
  lines.scenes[0].line = 'Every order,\r\none click away';
  lines.scenes[1].beats[3].caption.label = 'Appro\nval';
  lines.scenes[1].beats.push(
    { do: 'type', target: 'the search box', text: 'two\nlines', ms: 1400 },
    { do: 'hold', target: 'the drawer', ms: 1400, caption: { label: 'Approval: now', value: 'by hand', truth: 'T-01' } },
  );
  assert.deepEqual(check('beats', lines), [
    '/personas/0/role: must match ^[^\\r\\n]*$',
    '/scenes/0/line: must match ^[^\\r\\n]*$',
    '/scenes/1/beats/3/caption/label: must match ^[^:\\r\\n]+$',
    '/scenes/1/beats/5/text: must match ^[^\\r\\n]*$',
    '/scenes/1/beats/6/caption/label: must match ^[^:\\r\\n]+$',
  ]);
});

test('beats: each scene is checked against the screen map, the personas, the mods and the ledger', () => {
  const story = validJson('beats');
  const [title, screen, end] = story.scenes;
  const doesNot = { id: 'T-03', kind: 'does-not', statement: 'Orders are never deleted.', evidence: [], confidence: 'confirmed' };
  const fc = context({ truth: [...validJson('truth').entries, doesNot] });
  assert.deepEqual(beatsProblems(story, fc), []);
  assert.deepEqual(check('beats', { ...story, scenes: [title, title] }), ['/scenes: duplicate id S-01']);
  const bad = {
    personas: story.personas,
    scenes: [
      { ...title, screen: 'SCR-01' },
      {
        ...screen, state: 'error', persona: 'P-09', pattern: 'tab-tour',
        beats: [
          { do: 'type', target: 'the search box', ms: 1400 },
          { do: 'hold', target: 'the list', text: 'Lake', ms: 1400 },
          { do: 'click', target: 'the bin', action: 'Delete order', ms: 600 },
          { do: 'hold', target: 'a row', ms: 1400, caption: { label: 'Kept', value: 'forever', truth: 'T-03' } },
          { do: 'hold', target: 'the drawer', ms: 1400, caption: { label: 'Delivery', value: 'by mail', truth: 'T-02' } },
          { do: 'hold', target: 'the button', ms: 1000, caption: { label: 'Approval', value: 'by hand', truth: 'T-09' } },
        ],
      },
      { id: 'S-04', kind: 'screen', screen: 'SCR-07', state: 'populated', persona: 'P-01', beats: [{ do: 'hold', target: 'x', ms: 1000 }] },
      { id: 'S-05', kind: 'screen', screen: 'SCR-01', state: 'populated', beats: [{ do: 'hold', target: 'x', ms: 1000 }] },
      end,
    ],
  };
  assert.deepEqual(beatsProblems(bad, fc), [
    '/scenes/0: a title scene has no screen',
    '/scenes/1: SCR-01 has no error state; it has empty, populated',
    '/scenes/1: no persona P-09',
    '/scenes/1: the mods put no tab-tour on SCR-01',
    '/scenes/1/beats/0: a type beat needs the text it types',
    '/scenes/1/beats/1: only a type beat has text',
    '/scenes/1/beats/2: SCR-01 has no action "Delete order"',
    '/scenes/1/beats/3/caption: T-03 is a does-not entry; a caption rests on a does, manual-only or limit entry',
    '/scenes/1/beats/4/caption: T-02 is open, so the ledger does not know it yet',
    '/scenes/1/beats/5/caption: the ledger has no T-09',
    '/scenes/1/beats/5: a captioned beat holds at least 1400 ms at standard pacing',
    '/scenes/2: the screen map has no SCR-07',
    '/scenes/3: a screen scene needs persona',
    '/scenes: a promo runs 30-60 s; this story runs 15.2 s',
  ]);
});

test('beats: one title card first and one end card last, and each format\'s arc, length and end card', () => {
  const story = validJson('beats');
  const [title, screen, end] = story.scenes;
  assert.deepEqual(beatsProblems({ ...story, scenes: [screen, title, end, { ...end, id: 'S-04' }] }, context()), [
    '/scenes: a film has at most one title card, and it comes first',
    '/scenes: a film ends with its one end card',
  ]);
  assert.deepEqual(beatsProblems({ ...story, scenes: [title, end] }, context()), [
    '/scenes: a film shows at least one screen', '/scenes: a promo runs 30-60 s; this story runs 6.0 s',
  ]);
  assert.deepEqual(beatsProblems(story, context({ format: 'store-preview' })), [
    '/scenes: a store preview runs 30 s or less; this story runs 30.6 s',
    "/scenes/2: a store preview's end card holds 2 s or less",
  ]);
  const second = { ...validJson('screens').screens[0], id: 'SCR-02', title: 'Order detail' };
  assert.deepEqual(beatsProblems(story, context({ format: 'walkthrough', screens: [...validJson('screens').screens, second] })), [
    '/scenes: a walkthrough tours every screen of the subject in order: SCR-01, SCR-02',
  ]);
  assert.deepEqual(beatsProblems(story, context({ format: 'trailer' })), [
    '/scenes: a trailer cuts its highlights into acts, with act cards', '/scenes: a trailer runs 60-90 s; this story runs 30.6 s',
  ]);
  assert.deepEqual(beatsProblems(story, context({ format: 'how-to', mods: { ...validJson('mods'), pacing: 'calm' } })), []);
});

test('beats: a module walkthrough opens each feature with an act card; a feature walkthrough needs none', () => {
  const story = validJson('beats');
  const [title, scene, end] = story.scenes;
  const shown = { ...scene };
  delete shown.pattern; // the mods put it on SCR-01 only
  const [list] = validJson('screens').screens;
  const screens = [
    { ...list, feature: 'Orders' },
    { ...list, id: 'SCR-02', title: 'Order detail', feature: 'Orders' },
    { ...list, id: 'SCR-03', title: 'Invoices', feature: 'Invoices' },
  ];
  const on = (screen) => ({ ...shown, screen });
  const act = (text) => ({ kind: 'act', text, ms: 3000 });
  const film = (...scenes) => ({ personas: story.personas, scenes: scenes.map((s, i) => ({ ...s, id: `S-0${i + 1}` })) });
  const module = context({ kind: 'module', format: 'walkthrough', screens });
  const bare = film(title, on('SCR-01'), on('SCR-02'), on('SCR-03'), end);
  assert.deepEqual(beatsProblems(bare, module), [
    '/scenes/1: a module walkthrough opens each feature with an act card (add one before Orders)',
    '/scenes/3: a module walkthrough opens each feature with an act card (add one before Invoices)',
  ]);
  assert.deepEqual(beatsProblems(film(title, act('Orders'), on('SCR-01'), on('SCR-02'), act('Invoices'), on('SCR-03'), end), module), []);
  assert.deepEqual(beatsProblems(bare, { ...module, kind: 'feature' }), []);
});

test('demo-data: answers the subject\'s calls, one per request and scene, and every call the story\'s screens make, a sign-in call too', () => {
  const caller = { path: 'src/api/orders.ts', line: 2 };
  const calls = [
    ...validJson('api-calls').calls,
    { id: 'API-03', style: 'rest', method: 'GET', path: '/api/session', auth: 'sign-in', caller },
    { id: 'API-04', style: 'rest', method: 'GET', path: '/api/weather', auth: 'other', caller },
  ];
  assert.deepEqual(demoProblems(validJson('demo-data'), context({ calls })), []);
  const demo = {
    calls: {
      'API-01': [
        { when: { params: { id: 'O-1' } }, body: { id: 'O-1' } }, { status: 500, body: { error: 'down' } },
        { from: 'S-09', body: [] }, { status: 503, body: {} },
      ],
      'API-03': [{ body: {} }],
      'API-04': [{ body: {} }],
      'API-09': [{ body: {} }],
    },
  };
  assert.deepEqual(demoProblems(demo, context({ calls })), [
    '/calls/API-01/0/when/params: /api/orders has no :id',
    '/calls/API-01/0/body: Order[] is a list',
    '/calls/API-01/2/from: the story has no screen scene S-09',
    '/calls/API-01/3: answers the same request from the same scene as answer 1',
    '/calls/API-09: api-calls.json has no API-09',
    "/calls: API-02 (GET /api/orders/:id) has no demo data, and the story's screens call it",
  ]);
  const signedIn = validJson('screens').screens.map((s) => ({ ...s, calls: [...s.calls, 'API-03'] }));
  assert.deepEqual(demoProblems(validJson('demo-data'), context({ calls, screens: signedIn })), [
    "/calls: API-03 (GET /api/session) has no demo data, and the story's screens call it",
  ]);
});

test('beats and demo-data: no text shows a name the brief\'s must-not-show list gives, in any case', () => {
  const fc = context({ forbidden: ['Dana Fox'] });
  const beats = validJson('beats');
  beats.personas[0].name = 'Dana Fox';
  assert.deepEqual(beatsProblems(beats, fc), ['/personas/0/name: shows "Dana Fox", which the brief\'s must-not-show list names']);
  const demo = validJson('demo-data');
  const n = demo.calls['API-01'].length;
  demo.calls['API-01'].push({ when: { query: { q: 'fox' } }, body: [{ note: 'Call DANA FOX back' }] });
  assert.deepEqual(demoProblems(demo, fc), [`/calls/API-01/${n}/body/0/note: shows "Dana Fox", which the brief's must-not-show list names`]);
});

test('save beats: the brief\'s names are refused through the CLI too', () => {
  const f = filmRepo();
  const save = (kind, value) => runSp(f.repo, ['save', kind, inputFile(value, f.repo), '--subject', 'orders', '--film', 'promo'], f.env);
  const brief = path.join(tempDir('sp-in-'), 'orders.brief.md');
  fs.writeFileSync(brief, ORDERS_BRIEF.replace('- Real customer names.', '- Seed names: `Dana Fox`.'));
  assert.equal(runSp(f.repo, ['save', 'brief', brief, '--subject', 'orders'], f.env).code, 0);
  assert.equal(save('mods', validJson('mods')).code, 0);
  const beats = validJson('beats');
  beats.personas[0].role = 'Works for dana fox';
  const r = save('beats', beats);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /\/personas\/0\/role: shows "Dana Fox", which the brief's must-not-show list names/);
});

test('beats: a pacing the catalog lacks is the mods\' problem; the story\'s holds are not checked against it', () => {
  assert.deepEqual(beatsProblems(validJson('beats'), context({ mods: { ...validJson('mods'), pacing: 'warp' } })), []);
});

test('demo-data: two answers for the same request, whatever the order of its keys, are one too many', () => {
  const demo = validJson('demo-data');
  demo.calls['API-01'] = [
    { when: { query: { status: 'open', page: '1' } }, body: [] },
    { when: { query: { page: '1', status: 'open' } }, body: [] },
  ];
  assert.deepEqual(demoProblems(demo, context()), ['/calls/API-01/1: answers the same request from the same scene as answer 0']);
});

test('demo-data: every call a screen scene makes has an answer that holds there', () => {
  const beats = validJson('beats');
  const [title, scene, end] = beats.scenes;
  beats.scenes = [title, scene, { ...scene, id: 'S-03', beats: [{ do: 'hold', target: 'the orders list', ms: 3000 }] }, { ...end, id: 'S-04' }];
  const demo = validJson('demo-data');
  const late = (id) => { demo.calls[id] = demo.calls[id].map((a) => ({ ...a, from: 'S-03' })); };
  const why = (id) => `/calls/${id}: S-02 makes this call, but no answer holds there; give one with no from, or one from S-02 or an earlier scene`;
  assert.deepEqual(demoProblems(demo, context({ beats })), []);
  late('API-01');
  assert.deepEqual(demoProblems(demo, context({ beats })), [why('API-01')]);
  late('API-02'); // S-03 shows the drawer S-02 opened, where an answer from S-03 holds
  assert.deepEqual(demoProblems(demo, context({ beats })), [why('API-01'), why('API-02')]);
});
