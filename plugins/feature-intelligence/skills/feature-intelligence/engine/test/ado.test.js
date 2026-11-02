'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { FIXTURES } = require('./helpers');
const { adoChunks } = require('../lib/ado');

test('ado: description, acceptance criteria and comments become anchored chunks', () => {
  const [story, bare] = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'ado-stories.json'), 'utf8'));
  const a = adoChunks(story);
  assert.deepEqual(a.origin, { workItem: 2104, rev: 7, type: 'User Story' });
  assert.equal(a.title, 'Reject oversized files');
  assert.deepEqual(a.chunks.map((c) => c.anchor), ['description ¶1', 'description ¶2', 'AC-1', 'AC-2', 'comment 1', 'comment 2']);
  assert.equal(a.chunks[2].text, 'Given a file with more than 5,000 rows, when it is uploaded, then it is rejected.');
  assert.equal(a.chunks[4].text, 'Thanks!');
  const b = adoChunks(bare);
  assert.deepEqual(b.chunks, [
    { anchor: 'description', text: 'After an import, the admin can download a CSV of rejected rows with the reason for each.' },
    { anchor: 'AC-1', text: 'The report lists the row number and the reason.' },
  ]);
  assert.throws(() => adoChunks({ fields: {} }), /needs a work item with an id and fields/);
});

test('ado: repro steps for bugs; a list of comments', () => {
  const bug = {
    workItem: { id: 9, rev: 1, fields: { 'System.Title': 'Import stops', 'Microsoft.VSTS.TCM.ReproSteps': '<p>Upload a file.</p><p>It stops at row 50.</p>' } },
    comments: [{ text: 'Seen on Monday.' }],
  };
  assert.deepEqual(adoChunks(bug).chunks.map((c) => c.anchor), ['repro ¶1', 'repro ¶2', 'comment 1']);
  assert.deepEqual(adoChunks(bug).origin, { workItem: 9, rev: 1, type: null });
  const undated = adoChunks({ workItem: { id: 1, rev: 1, fields: {} }, comments: [{ id: 3, text: 'c' }, { id: 2, text: 'b' }, { id: 1, text: 'a' }, null] });
  assert.deepEqual(undated.chunks, [{ anchor: 'comment 1', text: 'a' }, { anchor: 'comment 2', text: 'b' }, { anchor: 'comment 3', text: 'c' }]);
});
