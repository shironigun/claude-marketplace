'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, shopRepo, tempDir, validJson, inputFile } = require('./helpers');
const { check } = require('../lib/schema');
const { LOGO_BYTES, logoProblems } = require('../lib/logos');

// The sample app with its brand profile saved and confirmed; `sp` runs more.
function profiled() {
  const repo = shopRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const sp = (...args) => runSp(repo, args, env);
  const { workspace } = sp('init', 'Orders', '--json').json;
  for (const args of [['detect'], ['save', 'brands', inputFile(validJson('brands'), repo)], ['confirm', 'brands']]) {
    assert.equal(sp(...args).code, 0, args.join(' '));
  }
  // The subject's workspace sits in the repository's, beside its profile.
  const profile = path.resolve(workspace, '..', '..', 'profile');
  return { repo, env, sp, profile };
}

test('brand profile: each place has a name, a logo has one source, and a place may wait for a logo the user supplies', () => {
  const b = validJson('brands');
  b.brands[0].chrome = { header: { logo: 'full', height: 28 }, 'Side Rail': { logo: 'mark', height: 24 }, rail: { logo: 'dark', height: 24 } };
  b.brands[0].evidence['chrome.Side Rail'] = b.brands[0].evidence['chrome.header'];
  b.brands[0].evidence['chrome.rail'] = b.brands[0].evidence['chrome.header'];
  b.brands[0].logos.mark.svg = '<svg></svg>';
  assert.deepEqual(check('brands', b), [
    "/brands/0/logos/mark: a logo has one of path (a file in the repository), svg (drawn in code) or file (the user's)",
    '/brands/0/chrome: "Side Rail" is not a place name (lower-case letters, digits and hyphens)',
  ]);
  // A logo drawn in code is cited like any value; a supplied one has no evidence, and no logo is required.
  const d = validJson('brands');
  d.brands[0].logos.mark = { svg: "<svg viewBox='0 0 24 24'><circle r='9'/></svg>", format: 'svg' };
  assert.deepEqual(check('brands', d), []);
  d.brands[0].logos.full = { file: 'logos/sample-full.png', format: 'png' };
  assert.deepEqual(check('brands', d), ['/brands/0/evidence: "logos.full" names no value']);
  delete d.brands[0].evidence['logos.full'];
  assert.deepEqual(check('brands', d), []);
  delete d.brands[0].logos.full;
  d.brands[0].chrome = {};
  delete d.brands[0].evidence['chrome.header'];
  assert.deepEqual(check('brands', d), []);
});

test('brand profile: a logo takes at most 64 KiB, and svg markup is one <svg> element in the characters XML knows', () => {
  assert.deepEqual(logoProblems(1024, 'png', 'x'), []);
  assert.deepEqual(logoProblems(LOGO_BYTES + 1, 'png', 'x'), ['x: 65 KiB; a logo takes at most 64 KiB']);
  assert.deepEqual(logoProblems(30, 'svg', 'x', "\n<svg width='9'><path d='M0 0'/></svg>\n"), []);
  assert.deepEqual(logoProblems(30, 'svg', 'x', '<g></g>'), ['x: an svg logo is one <svg> element']);
  // A file may open with the XML declaration, comments and a doctype, as an editor saves it.
  assert.deepEqual(logoProblems(90, 'svg', 'x', '<?xml version="1.0"?>\n<!-- Generator: an editor -->\n<!DOCTYPE svg>\n<svg viewBox="0 0 9 9"></svg>\n'), []);
  assert.deepEqual(logoProblems(50, 'svg', 'x', '<svg><text>R&amp;D&#160;&lt;1&gt;</text></svg>'), []);
  assert.deepEqual(logoProblems(50, 'svg', 'x', '<svg><text>Sample&nbsp;Desk</text></svg>'), [
    'x: &nbsp; is a character XML does not know, and an image reads svg as XML; write the character itself',
  ]);
  for (const text of ['<svg><text>R&D</text></svg>', '<svg><text>A&nbsp B</text></svg>']) {
    assert.deepEqual(logoProblems(50, 'svg', 'x', text), ['x: a bare & is not XML, and an image reads svg as XML; write it as &amp;'], text);
  }
});

test('save brands: a logo drawn in code is checked as a logo', () => {
  const { repo, sp } = profiled();
  const b = validJson('brands');
  b.brands[0].logos.mark = { svg: '<div>Sample</div>', format: 'svg' };
  const r = sp('save', 'brands', inputFile(b, repo));
  assert.equal(r.code, 1);
  assert.match(r.stderr, /\/brands\/0\/logos\/mark: an svg logo is one <svg> element/);
});

test('sp logo: the user\'s file goes into the profile as that brand\'s logo, the board needs confirming again, and a new save keeps it', () => {
  const { repo, sp, profile } = profiled();
  const file = path.join(tempDir('sp-logo-'), 'Sample Logo.PNG');
  fs.writeFileSync(file, Buffer.from('89504e470d0a1a0a', 'hex'));
  const r = sp('logo', 'sample', 'dark', file, '--json');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.logo, { file: 'logos/sample-dark.png', format: 'png' });
  assert.deepEqual(fs.readFileSync(path.join(profile, 'logos', 'sample-dark.png')), fs.readFileSync(file));
  const saved = JSON.parse(fs.readFileSync(path.join(profile, 'brands.json'), 'utf8'));
  assert.deepEqual(saved.brands[0].logos.dark, { file: 'logos/sample-dark.png', format: 'png' });
  assert.equal(sp('status', '--json').json.brand.confirmed, false);
  assert.equal(sp('save', 'brands', inputFile(validJson('brands'), repo)).code, 0);
  const again = JSON.parse(fs.readFileSync(path.join(profile, 'brands.json'), 'utf8'));
  assert.deepEqual(again.brands[0].logos.dark, { file: 'logos/sample-dark.png', format: 'png' });
});

test('confirm brands: a place that shows a logo the repository does not hold waits for the user\'s file', () => {
  const repo = shopRepo();
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  const sp = (...args) => runSp(repo, args, env);
  const b = validJson('brands');
  b.brands[0].chrome.header.logo = 'dark';
  for (const args of [['init', 'Orders'], ['detect'], ['save', 'brands', inputFile(b, repo)]]) {
    assert.equal(sp(...args).code, 0, args.join(' '));
  }
  const r = sp('confirm', 'brands');
  assert.equal(r.code, 1);
  assert.match(r.stderr, /sample shows the dark logo in its header, which it has not; supply its file with sp logo sample dark <file>/);
  const file = path.join(tempDir('sp-logo-'), 'dark.png');
  fs.writeFileSync(file, Buffer.from('89504e470d0a1a0a', 'hex'));
  assert.equal(sp('logo', 'sample', 'dark', file).code, 0);
  assert.equal(sp('confirm', 'brands').code, 0);
});

test('sp logo: a brand, a variant and a logo file it can take, with the profile outside the repository', () => {
  const { repo, sp } = profiled();
  const dir = tempDir('sp-logo-');
  const write = (name, data) => {
    fs.writeFileSync(path.join(dir, name), data);
    return path.join(dir, name);
  };
  const svg = write('mark.svg', "<svg viewBox='0 0 9 9'></svg>");
  const inside = runSp(repo, ['logo', 'sample', 'mark', svg], { SCREENPLAY_HOME: path.join(repo, '.sp') });
  assert.equal(inside.code, 2);
  assert.match(inside.stderr, /is inside the app's repository; choose a folder outside it/);
  assert.match(sp('logo', 'acme', 'full', svg).stderr, /no brand "acme" in the profile; it has sample/);
  assert.match(sp('logo', 'sample', 'wide', svg).stderr, /a logo variant is one of full, mark, collapsed, favicon, dark/);
  assert.match(sp('logo', 'sample', 'full', write('logo.gif', 'GIF89a')).stderr, /a logo is a svg, png, jpg, webp, ico file/);
  assert.match(sp('logo', 'sample', 'full', write('big.png', Buffer.alloc(LOGO_BYTES + 1))).stderr, /65 KiB; a logo takes at most 64 KiB/);
  assert.match(sp('logo', 'sample', 'full', write('bad.svg', '<html></html>')).stderr, /an svg logo is one <svg> element/);
  assert.equal(sp('logo', 'sample', 'mark', svg).code, 0);
});
