// node build.mjs <guide.md> [out.pdf] [--html] [--brand=<howto-brand.json>] [--cover=<style>] [--covers[=style,style]]
// Turns a Markdown guide into a branded PDF with local Chrome. --html also keeps the print HTML for debugging.
// --covers prints only the cover, once in every style (or the listed ones), one per page and labelled, to choose from.
// The brand (product name, logo, colours, font, help line) comes from howto-brand.json: --brand=<file>, or the first
// howto-brand.json found in the guide's folder or any folder above it. Without one, the guide gets a plain neutral look.
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, basename, extname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { chromium } from 'playwright-core';
import { coverArt } from './theme/cover-art.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = join(HERE, 'theme');

const args = process.argv.slice(2);
const keepHtml = args.includes('--html');
const catalogArg = args.find((a) => a === '--covers' || a.startsWith('--covers='));
const catalog = Boolean(catalogArg);
const catalogOnly = catalogArg?.split('=')[1]?.split(',');
const coverArg = args.find((a) => a.startsWith('--cover='))?.slice('--cover='.length);
const brandArg = args.find((a) => a.startsWith('--brand='))?.slice('--brand='.length);

// Every cover style in theme/covers.css, in the order the --covers catalog shows them.
// The brochure styles frame the guide's coverImage; the mark styles need a "mark" in the brand profile.
const COVER_STYLES = [
  ['classic', 'Brand line along the top'],
  ['rings', 'Concentric rings in the corner'],
  ['dots', 'Dot grid in the corner'],
  ['crosshair', 'Crosshairs in the corner'],
  ['lines', 'Hairlines in the corner'],
  ['glow', 'Soft brand and accent glow'],
  ['frame', 'Thin frame'],
  ['centered', 'Centred'],
  ['title-card', 'Centred title card on a dotted page'],
  ['orbit', 'Brochure: photo circle and arc'],
  ['hexagon', 'Brochure: colour top and hexagon'],
  ['facets', 'Brochure: diamond photo mosaic'],
  ['profile', 'Brochure: photo band and angled stripes'],
  ['corner', 'Brand mark large in the corner'],
  ['watermark', 'Brand mark as an emblem'],
  ['tint', 'Grey page with the brand mark'],
];
const MARK_STYLES = ['corner', 'watermark', 'tint'];

const [input, output] = args.filter((a) => !a.startsWith('--'));
if (!input) { console.error(`usage: node build.mjs <guide.md> [out.pdf] [--html] [--brand=<howto-brand.json>] [--covers] [--cover=${COVER_STYLES.map(([s]) => s).join('|')}]`); process.exit(1); }
const src = resolve(input);
const out = resolve(output ?? join(dirname(src), basename(src, extname(src)) + (catalog ? '-covers.pdf' : '.pdf')));

// ---- Brand profile ----
function findBrand(dir) {
  for (let d = dir; ; d = dirname(d)) {
    if (existsSync(join(d, 'howto-brand.json'))) return join(d, 'howto-brand.json');
    if (dirname(d) === d) return null;
  }
}
const brandPath = brandArg ? resolve(brandArg) : findBrand(dirname(src));
const brand = brandPath ? JSON.parse(readFileSync(brandPath, 'utf8')) : {};
// Image and font paths in the profile are relative to the profile itself.
const brandFile = (rel, label) => {
  if (!rel) return null;
  const p = resolve(dirname(brandPath), rel);
  if (existsSync(p)) return pathToFileURL(p).href;
  console.warn(`Brand ${label} not found: ${p}`);
  return null;
};
const logo = brandFile(brand.logo, 'logo');
const logoOnDark = brandFile(brand.logoOnDark, 'logoOnDark');
const mark = brandFile(brand.mark, 'mark');
const fontFile = brandFile(brand.font?.file, 'font file');
console.log(brandPath ? `Brand: ${brandPath}` : 'Brand: none found, using the neutral look (add a howto-brand.json to brand it).');

// Colours go straight into CSS and SVG, so only #rrggbb is accepted.
const HEX = /^#[0-9a-f]{6}$/i;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const colour = (key, fallback) => {
  const v = brand.colors?.[key];
  if (v && !HEX.test(v)) console.warn(`Brand colour "${key}" must look like #1a2b3c; using the default.`);
  return v && HEX.test(v) ? v : fallback;
};
const main = colour('primary', '#2b59c3');
const pal = {
  main, accent: colour('accent', '#f0b323'), ink: colour('ink', '#263238'),
  deep: colour('deep', mix(main, '#000000', 0.45)), tint: colour('tint', mix(main, '#ffffff', 0.9)),
  ring: colour('ring', mix(main, '#ffffff', 0.72)), soft: colour('soft', mix(main, '#ffffff', 0.38)),
};
// The brochure photo's duotone runs from the deep shade to a near-white tint of the brand colour.
const duo = (() => {
  const dark = rgb(pal.deep).map((v) => v / 255), light = rgb(mix(main, '#ffffff', 0.93)).map((v) => v / 255);
  return dark.map((d, i) => { const k = light[i] - d; return `${(k * 0.2126).toFixed(3)} ${(k * 0.7152).toFixed(3)} ${(k * 0.0722).toFixed(3)} 0 ${d.toFixed(3)}`; }).join('  ') + '  0 0 0 1 0';
})();
const artPalette = {
  PRIMARY: main, DEEP: pal.deep, SOFT: pal.soft, PALE: mix(main, '#ffffff', 0.55), TINT: pal.tint, RING: pal.ring,
  WASH: mix(main, '#ffffff', 0.93), MID: mix(main, '#ffffff', 0.18), SHADOW: mix(main, '#000000', 0.6), DUO: duo,
};
const product = brand.product ?? '';

// ---- Front matter: simple "key: value" lines between --- fences ----
let md = readFileSync(src, 'utf8').replace(/^﻿/, '');
const meta = {};
const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (fm) {
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+)\s*:\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  md = md.slice(fm[0].length);
}

// Document types and how they read on the cover kicker and in the footer. Any other type: label it in front matter.
const DOC_TYPES = {
  'how-to': 'How-to guide',
  walkthrough: 'Walkthrough',
  reference: 'Reference',
  'release-notes': 'Release notes',
};

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// marked hands image alt text over already entity-encoded; decode it once so esc() doesn't double-encode.
const unesc = (s = '') => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ICONS = {
  note: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-6h2zm0-8h-2V7h2z',
  tip: 'M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7',
  important: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m1 15h-2v-2h2zm0-4h-2V7h2z',
  warning: 'M1 21h22L12 2zm12-3h-2v-2h2zm0-4h-2v-4h2z',
  caution: 'M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27zM12 17.3c-.72 0-1.3-.58-1.3-1.3s.58-1.3 1.3-1.3 1.3.58 1.3 1.3-.58 1.3-1.3 1.3m1-4.3h-2V7h2z',
  done: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8z',
  availability: 'M20 4H4v2h16zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6zm-9 4H6v-4h6z',
  ai: 'm19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z',
};
const LABELS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution', done: 'Done', availability: 'Availability', ai: 'AI feature' };

const sections = [];
let docTitle = meta.title;
const figure = (href, alt) => {
  const caption = unesc(alt);
  return `<figure><div class="win"><div class="bar"><i></i><i></i><i></i></div><img src="${esc(href)}" alt="${esc(caption)}"></div>` +
    (caption ? `<figcaption>${esc(caption)}</figcaption>` : '') + '</figure>';
};

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading({ tokens, depth, text }) {
      const html = this.parser.parseInline(tokens);
      if (depth === 1) { docTitle ??= text; return ''; } // the title lives on the cover
      const id = slug(text);
      if (depth === 2) sections.push({ id, html });
      return `<h${depth} id="${id}">${html}</h${depth}>\n`;
    },
    paragraph({ tokens }) {
      // A paragraph that is only an image becomes a framed, numbered figure.
      if (tokens.length === 1 && tokens[0].type === 'image') return figure(tokens[0].href, tokens[0].text);
      const html = this.parser.parseInline(tokens);
      // "You'll see ..." is the result line after an action.
      return /^You(’|'|&#39;)ll see\b/.test(html) ? `<p class="result">${html}</p>\n` : `<p>${html}</p>\n`;
    },
    image({ href, text }) { return figure(href, text); },
    blockquote({ tokens }) {
      const inner = this.parser.parse(tokens);
      const m = inner.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DONE|AVAILABILITY|AI)\]\s*/i);
      if (!m) return `<blockquote>${inner}</blockquote>\n`;
      const kind = m[1].toLowerCase();
      const body = ('<p>' + inner.slice(m[0].length)).replace(/^<p>\s*<\/p>\s*/, '');
      return `<aside class="callout ${kind}"><div class="callout-label"><svg viewBox="0 0 24 24"><path d="${ICONS[kind]}"/></svg>${LABELS[kind]}</div>${body}</aside>\n`;
    },
  },
});

// ---- Checks against the how-to standard (references/standard.md). Warnings only: the PDF still builds. ----
function checkHowTo() {
  const warnings = [];
  const tokens = marked.lexer(md);
  const h2 = tokens.filter((t) => t.type === 'heading' && t.depth === 2).map((t) => t.text.toLowerCase());
  if (!meta.subtitle) warnings.push('No summary: add a subtitle saying what the reader can do when they finish.');
  if (!h2.includes('before you begin')) warnings.push('No "Before you begin" section.');
  if (!h2.includes('how it works')) warnings.push('No "How it works" section explaining the feature and its terms.');
  if (!h2.some((h) => /^questions .+ ask$/.test(h))) warnings.push('No "Questions <readers> ask" section, such as "Questions office managers ask".');
  if (!h2.includes('if something goes wrong')) warnings.push('No "If something goes wrong" section.');
  if (!/^>\s*\[!DONE\]/im.test(md.replace(/^ +/gm, ''))) warnings.push('No "> [!DONE]" callout saying what the reader sees when the task worked.');
  // Reviewers missed an AI disclaimer folded into a general note, so an AI feature gets its own labelled callout.
  if (/\bAI\b/.test(md) && !/^>\s*\[!AI\]/im.test(md.replace(/^ +/gm, ''))) warnings.push('The guide mentions AI but has no "> [!AI]" callout saying it is an AI feature and its suggestions can be wrong.');
  marked.walkTokens(tokens, (t) => {
    if (t.type === 'list' && t.ordered && t.items.length > 10) warnings.push(`A step list has ${t.items.length} steps; the limit is 10. Split it into two sections.`);
    if (t.type === 'image' && !t.text.trim()) warnings.push(`Screenshot ${t.href} has no caption.`);
  });
  const WORDS = [
    [/\b(click|clicks|clicked|clicking|tap)\b/i, 'write "select"'],
    // Where something is on screen ("top-right of the list") helps readers find it; "see above" breaks with the page.
    [/\b(see|shown|listed|described|mentioned) (above|below)\b|\bthe (above|below)\b/i, 'name the section instead of "above" or "below"'],
    [/\b(shows|showing)\b/i, 'the screen "displays" information'],
    [/\bplease\b/i, 'leave out "please"'],
    [/\b(simply|just|easy|easily)\b/i, 'leave out "simply", "just" and "easy"'],
    [/\bthe user\b/i, 'write "you"'],
    [/\bshould\b/i, 'say what happens or what to do; "should" sounds unsure'],
  ];
  // Bold text is on-screen wording, quoted exactly as the app shows it, so the word checks skip it.
  const prose = (line) => line.replace(/\*\*[^*]+\*\*/g, '');
  const dashes = (prose(md).match(/—/g) || []).length;
  if (dashes > 3) warnings.push(`${dashes} em-dashes: customer copy with many em-dashes reads as machine-written. Use a period or comma instead.`);
  const offset = fm ? fm[0].split('\n').length - 1 : 0;
  let inCode = false;
  md.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```/.test(line)) inCode = !inCode;
    if (inCode) return;
    const text = prose(line);
    for (const [re, fix] of WORDS) if (re.test(text)) warnings.push(`Line ${i + 1 + offset}: "${text.match(re)[0]}": ${fix}.`);
  });
  return warnings;
}
if (meta.type === 'how-to' && !catalog) {
  const warnings = checkHowTo();
  if (warnings.length) console.warn(`How-to standard: ${warnings.length} warning(s)\n  - ` + warnings.join('\n  - '));
  else console.log('How-to standard: no warnings.');
}

// Short tables (a header and up to six rows) stay in one piece with their heading; longer ones break across pages and repeat the header row.
const body = marked.parse(md).replace(/<table>([\s\S]*?)<\/table>/g, (t, inner) =>
  (inner.match(/<tr>/g) || []).length <= 7 ? t.replace('<table>', '<table class="keep">') : t);
const coverStyle = coverArg ?? meta.cover ?? brand.cover ?? 'classic';
if (!COVER_STYLES.some(([s]) => s === coverStyle)) console.warn(`Unknown cover "${coverStyle}". Styles: ${COVER_STYLES.map(([s]) => s).join(', ')}.`);
if (MARK_STYLES.includes(coverStyle) && !mark && !catalog) console.warn(`The "${coverStyle}" cover needs a "mark" image in the brand profile.`);
const typeLabel = meta.typeLabel ?? DOC_TYPES[meta.type] ?? meta.type ?? 'Guide';
docTitle ??= basename(src, extname(src));

const metaRows = [
  ['Applies to', meta.appliesTo], ['Audience', meta.audience], ['Version', meta.version], ['Updated', meta.updated],
].filter(([, v]) => v);

const toc = sections.length > 1
  ? `<nav class="toc"><div class="toc-title">In this ${esc(typeLabel.toLowerCase())}</div><ol>` +
    sections.map((s, i) => `<li><a href="#${s.id}"><span class="n">${String(i + 1).padStart(2, '0')}</span>${s.html}</a></li>`).join('') +
    '</ol></nav>'
  : '';

// Every task guide ends with where to get help next. The brand profile words it; Markdown is allowed.
const helpText = brand.help ?? '**Still stuck?** Contact our support team.';
const help = ['how-to', 'walkthrough'].includes(meta.type) && helpText
  ? `<aside class="help">${marked.parseInline(helpText)}</aside>`
  : '';
const cssString = (s) => JSON.stringify(String(s));
const asset = (name) => pathToFileURL(join(THEME, name)).href;
// The feature name with its last word wrapped, so two-tone covers can colour and stack it.
const coverName = (name) => {
  const words = esc(name).split(' ');
  return words.length > 1 ? `${words.slice(0, -1).join(' ')} <span class="h1-last">${words.at(-1)}</span>` : words[0];
};
// Without a logo, the product name stands in as a word mark; without either, the corner stays empty.
const logoHtml = () => {
  if (logo) {
    return `<img class="cover-logo" src="${logo}" alt="${esc(product)}">` +
      (logoOnDark ? `<img class="cover-logo-white" src="${logoOnDark}" alt="${esc(product)}">`
        : `<img class="cover-logo-white" style="filter: brightness(0) invert(1)" src="${logo}" alt="${esc(product)}">`);
  }
  return product ? `<div class="cover-logo cover-wordmark">${esc(product)}</div><div class="cover-logo-white cover-wordmark">${esc(product)}</div>` : '';
};
// `coverImage:` in front matter is the photo the brochure covers frame; the print HTML sits next to the guide, so the path stays relative.
// `note` only appears in the --covers catalog, to name each option.
const coverHtml = (style, note = '') => `<section class="cover cover-${esc(style)}">
  ${coverArt(style, meta.coverImage && esc(meta.coverImage), artPalette)}
  <div class="cover-bar"></div>
  ${mark ? `<img class="cover-mark" src="${mark}" alt="">` : ''}
  ${logoHtml()}
  <div class="cover-title">
    <div class="cover-type">${esc(typeLabel)}</div>
    <h1>${coverName(meta.feature ?? docTitle)}</h1>
    <div class="cover-ver">${meta.version ? `Version ${esc(meta.version)}` : ''}</div>
    ${meta.feature ? `<p class="cover-sub">${esc(docTitle)}</p>` : ''}
  </div>
  ${meta.subtitle ? `<p class="cover-blurb">${esc(meta.subtitle)}</p>` : ''}
  <div class="cover-foot">${meta.version ? `<span class="foot-version">Version ${esc(meta.version)}</span>` : ''}${meta.updated ? `<span class="foot-updated">${esc(meta.updated)}</span>` : ''}</div>
  ${note ? `<div class="cover-note">${esc(note)}</div>` : ''}
</section>`;

const pages = catalog
  ? COVER_STYLES.map(([style, label], i) => ({ style, label, n: i + 1 }))
    .filter(({ style }) => (!catalogOnly || catalogOnly.includes(style)) && (mark || !MARK_STYLES.includes(style)))
    .map(({ style, label, n }) => coverHtml(style, `Option ${n} of ${COVER_STYLES.length}  ·  ${label}  ·  cover: ${style}`)).join('\n')
  : `${coverHtml(coverStyle)}
<main class="content">
  <header class="intro">
    <div class="kicker">${esc(typeLabel)}</div>
    ${meta.subtitle ? `<p class="lead">${esc(meta.subtitle)}</p>` : ''}
    ${metaRows.length ? `<dl class="meta">${metaRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
  </header>
  ${toc}${body}${help}
</main>`;

// The brand, as CSS: colours and font on :root, and the page header and footer (margin boxes take literal values).
const fontFamily = brand.font?.family ? `${cssString(brand.font.family)}, ` : '';
const font = `${fontFamily}"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
const brandCss = `
${fontFile ? `@font-face { font-family: ${cssString(brand.font.family)}; src: url("${fontFile}"); font-weight: 300 700; font-display: block; }` : ''}
:root { --font: ${font}; --main: ${pal.main}; --deep: ${pal.deep}; --tint: ${pal.tint}; --ring: ${pal.ring}; --soft: ${pal.soft}; --accent: ${pal.accent}; --ink: ${pal.ink}; }
.cover-wordmark { font-size: 20pt; font-weight: 700; letter-spacing: -.01em; color: var(--main); height: auto; }
.cover-logo-white.cover-wordmark { color: #fff; }
@page {
  @top-left { ${logo ? `content: ""; background: url("${logo}") no-repeat left center / contain;` : `content: ${cssString(product)}; font: 700 9pt ${font}; color: ${pal.main};`} }
  @top-right { content: ${cssString(docTitle)}; font: 600 8pt ${font}; }
  @bottom-left { content: ${cssString([product, typeLabel].filter(Boolean).join(' · '))}; font: 600 7.5pt ${font}; }
  @bottom-right { font: 600 7.5pt ${font}; }
}`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(catalog ? `${docTitle}: cover options` : docTitle)}</title>
<link rel="stylesheet" href="${asset('theme.css')}">
<link rel="stylesheet" href="${asset('covers.css')}">
<style>${brandCss}</style>
</head><body>
${pages}
</body></html>`;

// The HTML sits next to the Markdown so relative image paths resolve.
const htmlPath = join(dirname(src), `.${basename(src, extname(src))}.print.html`);
writeFileSync(htmlPath, html);

const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const missing = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')));
  if (missing.length) console.warn('Images that did not load:', missing.join(', '));
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  console.log('PDF written:', out);
} finally {
  await browser.close();
  if (!keepHtml) rmSync(htmlPath, { force: true });
}
