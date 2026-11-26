'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { filmCss } = require('../lib/filmcss');
const { MODULE_LIMITS, packSurfaces, moduleProblems } = require('../lib/modules');

test('film CSS: each state the app styles also answers to the attribute the kit sets in its place, in a rule of its own', () => {
  assert.equal(filmCss('.sp-scr-01 .bell:hover { background: #eee; }'),
    '.sp-scr-01 .bell:hover { background: #eee; }\n.sp-scr-01 .bell[data-sp-hover] { background: #eee; }');
  assert.equal(filmCss('.sp-scr-01 textarea:focus-visible, .sp-scr-01 a:FOCUS { outline: 2px solid; }'),
    '.sp-scr-01 textarea:focus-visible, .sp-scr-01 a:FOCUS { outline: 2px solid; }\n.sp-scr-01 textarea[data-sp-focus], .sp-scr-01 a[data-sp-focus] { outline: 2px solid; }');
  assert.equal(filmCss('.sp-scr-01 form:focus-within { border-color: #1f5fbf; }'),
    '.sp-scr-01 form:focus-within { border-color: #1f5fbf; }\n.sp-scr-01 form:has([data-sp-focus]) { border-color: #1f5fbf; }');
  assert.equal(filmCss('.sp-scr-01 button:not(:active) { opacity: .9; }'),
    '.sp-scr-01 button:not(:active) { opacity: .9; }\n.sp-scr-01 button:not([data-sp-active]) { opacity: .9; }');
  // `:has()` takes no `:has()`, so a focus-within inside one gets no attribute rule, and the app's rule stands.
  const nested = '.sp-scr-01 .card:has(input:focus-within), .sp-scr-01 .a { color: #222; }';
  assert.equal(filmCss(nested), nested);
});

test('film CSS: a child of the screen\'s element is a child of its surface, and a dialog\'s backdrop styles the kit\'s', () => {
  assert.equal(filmCss('.sp-scr-01 > .shell, .sp-scr-01>main { display: grid; }'),
    '.sp-scr-01 > .sp-surface > .shell, .sp-scr-01> .sp-surface >main { display: grid; }');
  assert.equal(filmCss('.sp-scr-01 dialog::backdrop { background: rgba(0, 0, 0, .4); }'),
    '.sp-scr-01 dialog::backdrop { background: rgba(0, 0, 0, .4); }\n.sp-scr-01 .sp-backdrop:has(+ dialog) { background: rgba(0, 0, 0, .4); }');
  assert.equal(filmCss('.sp-scr-01 > dialog.send::BACKDROP { opacity: .5; }'),
    '.sp-scr-01 > .sp-surface > dialog.send::BACKDROP { opacity: .5; }\n.sp-scr-01 > .sp-surface > .sp-backdrop:has(+ dialog.send) { opacity: .5; }');
  assert.equal(filmCss('.sp-scr-01::backdrop { opacity: .5; }'), '.sp-scr-01::backdrop { opacity: .5; }');
});

test('film CSS: rules with no state stay as the app wrote them, values and strings included', () => {
  const css = [
    '.sp-scr-01 .grid td { padding: 10px 12px; }',
    ".sp-scr-01 .tip::after { content: ':hover'; }",
    '.sp-scr-01 ::selection { color: #fff; }',
  ].join('\n');
  assert.equal(filmCss(css), css);
  assert.equal(filmCss('/* note */ .sp-scr-01 p { margin: 0; }'), ' .sp-scr-01 p { margin: 0; }');
});

test('modules: a screen\'s surfaces pack into as few JSON modules as fit, and each surface\'s module is named', () => {
  const items = [['S-02/0', '<p>a</p>'], ['S-02/1', '<aside>b</aside>'], ['S-03/0', '<p>c</p>']];
  const one = packSurfaces('scr-01', items);
  assert.deepEqual(one.modules.map((m) => [m.name, m.kind]), [['scr-01.json', 'json']]);
  assert.deepEqual(JSON.parse(one.modules[0].text), { 'S-02/0': '<p>a</p>', 'S-02/1': '<aside>b</aside>', 'S-03/0': '<p>c</p>' });
  assert.deepEqual(one.where, { 'S-02/0': 'scr-01.json', 'S-02/1': 'scr-01.json', 'S-03/0': 'scr-01.json' });
  const big = 'x'.repeat(120 * 1024);
  const split = packSurfaces('scr-02', [['S-04/0', big], ['S-04/1', big], ['S-05/0', 'y'.repeat(210 * 1024)]]);
  assert.deepEqual(split.modules.map((m) => [m.name, m.kind]), [['scr-02.json', 'json'], ['scr-02-2.json', 'json'], ['scr-02-3.html', 'html']]);
  assert.deepEqual(split.where, { 'S-04/0': 'scr-02.json', 'S-04/1': 'scr-02-2.json', 'S-05/0': 'scr-02-3.html' });
  for (const m of split.modules.filter((x) => x.kind === 'json')) assert.ok(Buffer.byteLength(m.text) <= MODULE_LIMITS.moduleBytes);
});

test('modules: the Motion type takes 48 modules of 200 KiB, 2 MiB in all, and never a name the page keeps', () => {
  const mod = (name, kib = 1) => ({ name, kind: 'text', text: 'x'.repeat(kib * 1024) });
  assert.deepEqual(moduleProblems([mod('scenes.json'), mod('scene-s-01.js'), mod('scr-01.json')]), []);
  assert.deepEqual(moduleProblems([mod('retyped.json'), mod('layer-1.js'), mod('-x.json')]), [
    'module retyped.json: a name the Motion page keeps for itself',
    'module layer-1.js: a name the Motion page keeps for itself',
    'module -x.json: not a name the Motion type takes',
  ]);
  assert.deepEqual(moduleProblems([mod('a.json', 201)]), ['module a.json: 201 KiB; a module takes at most 200 KiB']);
  const many = Array.from({ length: 49 }, (_, i) => mod(`m${i}.json`));
  assert.deepEqual(moduleProblems(many), ['49 modules; a film takes at most 48']);
  const heavy = Array.from({ length: 11 }, (_, i) => mod(`h${i}.json`, 190));
  assert.deepEqual(moduleProblems(heavy), ['the modules take 2090 KiB; a film takes at most 2048 KiB']);
});
