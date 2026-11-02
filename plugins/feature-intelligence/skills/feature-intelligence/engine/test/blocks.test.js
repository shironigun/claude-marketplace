'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { chunkMarkdown, chunksFromBlocks, textBlocks } = require('../lib/blocks');
const { htmlToMarkdown, decodeEntities } = require('../lib/html');

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
  assert.deepEqual(chunkMarkdown(htmlToMarkdown(html)), [
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
  assert.equal(htmlToMarkdown('<p>Price < 10 and > 5</p>'), 'Price < 10 and > 5');
  assert.deepEqual(chunkMarkdown('## Language: C#\n\nE').map((c) => c.anchor), ['§Language: C# ¶1']);
});
