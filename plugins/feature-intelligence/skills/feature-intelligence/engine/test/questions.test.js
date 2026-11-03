'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runFi } = require('./helpers');
const { must, write, buildModel } = require('./model-fixture');
const { rankQuestions } = require('../lib/questions');

// Q-002 blocks the row-limit rule: an AC refines it, a scenario rests on the AC, a second scenario covers the AC and a
// message rests on Q-002 itself; Q-003 blocks one message; Q-004 is answered; Q-001 (date formats) blocks nothing yet.
const QUESTIONS = {
  decisions: [{ id: '+d4', question: 'Are phone numbers with spaces accepted?', answer: 'Yes; spaces are removed before the check.', decidedBy: 'Product owner', via: 'session' }],
  nodes: [
    { id: '+q2', type: 'Q', title: 'Row limit', statement: 'Which row limit applies: 10,000 or 5,000?', status: 'open', derivedFrom: ['RULE-001'] },
    { id: '+ac', type: 'AC', title: 'Reject over the limit', statement: 'A file over the row limit is rejected before import.', status: 'inferred', confidence: 'high', derivedFrom: ['RULE-001'] },
    { id: '+ts', type: 'TS', title: 'One row over the limit', statement: 'A file one row over the limit is rejected.', status: 'inferred', confidence: 'medium', derivedFrom: ['+ac'] },
    { id: '+q3', type: 'Q', title: 'Empty file message', statement: 'What does the importer say when a file has no valid rows?', status: 'open', derivedFrom: ['GOAL-001'] },
    { id: '+msg', type: 'MSG', title: 'No valid rows', statement: 'The file has no valid rows to import.', status: 'assumed', derivedFrom: ['+q3'] },
    { id: '+q4', type: 'Q', title: 'Phone format', statement: 'Are phone numbers with spaces accepted?', status: 'open', derivedFrom: ['GOAL-001'] },
    { id: '+ts2', type: 'TS', title: 'At the limit', statement: 'A file exactly at the limit is imported.', status: 'inferred', confidence: 'medium', derivedFrom: ['GOAL-001'] },
    { id: '+m2', type: 'MSG', title: 'Too many rows', statement: 'The file has more rows than the limit allows.', status: 'assumed', derivedFrom: ['+q2'] },
  ],
  links: [
    { from: '+q2', type: 'blocks', to: 'RULE-001' },
    { from: '+ts2', type: 'covers', to: '+ac' },
    { from: '+q3', type: 'blocks', to: '+msg' },
    { from: '+d4', type: 'answers', to: '+q4' },
  ],
};

test('questions: ranked by blast radius × severity; answered questions drop out', () => {
  const root = buildModel();
  const added = must(runFi(root, ['add', 'csv', write(root, 'q.json', QUESTIONS), '--json'])).json;
  assert.deepEqual(added.ids, {
    '+d4': 'DL-001', '+q2': 'Q-002', '+ac': 'AC-001', '+ts': 'TS-001', '+q3': 'Q-003', '+msg': 'MSG-001', '+q4': 'Q-004', '+ts2': 'TS-002', '+m2': 'MSG-002',
  });
  const q = must(runFi(root, ['questions', 'csv', '--json'])).json;
  assert.deepEqual(q.questions.map((x) => [x.id, x.radius, x.severity, x.score]), [['Q-002', 6, 3, 18], ['Q-003', 2, 1, 2], ['Q-001', 1, 1, 1]]);
  assert.deepEqual(q.questions[0].nodes, ['AC-001', 'MSG-002', 'Q-002', 'RULE-001', 'TS-001', 'TS-002']);
  assert.deepEqual(q.questions[0].blocks, ['RULE-001']);
  assert.equal(must(runFi(root, ['questions', 'csv', '--top', '1', '--json'])).json.questions.length, 1);
  const text = runFi(root, ['questions', 'csv']).stdout;
  assert.match(text, /^3 open questions/);
  assert.match(text, /1\. Q-002 score 18 \(radius 6 × severity 3\)/);
  assert.match(text, /blocks RULE-001; reaches AC-001, MSG-002, TS-001, TS-002$/m);
  must(runFi(root, ['add', 'csv', write(root, 'nl.json', { nodes: [{ id: 'Q-003', statement: 'What does the importer say\nwhen a file has no valid rows?' }] })]));
  assert.match(runFi(root, ['questions', 'csv']).stdout, /^2\. Q-003 score 2 \(radius 2 × severity 1\): What does the importer say when a file has no valid rows\?$/m);
  assert.match(runFi(root, ['questions', 'csv', '--top', '1']).stdout, /^3 open questions/);
});

test('rankQuestions: every rests-on edge counts; superseded nodes and other edges do not; ties go by id', () => {
  const node = (id, type, extra = {}) => ({ id, type, title: id, statement: id, ...extra });
  const nodes = [
    node('Q-001', 'Q'), node('Q-002', 'Q'), node('Q-003', 'Q'), node('Q-004', 'Q'), node('RULE-001', 'RULE'),
    node('AC-001', 'AC'), node('BR-001', 'BR'), node('STORY-001', 'STORY'), node('TS-001', 'TS'), node('SCR-001', 'SCR'), node('CNT-001', 'CNT'),
    node('SCR-009', 'SCR', { supersededBy: 'SCR-001' }), node('MSG-001', 'MSG'),
  ];
  const links = [
    { from: 'Q-001', type: 'blocks', to: 'RULE-001' },
    { from: 'AC-001', type: 'refines', to: 'RULE-001' },
    { from: 'BR-001', type: 'derives-from', to: 'RULE-001' },
    { from: 'STORY-001', type: 'implements', to: 'RULE-001' },
    { from: 'TS-001', type: 'covers', to: 'RULE-001' },
    { from: 'SCR-001', type: 'part-of', to: 'RULE-001' },
    { from: 'CNT-001', type: 'maps-to', to: 'RULE-001' },
    { from: 'SCR-009', type: 'part-of', to: 'RULE-001' },
    { from: 'MSG-001', type: 'governs', to: 'RULE-001' },
    { from: 'Q-004', type: 'blocks', to: 'SCR-009' },
  ];
  const ranked = rankQuestions({ nodes, links });
  assert.deepEqual(ranked.map((q) => [q.id, q.radius, q.score]), [['Q-001', 8, 24], ['Q-002', 1, 1], ['Q-003', 1, 1], ['Q-004', 1, 1]]);
  assert.deepEqual(ranked[0].nodes, ['AC-001', 'BR-001', 'CNT-001', 'Q-001', 'RULE-001', 'SCR-001', 'STORY-001', 'TS-001']);
});
