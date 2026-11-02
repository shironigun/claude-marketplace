'use strict';
const { readZip, writeZip } = require('./zip');
const { decodeEntities } = require('./html');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const clean = (s) => s.replace(/\s+/g, ' ').trim();

// Text of one paragraph in document order: text runs, tabs and breaks. Deleted text (w:delText) is not read.
function paragraphText(xml) {
  let out = '';
  const body = xml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '');
  for (const m of body.matchAll(/<w:t(?:\s[^>]*[^/>])?>([\s\S]*?)<\/w:t>|<w:t\b[^>]*\/>|<w:tab\b[^>]*\/>|<w:(?:br|cr)\b[^>]*\/>/g)) {
    if (m[1] !== undefined) out += decodeEntities(m[1]);
    else if (m[0].startsWith('<w:tab')) out += '\t';
    else if (m[0].startsWith('<w:br') || m[0].startsWith('<w:cr')) out += '\n';
  }
  return out;
}

// Reads the body of word/document.xml into the blocks markdownBlocks produces.
function readDocxBlocks(buf) {
  const doc = readZip(buf).get('word/document.xml');
  if (!doc) throw new Error('no word/document.xml in the archive');
  const xml = doc.toString('utf8');
  const body = (/<w:body>([\s\S]*)<\/w:body>/.exec(xml) || [null, xml])[1];
  const blocks = [];
  for (const m of body.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    const el = m[0];
    if (el.startsWith('<w:tbl')) {
      const rows = [...el.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((r) => [...r[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)]
        .map((c) => [...c[1].matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((p) => clean(paragraphText(p[0]))).filter(Boolean).join(' ')));
      const [first, ...rest] = rows;
      const header = first && first.some((c) => c) ? first : null; // an all-blank first row is no header (writeDocx writes one for a headerless table)
      if (!rest.length && header) blocks.push({ kind: 'row', cells: header, header: null }); // a one-row table still says something
      for (const cells of rest) blocks.push({ kind: 'row', cells, header });
      continue;
    }
    const style = (/<w:pStyle w:val="([^"]+)"/.exec(el) || [])[1] || '';
    const raw = paragraphText(el);
    if (style === 'Code') {
      const code = raw.replace(/\s+$/, '');
      if (code.trim()) blocks.push({ kind: 'code', text: code });
      continue;
    }
    const text = clean(raw);
    if (!text) continue;
    const heading = style === 'Title' ? '1' : (/^Heading([1-6])$/.exec(style) || [])[1];
    if (heading) blocks.push({ kind: 'heading', level: Number(heading), text });
    else if (/<w:numPr>/.test(el) || /^List/.test(style)) blocks.push({ kind: 'item', text });
    else blocks.push({ kind: 'para', text });
  }
  return blocks;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const run = (text) => `<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (style, inner) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${inner}</w:p>`;

function table(header, rows) {
  const tr = (cells) => `<w:tr>${cells.map((c) => `<w:tc><w:p>${run(c)}</w:p></w:tc>`).join('')}</w:tr>`;
  const grid = header.map(() => '<w:gridCol w:w="3000"/>').join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${tr(header)}${rows.map(tr).join('')}</w:tbl>`;
}

const styleXml = (id, name, extra) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/>${extra}</w:style>`;
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const STYLES = `${XML}<w:styles xmlns:w="${W_NS}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>`
  + [1, 2, 3, 4, 5, 6].map((l) => styleXml(`Heading${l}`, `heading ${l}`, `<w:pPr><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/></w:rPr>`)).join('')
  + styleXml('ListBullet', 'List Bullet', '<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>')
  + styleXml('Code', 'Code', '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr>')
  + '</w:styles>';
const CONTENT_TYPES = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
  + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
const rels = (type, target) => `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/></Relationships>`;

// Writes blocks as a minimal Word document. Used to make fixtures; readDocxBlocks reads it back unchanged.
function writeDocx(blocks) {
  const parts = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.kind === 'heading') parts.push(para(`Heading${b.level}`, run(b.text)));
    else if (b.kind === 'item') parts.push(para('ListBullet', run(b.text)));
    else if (b.kind === 'code') parts.push(para('Code', b.text.split('\n').map((l, j) => `${j ? '<w:r><w:br/></w:r>' : ''}${run(l)}`).join('')));
    else if (b.kind === 'row') {
      const rows = [];
      for (; i < blocks.length && blocks[i].kind === 'row' && blocks[i].header === b.header; i += 1) rows.push(blocks[i].cells);
      i -= 1;
      parts.push(table(b.header || rows[0].map(() => ''), rows));
    } else parts.push(para('', run(b.text)));
  }
  const document = `${XML}<w:document xmlns:w="${W_NS}"><w:body>${parts.join('')}<w:p/><w:sectPr/></w:body></w:document>`;
  return writeZip([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: rels('officeDocument', 'word/document.xml') },
    { name: 'word/document.xml', data: document },
    { name: 'word/_rels/document.xml.rels', data: rels('styles', 'styles.xml') },
    { name: 'word/styles.xml', data: STYLES },
  ]);
}

module.exports = { readDocxBlocks, writeDocx };
