'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validJson } = require('./helpers');
const { check } = require('../lib/schema');
const { joined, screenPrefix, attrTokens, cssVariables, cssProblems, htmlProblems, filmReadyProblems } = require('../lib/screen');

const AT = '/scenes/0/surfaces/0/html';

test('screen: the valid example is film-ready; text is one string or its lines, and every rule sits under sp-<id>', () => {
  const screen = validJson('screen');
  assert.deepEqual(check('screen', screen), []);
  assert.deepEqual(filmReadyProblems(screen), []);
  assert.equal(screenPrefix('SCR-01'), 'sp-scr-01');
  assert.equal(joined(['a', 'b']), 'a\nb');
  assert.equal(joined('a'), 'a');
  assert.deepEqual(check('screen', { ...screen, css: [1] }), ['/css/0: must be string']);
});

test('screen CSS: plain rules under the prefix, with nothing that loads or runs', () => {
  const p = 'sp-scr-01';
  assert.deepEqual(cssProblems('.sp-scr-01 .a, .sp-scr-01:is(.b, .c) > td { color: red }\n.sp-scr-01 { --x: 1px }', p), []);
  assert.deepEqual(cssProblems('.sp-scr-01 .a { background: url("data:image/png;base64,AAAA") }', p), []);
  assert.deepEqual(cssProblems('.sp-scr-01x { color: red }\n:root { --x: 1 }\nbody, .sp-scr-01 p { margin: 0 }', p), [
    '/css: ".sp-scr-01x" is not under .sp-scr-01',
    '/css: ":root" is not under .sp-scr-01',
    '/css: "body" is not under .sp-scr-01',
  ]);
  assert.deepEqual(cssProblems('@media (max-width: 600px) { .sp-scr-01 .a { color: red } }\n@font-face { font-family: X }', p), [
    "/css: no @media: a screen's CSS is plain rules, scoped under .sp-scr-01",
    "/css: no @font-face: a screen's CSS is plain rules, scoped under .sp-scr-01",
  ]);
  assert.deepEqual(cssProblems('.sp-scr-01 .a { background: url(/img/bg.png); width: expression(1) }', p), [
    '/css: url(/img/bg.png) loads from outside; a screen loads nothing',
    '/css: no expression() or javascript:',
  ]);
  assert.deepEqual(cssProblems('.sp-scr-01 .a { .b { color: red } }', p), ['/css: a rule sits inside another: .sp-scr-01 .a { .b { color: red']);
  assert.deepEqual(cssProblems('.sp-scr-01 .a { color: red', p), ['/css: a rule is not closed']);
  assert.deepEqual(cssProblems('/* @media and url(x) in a comment */ .sp-scr-01 .a { color: red }', p), []);
  // A CSS escape spells url( too, image-set() loads its plain strings, and no rule reaches what sits beside the screen.
  assert.deepEqual(cssProblems('.sp-scr-01 .a { background: \\75 rl(/a.png) }', p), ['/css: url(/a.png) loads from outside; a screen loads nothing']);
  assert.deepEqual(cssProblems(".sp-scr-01 .a { background: image-set('/a.png' 1x) }", p), [
    '/css: no image-set(); an image is an inline url(data:image/...)',
  ]);
  assert.deepEqual(cssProblems('.sp-scr-01 ~ * { display: none }\n.sp-scr-01:hover + .x, .sp-scr-01 .a ~ .b { color: red }', p), [
    '/css: ".sp-scr-01 ~ *" styles what sits beside the screen; a rule reaches only inside .sp-scr-01',
    '/css: ".sp-scr-01:hover + .x" styles what sits beside the screen; a rule reaches only inside .sp-scr-01',
  ]);
  // A quoted url() runs to its own quote, and a comment mark or a brace inside a string is text, so none hides a rule.
  assert.deepEqual(cssProblems('.sp-scr-01 .a { background: url("/e)v.png") }\n.sp-scr-01 .b { background: url(\'/e"v.png\') }', p), [
    '/css: url(/e)v.png) loads from outside; a screen loads nothing',
    '/css: url(/e"v.png) loads from outside; a screen loads nothing',
  ]);
  assert.deepEqual(cssProblems('.sp-scr-01 a { content: "/*" }\nbody { margin: 0 }\n.sp-scr-01 b { content: "*/" }', p), [
    '/css: "body" is not under .sp-scr-01',
  ]);
  assert.deepEqual(cssProblems('.sp-scr-01 a { content: "/*" }\n@import url(/x.css);\n.sp-scr-01 b { content: "*/" }', p), [
    "/css: no @import: a screen's CSS is plain rules, scoped under .sp-scr-01",
    '/css: url(/x.css) loads from outside; a screen loads nothing',
  ]);
  assert.deepEqual(cssProblems('.sp-scr-01 a { content: "}" }\n.sp-scr-01 b { content: "@media" }', p), []);
  // CSS reads a CRLF after an escape as one space, so the escape and the line end spell u.
  assert.deepEqual(cssProblems('.sp-scr-01 .a { background: \\75\r\nrl(/a.png) }', p), ['/css: url(/a.png) loads from outside; a screen loads nothing']);
});

test('screen CSS: read in one pass as a browser reads it, so no string, escape or url( hides a rule', () => {
  const p = 'sp-scr-01';
  const BAD_STRING = '/css: a string runs onto a new line, where a browser ends it; close each string on its line';
  const BODY = '/css: "body" is not under .sp-scr-01';
  const at = (name) => `/css: no @${name}: a screen's CSS is plain rules, scoped under .sp-scr-01`;
  // A raw newline ends a string as a bad string, and the browser reads what follows it as rules.
  const after = (rest) => `.sp-scr-01 { content: "x\n} ${rest} .sp-scr-01 { content: "y" }`;
  assert.deepEqual(cssProblems(after('body { display: none }'), p), [BAD_STRING, BODY]);
  assert.deepEqual(cssProblems(after('@keyframes k { from { opacity: 0 } }'), p), [BAD_STRING, at('keyframes')]);
  const font = after('@font-face { font-family: Q; src: local(Arial) }');
  assert.deepEqual(cssProblems(font, p), [BAD_STRING, at('font-face')]);
  assert.deepEqual(cssProblems('.sp-scr-01::after { content: "x }', p), [
    '/css: a string is not closed', '/css: a rule is not closed',
  ]);
  // In a string, a backslash before a newline drops out of it, and every other escape is decoded.
  const continued = '.sp-scr-01 .a { content: "a\\\nb"; background: url("data:image/\\\npng;base64,AA") }';
  assert.deepEqual(cssProblems(continued, p), []);
  // A backslash escapes any character but a newline outside strings too, so `\(` opens nothing.
  for (const c of ['(', '[', '"']) {
    assert.deepEqual(cssProblems(`.sp-scr-01 .x\\${c}, body { display: none }`, p), [BODY], c);
  }
  assert.deepEqual(cssProblems('.sp-scr-01 .md\\:flex, .sp-scr-\\30 1 .a { display: flex }', p), []);
  assert.deepEqual(cssProblems('.sp-scr-01 .a, .sp-scr-01\\31 ~ body { display: none }', p), [
    '/css: ".sp-scr-01\\31 ~ body" is not under .sp-scr-01',
  ]);
  // An unquoted url( is one token to its `)`, escapes honoured, so a `}` in it closes nothing; a bad url is refused.
  assert.deepEqual(cssProblems('.sp-scr-01 .a { background: url(data:image/png;base64,A}A\\)A) }', p), []);
  const bad = '.sp-scr-01 .a { background: url(/a b.png) }\n.sp-scr-01 .b { mask: url(data:image/svg+xml;utf8,"x") }';
  assert.deepEqual(cssProblems(bad, p), [
    '/css: url(/a b.png) is a bad url to a browser; put its address in quotes',
    '/css: url(data:image/svg+xml;utf8,"x") is a bad url to a browser; put its address in quotes',
  ]);
  // Every address is read with its escapes decoded.
  const escaped = '.sp-scr-01 .a { background: url(\\2f a.png), url("\\2f b.png"), url(\\64 ata:image/png,AA),'
    + ' url(\\23 x) }';
  assert.deepEqual(cssProblems(escaped, p), [
    '/css: url(/a.png) loads from outside; a screen loads nothing',
    '/css: url(/b.png) loads from outside; a screen loads nothing',
  ]);
  // A function that loads an image, by its name with escapes decoded, in any case and with a vendor prefix.
  const loads = (name) => `/css: no ${name}(); an image is an inline url(data:image/...)`;
  const loaders = [
    '.sp-scr-01 .a { background: IMAGE(#x), -webkit-image-set(url(data:image/png,A) 1x), \\63 ross-fade(red, blue),',
    "  -webkit-cross-fade(red, blue); mask: src('/m.png') }",
  ].join('\n');
  assert.deepEqual(cssProblems(loaders, p), [
    loads('image'), loads('-webkit-image-set'), loads('cross-fade'), loads('-webkit-cross-fade'), loads('src'),
  ]);
  // Brackets pair as a browser pairs them: a bracket that closes nothing open is refused.
  const stray = (c) => `/css: a "${c}" closes nothing that is open; brackets close in the order they open`;
  assert.deepEqual(cssProblems('.sp-scr-01 .a { color: red } }\nbody { margin: 0 }', p), [stray('}')]);
  assert.deepEqual(cssProblems('.sp-scr-01 .a { content: ( } body { display: none ) }', p), [stray('}')]);
  assert.deepEqual(cssProblems('.sp-scr-01 .a { color: f(red] }', p), [stray(']')]);
});

test('screen CSS: no "<", even in a comment, since "</style>" would end the element the build puts the CSS in', () => {
  const p = 'sp-scr-01';
  const LT = '/css: no "<": the build puts the CSS in a <style> element, which "</style>" ends wherever it stands';
  assert.deepEqual(cssProblems('.sp-scr-01::after { content: "</style><img src=x onerror=alert(1)>" }', p), [LT]);
  assert.deepEqual(cssProblems('/* </style> */ .sp-scr-01 > .a { color: red }', p), [LT]);
  assert.deepEqual(cssProblems('.sp-scr-01 > .a::after { content: "\\3c /style>" }', p), []);
});

test('screen HTML: no element that runs or loads, no handler, no address but #fragments and inline images', () => {
  assert.deepEqual(htmlProblems("<a href='#send' class='x'><img src='data:image/svg+xml;utf8,<svg/>'></a>", AT), []);
  assert.deepEqual(htmlProblems('  ', AT), [`${AT}: has no markup`]);
  assert.deepEqual(htmlProblems('<script>x()</script><STYLE>p{}</STYLE><iframe src="#"></iframe>', AT), [
    `${AT}: no <script>`, `${AT}: no <style>`, `${AT}: no <iframe>`,
  ]);
  assert.deepEqual(htmlProblems('<button onclick="go()" ONMOUSEOVER=x>Go</button>', AT), [
    `${AT}: no onclick handler`, `${AT}: no onmouseover handler`,
  ]);
  assert.deepEqual(htmlProblems('<a href="/settings">x</a><img src=/logo.png><div style="background: url(/a.png)"></div>', AT), [
    `${AT}: href="/settings" loads from outside; a screen loads nothing`,
    `${AT}: src="/logo.png" loads from outside; a screen loads nothing`,
    `${AT}: url(/a.png) loads from outside; a screen loads nothing`,
  ]);
  // HTML takes a slash or a quote before an attribute and decodes references, and a srcset loads each candidate.
  assert.deepEqual(htmlProblems('<img/onerror="go()"src="/a.png"><svg/onload="go()"></svg>', AT), [
    `${AT}: no onerror handler`, `${AT}: no onload handler`, `${AT}: src="/a.png" loads from outside; a screen loads nothing`,
  ]);
  assert.deepEqual(htmlProblems("<img srcset='data:image/png;base64,AA 1x, /b.png 2x'><table background='/bg.png'></table>", AT), [
    `${AT}: srcset="/b.png" loads from outside; a screen loads nothing`,
    `${AT}: background="/bg.png" loads from outside; a screen loads nothing`,
  ]);
  assert.deepEqual(htmlProblems(`<p style="background: image-set('/a.png' 1x)">a</p><p style='color: u&#114;l(/b.png)'>b</p>`, AT), [
    `${AT}: url(/b.png) loads from outside; a screen loads nothing`,
    `${AT}: no image-set(); an image is an inline url(data:image/...)`,
  ]);
  assert.deepEqual(htmlProblems(`<p style='background: url("/e)v.png")'>a</p>`, AT), [`${AT}: url(/e)v.png) loads from outside; a screen loads nothing`]);
  assert.deepEqual(htmlProblems("<svg><image href='#a'><set attributeName='href' to='/x.png'/><animate attributeName='href' values='/y.png'/></image></svg>", AT), [
    `${AT}: no <set>`, `${AT}: no <animate>`,
  ]);
  assert.deepEqual(htmlProblems('<svg><text>Total</text></svg><span data-sp-slot="avatar"></span>', AT), [
    `${AT}: words are HTML text, never svg <text>`,
    `${AT}: no slot "avatar"; the build fills the logo slot only`,
  ]);
});

test('screen HTML: read whole as a browser reads it, so no reference, escape or space spells a load', () => {
  const outside = (u) => `${AT}: url(${u}) loads from outside; a screen loads nothing`;
  const loads = (name) => `${AT}: no ${name}(); an image is an inline url(data:image/...)`;
  const away = '//example.invalid';
  // A url() spelled with a character reference or a CSS escape, in any attribute a browser reads as CSS.
  const svg = (attr) => htmlProblems(`<svg><rect ${attr}/></svg>`, AT);
  assert.deepEqual(svg(`fill="u&#114;l(${away}/p.svg#g)"`), [outside(`${away}/p.svg#g`)]);
  assert.deepEqual(svg(`mask="u\\72l(${away}/m.png)"`), [outside(`${away}/m.png`)]);
  assert.deepEqual(svg(`cursor="url&#40;${away}/c.png), auto"`), [outside(`${away}/c.png`)]);
  // Every function that loads an image; the text is read too, so text that reads like one is refused.
  const styled = "<p style='background: -webkit-image-set(url(data:image/png,AA) 1x)'>a</p>"
    + "<i style='mask: \\69mage(#m)'>b</i>";
  assert.deepEqual(htmlProblems(styled, AT), [loads('-webkit-image-set'), loads('image')]);
  const text = '<p style="background: cross-fade(red, blue)">a</p><p>Paste the URL(s) or image(s)</p>';
  assert.deepEqual(htmlProblems(text, AT), [outside('s'), loads('cross-fade'), loads('image')]);
  // An expression() call is refused however its escapes spell it; text that names an expression makes no call.
  assert.deepEqual(htmlProblems('<p style="width: expr\\65ssion(1)">a</p>', AT), [`${AT}: no expression()`]);
  assert.deepEqual(htmlProblems('<p>Cron expression (UTC)</p>', AT), []);
  // A named reference is read only with its `;`, and only ASCII spaces may come before an inline address.
  assert.deepEqual(htmlProblems(`<img src="&num${away}/x.png"><a href="&num;send">x</a>`, AT), [
    `${AT}: src="&num${away}/x.png" loads from outside; a screen loads nothing`,
  ]);
  assert.deepEqual(htmlProblems('<img src="&nbsp;#x"><img src=" &#9;#y">', AT), [
    `${AT}: src="\u00a0#x" loads from outside; a screen loads nothing`,
  ]);
  // <marquee> animates itself.
  assert.deepEqual(htmlProblems('<marquee>Sale</marquee>', AT), [`${AT}: no <marquee>`]);
});

test('screen: hooks and variables are read from the markup and the CSS; sizes stay under the limits', () => {
  assert.deepEqual(attrTokens("<p data-sp='S-02.1 S-02.2'>a</p><b data-sp=\"S-02.3\">b</b><i data-sp=S-02.4 data-sp-hide=T-04>c</i>", 'data-sp'),
    ['S-02.1', 'S-02.2', 'S-02.3', 'S-02.4']);
  assert.deepEqual(attrTokens("<i data-sp=S-02.4 data-sp-hide='T-04 T-05'>c</i>", 'data-sp-hide'), ['T-04', 'T-05']);
  const vars = cssVariables('.sp-scr-01 { --gap: 4px; color: var(--brand-text, #222); margin: var( --gap) }');
  assert.deepEqual([[...vars.used], [...vars.set]], [['--brand-text', '--gap'], ['--gap']]);
  const named = cssVariables('.sp-scr-01 { --brand_gap: 4px; color: var(--marca-café); margin: var(--brand_gap) }');
  assert.deepEqual([[...named.used], [...named.set]], [['--marca-café', '--brand_gap'], ['--brand_gap']]);
  // 150 KiB of url( is read in one pass: the first runs to the end of the text, and is refused.
  const flood = 'url('.repeat(37 * 1024);
  assert.deepEqual(htmlProblems(`<p style="background: ${flood}">a</p>`, AT), [
    `${AT}: url(${flood.slice(4)}">a</p>) loads from outside; a screen loads nothing`,
  ]);
  const screen = validJson('screen');
  const big = { ...screen, css: `.sp-scr-01 .a { content: "${'x'.repeat(151 * 1024)}" }` };
  assert.deepEqual(filmReadyProblems(big), ["/css: 152 KiB is more than the 150 KiB a screen's CSS may take"]);
  const surface = { kind: 'page', html: `<p>${'x'.repeat(151 * 1024)}</p>` };
  const bigSurface = { ...screen, scenes: [{ ...screen.scenes[0], surfaces: [surface] }] };
  assert.deepEqual(filmReadyProblems(bigSurface), [`${AT}: 152 KiB is more than the 150 KiB a surface may take`]);
});

test('screen HTML: a reference the engine cannot read is refused, so a builder writes the character itself', () => {
  const unread = (r) => `${AT}: ${r} is a reference the engine cannot read; write the character itself`;
  assert.deepEqual(htmlProblems('<p>Jos&eacute; Ruiz &amp; Ava&nbsp;Brooks, R&D, &#233; &nbspX</p>', AT), [unread('&eacute;')]);
  assert.deepEqual(htmlProblems('<p>Av&shy;a &ensp; &copy2026 &constructor;</p>', AT), [
    unread('&shy;'), unread('&ensp;'), unread('&copy'), unread('&constructor;'),
  ]);
});
