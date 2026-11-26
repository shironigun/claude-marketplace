'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir } = require('./helpers');
const { SHARED_DIR, walk, rel, runtimeMarkdown, docProblems, allowedUrl, addressProblems } = require('./plugin-files');
const { RULES } = require('../lib/detect-tables');

test('plugin docs: the shared playbooks start with a title and name only real sp commands, flags and playbooks', () => {
  const books = walk(SHARED_DIR);
  assert.deepEqual(books.map((f) => path.basename(f)), ['bootstrap.md', 'detectors.md']);
  for (const f of books) assert.match(fs.readFileSync(f, 'utf8'), /^# \S/, `${rel(f)} starts with a title`);
  assert.deepEqual(runtimeMarkdown().flatMap(docProblems), []);
});

test('plugin docs: detectors.md lists the engine tables, group by group, in order', () => {
  const md = fs.readFileSync(path.join(SHARED_DIR, 'detectors.md'), 'utf8');
  const rows = [...md.matchAll(/^\| ((?:frontend|backend)\.\w+) \| ([a-z0-9.+, -]+?) \|/gm)].map((m) => [m[1], m[2].split(', ')]);
  assert.deepEqual(rows, Object.entries(RULES).map(([group, rules]) => [group, rules.map((r) => r.id)]));
});

test('plugin docs: the checker catches what it is for', () => {
  const file = path.join(tempDir(), 'bad.md');
  fs.writeFileSync(file, [
    '# Bad',
    'Run `sp detct` and `sp status x --deep`, then `sp help`.',
    'Read shared/nowhere.md and references/none.md, and ask feature-explainer.',
    'Fine: `sp status x --json | grep -c --count` and `sp state x --decision "uses --force"`.',
  ].join('\n'));
  const problems = docProblems(file).map((p) => p.replace(/^.*?:(\d+:)?\s*/, ''));
  assert.deepEqual(problems.sort(), [
    'feature-explainer', 'no sp command "detct"', 'references/none.md does not exist',
    'shared/nowhere.md does not exist', 'sp status has no --deep',
  ].sort());
});

test('plugin docs: the only addresses are the signature, the schema dialect, the SVG and XLink namespaces and local hosts', () => {
  assert.deepEqual(addressProblems(), []);
  const ok = ['http://localhost', 'http://localhost:5317/x', 'http://127.0.0.1:5317', 'https://json-schema.org/draft/2020-12/schema'];
  for (const url of ok) assert.ok(allowedUrl(url), url);
  // Built from parts, so the address check above never finds them in this file.
  const bad = ['localhost.example.org/x', '127.0.0.10', 'www.w3.org/2000/svgx'].map((rest) => `http:${'//'}${rest}`);
  for (const url of bad) assert.ok(!allowedUrl(url), url);
});
