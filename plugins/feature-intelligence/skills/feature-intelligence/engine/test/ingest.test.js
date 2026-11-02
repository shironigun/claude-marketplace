'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tempDir, runFi, FIXTURES } = require('./helpers');
const { workspacePaths } = require('../lib/paths');
const { loadSources, loadChunks } = require('../lib/workspace');
const { shortHash } = require('../lib/hash');
const { writeDocx } = require('../lib/docx');
const { writeSimplePdf } = require('../lib/pdf');
const { markdownBlocks } = require('../lib/blocks');

function workspace() {
  const root = tempDir();
  assert.equal(runFi(root, ['init', 'csv', '--mode', 'new']).code, 0);
  return root;
}

function sourcesOf(root, args) {
  const r = runFi(root, [...args, '--json']);
  assert.equal(r.code, 0, r.stderr);
  return r.json.sources;
}

test('ingest: a Markdown file; unchanged again is skipped; a changed file is refused', () => {
  const root = workspace();
  fs.copyFileSync(path.join(FIXTURES, 'mini-frd.md'), path.join(root, 'frd.md'));
  assert.deepEqual(sourcesOf(root, ['ingest', 'csv', 'frd.md']), [{ id: 'SRC-001', kind: 'file', title: 'frd.md', status: 'ok', chunks: 9, skipped: false }]);
  const p = workspacePaths(root, 'csv');
  const [src] = loadSources(p);
  assert.equal(src.origin.path, 'frd.md');
  assert.deepEqual(src.chunks.map((c) => c.anchor), ['§1 ¶1', '§2 ¶1', '§2 ¶2', '§2 ¶3', '§2 ¶4', '§2 ¶5', '§2 ¶6', '§3 ¶1', '§4 ¶1']);
  assert.deepEqual(loadChunks(p, 'SRC-001')[1], {
    id: 'SRC-001#2', anchor: '§2 ¶1', text: 'Files are limited to 10,000 rows.', hash: shortHash('Files are limited to 10,000 rows.'),
  });
  assert.equal(sourcesOf(root, ['ingest', 'csv', 'frd.md'])[0].skipped, true);
  fs.appendFileSync(path.join(root, 'frd.md'), '\nA new line.\n');
  const changed = runFi(root, ['ingest', 'csv', 'frd.md']);
  assert.equal(changed.code, 1);
  assert.match(changed.stderr, /changed since it was ingested as SRC-001/);
  fs.writeFileSync(path.join(root, 'notes.doc'), 'old Word format');
  assert.equal(runFi(root, ['ingest', 'csv', 'notes.doc']).code, 2);
  assert.equal(runFi(root, ['ingest', 'csv']).code, 2);
});

test('ingest: Word, PDF, image, HTML, ADO, pasted text and a repository', () => {
  const root = workspace();
  const md = fs.readFileSync(path.join(FIXTURES, 'mini-frd.md'), 'utf8');
  fs.writeFileSync(path.join(root, 'frd.docx'), writeDocx(markdownBlocks(md)));
  fs.writeFileSync(path.join(root, 'frd.pdf'), writeSimplePdf([['one'], ['two']]));
  fs.writeFileSync(path.join(root, 'shot.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(path.join(root, 'page.html'), '<h2>2 File rules</h2><p>Files are limited to 10,000 rows.</p>');
  fs.writeFileSync(path.join(root, 'teams.txt'), 'Can managers import too?\n\nYes, but only into their own region.');
  assert.equal(sourcesOf(root, ['ingest', 'csv', 'frd.docx'])[0].chunks, 9);
  assert.deepEqual(sourcesOf(root, ['ingest', 'csv', 'frd.pdf'])[0], { id: 'SRC-002', kind: 'file', title: 'frd.pdf', status: 'ok', chunks: 2, skipped: false });
  assert.equal(sourcesOf(root, ['ingest', 'csv', 'shot.png'])[0].kind, 'screenshot');
  assert.equal(sourcesOf(root, ['ingest', 'csv', 'page.html'])[0].chunks, 1);
  const ado = sourcesOf(root, ['ingest', 'csv', '--ado', path.join(FIXTURES, 'ado-stories.json')]);
  assert.deepEqual(ado.map((s) => [s.id, s.title, s.chunks]), [['SRC-005', 'Reject oversized files', 6], ['SRC-006', 'Download the error report', 2]]);
  assert.deepEqual(sourcesOf(root, ['ingest', 'csv', '--ado', path.join(FIXTURES, 'ado-stories.json')]).map((s) => s.skipped), [true, true]);
  const [story] = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'ado-stories.json'), 'utf8'));
  const item = (id, rev) => ({ ...story, workItem: { ...story.workItem, id, rev } });
  fs.writeFileSync(path.join(root, 'twice.json'), JSON.stringify([item(3001, 1), item(3001, 2)]));
  const twice = runFi(root, ['ingest', 'csv', '--ado', 'twice.json']);
  assert.equal(twice.code, 2);
  assert.match(twice.stderr, /work item 3001 appears twice, at rev 1 and rev 2/);
  assert.equal(loadSources(workspacePaths(root, 'csv')).some((s) => s.origin.workItem === 3001), false);
  fs.writeFileSync(path.join(root, 'same.json'), JSON.stringify([item(3002, 1), item(3002, 1)]));
  assert.deepEqual(sourcesOf(root, ['ingest', 'csv', '--ado', 'same.json']).map((s) => s.skipped), [false, true]);
  const pasted = sourcesOf(root, ['ingest', 'csv', '--paste', 'teams.txt', '--by', 'Product owner'])[0];
  assert.deepEqual([pasted.kind, pasted.title, pasted.chunks], ['paste', 'Pasted text', 2]);
  const app = path.join(root, 'app');
  fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, 'a.js'), 'x');
  const git = (...a) => execFileSync('git', ['-C', app, ...a], { stdio: 'ignore' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'x');
  fs.writeFileSync(path.join(app, 'b.js'), 'not committed');
  const repo = sourcesOf(root, ['ingest', 'csv', '--repo', 'app'])[0];
  assert.deepEqual([repo.kind, repo.chunks], ['repo', 0]);
  assert.equal(loadSources(workspacePaths(root, 'csv')).find((s) => s.kind === 'repo').coverageExempt, true);
  assert.equal(loadSources(workspacePaths(root, 'csv')).find((s) => s.kind === 'repo').origin.dirty, true);
  assert.match(runFi(root, ['ingest', 'csv', '--repo', 'app']).stdout, /Skipped/);
});

test('ingest: an unreadable file is registered, reported, and replaced once it can be read', () => {
  const root = workspace();
  fs.writeFileSync(path.join(root, 'bad.docx'), 'not a zip archive at all, only text');
  const bad = runFi(root, ['ingest', 'csv', 'bad.docx', '--json']);
  assert.equal(bad.code, 1);
  assert.deepEqual(bad.json.sources[0], { id: 'SRC-001', kind: 'file', title: 'bad.docx', status: 'unreadable', chunks: 1, skipped: false });
  fs.writeFileSync(path.join(root, 'bad.docx'), writeDocx([{ kind: 'para', text: 'Now readable.' }]));
  assert.deepEqual(sourcesOf(root, ['ingest', 'csv', 'bad.docx'])[0], { id: 'SRC-001', kind: 'file', title: 'bad.docx', status: 'ok', chunks: 1, skipped: false });
  fs.writeFileSync(path.join(root, 'scan.pdf'), '%PDF-1.4\n%%EOF\n');
  assert.equal(runFi(root, ['ingest', 'csv', 'scan.pdf']).code, 1);
  assert.equal(sourcesOf(root, ['ingest', 'csv', 'scan.pdf', '--pages', '3'])[0].chunks, 3);
  assert.deepEqual(loadSources(workspacePaths(root, 'csv')).map((s) => [s.id, s.status]), [['SRC-001', 'ok'], ['SRC-002', 'ok']]);
});
