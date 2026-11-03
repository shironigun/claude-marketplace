'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir, runFi, FIXTURES } = require('./helpers');
const { CLAIMS, DECISIONS, claim, must, write } = require('./model-fixture');

const fi = (root, ...args) => must(runFi(root, [...args, '--json'])).json;

test('e2e: from sources to a fully accounted model with ranked questions', () => {
  const root = tempDir();
  const slug = 'csv-customer-import';
  fi(root, 'init', slug, '--mode', 'new', '--name', 'Import customers from CSV');
  fs.copyFileSync(path.join(FIXTURES, 'mini-frd.md'), path.join(root, 'frd.md'));
  assert.equal(fi(root, 'ingest', slug, 'frd.md').sources[0].chunks, 9);
  assert.equal(fi(root, 'ingest', slug, '--ado', path.join(FIXTURES, 'ado-stories.json')).sources.length, 2);

  // First extraction pass; two clusters need a decision.
  fi(root, 'claims', 'add', slug, write(root, 'pass1.json', CLAIMS));
  fi(root, 'consolidate', slug, '--propose');
  assert.equal(fi(root, 'consolidate', slug, '--apply', write(root, 'd1.json', DECISIONS)).created.length, 9);
  assert.equal(fi(root, 'coverage', slug).unaccounted.length, 7);

  // Second pass over what coverage listed; a thank-you is set aside.
  fi(root, 'claims', 'add', slug, write(root, 'pass2.json', [
    claim('SRC-001#6', '§2 ¶5', 'RULE', 'Email format', 'An email must be a valid email address.', 'Format: a valid email address'),
    claim('SRC-001#7', '§2 ¶6', 'RULE', 'Phone format', 'A phone number, when given, contains digits only.', 'Phone; Required: no; Format: digits only'),
    claim('SRC-002#2', 'description ¶2', 'ACT', 'Manager', 'Managers can start imports.', 'Managers can also start imports.'),
    claim('SRC-002#4', 'AC-2', 'MSG', 'Row limit message', 'The rejection message names the row limit.', 'The rejection message names the row limit.'),
    claim('SRC-002#6', 'comment 2', 'Q', 'Duplicates updated or skipped', 'Should a row whose email matches an existing customer update it instead of being skipped?', 'Should duplicates by email be updated instead of skipped?', 'open'),
    claim('SRC-003#2', 'AC-1', 'FR', 'Error report contents', 'The error report lists the row number and the reason for each rejected row.', 'The report lists the row number and the reason.'),
  ]));
  assert.deepEqual(fi(root, 'consolidate', slug, '--propose').clusters.map((k) => k.suggest), ['new', 'new', 'new', 'new', 'new', 'new']);
  assert.deepEqual(fi(root, 'consolidate', slug, '--apply', write(root, 'd2.json', {})).created, ['RULE-006', 'RULE-007', 'ACT-001', 'MSG-001', 'Q-002', 'FR-001']);
  fi(root, 'set-aside', slug, 'SRC-002#5', '--reason', 'a thank-you, no requirement content');
  const coverage = fi(root, 'coverage', slug, '--min', '1');
  assert.deepEqual([coverage.chunks, coverage.covered, coverage.setAside, coverage.pass], [17, 16, 1, true]);

  // Derived nodes: a question blocking the row-limit rule, a scenario covering it, a decision answering Q-001.
  const added = fi(root, 'add', slug, write(root, 'derive.json', {
    decisions: [{ id: '+d1', question: 'Which date formats does the importer accept?', answer: 'ISO 8601 dates such as 2026-10-30 only.', decidedBy: 'Product owner', via: 'session' }],
    nodes: [
      { id: '+q', type: 'Q', title: 'Row limit', statement: 'Which row limit applies: 10,000 or 5,000?', status: 'open', derivedFrom: ['RULE-001'] },
      {
        id: '+ts', type: 'TS', title: 'One row over the limit', statement: 'A file one row over the limit is rejected and the message names the limit.',
        status: 'inferred', confidence: 'high', derivedFrom: ['RULE-001', 'MSG-001'], category: 'boundary value analysis',
      },
    ],
    links: [
      { from: '+q', type: 'blocks', to: 'RULE-001' },
      { from: '+ts', type: 'covers', to: 'RULE-001' },
      { from: '+d1', type: 'answers', to: 'Q-001' },
      { from: 'STORY-001', type: 'implements', to: 'RULE-001' },
    ],
  }));
  assert.deepEqual(added.ids, { '+d1': 'DL-001', '+q': 'Q-003', '+ts': 'TS-001' });
  assert.equal(fi(root, 'validate', slug).valid, true);
  assert.deepEqual(fi(root, 'questions', slug).questions.map((q) => [q.id, q.score]), [['Q-003', 12], ['Q-002', 1]]);
  assert.deepEqual(fi(root, 'query', slug, '--section', 'B', '--status', 'conflict').nodes.map((n) => n.id), ['RULE-001']);
  assert.deepEqual(fi(root, 'trace', slug, 'RULE-001').in.map((e) => e.id).sort(), ['Q-003', 'STORY-001', 'TS-001']);
  const status = fi(root, 'status', slug);
  assert.deepEqual([status.nodes.live, status.decisions, status.openQuestions, status.next], [17, 1, 2, `fi questions ${slug}: ask the top five`]);

  // Re-running part of the first pass changes nothing: the ids are stable.
  fi(root, 'claims', 'add', slug, write(root, 'rerun.json', CLAIMS.slice(0, 2)));
  assert.deepEqual(fi(root, 'consolidate', slug, '--propose').clusters.map((k) => [k.existing, k.suggest]), [['GOAL-001', 'same'], ['RULE-001', 'update?']]);
  const rerun = fi(root, 'consolidate', slug, '--apply', write(root, 'd3.json', { 'K-002': { action: 'existing' } }));
  assert.deepEqual([rerun.created, rerun.updated], [[], []]);

  // Every command is listed, and the shipped server config is a stamped fork.
  const help = must(runFi(root, ['help'])).stdout;
  for (const name of ['init', 'ingest', 'claims add', 'consolidate', 'add', 'validate', 'coverage', 'set-aside', 'query', 'trace', 'questions', 'status', 'forks']) {
    assert.match(help, new RegExp(`fi ${name} `));
  }
  assert.match(must(runFi(root, ['forks'])).stdout, /\.mcp\.json <- plugins\/qa-engineering\/\.mcp\.json @ /);
});
