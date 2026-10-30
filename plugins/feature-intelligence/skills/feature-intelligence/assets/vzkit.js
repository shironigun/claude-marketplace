// Drawing kit for feature-explainer pages: filled Material icons, SVG box-and-arrow helpers, and the
// plain-language building blocks (journey, who-does-what grid, helper cards, tiles, comparison cards,
// verdict list, levels grid, issue cards, test routes). Every block returns an HTML string.
// Styles live in shell.css. Lanes: 'ai' = the AI or outside service (indigo), 'crm' = your product's
// own code (amber), 'dl' = a person or a screen (neutral). See references/visual-catalog.md.
'use strict';

// ---------- filled Material icons ----------
const P = {
  login: 'M10 17v-3H3v-4h7V7l5 5-5 5m0-15h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-9v-2h9V4h-9V2z',
  bulb: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  pen: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  review: 'M9 17l3-2.94c-.39-.04-.68-.06-1-.06-2.67 0-8 1.34-8 4v2h9l-3-3zm2-5c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm4.47 8.5L12 17l1.4-1.41 2.07 2.08 5.13-5.17 1.4 1.41-6.53 6.59z',
  send: 'M2.01 21 23 12 2.01 3 2 10l15 2-15 2z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  yes: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  part: 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.86 7 7.93s-3.06 7.44-7 7.93V4.07z',
  no: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
  ai: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
  store: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  event: 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
  shield: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
  moneyoff: 'M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06 4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z',
  sms: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z',
  range: 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
  warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  wrench: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  block: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8z',
  doc: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  flag: 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z',
  play: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14.5v-9l6 4.5-6 4.5z',
  bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
  dash: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  key: 'M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
  trend: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  mega: 'M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  jump: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  cached: 'M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46A7.93 7.93 0 0 0 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46A7.93 7.93 0 0 0 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z',
  list: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
  clock: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z',
  mood: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M8.5 8c.83 0 1.5.67 1.5 1.5S9.33 11 8.5 11 7 10.33 7 9.5 7.67 8 8.5 8M12 18c-2.28 0-4.22-1.66-5-4h10c-.78 2.34-2.72 4-5 4m3.5-7c-.83 0-1.5-.67-1.5-1.5S14.67 8 15.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5',
  forum: 'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z',
  task: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m2 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2m6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1z'
};
const ic = (n, cls) => '<svg class="vi' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + P[n] + '"/></svg>';
const num = (n) => '<i class="vz-num" aria-hidden="true">' + n + '</i>';

// ---------- SVG box-and-arrow helpers ----------
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function box(x, y, w, h, cls, ls) {
  const lh = 15, top = y + h / 2 - (ls.length - 1) * lh / 2 + 4;
  return '<g class="' + cls + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9"/>' +
    ls.map((t, i) => '<text x="' + (x + w / 2) + '" y="' + (top + i * lh) + '" text-anchor="middle"' + (i ? ' class="t2"' : '') + '>' + esc(t) + '</text>').join('') + '</g>';
}
// box() spaced for the larger type of a .vz-big diagram
const gbox = (bx, by, bw, bh, cls, ls) => box(bx, by, bw, bh, cls, ls).replace(/<text x="([\d.]+)" y="([\d.]+)"([^>]*)>/g, (m, tx, ty, rest) => { const top = by + bh / 2 - (ls.length - 1) * 19 / 2 + 5; const i = /class="t2"/.test(rest) ? 1 : 0; return '<text x="' + tx + '" y="' + (top + i * 19) + '"' + rest + '>'; });
const arr = (d, dash) => '<path class="ar' + (dash ? ' dash' : '') + '" d="' + d + '" marker-end="url(#ah)"/>';
const lbl = (x, y, t, anchor) => '<text class="lbl" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(t) + '</text>';
const defs = () => '<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z"/></marker></defs>';
function svg(vb, label, inner, cap, narrow) {
  return '<figure class="dgwrap' + (narrow ? ' narrow' : '') + '"><div class="dgscroll"><svg class="dg" viewBox="' + vb + '" role="img" aria-label="' + esc(label) + '">' + defs() + inner + '</svg></div><figcaption>' + cap + '</figcaption></figure>';
}
const big = (fig) => '<div class="vz-big">' + fig + '</div>';

// ---------- grids that never leave a card alone in a row ----------
// Column count for n cards: the largest of 3, 4, 5, 2 that divides n or leaves at least 2 in the last row.
// Phones get 1 column and medium widths at most 2 (shell.css). Use cards() for any hand-built card row.
function colsFor(n) { if (n <= 4) return n; for (const c of [3, 4, 5, 2]) if (n % c === 0 || n % c >= 2) return c; return 3; }
const cols = (n) => '--cols:' + colsFor(n) + ';--cols-md:' + Math.min(colsFor(n), 2);
const cards = (cls, items) => '<div class="' + cls + '" style="' + cols(items.length) + '">' + items.join('') + '</div>';
// More filled icons for one page: call K.addIcons({ name: 'svg path d' }) at the top of content.js.
const addIcons = (map) => { Object.assign(P, map); };

// ---------- plain-language building blocks ----------
// a role pill coloured by lane: pill('AI', 'ai'), pill('Your app', 'crm'), pill('Manager', 'dl')
const pill = (who, lane) => '<span class="' + (lane === 'ai' ? 'pill-ai' : lane === 'crm' ? 'pill-crm' : 'pill-dl') + '">' + who + '</span>';
const foot = (icn, html) => '<p class="vz-foot">' + ic(icn) + '<span>' + html + '</span></p>';

// nodes: [lane, icon, title, sub, who]; loop: {icon, html, who, lane} or null
function journey(label, nodes, loop, caption) {
  return '<figure class="vz-fig"><ol class="vz-flow" style="--n:' + nodes.length + '" aria-label="' + label + '">' +
    nodes.map((n, i) => '<li class="vz-node"><span class="vz-ic ' + n[0] + '">' + ic(n[1]) + '<b class="vz-step">' + (i + 1) + '</b></span><span class="vz-nt"><b>' + n[2] + '</b><small>' + n[3] + '</small>' + pill(n[4], n[0]) + '</span></li>').join('') +
    '</ol>' + (loop ? '<div class="vz-loop"><span class="vz-ic ai sm">' + ic(loop.icon) + '</span><span>' + loop.html + '</span>' + pill(loop.who, loop.lane) + '</div>' : '') +
    '<figcaption>' + caption + '</figcaption></figure>';
}

// cols: [[cls, icon, label] x3]; rows: [icon, job, [state, text] x3]; legend: {y, p, n}
function matrix(cols, rows, legend) {
  const st = { y: ['yes', legend.y], p: ['part', legend.p], n: ['no', legend.n] };
  const cell = (s, t) => '<td class="vz-' + s + '">' + ic(st[s][0]) + '<span>' + t + '</span><em class="sr">' + st[s][1] + '</em></td>';
  return '<div class="vz-mtxwrap"><table class="vz-mtx"><thead><tr><th></th>' +
    cols.map((c) => '<th><span class="vz-ic ' + c[0] + ' sm">' + ic(c[1]) + '</span>' + c[2] + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map((r) => '<tr><th scope="row">' + ic(r[0], 'rh') + r[1] + '</th>' + cell(r[2][0], r[2][1]) + cell(r[3][0], r[3][1]) + cell(r[4][0], r[4][1]) + '</tr>').join('') +
    '</tbody></table><div class="vz-legend"><span class="vz-y">' + ic('yes') + legend.y + '</span><span class="vz-p">' + ic('part') + legend.p + '</span><span class="vz-n">' + ic('no') + legend.n + '</span></div></div>';
}

const mini = (vb, label, inner) => '<svg class="vz-mini" viewBox="' + vb + '" role="img" aria-label="' + label + '"><defs><marker id="mah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z"/></marker></defs>' + inner + '</svg>';
const helper = (icn, name, tag, draw, when, gives) => '<article class="vz-helper"><header><span class="vz-ic ai">' + ic(icn) + '</span><span><b>' + name + '</b><code>' + tag + '</code></span></header>' + draw +
  '<dl><div><dt>' + ic('event') + 'When</dt><dd>' + when + '</dd></div><div><dt>' + ic('jump') + 'Gives</dt><dd>' + gives + '</dd></div></dl></article>';

// items: [icon, title, text]
const tiles = (items) => '<div class="vz-tiles" style="' + cols(items.length) + '">' + items.map((p) => '<div class="vz-tile"><span class="vz-ic good">' + ic(p[0]) + '</span><b>' + p[1] + '</b><p>' + p[2] + '</p></div>').join('') + '</div>';

const keys = (list, start) => '<ol class="vz-keys">' + list.map((k, i) => '<li>' + num(start + i) + '<span>' + k + '</span></li>').join('') + '</ol>';
const chips = (items) => '<div class="vz-more">' + items.map((m) => '<span>' + ic(m[0]) + '<span>' + m[1] + '</span></span>').join('') + '</div>';

// n dots with a limit line after `lim`; the ones past it are red
const dots = (n, lim) => '<div class="vz-dots" aria-hidden="true">' + Array.from({ length: n }, (_, i) => (i === lim ? '<b class="lim"></b>' : '') + '<i class="' + (i >= lim ? 'bad' : '') + '"></i>').join('') + '</div>';
// items: [kind crit|warn|info, badge, title, text, visual html]
const issues = (items) => '<div class="vz-issues" style="' + cols(items.length) + '">' + items.map((s) => '<article class="vz-iss ' + s[0] + '"><div class="vz-iv">' + s[4] + '</div><span class="vz-badge ' + s[0] + '">' + ic(s[0] === 'crit' ? 'warn' : s[0] === 'info' ? 'info' : 'flag') + s[1] + '</span><b>' + s[2] + '</b><p>' + s[3] + '</p></article>').join('') + '</div>';

const route = (icn, n, name, best, steps) => '<article class="vz-route"><header><span class="vz-ic ai">' + ic(icn) + '</span><span><small>Way ' + n + '</small><b>' + name + '</b></span></header><p class="vz-best">' + best + '</p><ol>' + steps.map((s) => '<li>' + s + '</li>').join('') + '</ol></article>';
// pairs: [ok?, left html, right html]
const pairs = (list) => '<div class="vz-pairs" aria-label="Which login works with which environment">' +
  list.map((p) => '<div class="vz-pair ' + (p[0] ? 'ok' : 'bad') + '">' + ic('key') + '<span>' + p[1] + '</span><i class="vz-link"></i><span>' + p[2] + '</span>' + ic(p[0] ? 'yes' : 'no', 'st') + '</div>').join('') + '</div>';

// ---------- conversation and judgement blocks ----------
// one chat bubble: side 'c' (left, customer or user), 'r' (right, staff or agent), 's' (a system message)
const msg = (side, text, meta, badge) => '<div class="msg ' + side + '"><div class="bub">' + (badge ? '<span class="badge">' + badge + '</span>' : '') + text + '</div><span class="meta">' + meta + '</span></div>';
// side-by-side comparison cards: items [icon, title, tag, inner html (e.g. msg() bubbles), verdict html, kind?]
// kind is a verdict kind (default 'owed'; 'rule' for a neutral fact about a variant)
const compare = (items) => '<div class="vz-kinds" style="' + cols(items.length) + '">' + items.map((k) => '<article class="vz-kind"><header><span class="vz-ic ai">' + ic(k[0]) + '</span><span><b>' + k[1] + '</b><code>' + k[2] + '</code></span></header>' +
  '<div class="vz-chat">' + k[3] + '</div><p class="vz-verdict ' + (k[5] || 'owed') + '">' + ic(VI[k[5] || 'owed']) + k[4] + '</p></article>').join('') + '</div>';
// "how the system reads each input": rows [side, who, text, kind owed|closed|none|crit, verdict, test id]
// kinds: owed (still to do), closed (done or allowed), none (not applicable), crit (critical), plus generic aliases
const VI = { owed: 'flag', closed: 'yes', none: 'no', crit: 'shield', allowed: 'yes', blocked: 'block', info: 'info', rule: 'doc' };
const verdicts = (title, sub, rows) => '<div class="vz-mock"><div class="vz-mh">' + ic('forum') + '<b>' + title + '</b><span>' + sub + '</span></div><div class="vz-reads">' +
  rows.map((r) => '<div class="vz-read">' + msg(r[0], r[2], r[1]) + '<span class="vz-verdict ' + r[3] + '">' + ic(VI[r[3]]) + '<span>' + r[4] + '</span>' + (r[5] ? '<code>' + r[5] + '</code>' : '') + (r[3] === 'crit' ? '<em class="vz-crit">critical</em>' : '') + '</span></div>').join('') + '</div></div>';
// a ticked checklist card: items [text, test id or '']
const checklist = (title, sub, items) => '<div class="vz-mock"><div class="vz-mh">' + ic('shield') + '<b>' + title + '</b><span>' + sub + '</span></div><ul class="vz-checklist">' +
  items.map((c) => '<li>' + ic('yes') + '<span>' + c[0] + '</span>' + (c[1] ? '<code>' + c[1] + '</code>' : '') + '</li>').join('') + '</ul></div>';
// the buttons a person can press, and when: items [icon, name, when, lane]
const actions = (items) => '<div class="vz-acts" style="' + cols(items.length) + '">' + items.map((a) => '<div class="vz-act"><span class="vz-ic sm ' + (a[3] || 'ai') + '">' + ic(a[0]) + '</span><span><b>' + a[1] + '</b><small>' + a[2] + '</small></span></div>').join('') + '</div>';
// a ladder as a grid: levels [[label, css colour]], rows [icon, signal, [one cell per level]], example html optional
const upill = (label, colour) => '<span class="upill" style="background:' + colour + '">' + label + '</span>';
const levels = (lv, rows, example) => '<div class="vz-mtxwrap"><table class="vz-mtx vz-urg"><thead><tr><th></th>' + lv.map((u) => '<th>' + upill(u[0], u[1]) + '</th>').join('') + '</tr></thead><tbody>' +
  rows.map((r) => '<tr><th scope="row">' + ic(r[0], 'rh') + r[1] + '</th>' + r[2].map((c, i) => '<td class="u' + Math.min(i, 3) + '">' + c + '</td>').join('') + '</tr>').join('') +
  '</tbody></table>' + (example ? '<div class="vz-urgex">' + example + '</div>' : '') + '</div>';

// ---------- page furniture ----------
// the heading every page starts with; keep p to one or two plain sentences, or leave it out
const head = (eyebrow, title, p) => '<div class="sechead"><span class="eyebrow">' + eyebrow + '</span><h2>' + title + '</h2>' + (p ? '<p>' + p + '</p>' : '') + '</div>';
// the "In plain words" note that opens every page after the first
const plain = (text) => '<div class="lead-note" style="margin-bottom:18px">' + ic('info').replace('class="vi"', '') + '<div><b>In plain words:</b> ' + text + '</div></div>';
// "where to start, by role" buttons: items [lane, role, what, #anchor]
const roles = (items) => '<nav class="vz-roles" aria-label="Where to start, by role">' + items.map((r) => '<a href="' + r[3] + '">' + pill(r[1], r[0]) + '<span>' + r[2] + '</span></a>').join('') + '</nav>';
// the collapsed developer section at the bottom of How it works (keep its id so the Developers button lands on it)
const devDetails = (summary, html) => '<details class="lv-more" id="how-dev" style="margin-top:28px"><summary>' + summary + '</summary><div style="margin-top:14px">' + html + '</div></details>';
// a sub-heading; give it an id when a role button or a link points at it
const sub = (text, id) => '<h3 class="sub"' + (id ? ' id="' + id + '"' : '') + '>' + text + '</h3>';
const block = (html) => '<div class="vz-block">' + html + '</div>';

// ---------- reference-page blocks ----------
// a scrolling table: head [labels], rows [[cell html]], opts { first: true makes column 1 monospace, min: css min-width }
const table = (headRow, rows, opts) => { const o = opts || {};
  return '<div class="tablewrap"><table class="t"' + (o.min ? ' style="min-width:' + o.min + '"' : '') + '><thead><tr>' + headRow.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map((r) => '<tr>' + r.map((c, i) => '<td' + (i === 0 && o.first ? ' class="fn"' : '') + '>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'; };
// a code block with a label and a Copy button; text is escaped here, so pass it raw. id must be unique on the page.
const code = (label, text, id) => '<div class="codewrap"><div class="codebar"><span class="label">' + esc(label) + '</span><button type="button" class="copybtn" data-copy="#' + id + '">Copy</button></div><pre class="code" id="' + id + '">' + esc(text) + '</pre></div>';
// test case cards for a Tests page: items { id, title, checks (what it proves), steps? [..], expected, priority? 'critical'|'high'|'normal' }
const testCards = (items) => '<div class="vz-tests">' + items.map((t) => '<article class="vz-test' + (t.priority === 'critical' ? ' crit' : '') + '"><header><code>' + t.id + '</code><b>' + t.title + '</b>' +
  (t.priority && t.priority !== 'normal' ? '<span class="vz-badge ' + (t.priority === 'critical' ? 'crit' : 'warn') + '">' + t.priority + '</span>' : '') + '</header><p>' + t.checks + '</p>' +
  (t.steps && t.steps.length ? '<ol>' + t.steps.map((s) => '<li>' + s + '</li>').join('') + '</ol>' : '') + '<p class="vz-exp">' + ic('yes') + '<span><b>Expected:</b> ' + t.expected + '</span></p></article>').join('') + '</div>';

module.exports = { P, ic, num, esc, box, gbox, arr, lbl, defs, svg, big, pill, foot, journey, matrix, mini, helper, tiles, keys, chips, dots, issues, route, pairs, msg, compare, verdicts, checklist, actions, levels, upill, head, plain, roles, devDetails, sub, block, cols, cards, addIcons, table, code, testCards };
