'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, shopRepo, validJson, inputFile, EXAMPLES } = require('./helpers');
const { check } = require('../lib/schema');
const { checkCitations, citationsOf } = require('../lib/citations');
const { themeProblems } = require('../lib/theme');

const EXPECTED = path.join(EXAMPLES, 'expected', 'example-desk');

test('theme: one entry per brand of the profile, each with the same custom properties, and no URL', () => {
  const theme = validJson('theme');
  const { evidence } = theme.brands.sample;
  assert.deepEqual(themeProblems(theme, ['sample']), []);
  assert.deepEqual(themeProblems(theme, ['sample', 'gone']), ['/brands: no theme for the brand "gone"']);
  assert.deepEqual(themeProblems({ brands: { ...theme.brands, other: theme.brands.sample } }, ['sample']), [
    '/brands/other: the brand profile has no brand "other"',
  ]);
  assert.deepEqual(themeProblems({ brands: { sample: { vars: { '--primary': 'url(logo.png)', color: 'red' }, evidence } } }, ['sample']), [
    '/brands/sample/vars/--primary: a theme value loads nothing, so it has no url() or image-set()',
    '/brands/sample/vars/color: a theme variable is a custom property, as --name',
  ]);
  // A CSS escape spells url( too, and image-set() loads its plain strings.
  assert.deepEqual(themeProblems({ brands: { sample: { vars: { '--a': '\\75 rl(x.png)', '--b': "image-set('x.png' 1x)" }, evidence } } }, ['sample']), [
    '/brands/sample/vars/--a: a theme value loads nothing, so it has no url() or image-set()',
    '/brands/sample/vars/--b: a theme value loads nothing, so it has no url() or image-set()',
  ]);
  const two = { a: { vars: { '--x': '1', '--y': '2' }, evidence }, b: { vars: { '--x': '3' }, evidence } };
  assert.deepEqual(themeProblems({ brands: two }, ['a', 'b']), ['/brands/b/vars: missing --y, which another brand defines']);
  assert.deepEqual(check('theme', { brands: { sample: { vars: { '--x': 'red; color: blue' }, evidence } } }), [
    '/brands/sample/vars/--x: must match ^[^\\r\\n;{}<>]*$',
  ]);
});

test('save theme: after the brand profile, to the profile; its schema, citations, commits and brands are checked', () => {
  const repo = shopRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const sp = (...args) => runSp(repo, args, env);
  const theme = validJson('theme');
  const early = sp('save', 'theme', inputFile(theme, repo));
  assert.equal(early.code, 2);
  assert.match(early.stderr, /save the brand profile first: the theme has one entry per brand \(sp save brands\)/);
  assert.equal(sp('save', 'brands', inputFile(validJson('brands'), repo)).code, 0);
  const r = sp('save', 'theme', inputFile(theme, repo), '--json');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual([r.json.saved, r.json.items], [path.join(env.SCREENPLAY_HOME, 'shop', 'profile', 'theme.json'), 1]);
  assert.equal(JSON.parse(fs.readFileSync(r.json.saved, 'utf8')).brands.sample.vars['--primary'], '#4a3fb5');
  assert.match(sp('save', 'theme', inputFile(theme, repo)).stdout, /^Saved theme \(1 brand\) to /);
  const wrongQuote = JSON.parse(JSON.stringify(theme));
  wrongQuote.brands.sample.evidence[0].quote = 'primary: red';
  assert.match(sp('save', 'theme', inputFile(wrongQuote, repo)).stderr, /sample evidence 1: src\/theme\/sample\.ts:8@\w+: the line does not hold the quote "primary: red"/);
  const extra = sp('save', 'theme', inputFile({ brands: { ...theme.brands, other: theme.brands.sample } }, repo));
  assert.equal(extra.code, 1);
  assert.match(extra.stderr, /\/brands\/other: the brand profile has no brand "other"/);
  const bare = path.join(tempDir('sp-in-'), 'theme.json');
  fs.writeFileSync(bare, JSON.stringify(theme));
  assert.match(sp('save', 'theme', bare).stderr, /\/brands\/sample\/evidence\/0: missing "commit" \(needed in a git repository\)/);
  // The theme is rebuilt from the brand profile: the same profile keeps it, and a changed one takes it away.
  assert.equal(sp('save', 'brands', inputFile(validJson('brands'), repo)).code, 0);
  assert.ok(fs.existsSync(r.json.saved));
  const renamed = validJson('brands');
  renamed.brands[0].name = 'Sample Two';
  const changed = sp('save', 'brands', inputFile(renamed, repo), '--json');
  assert.equal(changed.json.removed, r.json.saved);
  assert.equal(fs.existsSync(r.json.saved), false);
  assert.match(sp('save', 'brands', inputFile(validJson('brands'), repo)).stdout, /^Saved brands \(1 item\) to [^;]*$/m);
});

test('expected: the theme of example-desk passes its checks against its brand profile, and every citation holds', () => {
  const theme = JSON.parse(fs.readFileSync(path.join(EXPECTED, 'theme.json'), 'utf8'));
  const brands = JSON.parse(fs.readFileSync(path.join(EXPECTED, 'brands.json'), 'utf8')).brands.map((b) => b.id);
  assert.deepEqual(check('theme', theme), []);
  assert.deepEqual(themeProblems(theme, brands), []);
  assert.deepEqual(checkCitations(path.join(EXAMPLES, 'example-desk'), citationsOf('theme', theme)), []);
});
