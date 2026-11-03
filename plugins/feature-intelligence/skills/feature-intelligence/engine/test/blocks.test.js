'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chunkMarkdown, chunksFromBlocks, textBlocks } = require('../lib/blocks');
const { htmlBlocks, decodeEntities } = require('../lib/html');

test('blocks: Markdown into anchored chunks', () => {
  const md = [
    'Intro line one',
    'continues here.',
    '',
    '## 3.2 Row limits',
    '',
    'Files are limited to **10,000** rows.',
    '',
    '- Email is *required*',
    '- Name is required',
    '',
    '| Column | Required |',
    '|---|---|',
    '| Email | yes |',
    '| Phone \\| mobile | no |',
    '',
    '## Notes',
    'See [the guide](https://example.com).',
    '## Notes',
    '```',
    'code line',
    '```',
  ].join('\r\n');
  assert.deepEqual(chunkMarkdown(md), [
    { anchor: '¶1', text: 'Intro line one continues here.' },
    { anchor: '§3.2 ¶1', text: 'Files are limited to 10,000 rows.' },
    { anchor: '§3.2 ¶2', text: 'Email is required' },
    { anchor: '§3.2 ¶3', text: 'Name is required' },
    { anchor: '§3.2 ¶4', text: 'Column: Email; Required: yes' },
    { anchor: '§3.2 ¶5', text: 'Column: Phone | mobile; Required: no' },
    { anchor: '§Notes ¶1', text: 'See the guide.' },
    { anchor: '§Notes (2) ¶1', text: 'code line' },
  ]);
});

test('blocks: plain text is paragraphs', () => {
  assert.deepEqual(chunksFromBlocks(textBlocks('Can managers import?\n\n  Yes, but only\ntheir own region. \n')), [
    { anchor: '¶1', text: 'Can managers import?' },
    { anchor: '¶2', text: 'Yes, but only their own region.' },
  ]);
});

test('html: headings, paragraphs, lists, tables, code, entities; scripts dropped', () => {
  const html = '<html><head><title>x</title><style>p{}</style></head><body><h2>3.2 Row limits</h2>'
    + '<p>Files are limited to <b>10,000</b>&nbsp;rows.</p><ul><li><p>Email</p></li><li>Name<ul><li>First &amp; last</li></ul></li></ul>'
    + '<table><tr><th>Column</th><th>Required</th></tr><tr><td>Email</td><td>yes</td></tr></table>'
    + '<script>alert(1)</script><pre>a  b\nc</pre></body></html>';
  assert.deepEqual(chunksFromBlocks(htmlBlocks(html)), [
    { anchor: '§3.2 ¶1', text: 'Files are limited to 10,000 rows.' },
    { anchor: '§3.2 ¶2', text: 'Email' },
    { anchor: '§3.2 ¶3', text: 'Name' },
    { anchor: '§3.2 ¶4', text: 'First & last' },
    { anchor: '§3.2 ¶5', text: 'Column: Email; Required: yes' },
    { anchor: '§3.2 ¶6', text: 'a  b\nc' },
  ]);
  assert.equal(decodeEntities('&lt;&#65;&#x42;&quot;&unknown;'), '<AB"&unknown;');
});

test('blocks: anchors stay unique, closing hashes are optional, a bare "<" in HTML text is kept', () => {
  const md = 'Intro\n\n## \n\nAfter an empty heading\n\n## Notes\n\nA\n\n## Notes\n\nB\n\n## Notes (2)\n\nC\n\n## C# ##\n\nD';
  assert.deepEqual(chunkMarkdown(md).map((c) => c.anchor), ['¶1', '¶2', '§Notes ¶1', '§Notes (2) ¶1', '§Notes (2) (2) ¶1', '§C# ¶1']);
  assert.deepEqual(htmlBlocks('<p>Price < 10 and > 5</p>'), [{ kind: 'para', text: 'Price < 10 and > 5' }]);
  assert.deepEqual(chunkMarkdown('## Language: C#\n\nE').map((c) => c.anchor), ['§Language: C# ¶1']);
});

test('html: one-row, headerless and header-only tables, and captions, keep their text', () => {
  const t = (html) => chunksFromBlocks(htmlBlocks(html)).map((c) => c.text);
  assert.deepEqual(t('<table><tr><td>Important: managers cannot import files</td></tr></table>'), ['Important: managers cannot import files']);
  assert.deepEqual(t('<table><caption>Import limits</caption><tr><td>Email</td><td>yes</td></tr><tr><td>Phone</td><td>no</td></tr></table>'),
    ['Import limits', 'Email; yes', 'Phone; no']);
  assert.deepEqual(t('<table><tr><th>A</th><th>B</th></tr></table>'), ['A; B']);
  assert.deepEqual(chunkMarkdown('| A | B |\n|---|---|\n').map((c) => c.text), ['A; B']);
});

test('html: blocks nested in items, cells and headings are read as their text', () => {
  const t = (html) => chunksFromBlocks(htmlBlocks(html)).map((c) => c.text);
  assert.deepEqual(t('<ul><li>Run:<pre>npm test</pre></li></ul>'), ['Run: npm test']);
  assert.deepEqual(t('<table><tr><th>Cmd</th></tr><tr><td><pre>npm test</pre></td></tr></table>'), ['Cmd: npm test']);
  assert.deepEqual(t('<ul><li><table><tr><td>x</td></tr></table></li></ul>'), ['x']);
  assert.deepEqual(t('<ul><li><h3>Sub</h3>text</li></ul>'), ['Sub text']);
  assert.deepEqual(t('<ul><li><p>Para one.</p><p>Para two.</p></li><li>one<br>two</li></ul>'), ['Para one. Para two.', 'one two']);
  assert.deepEqual(t('<table><tr><th>Note</th></tr><tr><td>line1<br>line2</td></tr><tr><td><ul><li>x</li><li>y</li></ul></td></tr></table>'),
    ['Note: line1 line2', 'Note: x y']);
  assert.deepEqual(htmlBlocks('<h2>Title<br>Sub</h2>'), [{ kind: 'heading', level: 2, text: 'Title Sub' }]);
});

test('html: text is never read as Markdown; odd input is safe', () => {
  const t = (html) => chunksFromBlocks(htmlBlocks(html)).map((c) => c.text);
  assert.deepEqual(t('<p># of rows is limited</p><p>&gt; 5 items allowed</p><p>1. Email is required</p><p>- note</p>'),
    ['# of rows is limited', '> 5 items allowed', '1. Email is required', '- note']);
  assert.deepEqual(t('<p>```</p><h2>Next</h2><p>Body</p>'), ['```', 'Body']);
  assert.equal(decodeEntities('&constructor;'), '&constructor;');
  assert.deepEqual(htmlBlocks(undefined), []);
  assert.deepEqual(htmlBlocks('<p>a <fi-pre 9> b <fi-table 0> c</fi-table></p>'), [{ kind: 'para', text: 'a <fi-pre 9> b <fi-table 0> c</fi-table>' }]);
  assert.deepEqual(htmlBlocks('<fi-pre>'), [{ kind: 'para', text: '<fi-pre>' }]);
});

test('html: declarations vanish, other tags never split a sentence, an unclosed item ends with its list', () => {
  const t = (html) => chunksFromBlocks(htmlBlocks(html)).map((c) => `${c.anchor} ${c.text}`);
  assert.deepEqual(t('<!DOCTYPE html><?xml version="1.0"?><html><body><p>Intro</p></body></html>'), ['¶1 Intro']);
  assert.deepEqual(t('<p><![if !supportLists]>Word<![endif]> list</p>'), ['¶1 Word list']);
  assert.deepEqual(t('<p>Click the <img src="gear.png"> icon to <dfn>open</dfn> settings.</p>'), ['¶1 Click the icon to open settings.']);
  assert.deepEqual(t('<h2>A</h2><ul><li>One<li>Two</ul><h2>B</h2><p>b1</p>'), ['§A ¶1 One', '§A ¶2 Two', '§B ¶1 b1']);
});

test('html: an unclosed "<!" inside a script does not leak the script code', () => {
  const blocks = htmlBlocks('<p>Visible text.</p><script>var a = "<!"; leak_the_code();</script><p>After.</p>');
  assert.ok(!JSON.stringify(blocks).includes('leak_the_code'));
  assert.deepEqual(blocks.map((b) => b.text), ['Visible text.', 'After.']);
});
