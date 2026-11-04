'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir, runFi } = require('./helpers');
const { DIR, pdfPages, build, check } = require('../tools/make-fixture');
const { loadChunks } = require('../lib/workspace');
const { workspacePaths } = require('../lib/paths');
const { normalizeQuote } = require('../lib/text');
const { pdfPageCount } = require('../lib/pdf');

const STORIES = fs.readdirSync(path.join(DIR, 'stories')).filter((f) => f.endsWith('.json')).sort();

const ok = (r) => {
  if (r.code !== 0) throw new Error(`fi exited ${r.code}: ${r.stderr}${r.stdout}`);
  return r.json;
};

// A workspace holding the named fixture files; returns the source id each file got.
function ingest(files) {
  const root = tempDir();
  ok(runFi(root, ['init', 'fx', '--mode', 'new', '--json']));
  const ids = {};
  for (const file of files) {
    const abs = path.join(DIR, file);
    const args = file.startsWith('stories/') ? ['ingest', 'fx', '--ado', abs] : ['ingest', 'fx', abs];
    if (file.endsWith('.pdf')) args.push('--pages', String(pdfPageCount(fs.readFileSync(abs))));
    ids[file] = ok(runFi(root, [...args, '--json'])).sources[0].id;
  }
  return { root, ids, chunks: (file) => loadChunks(workspacePaths(root, 'fx'), ids[file]) };
}

test('fixture: frd.docx and frd.pdf are generated from frd.md and up to date', () => {
  assert.deepEqual(check(), []);
  const pages = pdfPages(build().blocks);
  assert.ok(pages.length >= 4, `${pages.length} pages`);
  assert.ok(pages.every((p) => p.length <= 46 && p[0] !== ''));
  assert.equal(pdfPageCount(fs.readFileSync(path.join(DIR, 'frd.pdf'))), pages.length);
});

test('fixture: the six stories are work items with acceptance criteria', () => {
  assert.equal(STORIES.length, 6);
  for (const file of STORIES) {
    const [item] = JSON.parse(fs.readFileSync(path.join(DIR, 'stories', file), 'utf8'));
    assert.equal(item.workItem.fields['System.WorkItemType'], 'User Story', file);
    assert.match(item.workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria'], /<li>/, file);
    assert.equal(String(item.workItem.id), file.slice(0, 4));
  }
});

test('fixture: every planted fault is revealed by quotes found in its sources', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(DIR, 'expected-findings.json'), 'utf8'));
  assert.equal(expected.faults.length, 17);
  const counts = {};
  for (const f of expected.faults) counts[f.kind] = (counts[f.kind] || 0) + 1;
  assert.deepEqual(counts, {
    conflict: 3, ambiguity: 5, duplicate: 2, 'missing-error-behavior': 4, terminology: 1, 'permission-gap': 1, 'missing-content': 1,
  });
  const files = ['frd.md', 'notes.md', ...STORIES.map((f) => `stories/${f}`)];
  const ws = ingest(files);
  for (const f of expected.faults) {
    for (const e of f.evidence) {
      assert.ok(files.includes(e.file), `${f.id}: no fixture file ${e.file}`);
      const found = ws.chunks(e.file).some((c) => c.text != null && normalizeQuote(c.text).includes(normalizeQuote(e.quote)));
      assert.ok(found, `${f.id}: "${e.quote}" is not in ${e.file}`);
    }
  }
});

test('fixture: the Markdown and Word FRDs chunk to the same text; the PDF has one chunk per page', () => {
  const md = ingest(['frd.md']).chunks('frd.md');
  const docx = ingest(['frd.docx']).chunks('frd.docx');
  assert.deepEqual(docx.map((c) => [c.anchor, c.text]), md.map((c) => [c.anchor, c.text]));
  const pdf = ingest(['frd.pdf']).chunks('frd.pdf');
  assert.deepEqual(pdf.map((c) => c.anchor), pdfPages(build().blocks).map((_, i) => `p${i + 1}`));
});
