'use strict';

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018',
  rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D', hellip: '…', copy: '©', reg: '®', trade: '™',
  sect: '§', para: '¶', bull: '•', middot: '·',
};

function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    const k = e.toLowerCase();
    return Object.hasOwn(ENTITIES, k) ? ENTITIES[k] : m;
  });
}

// Tags that format words inside a line; every other tag separates words.
const INLINE_TAGS = new Set(['a', 'abbr', 'acronym', 'b', 'bdi', 'bdo', 'big', 'cite', 'code', 'data', 'del', 'dfn', 'em',
  'font', 'i', 'ins', 'kbd', 'label', 'mark', 'nobr', 'q', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
  'time', 'tt', 'u', 'var', 'wbr']);
// Tags that end a paragraph. Any other tag (an image, a form control, an unknown tag) only separates words.
const BLOCK_TAGS = new Set(['address', 'article', 'aside', 'blockquote', 'body', 'caption', 'center', 'dd', 'details',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'header', 'hgroup', 'hr', 'html', 'legend',
  'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title',
  'tr', 'ul']);
const TAG = /<(\/?)([A-Za-z][\w:-]*)\b[^>]*>/g;
const clean = (s) => s.replace(/\s+/g, ' ').trim();

// The text of an HTML fragment on one line: inline tags vanish, every other tag (and <br>) becomes a space.
function inlineText(html) {
  return clean(decodeEntities(String(html).replace(TAG, (m, close, name) => (INLINE_TAGS.has(name.toLowerCase()) ? '' : ' '))));
}

// Cuts every outermost <table>...</table> out of the HTML, leaving a <fi-table N> marker in its place.
function takeTables(html) {
  const tables = [];
  let out = '';
  let depth = 0;
  let start = 0;
  let last = 0;
  for (const m of html.matchAll(/<(\/?)table\b[^>]*>/gi)) {
    if (!m[1]) {
      if (depth === 0) {
        out += html.slice(last, m.index);
        start = m.index;
      }
      depth += 1;
    } else if (depth > 0) {
      depth -= 1;
      if (depth === 0) {
        last = m.index + m[0].length;
        tables.push(html.slice(start, last));
        out += `<fi-table ${tables.length - 1}>`;
      }
    }
  }
  return { html: out + html.slice(depth > 0 ? start : last), tables };
}

// A table's blocks: its caption as a paragraph, then one row block per row. The first row is the header only when it
// is made of <th> cells and other rows follow. A nested table, or any block inside a cell, is read as the cell's text.
function tableBlocks(table) {
  const inner = table.replace(/^<table\b[^>]*>/i, '').replace(/<\/table\s*>$/i, '');
  const { html, tables } = takeTables(inner);
  const body = html.replace(/<fi-table (\d+)>/g, (m, n) => ` ${inlineText(tables[Number(n)])} `);
  const blocks = [];
  const caption = /<caption\b[^>]*>([\s\S]*?)<\/caption\s*>/i.exec(body);
  if (caption && inlineText(caption[1])) blocks.push({ kind: 'para', text: inlineText(caption[1]) });
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)]
    .map((r) => [...r[1].matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/t[hd]\s*>/gi)])
    .filter((cells) => cells.length)
    .map((cells) => ({ th: cells.every((c) => c[1].toLowerCase() === 'th'), cells: cells.map((c) => inlineText(c[2])) }));
  const header = rows.length > 1 && rows[0].th ? rows[0].cells : null;
  for (const r of header ? rows.slice(1) : rows) blocks.push({ kind: 'row', cells: r.cells, header });
  return blocks;
}

// Reads HTML into the blocks markdownBlocks produces, without going through Markdown, so no text is ever read as
// Markdown syntax. Inside a list item or a heading everything is inline text: line breaks and block tags become spaces.
function htmlBlocks(html) {
  // The <fi-pre N> and <fi-table N> markers are the converter's own, so any "<fi-" in the input is turned into text.
  const cleaned = String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[!?][^>]*>/g, '') // declarations, XML prologs and Word's conditional markers
    .replace(/<(\/?fi-)/gi, '&lt;$1');
  const { html: rest, tables } = takeTables(cleaned);
  const pres = [];
  const source = rest.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre\s*>/gi, (m, body) => {
    pres.push(decodeEntities(body.replace(/<br\s*\/?>/gi, '\n').replace(TAG, '')).replace(/^\n+|\s+$/g, ''));
    return `<fi-pre ${pres.length - 1}>`;
  });
  const blocks = [];
  let text = '';
  let kind = 'para';
  let level = 0;
  const flush = () => {
    const t = clean(text);
    if (t) blocks.push(kind === 'heading' ? { kind, level, text: t } : { kind, text: t });
    text = '';
    kind = 'para';
  };
  for (const m of source.matchAll(/<(\/?)([A-Za-z][\w:-]*)\b[^>]*>|[^<]+|</g)) {
    const [raw, close, tag] = m;
    if (!tag) {
      text += decodeEntities(raw);
      continue;
    }
    const name = tag.toLowerCase();
    const inline = kind !== 'para';
    if (name === 'fi-pre' || name === 'fi-table') {
      const n = Number(/\d+/.exec(raw)[0]);
      const piece = name === 'fi-pre' ? pres[n] : tables[n];
      if (inline) {
        text += ` ${name === 'fi-pre' ? piece : inlineText(piece)} `;
      } else {
        flush();
        if (name === 'fi-table') blocks.push(...tableBlocks(piece));
        else if (piece.trim()) blocks.push({ kind: 'code', text: piece });
      }
    } else if (name === 'li') {
      flush();
      if (!close) kind = 'item';
    } else if (/^h[1-6]$/.test(name) && kind !== 'item') {
      flush();
      if (!close) {
        kind = 'heading';
        level = Number(name[1]);
      }
    } else if (kind === 'item' && (name === 'ul' || name === 'ol')) {
      flush(); // a nested or closing list ends the item, even when </li> was left out
    } else if (INLINE_TAGS.has(name)) {
      // formatting inside a line: no break between words
    } else if (inline || !BLOCK_TAGS.has(name)) {
      text += ' ';
    } else {
      flush();
    }
  }
  flush();
  return blocks;
}

module.exports = { decodeEntities, inlineText, htmlBlocks };
