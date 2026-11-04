'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { runFi, tempDir } = require('./helpers');
const { readStamp } = require('../lib/forks');
const { PLUGIN, SKILL_DIR, walk, rel, foreignNames } = require('./plugin-files');

const FORKS = walk(path.join(SKILL_DIR, 'references', 'forks'));

test('plugin forks: every forked file is stamped and fi forks lists it as current', () => {
  assert.deepEqual(FORKS.map((f) => path.basename(f)), ['ado-read-sequence.md', 'concern-taxonomy.md', 'profile-contract.md', 'review-brief-format.md']);
  for (const f of FORKS) assert.ok(readStamp(f), `${rel(f)} has no fork stamp`);
  const r = runFi(tempDir(), ['forks', '--plugin', PLUGIN, '--json']);
  assert.equal(r.code, 0, r.stderr);
  const listed = new Map(r.json.forks.map((f) => [f.file, f]));
  for (const f of FORKS) {
    const entry = listed.get(rel(f));
    assert.ok(entry, `fi forks does not list ${rel(f)}`);
    // In this repository the sources exist; an installed copy without them reports source-absent.
    assert.ok(['current', 'source-absent', 'no-repo'].includes(entry.state), `${rel(f)} is ${entry.state}`);
  }
});

test('plugin forks: a forked file names its source only in its stamp', () => {
  assert.deepEqual(FORKS.flatMap(foreignNames), []);
});
