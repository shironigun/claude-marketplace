'use strict';
const zlib = require('zlib');

// Inflates the object streams (/Type /ObjStm), one at a time: a page tree is a top-level object or sits inside one.
// Images, fonts, page content and attached files are never inflated, so their size costs nothing and an attached
// PDF cannot lend its page tree.
function* objectStreamTexts(buf, s) {
  const re = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    if (end === -1) break;
    if (/\/Type\s*\/ObjStm\b/.test(s.slice(s.lastIndexOf('obj', m.index), m.index))) {
      try {
        yield zlib.inflateSync(buf.subarray(start, end), { finishFlush: zlib.constants.Z_SYNC_FLUSH, maxOutputLength: 64 * 1024 * 1024 })
          .toString('latin1');
      } catch {
        // Not Flate data, or larger than any page tree could be: nothing to search.
      }
    }
    re.lastIndex = end + 'endstream'.length;
  }
}

// The largest /Count of a /Type /Pages node; else the number of /Type /Page objects; else null.
function pdfPageCount(buf) {
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') return null;
  const raw = buf.toString('latin1');
  let count = 0;
  let pages = 0;
  const scan = (text) => {
    for (const m of text.matchAll(/<<((?:(?!<<|>>)[\s\S])*)>>/g)) {
      if (!/\/Type\s*\/Pages\b/.test(m[1])) continue;
      const c = /\/Count\s+(\d+)/.exec(m[1]);
      if (c) count = Math.max(count, Number(c[1]));
    }
    pages += (text.match(/\/Type\s*\/Page(?![A-Za-z])/g) || []).length;
  };
  scan(raw);
  for (const text of objectStreamTexts(buf, raw)) scan(text);
  return count || pages || null;
}

const pdfString = (s) => String(s).replace(/[^\x20-\x7e\xa0-\xff]/g, '?').replace(/[\\()]/g, (c) => `\\${c}`);

// A plain PDF with one text line per entry, used to make fixtures.
function writeSimplePdf(pages) {
  const objects = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const kids = [];
  for (const lines of pages) {
    const content = ['BT', '/F1 11 Tf', '14 TL', '72 770 Td', ...lines.map((l, i) => `${i ? 'T* ' : ''}(${pdfString(l)}) Tj`), 'ET'].join('\n');
    objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    const contentId = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    kids.push(objects.length);
  }
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const at = Buffer.byteLength(out, 'latin1');
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

module.exports = { pdfPageCount, writeSimplePdf };
