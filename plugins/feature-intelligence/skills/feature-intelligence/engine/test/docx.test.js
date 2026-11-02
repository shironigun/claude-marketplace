'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { crc32, readZip, writeZip } = require('../lib/zip');
const { readDocxBlocks, writeDocx } = require('../lib/docx');
const { markdownBlocks, chunksFromBlocks, chunkMarkdown } = require('../lib/blocks');

test('zip: write then read; crc32; not a zip', () => {
  const zip = writeZip([{ name: 'a.txt', data: 'hello' }, { name: 'dir/b.xml', data: Buffer.from('<x/>') }]);
  const files = readZip(zip);
  assert.equal(files.get('a.txt').toString(), 'hello');
  assert.equal(files.get('dir/b.xml').toString(), '<x/>');
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  assert.deepEqual(writeZip([{ name: 'a', data: 'x' }]), writeZip([{ name: 'a', data: 'x' }]));
  assert.throws(() => readZip(Buffer.from('this is plain text, long enough to search')), /not a zip archive/);
});

test('docx: a Word round trip gives the same blocks and chunks as the Markdown', () => {
  const md = '## 3.2 Row limits\n\nFiles are limited to 10,000 rows.\n\n- Email is required\n- Name & phone\n\n'
    + '| Column | Required |\n|---|---|\n| Email | yes |\n| Phone | no |\n\n```\nline 1\nline 2\n```\n';
  const blocks = markdownBlocks(md);
  const docx = writeDocx(blocks);
  assert.deepEqual(readDocxBlocks(docx), blocks);
  assert.deepEqual(chunksFromBlocks(readDocxBlocks(docx)), chunkMarkdown(md));
  assert.ok(readZip(docx).has('[Content_Types].xml'));
});

test('docx: numbering, Title style, tabs, tracked deletions and empty paragraphs', () => {
  const xml = '<w:document xmlns:w="x"><w:body>'
    + '<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Import</w:t></w:r></w:p>'
    + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr>'
    + '<w:r><w:t>A</w:t><w:tab/><w:t xml:space="preserve">B </w:t></w:r><w:del><w:r><w:delText>gone</w:delText></w:r></w:del></w:p>'
    + '<w:p/><w:sectPr/></w:body></w:document>';
  const docx = writeZip([{ name: 'word/document.xml', data: xml }]);
  assert.deepEqual(readDocxBlocks(docx), [{ kind: 'heading', level: 1, text: 'Import' }, { kind: 'item', text: 'A B' }]);
  assert.throws(() => readDocxBlocks(writeZip([{ name: 'other.xml', data: '<x/>' }])), /no word\/document.xml/);
  const oneRow = '<w:document xmlns:w="x"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Only row</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
  assert.deepEqual(readDocxBlocks(writeZip([{ name: 'word/document.xml', data: oneRow }])), [{ kind: 'row', cells: ['Only row'], header: null }]);
});
