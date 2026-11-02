'use strict';
const fs = require('fs');
const path = require('path');
const { tempDir, runFi, FIXTURES } = require('./helpers');

const claim = (chunk, anchor, type, title, statement, quote, status = 'confirmed') => ({ chunk, type, title, statement, status, anchor, quote });

// What a careful extractor writes for mini-frd.md (SRC-001) and the two stories (SRC-002 is 2104, SRC-003 is 2105).
const CLAIMS = [
  claim('SRC-001#1', '§1 ¶1', 'GOAL', 'Import customers from a file', 'Admins can import customers from a CSV file instead of entering them one by one.', 'Admins import customers from a CSV file'),
  claim('SRC-001#2', '§2 ¶1', 'RULE', 'Row limit per file', 'An import file may contain at most 10,000 rows.', 'Files are limited to 10,000 rows.'),
  claim('SRC-002#3', 'AC-1', 'RULE', 'Row limit per file', 'An import file may contain at most 5,000 rows.', 'Given a file with more than 5,000 rows'),
  claim('SRC-001#3', '§2 ¶2', 'RULE', 'File size limit', 'An import file may be at most 5 MB.', 'The maximum file size is 5 MB.'),
  claim('SRC-001#4', '§2 ¶3', 'RULE', 'Email required', 'Every row must have an email.', 'The email column is required.'),
  claim('SRC-001#5', '§2 ¶4', 'RULE', 'Name required', 'Every row must have a name.', 'Name is required.'),
  claim('SRC-001#8', '§3 ¶1', 'RULE', 'Duplicate emails skipped', 'A row whose email matches an existing customer is skipped.', 'Rows whose email matches an existing customer are skipped.'),
  claim('SRC-001#9', '§4 ¶1', 'Q', 'Accepted date formats', 'Which date formats does the importer accept?', 'The date formats to accept are to be confirmed.', 'open'),
  claim('SRC-002#1', 'description ¶1', 'STORY', 'Reject oversized files', 'As an admin, I want oversized files rejected before import, so that imports stay fast.', 'As an admin, I want oversized files rejected before import'),
  claim('SRC-003#1', 'description', 'STORY', 'Download the error report', 'As an admin, I want to download a CSV of rejected rows with the reason for each.', 'the admin can download a CSV of rejected rows'),
];

// K-002 holds the two row limits; K-004 holds "email required" and "name required", which only look alike.
const DECISIONS = {
  'K-002': { action: 'conflict', statement: 'An import file may contain at most 10,000 rows (FRD) or 5,000 rows (story 2104).' },
  'K-004': { action: 'separate' },
};

function must(r) {
  if (r.code !== 0) throw new Error(`fi exited ${r.code}: ${r.stderr}${r.stdout}`);
  return r;
}

function write(root, name, value) {
  fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2));
  return name;
}

function prepare() {
  const root = tempDir();
  must(runFi(root, ['init', 'csv', '--mode', 'new']));
  fs.copyFileSync(path.join(FIXTURES, 'mini-frd.md'), path.join(root, 'frd.md'));
  must(runFi(root, ['ingest', 'csv', 'frd.md']));
  must(runFi(root, ['ingest', 'csv', '--ado', path.join(FIXTURES, 'ado-stories.json')]));
  must(runFi(root, ['claims', 'add', 'csv', write(root, 'claims.json', CLAIMS)]));
  return root;
}

function buildModel() {
  const root = prepare();
  must(runFi(root, ['consolidate', 'csv', '--propose']));
  must(runFi(root, ['consolidate', 'csv', '--apply', write(root, 'decisions.json', DECISIONS)]));
  return root;
}

module.exports = { CLAIMS, DECISIONS, claim, must, write, prepare, buildModel };
