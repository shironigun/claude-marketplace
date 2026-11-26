'use strict';
const { readCss } = require('./css');

// The states a film shows by attribute (spec 7.4, 7.5): nothing hovers, takes focus or is pressed in a Motion film, so
// the kit sets an attribute in each one's place, and each rule the app writes for the state is given the attribute too.
const STATES = {
  hover: '[data-sp-hover]',
  focus: '[data-sp-focus]',
  'focus-visible': '[data-sp-focus]',
  'focus-within': ':has([data-sp-focus])',
  active: '[data-sp-active]',
};

const written = (tokens) => tokens.map((t) => t.raw).join('');
const lower = (s) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());
const opens = (t) => t.type === '(' || t.type === '[' || t.type === 'function';
const closes = (t) => t.type === ')' || t.type === ']';

// A run of tokens split at the commas outside brackets, each part without the spaces at its ends.
function splitList(tokens) {
  const parts = [[]];
  let depth = 0;
  for (const t of tokens) {
    if (opens(t)) depth += 1;
    else if (closes(t)) depth -= 1;
    if (t.type === ',' && !depth) parts.push([]);
    else parts[parts.length - 1].push(t);
  }
  return parts.map((p) => {
    let a = 0;
    let b = p.length;
    while (a < b && p[a].type === 'space') a += 1;
    while (b > a && p[b - 1].type === 'space') b -= 1;
    return p.slice(a, b);
  }).filter((p) => p.length);
}

// A selector with each state pseudo-class written as its attribute, or null when it names none. A `:focus-within`
// inside a `:has()` has no such form, since `:has()` takes no `:has()`: that selector has none either.
function stateVariant(sel) {
  const out = [];
  const within = []; // the functions and brackets a token sits in, innermost last
  let changed = false;
  for (let k = 0; k < sel.length; k += 1) {
    const t = sel[k];
    const next = sel[k + 1];
    const single = t.type === ':' && (k === 0 || sel[k - 1].type !== ':');
    if (single && next && next.type === 'ident' && STATES[lower(next.value)]) {
      const state = STATES[lower(next.value)];
      if (state.startsWith(':has') && within.includes('has')) return null;
      out.push(state);
      changed = true;
      k += 1;
    } else {
      if (opens(t)) within.push(t.type === 'function' ? lower(t.value) : t.type);
      else if (closes(t)) within.pop();
      out.push(t.raw);
    }
  }
  return changed ? out.join('') : null;
}

// A selector that names a child of the screen's element, `.sp-scr-01 > X`, as the kit holds X: inside a surface's
// wrapper (spec 5.11). Any other selector as it is. Each surface has a wrapper of its own, so a structural pseudo-class
// on X (`> div:first-child`) matches the first element of every surface, the app's root and each portal alike, and
// `.sp-scr-01:has(> X)` matches nothing; screens rarely write either.
function throughWrapper(sel) {
  let depth = 0;
  for (let k = 0; k < sel.length; k += 1) {
    const t = sel[k];
    if (opens(t)) depth += 1;
    else if (closes(t)) depth -= 1;
    else if (!depth && (t.type === 'space' || (t.type === 'delim' && '>+~'.includes(t.value)))) {
      let j = k;
      while (sel[j] && sel[j].type === 'space') j += 1;
      if (!sel[j] || sel[j].type !== 'delim' || sel[j].value !== '>') return sel;
      return readCss(`${written(sel.slice(0, j + 1))} .sp-surface >${written(sel.slice(j + 1))}`);
    }
  }
  return sel;
}

// A selector of the dialog's backdrop, `X::backdrop`, as the element the kit draws before a modal dialog: the
// `.sp-backdrop` beside X, in the same parent (spec 5.11: a dialog is drawn as showModal() leaves it). Null otherwise.
function backdropVariant(sel) {
  const n = sel.length;
  const last = sel[n - 1];
  if (n < 3 || last.type !== 'ident' || lower(last.value) !== 'backdrop' || sel[n - 2].type !== ':' || sel[n - 3].type !== ':') return null;
  const x = sel.slice(0, n - 3);
  let depth = 0;
  let cut = -1;
  x.forEach((t, k) => {
    if (opens(t)) depth += 1;
    else if (closes(t)) depth -= 1;
    else if (!depth && (t.type === 'space' || (t.type === 'delim' && '>+~'.includes(t.value)))) cut = k;
  });
  const dialog = written(x.slice(cut + 1)).trim();
  return cut >= 0 && dialog ? `${written(x.slice(0, cut + 1))}.sp-backdrop:has(+ ${dialog})` : null;
}

// A screen's CSS as the film needs it (spec 5.11, 7.5). A selector that names a child of the screen's element reaches
// it inside its surface's wrapper. A rule with a state or a backdrop is followed by a rule of its own, with the same
// block, whose selectors write the states as attributes and the backdrops as the kit's backdrop element: a selector the
// browser cannot read drops only that rule, never the app's. The rules are otherwise as the app wrote them; comments
// go. The CSS has passed the film-ready checks, so it is plain rules, none inside another.
function filmCss(css) {
  const tokens = readCss(css);
  let out = '';
  let start = 0; // where the rule being read starts
  let open = -1; // its `{`, once read
  tokens.forEach((t, k) => {
    if (t.type === '{' && open < 0) open = k;
    else if (t.type === '}' && open >= 0) {
      const prelude = tokens.slice(start, open);
      const list = splitList(prelude);
      const moved = list.map(throughWrapper);
      const lead = prelude.findIndex((x) => x.type !== 'space');
      const head = moved.some((s, i) => s !== list[i]) ? `${written(prelude.slice(0, Math.max(0, lead)))}${moved.map(written).join(', ')} ` : written(prelude);
      const block = written(tokens.slice(open, k + 1));
      const extra = moved.flatMap((s) => [stateVariant(s), backdropVariant(s)]).filter(Boolean);
      out += head + block + (extra.length ? `\n${extra.join(', ')} ${block}` : '');
      start = k + 1;
      open = -1;
    }
  });
  return out + written(tokens.slice(start));
}

module.exports = { STATES, filmCss };
