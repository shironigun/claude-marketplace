'use strict';
const { namesShown } = require('./brief');
const { CUSTOM_PROPERTY, decodeCssEscapes, readCss } = require('./css');
const { MUST_NOT_SHOW } = require('./dossier');
const { filmCss } = require('./filmcss');
const { MODULE_LIMITS } = require('./modules');

// What a screen may take, below the Motion type's limits so the kit and the scenes fit too: a film's module holds at
// most 200 KiB, and its store 2 MiB (spec 5.11).
const SCREEN_LIMITS = { cssBytes: 150 * 1024, htmlBytes: 150 * 1024, filmBytes: 1536 * 1024 };
// Elements that run code, load from outside, style the page around the screen, or animate themselves: the film
// moves a screen, as it holds no keyframes either, and an svg <set> or <animate> can point an image elsewhere.
const BANNED = [
  'script', 'style', 'link', 'iframe', 'frame', 'object', 'embed', 'meta', 'base', 'set', 'animate', 'animatemotion',
  'animatetransform', 'marquee',
];
// The kinds of action that open a surface of their own (spec 5.11). A tab changes what the page shows, which the page
// marks with data-sp-state; a button acts on the page.
const LAYERS = ['drawer', 'dialog', 'toast'];
// The functions besides url() that load an image, by name in lower case, with a vendor prefix or without: a function
// of a screen's CSS, and a call anywhere in a surface's markup.
const LOADERS = '(?:-[a-z]+-)?(?:image-set|image|cross-fade|src)';
const LOADER = new RegExp(`^${LOADERS}$`);
const LOADER_CALL = new RegExp(`(${LOADERS})\\(`, 'gi');

// A screen's or a surface's text: one string, or its lines.
const joined = (text) => (Array.isArray(text) ? text.join('\n') : text);
// The class every rule of a screen's CSS is scoped under: `sp-` and the screen's id in lower case (spec 5.11).
const screenPrefix = (id) => `sp-${id.toLowerCase()}`;
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const kib = (n) => `${Math.ceil(n / 1024)} KiB`;
// A film loads nothing from outside: an address is a #fragment or an inline data:image/, after nothing but the ASCII
// spaces a browser strips from an address (a no-break space is not one).
const inline = (value) => /^[\t\n\f\r ]*(#|data:image\/)/i.test(value);
// The address each url() of a text names: a quoted one runs to its own closing quote, whatever it holds, and a bare one
// to the first space or `)`. Only the spaces CSS skips may come between `url(` and the address. The next url( is
// looked for after the address, so the text is read once, however many url( it holds.
function urls(text) {
  const found = [];
  const start = /url\([ \t\n\r\f]*/gi;
  for (let m = start.exec(text); m; m = start.exec(text)) {
    let i = m.index + m[0].length;
    const quote = text[i] === '"' || text[i] === "'" ? text[i] : null;
    let value = '';
    if (quote) {
      for (i += 1; i < text.length && text[i] !== quote; i += 1) {
        if (text[i] === '\\') i += 1;
        value += text[i] ?? '';
      }
    } else {
      for (; i < text.length && !/[\s)]/.test(text[i]); i += 1) value += text[i];
    }
    found.push(value);
    start.lastIndex = Math.max(i, start.lastIndex);
  }
  return found;
}

// The attributes that load what they name.
const ADDRESSES = ['href', 'src', 'srcset', 'imagesrcset', 'poster', 'xlink:href', 'action', 'formaction', 'background', 'ping'];
// What the named character references that can spell an address or a style stand for; any other is kept as written,
// which no address check lets through.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', colon: ':', lpar: '(', rpar: ')', sol: '/',
  bsol: '\\', semi: ';', comma: ',', period: '.', num: '#', equals: '=', Tab: '\t', NewLine: '\n',
};

// Character references as a browser reads them: a number with or without its `;`, and a name only with it, so
// `&num//x` stays as written. In text a browser also reads the old names (`&amp`, `&lt`, `&gt`, `&quot`, `&nbsp`)
// without their `;`.
const NUMBER_REFERENCE = '#[xX]([0-9a-fA-F]+);?|#(\\d+);?';
const NAMES = Object.keys(NAMED).join('|');
const REFERENCE = new RegExp(`&(?:${NUMBER_REFERENCE}|(${NAMES});)`, 'g');
const TEXT_REFERENCE = new RegExp(`&(?:${NUMBER_REFERENCE}|((?:${NAMES})(?=;)|amp|lt|gt|quot|nbsp);?)`, 'g');

// Markup with its character references decoded, as a browser reads an attribute's value or, `inText`, its text.
function decodeEntities(text, inText = false) {
  return text.replace(inText ? TEXT_REFERENCE : REFERENCE, (m, hex, dec, name) => {
    if (name) return NAMED[name];
    const code = parseInt(hex ?? dec, hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '�';
  });
}

// The named references a browser reads in text even without their `;` (the HTML standard keeps them for old pages),
// longest first, and those of them the engine reads itself.
const LEGACY = ['AElig', 'AMP', 'Aacute', 'Acirc', 'Agrave', 'Aring', 'Atilde', 'Auml', 'COPY', 'Ccedil', 'ETH', 'Eacute',
  'Ecirc', 'Egrave', 'Euml', 'GT', 'Iacute', 'Icirc', 'Igrave', 'Iuml', 'LT', 'Ntilde', 'Oacute', 'Ocirc', 'Ograve', 'Oslash',
  'Otilde', 'Ouml', 'QUOT', 'REG', 'THORN', 'Uacute', 'Ucirc', 'Ugrave', 'Uuml', 'Yacute', 'aacute', 'acirc', 'acute', 'aelig',
  'agrave', 'amp', 'aring', 'atilde', 'auml', 'brvbar', 'ccedil', 'cedil', 'cent', 'copy', 'curren', 'deg', 'divide', 'eacute',
  'ecirc', 'egrave', 'eth', 'euml', 'frac12', 'frac14', 'frac34', 'gt', 'iacute', 'icirc', 'iexcl', 'igrave', 'iquest', 'iuml',
  'laquo', 'lt', 'macr', 'micro', 'middot', 'nbsp', 'not', 'ntilde', 'oacute', 'ocirc', 'ograve', 'ordf', 'ordm', 'oslash',
  'otilde', 'ouml', 'para', 'plusmn', 'pound', 'quot', 'raquo', 'reg', 'sect', 'shy', 'sup1', 'sup2', 'sup3', 'szlig', 'thorn',
  'times', 'uacute', 'ucirc', 'ugrave', 'uml', 'uuml', 'yacute', 'yen', 'yuml'].sort((a, b) => b.length - a.length);
const TEXT_READ = new Set(['amp', 'lt', 'gt', 'quot', 'nbsp']);

// Each character reference in markup that the engine cannot read as a browser does (spec 13.3): a named one its table
// lacks, with its `;`, or an old name a browser reads without one. A builder writes such a character itself, so every
// check reads what a viewer reads.
function unreadReferences(html) {
  const found = new Set();
  for (const [whole, name, semi] of html.matchAll(/&([A-Za-z][A-Za-z0-9]*)(;?)/g)) {
    if (semi) {
      if (!Object.prototype.hasOwnProperty.call(NAMED, name)) found.add(whole);
    } else {
      const old = LEGACY.find((l) => name.startsWith(l));
      if (old && !TEXT_READ.has(old)) found.add(`&${old}`);
    }
  }
  return [...found];
}

// An attribute's values over every element of a markup, with their character references decoded. HTML takes a space,
// a slash or a closing quote before an attribute, so all three count.
function attrValues(html, name) {
  const re = new RegExp(`(?:^|[\\s/"'])${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi');
  return [...html.matchAll(re)].map((m) => decodeEntities(m[1] ?? m[2] ?? m[3]));
}

// The addresses of a srcset: each candidate's URL, which runs to a space and may hold commas, as a data: URI does.
function srcsetUrls(value) {
  const found = [];
  let rest = value;
  while ((rest = rest.replace(/^[\s,]+/, ''))) {
    const url = /^\S+/.exec(rest)[0];
    rest = rest.slice(url.length);
    found.push(url.replace(/,+$/, ''));
    if (!url.endsWith(',')) rest = rest.replace(/^[^,]*/, '');
  }
  return found;
}

// The space-separated tokens of an attribute, over every element of a markup.
const attrTokens = (html, name) => attrValues(html, name).flatMap((v) => v.split(/\s+/).filter(Boolean));

// The custom properties a screen's CSS reads, and those it sets itself.
function cssVariables(css) {
  return {
    used: new Set([...css.matchAll(new RegExp(`var\\(\\s*(${CUSTOM_PROPERTY})`, 'g'))].map((m) => m[1])),
    set: new Set([...css.matchAll(new RegExp(`(?:^|[;{\\s])(${CUSTOM_PROPERTY})\\s*:`, 'g'))].map((m) => m[1])),
  };
}

// A run of a stylesheet's tokens as written, without its comments.
const written = (tokens) => tokens.map((t) => t.raw).join('');
// How a token moves the depth of brackets: a function opens a `(`.
const depthOf = (t) => (['(', 'function', '['].includes(t.type) ? 1 : t.type === ')' || t.type === ']' ? -1 : 0);
// The bracket each closing bracket closes.
const OPENER = { ')': '(', ']': '[', '}': '{' };

// A run of tokens without the spaces at its ends.
function trimSpaces(tokens) {
  let a = 0;
  let b = tokens.length;
  while (a < b && tokens[a].type === 'space') a += 1;
  while (b > a && tokens[b - 1].type === 'space') b -= 1;
  return tokens.slice(a, b);
}

// A rule's selectors: its prelude split at the commas outside brackets, each without its outer spaces.
function selectorsOf(prelude) {
  const selectors = [[]];
  let depth = 0;
  for (const t of prelude) {
    depth += depthOf(t);
    if (t.type === ',' && !depth) selectors.push([]);
    else selectors[selectors.length - 1].push(t);
  }
  return selectors.map(trimSpaces);
}

// Whether a selector starts with the screen's class as a whole name: `.` and the prefix, then the selector's end, a
// space, a combinator, or another part of the same compound (a class, an id, an attribute or a pseudo-class).
function underScreen([dot, name, after], prefix) {
  if (dot?.type !== 'delim' || dot.value !== '.' || name?.type !== 'ident' || name.value !== prefix) return false;
  return !after || ['space', ':', 'hash', '['].includes(after.type)
    || (after.type === 'delim' && '.>+~'.includes(after.value));
}

// Whether a selector reaches what sits beside the screen: the combinator after its first compound, the one that
// starts with the screen's class, is `+` or `~`. A space or `>` reaches inside the screen.
function besideScreen(selector) {
  let depth = 0;
  for (const [k, t] of selector.entries()) {
    depth += depthOf(t);
    if (!depth && (t.type === 'space' || (t.type === 'delim' && '>+~'.includes(t.value)))) {
      const combinator = selector.slice(k).find((x) => x.type !== 'space');
      return combinator.type === 'delim' && '+~'.includes(combinator.value);
    }
  }
  return false;
}

// Each selector of a rule's prelude that is not under the screen's class, or reaches beside the screen.
function selectorProblems(prelude, prefix) {
  return selectorsOf(prelude).flatMap((selector) => {
    const text = written(selector);
    if (!underScreen(selector, prefix)) return [`/css: "${text}" is not under .${prefix}`];
    if (!besideScreen(selector)) return [];
    return [`/css: "${text}" styles what sits beside the screen; a rule reaches only inside .${prefix}`];
  });
}

// The rules of a screen's CSS, with their brackets paired as a browser pairs them: each a prelude of selectors and
// one block of declarations. A bracket that closes nothing open ends the reading, and a rule inside another, a rule
// left open and each selector outside the screen's class or beside it are problems too.
function ruleProblems(tokens, prefix) {
  const problems = [];
  const open = [];
  let rule = 0; // where the rule being read starts
  let after = 0; // where the text after the last `}` starts, which names a rule inside another
  let nested = false;
  for (const [k, { type }] of tokens.entries()) {
    if (type === '{') {
      if (!open.length) problems.push(...selectorProblems(tokens.slice(rule, k), prefix));
      else if (open[0] === '{' && !nested) {
        nested = true;
        const end = tokens.findIndex((t, j) => j > k && t.type === '}');
        const text = written(tokens.slice(after, end < 0 ? undefined : end)).trim().split('\n')[0];
        problems.push(`/css: a rule sits inside another: ${text}`);
      }
      open.push('{');
    } else if (type === '(' || type === 'function' || type === '[') {
      open.push(type === '[' ? '[' : '(');
    } else if (OPENER[type]) {
      if (open[open.length - 1] !== OPENER[type]) {
        return [...problems, `/css: a "${type}" closes nothing that is open; brackets close in the order they open`];
      }
      open.pop();
      if (type === '}') {
        after = k + 1;
        if (!open.length) {
          rule = k + 1;
          nested = false;
        }
      }
    }
  }
  if (open.length || tokens.slice(rule).some((t) => t.type !== 'space')) problems.push('/css: a rule is not closed');
  return problems;
}

// The addresses a stylesheet's url()s name, with their escapes decoded: an unquoted url's own token, and a quoted
// one's string.
function cssUrls(tokens) {
  return tokens.flatMap((t, k) => {
    if (t.type === 'url') return [t.value];
    if (t.type !== 'function' || t.value.toLowerCase() !== 'url') return [];
    const arg = tokens[k + 1]?.type === 'space' ? tokens[k + 2] : tokens[k + 1];
    return arg?.type === 'string' ? [arg.value] : [];
  });
}

// What keeps a screen's CSS out of a film (spec 5.11), read in one pass as a browser reads it (lib/css.js), so no
// string, comment or escape hides a rule: a `<` anywhere, comments too, as "</style>" would end the <style> element
// the build puts the CSS in; a string that a line end or the CSS's end cuts short, and a url a browser reads as a bad
// one; an at-rule (a font, keyframes, a media query, an import); anything that loads or runs, whatever its escapes
// and letter case; and the rules themselves (ruleProblems).
function cssProblems(css, prefix) {
  const tokens = readCss(css);
  const problems = css.includes('<')
    ? ['/css: no "<": the build puts the CSS in a <style> element, which "</style>" ends wherever it stands'] : [];
  for (const t of tokens) {
    if (t.type === 'bad-string') {
      problems.push('/css: a string runs onto a new line, where a browser ends it; close each string on its line');
    } else if (t.type === 'string' && t.open) {
      problems.push('/css: a string is not closed');
    } else if (t.type === 'bad-url') {
      problems.push(`/css: ${t.raw.replace(/\s+/g, ' ')} is a bad url to a browser; put its address in quotes`);
    }
  }
  const ats = tokens.filter((t) => t.type === 'at');
  problems.push(...ats.map((t) => `/css: no @${t.value}: a screen's CSS is plain rules, scoped under .${prefix}`));
  for (const u of cssUrls(tokens)) {
    if (!inline(u)) problems.push(`/css: url(${u}) loads from outside; a screen loads nothing`);
  }
  const functions = tokens.filter((t) => t.type === 'function').map((t) => t.value.toLowerCase());
  for (const name of new Set(functions.filter((f) => LOADER.test(f)))) {
    problems.push(`/css: no ${name}(); an image is an inline url(data:image/...)`);
  }
  const values = tokens.filter((t) => t.type === 'string' || t.type === 'url').map((t) => t.value);
  if (functions.includes('expression') || values.some((v) => /javascript:/i.test(v))) {
    problems.push('/css: no expression() or javascript:');
  }
  return ats.length ? problems : [...problems, ...ruleProblems(tokens, prefix)];
}

// What keeps a surface's markup out of a film (spec 5.11): an element that runs code or loads from outside, an event
// handler, an address that is not a #fragment or an inline data:image/ (each candidate of a srcset), a call that loads
// or runs, svg <text> (the Motion page retypes a film's words, so they are HTML text), and a slot the build does not
// fill. Attribute values are read as the browser reads them, with their references decoded. A browser reads many
// attributes as CSS (style, fill, mask, cursor), so the calls are found in the whole markup, its text too, with its
// references and then its CSS escapes decoded.
function htmlProblems(html, at) {
  if (!html.trim()) return [`${at}: has no markup`];
  const problems = BANNED.filter((el) => new RegExp(`<${el}[\\s>/]`, 'i').test(html)).map((el) => `${at}: no <${el}>`);
  if (/<text[\s>/]/i.test(html)) problems.push(`${at}: words are HTML text, never svg <text>`);
  for (const m of html.matchAll(/(?:^|[\s/"'])(on[a-z]+)\s*=/gi)) problems.push(`${at}: no ${m[1].toLowerCase()} handler`);
  for (const name of ADDRESSES) {
    for (const value of attrValues(html, name)) {
      for (const u of /srcset$/.test(name) ? srcsetUrls(value) : [value]) {
        if (!inline(u)) problems.push(`${at}: ${name}="${u}" loads from outside; a screen loads nothing`);
      }
    }
  }
  const read = decodeCssEscapes(decodeEntities(html));
  for (const u of new Set(urls(read))) {
    if (!inline(u)) problems.push(`${at}: url(${u}) loads from outside; a screen loads nothing`);
  }
  for (const name of new Set([...read.matchAll(LOADER_CALL)].map((m) => m[1].toLowerCase()))) {
    problems.push(`${at}: no ${name}(); an image is an inline url(data:image/...)`);
  }
  if (/javascript:/i.test(read)) problems.push(`${at}: no javascript:`);
  if (/expression\(/i.test(read)) problems.push(`${at}: no expression()`);
  for (const slot of attrTokens(html, 'data-sp-slot')) {
    if (slot !== 'logo') problems.push(`${at}: no slot "${slot}"; the build fills the logo slot only`);
  }
  for (const r of unreadReferences(html)) problems.push(`${at}: ${r} is a reference the engine cannot read; write the character itself`);
  return problems;
}

// What keeps a screen out of a film, beyond its schema (spec 5.11): its CSS, each surface's markup, and their sizes.
function filmReadyProblems(screen) {
  const css = joined(screen.css);
  const problems = cssProblems(css, screenPrefix(screen.screen));
  if (bytes(css) > SCREEN_LIMITS.cssBytes) problems.push(`/css: ${kib(bytes(css))} is more than the ${kib(SCREEN_LIMITS.cssBytes)} a screen's CSS may take`);
  screen.scenes.forEach((scene, i) => scene.surfaces.forEach((surface, j) => {
    const at = `/scenes/${i}/surfaces/${j}/html`;
    const html = joined(surface.html);
    problems.push(...htmlProblems(html, at));
    if (bytes(html) > SCREEN_LIMITS.htmlBytes) problems.push(`${at}: ${kib(bytes(html))} is more than the ${kib(SCREEN_LIMITS.htmlBytes)} a surface may take`);
  }));
  return problems;
}

// The places every brand of the film shows a logo in (spec 5.3): where a screen's logo slot may point.
function filmPlaces(fc) {
  const brands = ((fc.mods && fc.mods.brands) || []).map((id) => (fc.brands || []).find((b) => b.id === id)).filter(Boolean);
  if (!brands.length) return [];
  return Object.keys(brands[0].chrome || {}).filter((p) => brands.every((b) => Object.hasOwn(b.chrome || {}, p)));
}

// Each logo slot of a surface names a place every brand of the film shows a logo in (spec 5.11, 5.12), so the build
// can fill it with the logo and the size each brand shows there.
function slotProblems(html, at, fc) {
  const places = filmPlaces(fc);
  const problems = [];
  for (const tag of html.match(/<[a-z][^<>]*>/gi) || []) {
    if (!attrTokens(tag, 'data-sp-slot').includes('logo')) continue;
    const [place] = attrValues(tag, 'data-sp-logo');
    const where = places.join(', ') || 'none yet';
    if (!place) problems.push(`${at}: a logo slot names its place with data-sp-logo; every brand of the film shows a logo in: ${where}`);
    else if (!places.includes(place)) problems.push(`${at}: data-sp-logo="${place}" is not a place every brand of the film shows a logo in: ${where}`);
  }
  return problems;
}

// What a screen takes in a film: its CSS and every surface's markup.
const screenBytes = (screen) => bytes(joined(screen.css))
  + screen.scenes.reduce((n, s) => n + s.surfaces.reduce((m, f) => m + bytes(joined(f.html)), 0), 0);

// The drawers, dialogs and toasts a scene's beats open, as the screen map's actions, each once.
const openedLayers = (scene, map) => [...new Set(scene.beats.map((b) => b.action).filter(Boolean))]
  .map((label) => map.actions.find((a) => a.label === label))
  .filter((a) => a && LAYERS.includes(a.kind));

// The tabs a scene's beats click, as their labels, each once.
const clickedTabs = (scene, map) => [...new Set(scene.beats.map((b) => b.action).filter(Boolean))]
  .filter((label) => map.actions.some((a) => a.label === label && a.kind === 'tab'));

// A scene's surfaces (spec 5.11): one page; a surface for each drawer, dialog and toast its beats open, of that kind and
// named by its action's label; and others only for layers an earlier scene of the screen opened, which may still be
// open. What each tab its beats click shows is marked data-sp-state with the tab's label.
function surfaceProblems(entry, scene, map, at, before) {
  const problems = [];
  const opened = openedLayers(scene, map);
  const allowed = [...opened, ...before.filter((a) => !opened.includes(a))];
  const pages = entry.surfaces.filter((s) => s.kind === 'page').length;
  if (pages !== 1) problems.push(`${at}: a scene has one page surface; this one has ${pages}`);
  entry.surfaces.forEach((surface, j) => {
    if (surface.kind === 'page') {
      if (surface.action) problems.push(`${at}/surfaces/${j}: the page names no action`);
      return;
    }
    const action = allowed.find((a) => a.label === surface.action);
    if (!action) problems.push(`${at}/surfaces/${j}: neither ${entry.scene} nor an earlier scene of ${map.id} opens the ${surface.kind} "${surface.action || ''}"`);
    else if (action.kind !== surface.kind) problems.push(`${at}/surfaces/${j}: "${action.label}" is a ${action.kind}, not a ${surface.kind}`);
    else if (entry.surfaces.findIndex((s) => s.action === surface.action) !== j) problems.push(`${at}/surfaces/${j}: "${action.label}" twice`);
  });
  for (const action of opened) {
    if (!entry.surfaces.some((s) => s.action === action.label)) {
      problems.push(`${at}: ${entry.scene}'s beats open the ${action.kind} "${action.label}"; add its surface`);
    }
  }
  const states = entry.surfaces.flatMap((s) => attrValues(joined(s.html), 'data-sp-state'));
  for (const tab of clickedTabs(scene, map)) {
    if (!states.includes(tab)) problems.push(`${at}: ${entry.scene}'s beats click the tab "${tab}"; mark what it shows with data-sp-state="${tab}"`);
  }
  const tabs = map.actions.filter((a) => a.kind === 'tab').map((a) => a.label);
  for (const state of new Set(states)) {
    if (!tabs.includes(state)) problems.push(`${at}: data-sp-state="${state}" names no tab of ${map.id}`);
  }
  return problems;
}

// Each beat's target carries its hook once, data-sp="<scene>.<beat>" with beats counted from 1 as the storyboard
// counts them, and no hook names a beat the scene lacks.
function hookProblems(entry, scene, at) {
  const problems = [];
  const tokens = entry.surfaces.flatMap((s) => attrTokens(joined(s.html), 'data-sp'));
  scene.beats.forEach((beat, n) => {
    const hook = `${scene.id}.${n + 1}`;
    const count = tokens.filter((t) => t === hook).length;
    if (!count) problems.push(`${at}: no element carries data-sp="${hook}", the target of "${beat.do} ${beat.target}"`);
    if (count > 1) problems.push(`${at}: data-sp="${hook}" is on ${count} elements; a beat has one target`);
  });
  for (const token of new Set(tokens)) {
    const m = /^(S-\d{2,})\.(\d+)$/.exec(token);
    if (!m || m[1] !== scene.id || Number(m[2]) < 1 || Number(m[2]) > scene.beats.length) {
      problems.push(`${at}: data-sp="${token}" names no beat of ${scene.id}`);
    }
  }
  return problems;
}

// What a viewer reads of a surface's markup (spec 13.3): its lines joined, its references decoded as text decodes
// them, and every run of spaces, no-break spaces too, one space. It is read twice: with each tag a space, so a name
// split across lines or tags reads whole, and with the tags as written, so a name an attribute shows reads too. The
// tags come out before the references are decoded, as a browser reads them, so an `&lt;` opens no tag. A tag holds no
// `<` here, so the reading stays linear, and what it leaves as text only adds to what is checked.
function viewerText(html) {
  const read = (markup) => decodeEntities(markup, true).replace(/\s+/g, ' ');
  return `${read(html.replace(/<[a-z/!?][^<>]*>/gi, ' '))}\n${read(html)}`;
}

// The words a screen's CSS writes on screen (`content`), as a viewer reads them: each declaration's strings joined,
// their escapes decoded, every run of spaces one space.
function cssWords(css) {
  const out = [];
  let words = '';
  for (const t of readCss(css)) {
    if (t.type === 'string') words += t.value;
    else if (t.type === ';' || t.type === '{' || t.type === '}') {
      if (words) out.push(words.replace(/\s+/g, ' '));
      words = '';
    }
  }
  if (words) out.push(words.replace(/\s+/g, ' '));
  return out.join('\n');
}

// The must-not-show names a viewer reads in a surface but none of its strings shows as written, at the surface; a
// name a string shows is reported at that string.
function namesRead(surface, names, at) {
  const unseen = names.filter((name) => !namesShown(surface, [name]).length);
  return namesShown(viewerText(joined(surface.html)), unseen, at);
}

// What is wrong with a screen against the film the user approved (spec 5.11): a screen the map lacks; the scenes the
// story shows it in, each with its surfaces and every beat's hook; logo slots that name no place of the film's brands;
// marks that name no entry of the must-not-show list;
// a variable that no brand's theme defines; and a name the brief's must-not-show list gives, in any of its strings or
// in what a viewer reads of a surface.
function screenFilmProblems(screen, fc, theme) {
  const map = fc.screens.find((s) => s.id === screen.screen);
  if (!map) return [`/screen: the screen map has no ${screen.screen}`];
  const problems = [];
  const story = fc.beats.scenes.filter((s) => s.kind === 'screen' && s.screen === screen.screen);
  const ids = screen.scenes.map((s) => s.scene);
  const missing = story.map((s) => s.id).filter((id) => !ids.includes(id));
  if (missing.length) problems.push(`/scenes: the story shows ${screen.screen} in ${missing.join(', ')}; add ${missing.length === 1 ? 'that scene' : 'those scenes'}`);
  const hidden = fc.truth.filter((e) => MUST_NOT_SHOW.includes(e.kind)).map((e) => e.id);
  const vars = cssVariables(joined(screen.css));
  // The film's CSS, with a rule of its own for each state the app styles, is one module (spec 5.12).
  const film = Buffer.byteLength(filmCss(joined(screen.css)), 'utf8');
  if (film > MODULE_LIMITS.moduleBytes) {
    problems.push(`/css: with a rule for each state it styles, the film's CSS takes ${Math.ceil(film / 1024)} KiB, past a module's ${MODULE_LIMITS.moduleBytes / 1024} KiB; trim its hover, focus and pressed rules`);
  }
  const themed = new Set(Object.values(theme.brands).flatMap((t) => Object.keys(t.vars)));
  // A variable is set by the screen's CSS or by the style that reads it, or defined in the theme of every brand.
  const unset = (v) => [...v.used].filter((name) => !v.set.has(name) && !vars.set.has(name) && !themed.has(name));
  const before = new Map();
  story.reduce((opened, s) => {
    before.set(s.id, opened);
    return [...opened, ...openedLayers(s, map).filter((a) => !opened.includes(a))];
  }, []);
  screen.scenes.forEach((entry, i) => {
    const at = `/scenes/${i}`;
    const scene = story.find((s) => s.id === entry.scene);
    if (!scene) return problems.push(`${at}: ${entry.scene} is not a scene of ${screen.screen} in the story`);
    if (ids.indexOf(entry.scene) !== i) return problems.push(`${at}: ${entry.scene} twice`);
    problems.push(...surfaceProblems(entry, scene, map, at, before.get(scene.id)), ...hookProblems(entry, scene, at));
    entry.surfaces.forEach((surface, j) => {
      problems.push(...slotProblems(joined(surface.html), `${at}/surfaces/${j}`, fc));
      for (const id of attrTokens(joined(surface.html), 'data-sp-hide')) {
        if (!hidden.includes(id)) problems.push(`${at}/surfaces/${j}: data-sp-hide="${id}" is not on the must-not-show list`);
      }
      for (const name of unset(cssVariables(attrValues(joined(surface.html), 'style').join(';')))) {
        problems.push(`${at}/surfaces/${j}: var(${name}) is in no brand's theme and not set here`);
      }
    });
    return null;
  });
  for (const name of unset(vars)) problems.push(`/css: var(${name}) is in no brand's theme and not set here`);
  problems.push(...namesShown(screen.css, fc.forbidden, '/css'), ...namesShown(screen.scenes, fc.forbidden, '/scenes'));
  const unseen = fc.forbidden.filter((name) => !namesShown(screen.css, [name]).length);
  problems.push(...namesShown(cssWords(joined(screen.css)), unseen, '/css'));
  screen.scenes.forEach((entry, i) => entry.surfaces.forEach((surface, j) => {
    problems.push(...namesRead(surface, fc.forbidden, `/scenes/${i}/surfaces/${j}`));
  }));
  problems.push(...namesShown(screen.guesses, fc.forbidden, '/guesses'));
  return problems;
}

// What the film's screens take with this one, against what a film's screens may take (spec 5.11): `others` are the
// saved screens the story shows besides this one.
function filmSizeProblems(screen, others) {
  const total = others.reduce((n, s) => n + screenBytes(s), screenBytes(screen));
  if (total <= SCREEN_LIMITS.filmBytes) return [];
  return [`the film's screens would take ${kib(total)}, more than the ${kib(SCREEN_LIMITS.filmBytes)} a film's screens may take`];
}

module.exports = {
  SCREEN_LIMITS, joined, screenPrefix, bytes, attrValues, attrTokens, cssVariables, cssProblems, htmlProblems,
  filmReadyProblems, screenBytes, openedLayers, clickedTabs, filmPlaces, screenFilmProblems, filmSizeProblems,
};
