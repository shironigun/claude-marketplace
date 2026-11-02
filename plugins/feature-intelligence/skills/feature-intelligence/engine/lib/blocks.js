'use strict';
const { readText } = require('./text');

// Strips inline Markdown (links, images, code spans, bold, italics) so chunk text reads as rendered.
function inline(s) {
  return String(s)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?![\w*])/g, '$1$2')
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '')
  .split(/(?<!\\)\|/)
  .map((c) => inline(c.replace(/\\\|/g, '|')));

// Splits Markdown into blocks: headings, paragraphs, list items, table rows (with their header) and code.
function markdownBlocks(text) {
  const lines = readText(text).split('\n');
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'para', text: inline(para.join(' ')) });
    para = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = /^\s*(```|~~~)/.exec(line);
    if (fence) {
      flush();
      const body = [];
      for (i += 1; i < lines.length && !lines[i].trim().startsWith(fence[1]); i += 1) body.push(lines[i]);
      const code = body.join('\n').trim();
      if (code) blocks.push({ kind: 'code', text: code });
      continue;
    }
    const heading = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: heading[1].length, text: inline(heading[2]) });
      continue;
    }
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1])) {
      flush();
      const header = splitRow(line);
      for (i += 2; i < lines.length && TABLE_ROW.test(lines[i]); i += 1) blocks.push({ kind: 'row', cells: splitRow(lines[i]), header });
      i -= 1;
      continue;
    }
    if (!line.trim() || /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flush();
      continue;
    }
    const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item) {
      flush();
      blocks.push({ kind: 'item', text: inline(item[1]) });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (!para.length && last && last.kind === 'item' && /^\s{2,}\S/.test(line)) {
      last.text = inline(`${last.text} ${line}`);
      continue;
    }
    para.push(line.trim().replace(/^>\s?/, ''));
  }
  flush();
  return blocks;
}

// Plain text: paragraphs separated by blank lines, no headings.
function textBlocks(text) {
  return readText(text).split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((p) => ({ kind: 'para', text: p }));
}

const rowText = (b) => b.cells.map((c, i) => (b.header && b.header[i] ? `${b.header[i]}: ${c}` : c)).join('; ');
const SECTION_NUMBER = /^(\d+(?:\.\d+)*)\.?\s/;

// Anchors each non-heading block as "§<section> ¶<n>" (or "¶<n>" before the first heading).
function chunksFromBlocks(blocks) {
  const chunks = [];
  const used = new Set();
  let section = '';
  let n = 0;
  for (const b of blocks) {
    if (b.kind === 'heading') {
      if (!b.text) continue; // an empty heading names nothing; its blocks stay in the current section
      const m = SECTION_NUMBER.exec(`${b.text} `);
      const base = m ? m[1] : b.text.slice(0, 40).trim();
      let key = base;
      for (let k = 2; used.has(key); k += 1) key = `${base} (${k})`; // never reuse a section key, even a written "(2)"
      used.add(key);
      section = key;
      n = 0;
      continue;
    }
    const text = b.kind === 'row' ? rowText(b) : b.text;
    if (!text) continue;
    n += 1;
    chunks.push({ anchor: section ? `§${section} ¶${n}` : `¶${n}`, text });
  }
  return chunks;
}

const chunkMarkdown = (text) => chunksFromBlocks(markdownBlocks(text));

module.exports = { inline, markdownBlocks, textBlocks, rowText, chunksFromBlocks, chunkMarkdown };
