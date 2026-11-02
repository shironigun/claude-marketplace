'use strict';
const { readZip, writeZip } = require('./zip');
const { decodeEntities } = require('./html');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const clean = (s) => s.replace(/\s+/g, ' ').trim();
const BREAKS = { tab: '\t', br: '\n', cr: '\n', noBreakHyphen: '-' };

// Text of one paragraph in document order: text runs, tabs, breaks and non-breaking hyphens. Deleted text
// (w:delText) is never read; text a tracked change moved away is removed before this runs.
function paragraphText(xml) {
  let out = '';
  const body = xml.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, '');
  for (const m of body.matchAll(/<w:t(?:\s[^>]*)?(?<!\/)>([\s\S]*?)<\/w:t>|<w:(tab|br|cr|noBreakHyphen)\b[^>]*\/>/g)) {
    out += m[1] !== undefined ? decodeEntities(m[1]) : BREAKS[m[2]];
  }
  return out;
}

// One table row's cells. A cell merged across n grid columns adds n - 1 empty cells, so labels stay aligned.
function rowCells(rowXml) {
  const cells = [];
  for (const c of rowXml.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)) {
    cells.push([...c[1].matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map((p) => clean(paragraphText(p[0]))).filter(Boolean).join(' '));
    const span = Number((/<w:gridSpan w:val="(\d+)"/.exec(c[1]) || [])[1] || 1);
    for (let k = 1; k < span; k += 1) cells.push('');
  }
  return cells;
}

function tableBlocks(tableXml, blocks) {
  const [first, ...rest] = [...tableXml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((r) => rowCells(r[1]));
  const header = first && first.some((c) => c) ? first : null; // an all-blank first row is no header (writeDocx writes one for a headerless table)
  if (!rest.length && header) blocks.push({ kind: 'row', cells: header, header: null }); // a one-row table still says something
  for (const cells of rest) if (cells.some((c) => c)) blocks.push({ kind: 'row', cells, header }); // a blank row carries nothing
}

function paragraphBlock(xml, blocks) {
  const style = (/<w:pStyle w:val="([^"]+)"/.exec(xml) || [])[1] || '';
  if (/^TOC/.test(style)) return; // a table of contents repeats the headings
  const raw = paragraphText(xml);
  if (style === 'Code') {
    const code = raw.replace(/\s+$/, '');
    if (code.trim()) blocks.push({ kind: 'code', text: code });
    return;
  }
  const text = clean(raw);
  if (!text) return;
  const heading = style === 'Title' ? '1' : (/^Heading([1-6])$/.exec(style) || [])[1];
  const numbered = /<w:numPr>/.test(xml) && !/<w:numId w:val="0"\/>/.test(xml); // numbering id 0 means "not a list"
  if (heading) blocks.push({ kind: 'heading', level: Number(heading), text });
  else if (numbered || /^List/.test(style)) blocks.push({ kind: 'item', text });
  else blocks.push({ kind: 'para', text });
}

// Reads a body into blocks. Word writes a fallback copy of every drawing and text box (dropped), keeps text a
// tracked change moved away inside w:moveFrom (dropped), and nests a text box's paragraphs inside its host
// paragraph (lifted out and read after the host, so the host's own text stays whole).
function readBody(xml, blocks) {
  const boxes = [];
  const body = xml
    .replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '')
    .replace(/<w:moveFrom\b[^>]*[^/]>[\s\S]*?<\/w:moveFrom>/g, '')
    .replace(/<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g, (m, inner) => {
      boxes.push(inner);
      return `<fi-box ${boxes.length - 1}/>`;
    });
  for (const m of body.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[^>]*\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    if (m[0].startsWith('<w:tbl')) tableBlocks(m[0], blocks);
    else paragraphBlock(m[0], blocks);
    for (const b of m[0].matchAll(/<fi-box (\d+)\/>/g)) readBody(boxes[Number(b[1])], blocks);
  }
}

// Reads the body of word/document.xml into the blocks markdownBlocks produces.
function readDocxBlocks(buf) {
  const doc = readZip(buf).get('word/document.xml');
  if (!doc) throw new Error('no word/document.xml in the archive');
  const xml = doc.toString('utf8');
  const blocks = [];
  readBody((/<w:body>([\s\S]*)<\/w:body>/.exec(xml) || [null, xml])[1], blocks);
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
