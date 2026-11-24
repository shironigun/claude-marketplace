'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runSp, filmRepo, validJson, inputFile } = require('./helpers');
const { canonicalWhen, sceneCalls, sceneAnswers } = require('../lib/answers');

// The sample app's story over two screen scenes, with answers that take over at the second (spec 5.9).
function twoScenes() {
  const beats = validJson('beats');
  const [title, scene, end] = beats.scenes;
  const later = { ...scene, id: 'S-03', beats: [{ do: 'hold', target: 'the orders list', ms: 3000 }] };
  beats.scenes = [title, scene, later, { ...end, id: 'S-04' }];
  const order = (status) => ({ id: 'O-1001', customer: 'Lake Harbor Supply', total: 1280, status });
  const demo = {
    calls: {
      'API-01': [
        { body: [order('pending')] },
        { when: { query: { status: 'approved', page: '1' } }, body: [] },
        { from: 'S-03', body: [order('approved')] },
        { when: { query: { page: '1', status: 'approved' } }, from: 'S-03', body: [order('approved')] },
      ],
      'API-02': [{ when: { params: { id: 'O-1001' } }, body: order('pending') }],
    },
  };
  return { screens: validJson('screens').screens, calls: validJson('api-calls').calls, beats, demo };
}

test('answers: a request is one spelling of its when; a scene makes its screen\'s calls and those of the actions it or an earlier scene names', () => {
  assert.equal(canonicalWhen({ query: { b: '2', a: '1' } }), canonicalWhen({ query: { a: '1', b: '2' } }));
  assert.equal(canonicalWhen({ params: {}, query: {} }), canonicalWhen(undefined));
  assert.equal(canonicalWhen({ params: { id: 'x' } }), '{"params":{"id":"x"}}');
  const [screen] = validJson('screens').screens;
  const scene = validJson('beats').scenes[1];
  assert.deepEqual(sceneCalls(scene, screen), ['API-01', 'API-02']);
  const holdOnly = { ...scene, beats: [{ do: 'hold', target: 'the list', ms: 1000 }] };
  assert.deepEqual(sceneCalls(holdOnly, screen), ['API-01']);
  assert.deepEqual(sceneCalls(holdOnly, screen, [scene]), ['API-01', 'API-02']); // the drawer may still be open
});

test('answers: each request gets the last answer whose from is this scene or an earlier one', () => {
  const fc = twoScenes();
  const [any, approved, anyLater, approvedLater] = fc.demo.calls['API-01'];
  const first = sceneAnswers(fc, 'S-02');
  assert.deepEqual(first.map((c) => [c.id, c.method, c.path]), [['API-01', 'GET', '/api/orders'], ['API-02', 'GET', '/api/orders/:id']]);
  assert.deepEqual(first[0].answers, [any, approved]);
  const second = sceneAnswers(fc, 'S-03');
  assert.deepEqual(second.map((c) => c.id), ['API-01', 'API-02']); // the drawer S-02 opened may still be open
  assert.deepEqual(second[0].answers, [anyLater, approvedLater]);
  assert.deepEqual(second[1].answers, fc.demo.calls['API-02']);
  assert.equal(sceneAnswers(fc, 'S-01'), null); // a card
  assert.equal(sceneAnswers(fc, 'S-09'), null);
});

test('sp answers: a screen scene\'s answers once gate 2 has passed, and only while it holds', () => {
  const f = filmRepo();
  const sp = (...args) => runSp(f.repo, args, f.env);
  const save = (kind, value) => sp('save', kind, inputFile(value, f.repo), '--subject', 'orders', '--film', 'promo');
  for (const [kind, value] of [['mods', { ...validJson('mods'), chip: 'none' }], ['beats', validJson('beats')], ['demo-data', validJson('demo-data')]]) {
    assert.equal(save(kind, value).code, 0, kind);
  }
  const early = sp('answers', 'orders', '--film', 'promo', '--scene', 'S-02');
  assert.equal(early.code, 1);
  assert.match(early.stderr, /the screens come after gate 2; the next step is gate-2/);
  assert.equal(sp('storyboard', 'orders', '--film', 'promo').code, 0);
  assert.equal(sp('confirm', 'gate-2', '--subject', 'orders', '--film', 'promo').code, 0);
  const r = sp('answers', 'orders', '--film', 'promo', '--scene', 'S-02', '--json');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual([r.json.scene, r.json.screen], ['S-02', 'SCR-01']);
  assert.deepEqual(r.json.calls, [
    { id: 'API-01', method: 'GET', path: '/api/orders', answers: validJson('demo-data').calls['API-01'] },
    { id: 'API-02', method: 'GET', path: '/api/orders/:id', answers: validJson('demo-data').calls['API-02'] },
  ]);
  assert.match(sp('answers', 'orders', '--film', 'promo', '--scene', 'S-02').stdout,
    /^S-02 Orders list \(SCR-01\), populated:\n {2}API-01 GET \/api\/orders: any request, 2 items\n {2}API-02 GET \/api\/orders\/:id: id=O-1001$/m);
  assert.equal(sp('answers', 'orders', '--film', 'promo', '--scene', 'S-01').code, 2); // a card, not a screen scene
  assert.equal(sp('answers', 'orders', '--film', 'promo').code, 2);
  // A later decision the saved mods no longer pass: the story the user approved is not the film any more.
  assert.equal(sp('state', 'orders', '--decision', 'Release: unreleased').code, 0);
  const stale = sp('answers', 'orders', '--film', 'promo', '--scene', 'S-02');
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /gate 2 no longer holds, so the film is not the story the user approved:\n {2}mods: \/chip: unreleased work carries a status chip/);
  assert.match(stale.stderr, /run sp storyboard orders --film promo, show it, and confirm gate 2 again/);
});
