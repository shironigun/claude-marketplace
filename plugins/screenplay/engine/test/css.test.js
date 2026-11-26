'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeCssEscapes, readCss } = require('../lib/css');

// A stylesheet's tokens without its spaces, each as its type and, when it has one, its value.
const read = (css) => readCss(css).filter((t) => t.type !== 'space')
  .map((t) => (t.value === undefined ? t.type : `${t.type} ${t.value}`));

test('css: escapes are decoded after the line ends, which CSS reads first', () => {
  assert.equal(decodeCssEscapes('\\75\r\nrl('), 'url(');
  assert.equal(decodeCssEscapes('\\75\rrl( \\75\frl( \\2f a.png'), 'url( url( /a.png');
});

test('css: a backslash makes any character but a newline part of a name, wherever it stands', () => {
  assert.deepEqual(read('.x\\(, body'), ['delim .', 'ident x(', ',', 'ident body']);
  assert.deepEqual(read('.x\\[, .y\\", .md\\:flex'), [
    'delim .', 'ident x[', ',', 'delim .', 'ident y"', ',', 'delim .', 'ident md:flex',
  ]);
  assert.deepEqual(read('.sp-scr-\\30 1 #\\31 a @\\6d edia \\75 rl(x) U\\52L("y")'), [
    'delim .', 'ident sp-scr-01', 'hash 1a', 'at media', 'url x', 'function URL', 'string y', ')',
  ]);
  assert.deepEqual(read('a\\\nb'), ['ident a', 'delim \\', 'ident b']);
});

test('css: a string ends at its quote, or at a raw newline as a bad string; a backslash and a newline drop out', () => {
  assert.deepEqual(read('"x\n} body {'), ['bad-string x', '}', 'ident body', '{']);
  assert.deepEqual(read('"a\\\nb" \'c\\\'d\' "\\2f e"'), ['string ab', "string c'd", 'string /e']);
  assert.deepEqual(readCss("'open").map((t) => [t.type, t.value, t.open]), [['string', 'open', true]]);
  assert.deepEqual(read('a/* } "*/b "/* c */"'), ['ident a', 'ident b', 'string /* c */']);
});

test('css: an unquoted url( is one token to its `)`, escapes honoured, or else a bad url', () => {
  assert.deepEqual(read('url( a}b\\)c ) url(d e) url(f"g) url(h\\\ni) url(j(k)'), [
    'url a}b)c', 'bad-url d', 'bad-url f', 'bad-url h', 'bad-url j',
  ]);
  assert.deepEqual(readCss('url(x').map((t) => [t.type, t.value, t.open]), [['url', 'x', true]]);
  assert.deepEqual(readCss('a url(b) "c"').map((t) => t.raw), ['a', ' ', 'url(b)', ' ', '"c"']);
});

test('css: CDO and CDC, numbers, and the delims a number does not take', () => {
  assert.deepEqual(read('<!-- --> -x +1 .5 1e3px 50% + ~ > -- --x'), [
    'cdo', 'cdc', 'ident -x', 'number', 'number', 'dimension px', 'percentage', 'delim +', 'delim ~', 'delim >',
    'ident --', 'ident --x',
  ]);
});
