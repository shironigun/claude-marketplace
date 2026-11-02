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

test('pdf: an unfiltered object stream holding a page tree counts', () => {
  const objStm = '<< /Type /Pages /Kids [5 0 R] /Count 7 >>\n<< /Type /Page >>\n';
  const pdf = Buffer.from(`%PDF-1.5\n1 0 obj\n<< /Type /ObjStm /N 2 /First 10 /Length ${objStm.length} >>\nstream\n${objStm}endstream\nendobj\n%%EOF\n`, 'latin1');
  assert.equal(pdfPageCount(pdf), 7);
});

test('pdf: many stream keywords without endstream finish fast', () => {
  const pdf = Buffer.from('%PDF-1.4\n' + 'stream\n'.repeat(100000), 'latin1');
  const started = Date.now();
  assert.equal(pdfPageCount(pdf), null);
  assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`);
});

test('pdf: stream blocks with no obj keyword finish fast', () => {
  const pdf = Buffer.from('%PDF-1.4\n' + 'stream\nendstream\n'.repeat(60000), 'latin1');
  const started = Date.now();
  assert.equal(pdfPageCount(pdf), null);
  assert.ok(Date.now() - started < 1000, `took ${Date.now() - started} ms`);
});

test('pdf: an inflate budget of zero reads no object stream', () => {
  const tree = zlib.deflateSync(Buffer.from('<< /Type /Pages /Kids [4 0 R] /Count 7 >>'));
  const pdf = Buffer.concat([
    Buffer.from(`%PDF-1.5\n1 0 obj\n<< /Type /ObjStm /Filter /FlateDecode /Length ${tree.length} >>\nstream\n`, 'latin1'),
    tree,
    Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
  ]);
  assert.equal(pdfPageCount(pdf), 7);
  assert.equal(pdfPageCount(pdf, { inflateBudget: 0 }), null);
});

test('pdf: object streams are not read once the inflate budget is used up', () => {
  const objStm = (n) => {
    const body = zlib.deflateSync(Buffer.from(`<< /Type /Pages /Count ${n} >>`));
    return Buffer.concat([
      Buffer.from(`${n} 0 obj\n<< /Type /ObjStm /Filter /FlateDecode /Length ${body.length} >>\nstream\n`, 'latin1'),
      body,
      Buffer.from('\nendstream\nendobj\n', 'latin1'),
    ]);
  };
  const pdf = Buffer.concat([Buffer.from('%PDF-1.5\n', 'latin1'), objStm(1), objStm(2), objStm(3)]);
  // Each stream inflates to 27 bytes, so a budget of 40 covers the first two; the third is never read.
  assert.equal(pdfPageCount(pdf, { inflateBudget: 40 }), 2);
});

test('pdf: a stream over the per-stream cap still uses up the budget', () => {
  const bomb = zlib.deflateSync(Buffer.alloc(65 * 1024 * 1024, 0x20));
  const small = zlib.deflateSync(Buffer.from('<< /Type /Pages /Count 5 >>'));
  const objStm = (n, body) => Buffer.concat([
    Buffer.from(`${n} 0 obj\n<< /Type /ObjStm /Filter /FlateDecode /Length ${body.length} >>\nstream\n`, 'latin1'),
    body,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
  const pdf = Buffer.concat([Buffer.from('%PDF-1.5\n', 'latin1'), objStm(1, bomb), objStm(2, bomb), objStm(3, small)]);
  // Each oversized attempt uses up its 64 MB share of the 128 MB budget, so the small stream is never read.
  assert.equal(pdfPageCount(pdf), null);
});
