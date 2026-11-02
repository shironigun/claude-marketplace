'use strict';

const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'at', 'as', 'and', 'or',
  'is', 'are', 'be', 'it', 'this', 'that', 'must', 'should', 'will', 'can', 'may', 'shall']);

// Strips the BOM and turns CRLF and CR into LF, so results never depend on line-ending settings.
function readText(bufOrString) {
  return String(bufOrString).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

// Lowercases, unifies quotes and dashes, drops zero-width characters and outer quotes, collapses spaces.
function normalizeQuote(s) {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function wordCount(s) {
  const t = String(s).trim();
  return t ? t.split(/\s+/).length : 0;
}

// Content words: lowercased letters and digits, thousands separators removed, stop words dropped.
function tokens(s) {
  const text = String(s).toLowerCase().replace(/(\d),(?=\d)/g, '$1');
  const out = new Set();
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) if (!STOP.has(m[0])) out.add(m[0]);
  return out;
}

function jaccard(a, b) {
  const A = a instanceof Set ? a : tokens(a);
  const B = b instanceof Set ? b : tokens(b);
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function numbers(s) {
  const text = String(s).replace(/(\d),(?=\d)/g, '$1');
  return new Set([...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]));
}

module.exports = { readText, normalizeQuote, wordCount, tokens, jaccard, numbers };
