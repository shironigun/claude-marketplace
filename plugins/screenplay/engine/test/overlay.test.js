'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EXAMPLES } = require('./helpers');
const { shade, filmColours, themeCssProblems, brandOverlay } = require('../lib/overlay');

const desk = (...p) => path.join(EXAMPLES, 'example-desk', ...p);
const expected = (...p) => JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'expected', 'example-desk', ...p), 'utf8'));
const readRepo = (p) => (fs.existsSync(desk(p)) ? fs.readFileSync(desk(p)) : null);
const overlayOf = (id, mods = { ground: 'light' }, change = () => {}) => {
  const brand = expected('brands.json').brands.find((b) => b.id === id);
  const theme = expected('theme.json');
  change(brand, theme);
  return brandOverlay({ brand, theme, mods, readRepo, readProfile: () => null });
};

test('overlay: a brand\'s theme variables, the logos its cards and places show, its places, colours and font', () => {
  const { overlay, problems } = overlayOf('lumen');
  assert.deepEqual(problems, []);
  assert.deepEqual(overlay.vars, expected('theme.json').brands.lumen.vars);
  assert.deepEqual(Object.keys(overlay.logos), ['full', 'collapsed']);
  assert.equal(overlay.logos.collapsed, `data:image/svg+xml;base64,${fs.readFileSync(desk('brands', 'lumen', 'mark.svg')).toString('base64')}`);
  assert.equal(overlay.card, 'full');
  assert.deepEqual(overlay.places, { rail: { logo: 'collapsed', height: 25, inset: 10 } });
  assert.deepEqual(overlay.colours, { ground: '#f3f7f6', main: '#00796b', second: '#1b2b28', accent: '#0288d1' });
  assert.deepEqual(overlay.font, { family: 'Lumen Sans', weights: [400, 700], title: 700 });
});

test('overlay: a deep ground is the brand\'s main colour, and no two of the film\'s colours are alike', () => {
  assert.deepEqual(filmColours({ primary: '#1f5fbf', background: '#f6f8fb', text: '#1d2733', info: '#0277bd' }, 'deep'),
    { ground: '#1f5fbf', main: '#ffffff', second: '#f6f8fb', accent: '#0277bd' });
  const same = filmColours({ primary: '#1f5fbf', background: '#1f5fbf', text: '#1f5fbf' }, 'light');
  assert.equal(new Set(Object.values(same)).size, 4);
  assert.equal(shade('#000000', 0.5), '#808080');
  assert.equal(shade('#ffffff', -0.25), '#bfbfbf');
});

test('overlay: a logo the brand lacks, a file not there, a value the film\'s CSS refuses, and a brand the theme lacks', () => {
  const missing = overlayOf('harbor', { ground: 'light' }, (b) => { delete b.logos.full; delete b.chrome.rail; });
  assert.deepEqual(missing.problems, ['brand harbor: Harbor has no full logo for the film\'s cards; supply one with sp logo harbor full <file>']);
  assert.deepEqual(overlayOf('harbor', { ground: 'deep' }).problems, [
    'brand harbor: Harbor has no dark logo for the film\'s cards on a deep ground; supply one with sp logo harbor dark <file>, or choose the light ground',
  ]);
  assert.deepEqual(overlayOf('harbor', { ground: 'light' }, (b) => { b.chrome.rail.logo = 'favicon'; }).problems, [
    'brand harbor: Harbor shows the favicon logo in its rail, which it has not; supply its file with sp logo harbor favicon <file>',
  ]);
  const gone = overlayOf('harbor', { ground: 'light' }, (b) => { b.logos.full.path = 'brands/harbor/gone.svg'; });
  assert.deepEqual(gone.problems, ['brand harbor logo full: brands/harbor/gone.svg is not there to read']);
  const bad = overlayOf('harbor', { ground: 'light' }, (b, t) => { t.brands.harbor.vars['--brand-font'] = 'expression(alert(1))'; });
  assert.deepEqual(bad.problems, ['brand harbor: theme no expression() or javascript:']);
  // `sp save theme` refuses such a value first, for every brand of the theme.
  const theme = expected('theme.json');
  assert.deepEqual(themeCssProblems(theme), []);
  theme.brands.lumen.vars['--brand-font'] = 'expression(alert(1))';
  assert.deepEqual(themeCssProblems(theme), ['/brands/lumen/vars: no expression() or javascript:']);
  const none = overlayOf('harbor', { ground: 'light' }, (b, t) => { delete t.brands.harbor; });
  assert.deepEqual(none.problems, ['brand harbor: the theme has no variables for Harbor; rebuild the theme (sp screens --brief theme)']);
});

test('overlay: a logo drawn in code or supplied by the user is read from where the profile keeps it, as an image reads it', () => {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 9'><rect width='9' height='9'/></svg>";
  const drawn = overlayOf('harbor', { ground: 'light' }, (b) => { b.logos.full = { svg, format: 'svg' }; });
  assert.equal(drawn.overlay.logos.full, `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  // Markup written in a page has no namespace, which an image needs.
  const inline = overlayOf('harbor', { ground: 'light' }, (b) => { b.logos.full = { svg: "<svg viewBox='0 0 9 9'><use xlink:href='#a'/></svg>", format: 'svg' }; });
  assert.equal(Buffer.from(inline.overlay.logos.full.split(',')[1], 'base64').toString(),
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox=\'0 0 9 9\'><use xlink:href=\'#a\'/></svg>');
  const commented = overlayOf('harbor', { ground: 'light' }, (b) => { b.logos.full = { svg: "<!-- an old <svg> -->\n<svg viewBox='0 0 9 9'><rect width='9' height='9'/></svg>", format: 'svg' }; });
  assert.equal(Buffer.from(commented.overlay.logos.full.split(',')[1], 'base64').toString(),
    '<!-- an old <svg> -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox=\'0 0 9 9\'><rect width=\'9\' height=\'9\'/></svg>');
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const brand = expected('brands.json').brands[0];
  brand.logos.dark = { file: 'logos/harbor-dark.png', format: 'png' };
  const deep = brandOverlay({ brand, theme: expected('theme.json'), mods: { ground: 'deep' }, readRepo, readProfile: (f) => (f === 'logos/harbor-dark.png' ? png : null) });
  assert.deepEqual(deep.problems, []);
  assert.equal(deep.overlay.card, 'dark');
  assert.equal(deep.overlay.logos.dark, `data:image/png;base64,${png.toString('base64')}`);
});
