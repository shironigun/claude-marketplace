'use strict';
const path = require('path');
const { readJson } = require('./files');
const { checkError } = require('./errors');
const { check } = require('./schema');
const { CATALOG } = require('./catalog');

// House style (spec 10): rules learned from review rounds, in two files. The repository's profile holds the rules of
// that repository, generic or product-specific; the user's own file, in $SCREENPLAY_HOME, holds the generic rules the
// user chose to keep for every repository. A rule is words a film keeps to, and may set mods a new film starts from.
const NONE = { rules: [] };
// The mods a rule may set: a style the catalog offers. The film's format, brands and patterns are the film's own, and
// the end card's status chip is the release status's (spec 8, rule 10).
const STYLE_MODS = CATALOG.mods.map((m) => m.id).filter((id) => id !== 'chip');

// The two files: the user's, beside the workspaces, and the repository's, in its profile.
function housePaths(rp) {
  return { user: path.join(path.dirname(rp.root), 'house-style.json'), repository: rp.houseStyle };
}

// The house style a new film starts from (spec 10): the plugin's defaults, then the user's rules, then the
// repository's, each later one's mods over the earlier's. Each rule carries the layer it is from. No rule changes the
// film rules, which hold whatever a rule says.
function houseStyle(rp) {
  const p = housePaths(rp);
  const rules = [
    ...houseRules(p.user).map((r) => ({ ...r, layer: 'user' })),
    ...houseRules(p.repository).map((r) => ({ ...r, layer: 'repository' })),
  ];
  return { rules, mods: Object.assign({}, ...rules.map((r) => r.mods || {})) };
}

// A house-style file's rules, none when it is missing. A file that is not a house style is refused by its name, since
// every film command reads it.
function houseRules(file) {
  const value = readJson(file, NONE);
  const errors = check('house-style', value);
  if (errors.length) throw checkError(`${file} is not a house style (${errors[0]}); fix it, or remove it`);
  return value.rules;
}

// What is wrong with the mods a rule sets: a mod that is no style, or an option the catalog lacks or offers in
// release 2.
function houseModProblems(mods) {
  const problems = [];
  for (const [id, value] of Object.entries(mods || {})) {
    const mod = CATALOG.mods.find((m) => m.id === id);
    if (!mod || !STYLE_MODS.includes(id)) {
      problems.push(`/mods/${id}: a house rule sets a style: ${STYLE_MODS.join(', ')}`);
      continue;
    }
    const option = mod.options.find((o) => o.id === value);
    if (!option || option.r2) problems.push(`/mods/${id}: "${value}" is not an option of ${id} in this release; use one of: ${mod.options.filter((o) => !o.r2).map((o) => o.id).join(', ')}`);
  }
  return problems;
}

// The next id in a file: H-01, H-02 ... for the repository's rules, U-01 ... for the user's.
function nextId(rules, letter) {
  const n = Math.max(0, ...rules.map((r) => Number(r.id.slice(2))));
  return `${letter}-${String(n + 1).padStart(2, '0')}`;
}

module.exports = { STYLE_MODS, housePaths, houseStyle, houseModProblems, nextId };
