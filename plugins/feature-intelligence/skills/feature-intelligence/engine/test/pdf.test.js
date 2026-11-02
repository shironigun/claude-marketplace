'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const { pdfPageCount, writeSimplePdf } = require('../lib/pdf');

test('pdf: page count of a written PDF; text is escaped', () => {
  const pdf = writeSimplePdf([['Page one'], ['Page two (b)', 'line 2'], ['Three']]);
  assert.equal(pdf.subarray(0, 8).toString('latin1'), '%PDF-1.4');
  assert.equal(pdfPageCount(pdf), 3);
  assert.match(pdf.toString('latin1'), /\(Page two \\\(b\\\)\) Tj/);
  assert.match(pdf.toString('latin1'), /\/Encoding \/WinAnsiEncoding/);
});

test('pdf: a page tree inside a compressed object stream', () => {
  const tree = zlib.deflateSync(Buffer.from('<< /Type /Pages /Kids [4 0 R] /Count 7 >>'));
  const pdf = Buffer.concat([
    Buffer.from(`%PDF-1.5\n1 0 obj\n<< /Type /ObjStm /Filter /FlateDecode /Length ${tree.length} >>\nstream\n`, 'latin1'),
    tree,
    Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
  ]);
  assert.equal(pdfPageCount(pdf), 7);
});

test('pdf: page objects only, and not a PDF at all', () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Page /Parent 2 0 R >> endobj\n3 0 obj << /Type /Page >> endobj\n', 'latin1');
  assert.equal(pdfPageCount(pdf), 2);
  assert.equal(pdfPageCount(Buffer.from('hello')), null);
  assert.equal(pdfPageCount(Buffer.from('%PDF-1.4\n%%EOF\n')), null);
});

test('pdf: an attached file is never read for pages', () => {
  const attached = zlib.deflateSync(Buffer.from('<< /Type /Pages /Kids [4 0 R] /Count 50 >>'));
  const pdf = Buffer.concat([
    writeSimplePdf([['one'], ['two']]),
    Buffer.from(`99 0 obj\n<< /Type /EmbeddedFile /Filter /FlateDecode /Length ${attached.length} >>\nstream\n`, 'latin1'),
    attached,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
  assert.equal(pdfPageCount(pdf), 2);
  const plain = Buffer.concat([
    writeSimplePdf([['one'], ['two']]),
    Buffer.from('98 0 obj\n<< /Type /EmbeddedFile /Length 44 >>\nstream\n<< /Type /Pages /Kids [4 0 R] /Count 50 >>\nendstream\nendobj\n', 'latin1'),
  ]);
  assert.equal(pdfPageCount(plain), 2);
});
