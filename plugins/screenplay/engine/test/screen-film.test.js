'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, filmRepo, validJson, inputFile } = require('./helpers');
const { screenFilmProblems, screenBytes, filmSizeProblems } = require('../lib/screen');

// What a screen of the sample app's promo is checked against (lib/film.js filmContext), with one must-not-show entry.
const context = () => ({
  subject: 'orders', film: 'promo', screens: validJson('screens').screens, beats: validJson('beats'), forbidden: ['Dana Fox'],
  mods: validJson('mods'), brands: validJson('brands').brands.map((b) => ({ id: b.id, name: b.name, chrome: b.chrome })),
  truth: [...validJson('truth').entries, { id: 'T-03', kind: 'never-populated', statement: 'The order total is never set.' }],
});
const THEME = validJson('theme');
const problemsOf = (change) => {
  const screen = validJson('screen');
  change(screen, screen.scenes[0].surfaces[0]);
  return screenFilmProblems(screen, context(), THEME);
};

test('screen against the film: the valid example fits its story, its hooks, the theme and the brief', () => {
  assert.deepEqual(screenFilmProblems(validJson('screen'), context(), THEME), []);
  const screen = validJson('screen');
  const html = screen.scenes[0].surfaces.reduce((n, s) => n + Buffer.byteLength(s.html.join('\n')), 0);
  assert.equal(screenBytes(screen), Buffer.byteLength(screen.css.join('\n')) + html);
});

test('screen against the film: the story\'s scenes of the screen, each with one page and a surface per layer its beats open', () => {
  assert.deepEqual(problemsOf((s) => { s.screen = 'SCR-09'; }), ['/screen: the screen map has no SCR-09']);
  assert.deepEqual(problemsOf((s) => { s.scenes[0].scene = 'S-03'; }), [
    '/scenes: the story shows SCR-01 in S-02; add that scene', '/scenes/0: S-03 is not a scene of SCR-01 in the story',
  ]);
  assert.deepEqual(problemsOf((s) => { s.scenes.push(s.scenes[0]); }), ['/scenes/1: S-02 twice']);
  assert.deepEqual(problemsOf((s) => { s.scenes[0].surfaces[1].kind = 'dialog'; }), ['/scenes/0/surfaces/1: "Open order" is a drawer, not a dialog']);
  assert.deepEqual(problemsOf((s) => { s.scenes[0].surfaces.push({ kind: 'toast', action: 'Saved', html: "<p class='toast'>Saved</p>" }); }), [
    '/scenes/0/surfaces/2: neither S-02 nor an earlier scene of SCR-01 opens the toast "Saved"',
  ]);
  assert.deepEqual(problemsOf((s) => { s.scenes[0].surfaces.push({ kind: 'page', html: '<p>again</p>' }); }), ['/scenes/0: a scene has one page surface; this one has 2']);
  assert.deepEqual(problemsOf((s, page) => {
    page.html.push(...s.scenes[0].surfaces[1].html);
    s.scenes[0].surfaces.pop();
  }), ['/scenes/0: S-02\'s beats open the drawer "Open order"; add its surface']);
});

test('screen against the film: a layer an earlier scene opened may stay open, and each tab a scene clicks marks what it shows', () => {
  const beats = validJson('beats');
  const [title, scene, end] = beats.scenes;
  const later = { ...scene, id: 'S-03', beats: [{ do: 'hold', target: 'the order drawer', ms: 2000 }, { do: 'click', target: 'the Approved tab', action: 'Approved', ms: 1200 }] };
  beats.scenes = [title, scene, later, { ...end, id: 'S-04' }];
  const screens = validJson('screens').screens.map((s) => ({ ...s, actions: [...s.actions, { kind: 'tab', label: 'Approved' }] }));
  const fc = { ...context(), beats, screens };
  const screen = (state) => {
    const s = validJson('screen');
    s.scenes.push({ scene: 'S-03', surfaces: [
      { kind: 'page', html: ["<section class='orders'>", `  <table><tbody ${state} hidden></tbody></table>`, "  <button data-sp='S-03.2'>Approved</button>", '</section>'] },
      { kind: 'drawer', action: 'Open order', html: ["<aside class='drawer' data-sp='S-03.1'>O-1001</aside>"] },
    ] });
    return s;
  };
  assert.deepEqual(screenFilmProblems(screen("data-sp-state='Approved'"), fc, THEME), []);
  assert.deepEqual(screenFilmProblems(screen("class='x'"), fc, THEME), [
    '/scenes/1: S-03\'s beats click the tab "Approved"; mark what it shows with data-sp-state="Approved"',
  ]);
  assert.deepEqual(screenFilmProblems(screen("data-sp-state='Approved'><tr data-sp-state='Archived'></tr"), fc, THEME), [
    '/scenes/1: data-sp-state="Archived" names no tab of SCR-01',
  ]);
});

test('screen against the film: a logo slot names a place every brand of the film shows a logo in', () => {
  const slot = (attrs) => (s, page) => { page.html[1] = `  <span class='logo' ${attrs}></span>`; };
  assert.deepEqual(problemsOf(slot("data-sp-slot='logo'")), [
    '/scenes/0/surfaces/0: a logo slot names its place with data-sp-logo; every brand of the film shows a logo in: header',
  ]);
  assert.deepEqual(problemsOf(slot("data-sp-slot='logo' data-sp-logo='rail'")), [
    '/scenes/0/surfaces/0: data-sp-logo="rail" is not a place every brand of the film shows a logo in: header',
  ]);
  assert.deepEqual(problemsOf(slot("data-sp-logo='header' data-sp-slot='logo'")), []);
});

test('screen against the film: each beat\'s target carries its hook once, and no hook names another beat', () => {
  assert.deepEqual(problemsOf((s, page) => { page.html[0] = "<section class='orders'>"; }), [
    '/scenes/0: no element carries data-sp="S-02.1", the target of "hold the orders list"',
  ]);
  assert.deepEqual(problemsOf((s, page) => { page.html[2] = "  <h1 data-sp='S-02.1'>Orders</h1>"; }), ['/scenes/0: data-sp="S-02.1" is on 2 elements; a beat has one target']);
  assert.deepEqual(problemsOf((s, page) => { page.html[2] = "  <h1 data-sp='S-02.9 S-03.1 x'>Orders</h1>"; }), [
    '/scenes/0: data-sp="S-02.9" names no beat of S-02', '/scenes/0: data-sp="S-03.1" names no beat of S-02', '/scenes/0: data-sp="x" names no beat of S-02',
  ]);
});

test('screen against the film: marks name must-not-show entries, variables come from the theme, and no seed name shows', () => {
  assert.deepEqual(problemsOf((s, page) => {
    page.html[2] = "  <h1 data-sp-hide='T-01'>Orders</h1>";
    page.html[4] = page.html[4].replace('<td>1,280</td>', "<td data-sp-hide='T-03'>1,280</td>");
  }), ['/scenes/0/surfaces/0: data-sp-hide="T-01" is not on the must-not-show list']);
  assert.deepEqual(problemsOf((s) => { s.css.push('.sp-scr-01 .x { color: var(--accent); margin: var(--gap) }', '.sp-scr-01 { --gap: 4px }'); }), [
    "/css: var(--accent) is in no brand's theme and not set here",
  ]);
  assert.deepEqual(problemsOf((s, page) => { page.html[2] = "  <h1 style='--pad: 2px; padding: var(--pad); color: var(--accent)'>Orders</h1>"; }), [
    "/scenes/0/surfaces/0: var(--accent) is in no brand's theme and not set here",
  ]);
  assert.deepEqual(problemsOf((s, page) => {
    page.html[5] = page.html[5].replace('Pine Street Cafe', 'Dana Fox');
    s.guesses.push('The second row was dana fox in the seed data.');
  }), [
    '/scenes/0/surfaces/0/html/5: shows "Dana Fox", which the brief\'s must-not-show list names',
    '/guesses/1: shows "Dana Fox", which the brief\'s must-not-show list names',
  ]);
});

test('screen against the film: a seed name split across lines, tags or references shows as a viewer reads it', () => {
  const shows = (at) => `${at}: shows "Dana Fox", which the brief's must-not-show list names`;
  const row = (cells) => (s, page) => { page.html[5] = `    <tr>${cells}<td>342</td></tr>`; };
  const cells = [
    '<td>Dana  Fox</td>', '<td>dana&#32;FOX</td>', '<td>Dana&nbsp;Fox</td>', '<td>Dana&nbspFox</td>',
    '<td>Dana <b></b>Fox</td>', '<td>Dana<b></b>Fox</td>', '<td>Dana</td><td>Fox</td>',
    "<td><input value='Dana&#32;Fox'></td>", '<td>&lt;b Dana <i></i>Fox</td>',
  ];
  for (const c of cells) assert.deepEqual(problemsOf(row(c)), [shows('/scenes/0/surfaces/0')], c);
  assert.deepEqual(problemsOf((s, page) => { page.html.splice(5, 1, '    <tr><td>Dana', '      Fox</td></tr>'); }), [
    shows('/scenes/0/surfaces/0'),
  ]);
  // A name one string already shows is reported there, once.
  assert.deepEqual(problemsOf(row('<td>Dana Fox</td>')), [shows('/scenes/0/surfaces/0/html/5')]);
});

test('screen against the film: a seed name holding an invisible character, in another Unicode form, or written by the CSS, shows as a viewer reads it', () => {
  const shows = (at) => `${at}: shows "Dana Fox", which the brief's must-not-show list names`;
  const row = (cells) => (s, page) => { page.html[5] = `    <tr>${cells}<td>342</td></tr>`; };
  for (const c of ['<td>Da\u200bna Fox</td>', '<td>Dana\u00ad Fox</td>', '<td>\ufeffDana Fox</td>', '<td>\uff24ana Fox</td>']) {
    assert.deepEqual(problemsOf(row(c)), [shows('/scenes/0/surfaces/0/html/5')], JSON.stringify(c));
  }
  assert.deepEqual(problemsOf(row('<td>Da&#8203;na Fox</td>')), [shows('/scenes/0/surfaces/0')]);
  assert.deepEqual(problemsOf((s) => { s.css.push('.sp-scr-01 .who::after { content: "Dana\\20 Fox"; }'); }), [shows('/css')]);
  assert.deepEqual(problemsOf((s) => { s.css.push('.sp-scr-01 .who::after { content: "Dana" " Fox"; }'); }), [shows('/css')]);
  assert.deepEqual(problemsOf((s) => { s.css.push('.sp-scr-01 .who::after { content: "Dana Fox"; }'); }), [shows('/css/6')]);
});

test('screen against the film: the screens the story shows fit in what a film\'s screens may take together', () => {
  const big = (id) => ({ screen: id, css: 'x'.repeat(140 * 1024), scenes: [] });
  const others = (n) => Array.from({ length: n }, (_, i) => big(`SCR-${String(i + 2).padStart(2, '0')}`));
  assert.deepEqual(filmSizeProblems(big('SCR-01'), others(9)), []);
  assert.deepEqual(filmSizeProblems(big('SCR-01'), others(10)), [
    "the film's screens would take 1540 KiB, more than the 1536 KiB a film's screens may take",
  ]);
});

test('screen against the film: the film\'s CSS, with a rule for each state it styles, fits one module', () => {
  const hovers = Array.from({ length: 2000 }, (_, i) => `.sp-scr-01 .row-${i}:hover { background: #f4f6f8; }`);
  assert.deepEqual(problemsOf((s) => { s.css.push(...hovers); }), [
    "/css: with a rule for each state it styles, the film's CSS takes 220 KiB, past a module's 200 KiB; trim its hover, focus and pressed rules",
  ]);
});

test('save screen: after the theme and gate 2, to the film\'s screens, leaving gate 2 passed; its size and citations are checked', () => {
  const f = filmRepo();
  const sp = (...args) => runSp(f.repo, args, f.env);
  const save = (kind, value, ...rest) => sp('save', kind, inputFile(value, f.repo), ...rest);
  const film = ['--subject', 'orders', '--film', 'promo'];
  for (const kind of ['mods', 'beats', 'demo-data']) assert.equal(save(kind, validJson(kind), ...film).code, 0, kind);
  const screen = validJson('screen');
  const noTheme = save('screen', screen, ...film);
  assert.equal(noTheme.code, 2);
  assert.match(noTheme.stderr, /save the theme first: a screen's brand values are its variables \(sp save theme\)/);
  assert.equal(save('theme', validJson('theme')).code, 0);
  assert.match(save('screen', screen, ...film).stderr, /the screens come after gate 2; the next step is gate-2/);
  assert.equal(sp('storyboard', 'orders', '--film', 'promo').code, 0);
  assert.equal(sp('confirm', 'gate-2', '--subject', 'orders', '--film', 'promo').code, 0);
  const r = save('screen', screen, ...film, '--json');
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json, { kind: 'screen', saved: path.join(f.film, 'screens', 'SCR-01.json'), items: 1 });
  assert.equal(sp('status', 'orders', '--film', 'promo', '--json').json.next, 'build'); // gate 2 still holds; the screen is saved
  assert.match(save('screen', screen, ...film).stdout, /^Saved screen \(1 scene\) to /);
  const wrong = validJson('screen');
  wrong.evidence[0].quote = 'the drawer';
  assert.match(save('screen', wrong, ...film).stderr, /evidence 1: src\/pages\/Orders\.tsx:3@\w+: the line does not hold the quote "the drawer"/);
  const bare = path.join(tempDir('sp-in-'), 'screen.json');
  fs.writeFileSync(bare, JSON.stringify(screen));
  assert.match(sp('save', 'screen', bare, ...film).stderr, /\/evidence\/0: missing "commit" \(needed in a git repository\)/);
  // Files of screens the story does not show, left from an earlier story, take none of the film's room.
  for (let n = 2; n <= 12; n += 1) {
    const other = { screen: `SCR-${String(n).padStart(2, '0')}`, css: 'x'.repeat(140 * 1024), scenes: [] };
    fs.writeFileSync(path.join(f.film, 'screens', `${other.screen}.json`), JSON.stringify(other));
  }
  assert.equal(save('screen', screen, ...film).code, 0);
});
