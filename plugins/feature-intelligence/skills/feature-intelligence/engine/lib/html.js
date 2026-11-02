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
    const v = ENTITIES[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}

const stripTags = (s) => String(s).replace(/<[^>]*>/g, '');
const inlineText = (s) => decodeEntities(stripTags(s)).replace(/\s+/g, ' ').trim();

// Converts HTML to Markdown that markdownBlocks reads: headings, paragraphs, list items, tables and code.
// Converted pieces are held aside and restored at the end, so whitespace clean-up cannot break them.
function htmlToMarkdown(html) {
  const held = [];
  const hold = (md) => {
    held.push(md);
    return `\n\n\u0000${held.length - 1}\u0000\n\n`;
  };
  let s = String(html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, '');
  s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre\s*>/gi, (m, body) => hold(`\`\`\`\n${decodeEntities(stripTags(body)).replace(/^\n+|\s+$/g, '')}\n\`\`\``));
  s = s.replace(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi, (m, body) => {
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)]
      .map((r) => [...r[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]\s*>/gi)].map((c) => inlineText(c[1]).replace(/\|/g, '\\|')))
      .filter((r) => r.length);
    if (!rows.length) return '\n\n';
    const line = (r) => `| ${r.join(' | ')} |`;
    return hold([line(rows[0]), `|${rows[0].map(() => '---').join('|')}|`, ...rows.slice(1).map(line)].join('\n'));
  });
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi, (m, level, body) => hold(`${'#'.repeat(Number(level))} ${inlineText(body)}`));
  s = s.replace(/<li\b[^>]*>([\s\S]*?)(?:<\/li\s*>|(?=<li\b)|(?=<\/[ou]l\s*>))/gi, (m, body) => hold(`- ${inlineText(body)}`));
  s = s.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|section|article|blockquote|ul|ol|header|footer|main|nav|aside|figure|figcaption|dl|dt|dd|hr)\b[^>]*>/gi, '\n\n');
  s = decodeEntities(stripTags(s))
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => held[Number(i)]);
}

module.exports = { decodeEntities, stripTags, inlineText, htmlToMarkdown };
