'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runFi } = require('./helpers');
const { must, write, buildModel } = require('./model-fixture');

// Q-002 blocks the row-limit rule, which an AC refines and a scenario covers; Q-003 blocks one message;
// Q-004 is answered; Q-001 (date formats) blocks nothing yet.
const QUESTIONS = {
  decisions: [{ id: '+d4', question: 'Are phone numbers with spaces accepted?', answer: 'Yes; spaces are removed before the check.', decidedBy: 'Product owner', via: 'session' }],
  nodes: [
    { id: '+q2', type: 'Q', title: 'Row limit', statement: 'Which row limit applies: 10,000 or 5,000?', status: 'open', derivedFrom: ['RULE-001'] },
    { id: '+ac', type: 'AC', title: 'Reject over the limit', statement: 'A file over the row limit is rejected before import.', status: 'inferred', confidence: 'high', derivedFrom: ['RULE-001'] },
    { id: '+ts', type: 'TS', title: 'One row over the limit', statement: 'A file one row over the limit is rejected.', status: 'inferred', confidence: 'medium', derivedFrom: ['+ac'] },
    { id: '+q3', type: 'Q', title: 'Empty file message', statement: 'What does the importer say when a file has no valid rows?', status: 'open', derivedFrom: ['GOAL-001'] },
    { id: '+msg', type: 'MSG', title: 'No valid rows', statement: 'The file has no valid rows to import.', status: 'assumed', derivedFrom: ['+q3'] },
    { id: '+q4', type: 'Q', title: 'Phone format', statement: 'Are phone numbers with spaces accepted?', status: 'open', derivedFrom: ['GOAL-001'] },
  ],
  links: [
    { from: '+q2', type: 'blocks', to: 'RULE-001' },
    { from: '+ts', type: 'covers', to: 'RULE-001' },
    { from: '+q3', type: 'blocks', to: '+msg' },
    { from: '+d4', type: 'answers', to: '+q4' },
  ],
};

test('questions: ranked by blast radius × severity; answered questions drop out', () => {
  const root = buildModel();
  const added = must(runFi(root, ['add', 'csv', write(root, 'q.json', QUESTIONS), '--json'])).json;
  assert.deepEqual(added.ids, { '+d4': 'DL-001', '+q2': 'Q-002', '+ac': 'AC-001', '+ts': 'TS-001', '+q3': 'Q-003', '+msg': 'MSG-001', '+q4': 'Q-004' });
  const q = must(runFi(root, ['questions', 'csv', '--json'])).json;
  assert.deepEqual(q.questions.map((x) => [x.id, x.radius, x.severity, x.score]), [['Q-002', 4, 3, 12], ['Q-003', 2, 1, 2], ['Q-001', 1, 1, 1]]);
  assert.deepEqual(q.questions[0].nodes, ['AC-001', 'Q-002', 'RULE-001', 'TS-001']);
  assert.deepEqual(q.questions[0].blocks, ['RULE-001']);
  assert.equal(must(runFi(root, ['questions', 'csv', '--top', '1', '--json'])).json.questions.length, 1);
  assert.match(runFi(root, ['questions', 'csv']).stdout, /1\. Q-002 score 12 \(radius 4 × severity 3\)/);
});
