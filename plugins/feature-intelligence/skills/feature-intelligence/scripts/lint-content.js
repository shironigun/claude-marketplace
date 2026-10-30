#!/usr/bin/env node
// Lints a content module against the house style for its audience, before it is built.
//   node lint-content.js <content.js>
// Prints one line per finding and exits 1 if any finding is a 'fail'. build.js runs lint() first and
// stops on a fail. The audience comes from the module's `audience` field (see references/audiences.md).
'use strict';
const path = require('path');

const AUDIENCES = ['all', 'product', 'qa', 'design', 'dev', 'sales'];

// Per audience: the prose budget for the first page, and which parts are required, optional or banned.
//   proseMax     words of running text on the first page, outside pictures and the developer block
//   perPicture   words of prose per picture before the page counts as text-heavy
//   plainNotes   every later page must open with an "In plain words" note
//   devBlock     'required' | 'optional' | 'banned'  (the collapsed For developers block)
//   needs        ids or markers that must exist somewhere: 'how-qa', 'terms', 'confirm', 'mock', 'screens'
const RULES = {
  all:     { proseMax: 250, perPicture: 60, plainNotes: true,  devBlock: 'required', needs: ['how-qa', 'terms'] },
  product: { proseMax: 250, perPicture: 60, plainNotes: true,  devBlock: 'required', needs: ['terms', 'confirm'] },
  qa:      { proseMax: 250, perPicture: 60, plainNotes: true,  devBlock: 'required', needs: ['how-qa', 'terms'] },
  design:  { proseMax: 220, perPicture: 50, plainNotes: true,  devBlock: 'optional', needs: ['mock', 'screens'] },
  dev:     { proseMax: Infinity, perPicture: Infinity, plainNotes: false, devBlock: 'optional', needs: ['diagram'] },
  sales:   { proseMax: 200, perPicture: 50, plainNotes: true,  devBlock: 'banned',   needs: [] }
};

const htmlOf = (p) => (typeof p.html === 'function' ? p.html() : p.html) || '';
const has = (html, needle) => html.indexOf(needle) >= 0;

// Pictures: the kit's top-level blocks and SVG figures.
const PICTURE = /class="(?:vz-fig|vz-mtxwrap|vz-tiles|vz-helpers|vz-kinds|vz-acts|vz-issues|vz-mock|vz-routes|vz-qa|vz-more|vz-enf|vz-bars|vz-mis|dgwrap)\b/g;
const pictures = (html) => (html.match(PICTURE) || []).length;

// Running prose: words of text that sit outside any picture, the developer block, notes and headings.
// A small tag walk, enough for the kit's own markup.
const SKIP = /\b(?:vz-[a-z-]+|dgwrap|lead-note|lv-more|eyebrow)\b/;
const VOID = /^(?:br|img|input|meta|link|hr|path|rect|circle|line|polyline|polygon|use|stop)$/i;
function proseWords(html) {
  const re = /<\/?([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g, stack = []; let m, n = 0;
  const skipping = () => stack.some((s) => s.skip);
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { if (!skipping()) n += m[4].replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(Boolean).length; continue; }
    const tag = m[1].toLowerCase(), closing = m[0][1] === '/', self = m[3] === '/' || VOID.test(tag);
    if (closing) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.splice(i); break; } continue; }
    if (self) continue;
    const cls = (m[2].match(/class="([^"]*)"/) || [])[1] || '';
    stack.push({ tag, skip: tag === 'svg' || tag === 'h2' || tag === 'h3' || tag === 'details' || SKIP.test(cls) });
  }
  return n;
}

// Things that must never be on a page, whoever it is for.
const SECRET = [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./, /\b(?:api[_-]?key|password|passwd|secret|client[_-]?secret)\b["']?\s*[:=]\s*["'][^"'\s<]{6,}/i, /\bBearer\s+[A-Za-z0-9._-]{20,}/];

// Returns [{ level: 'fail' | 'warn', page, msg }] for one content module.
function lint(C) {
  const out = [], add = (level, page, msg) => out.push({ level, page, msg });
  const aud = C.audience || 'all';
  if (AUDIENCES.indexOf(aud) < 0) { add('fail', '-', 'audience "' + aud + '" is not one of ' + AUDIENCES.join(', ')); return out; }
  const R = RULES[aud], [first, ...rest] = C.pages, how = htmlOf(first);
  const all = C.pages.map((p) => ({ id: p.id, html: htmlOf(p) }));
  const everything = all.map((p) => p.html).join('\n') + JSON.stringify(C.hero || {}) + JSON.stringify(C.glossary || []);

  // 1. Safety, every audience: no secrets, no unlabelled invented data
  SECRET.forEach((rx) => { all.forEach((p) => { if (rx.test(p.html)) add('fail', p.id, 'looks like a token, key or password; take it out'); }); });

  // 2. The first page must be a picture story, not an essay
  const pics = pictures(how), words = proseWords(how);
  if (aud !== 'dev' && pics < 3) add('fail', first.id, 'only ' + pics + ' picture(s) on the first page; draw the journey, the roles and the rules');
  if (words > R.proseMax) add('warn', first.id, words + ' words of running prose (budget ' + R.proseMax + '); turn paragraphs into pictures or move them down');
  if (pics && words / pics > R.perPicture) add('warn', first.id, Math.round(words / pics) + ' prose words per picture (budget ' + R.perPicture + ')');

  // 3. Every later page opens with an "In plain words" note (not for the developer edition)
  if (R.plainNotes) rest.forEach((p) => { if (!has(htmlOf(p), 'class="lead-note"')) add('fail', p.id, 'no "In plain words" note at the top'); });

  // 4. The developer block: kept for mixed audiences, never shown to sales
  const dev = has(how, 'id="how-dev"');
  if (R.devBlock === 'required' && !dev) add('fail', first.id, 'no collapsed For developers block; keep the technical detail, collapsed');
  if (R.devBlock === 'banned') {
    all.forEach((p) => {
      if (has(p.html, 'id="how-dev"') || has(p.html, 'class="codewrap"') || has(p.html, 'pre class="code"')) add('fail', p.id, 'developer detail or code on a sales page; leave it out entirely');
      if (has(p.html, 'class="vz-issues"')) add('fail', p.id, 'internal issues on a sales page; sales sees only what is shipped and works');
    });
    if (C.pages.length > 3) add('warn', '-', C.pages.length + ' pages; a sales overview fits in 1 to 3');
  }

  // 5. Issues must be dated, so readers know how old they are
  all.forEach((p) => { if (has(p.html, 'class="vz-issues"') && !/\b(19|20)\d\d\b/.test(p.html)) add('fail', p.id, 'issues without a date; put the date (and environment) in the heading'); });

  // 6. What each audience needs to find
  const ids = all.map((p) => p.id);
  R.needs.forEach((n) => {
    if (n === 'how-qa' && !has(everything, 'id="how-qa"')) add('fail', '-', 'no "What to test" section (id how-qa)');
    if (n === 'terms' && ids.indexOf('terms') < 0) add('warn', '-', 'no Glossary page (id terms)');
    if (n === 'confirm' && ids.indexOf('confirm') < 0) add('warn', '-', 'no To confirm page: product needs the open questions');
    if (n === 'mock' && !has(everything, 'class="vz-num"')) add('warn', '-', 'no annotated screen (numbered callouts); design reads screens, not text');
    if (n === 'screens' && !ids.some((id) => /screen|state/.test(id))) add('warn', '-', 'no screens-and-states page');
    if (n === 'diagram' && !has(everything, 'class="dgwrap')) add('warn', '-', 'no architecture or sequence diagram');
  });
  return out;
}

if (require.main === module) {
  const C = require(path.resolve(process.argv[2] || ''));
  const res = lint(C);
  res.forEach((r) => console.log((r.level === 'fail' ? 'FAIL ' : 'warn ') + r.page + ': ' + r.msg));
  console.log(res.length ? res.length + ' finding(s), audience ' + (C.audience || 'all') : 'lint: clean (audience ' + (C.audience || 'all') + ')');
  process.exit(res.some((r) => r.level === 'fail') ? 1 : 0);
}
module.exports = { lint, AUDIENCES, proseWords, pictures };
