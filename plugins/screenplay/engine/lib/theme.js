'use strict';
const { decodeCssEscapes } = require('./css');

// A theme variable: a CSS custom property (spec 5.11).
const VAR_RE = /^--[A-Za-z0-9-]+$/;

// What is wrong with a theme beyond its schema (spec 5.11, D25): a brand of the profile it leaves out, or one the
// profile lacks; a name that is not a custom property; a value that loads an image, through url() or image-set()
// however its escapes spell them, since a film loads nothing from outside; and a variable one brand defines and
// another does not, since one screen serves every brand.
function themeProblems(theme, brands) {
  const problems = [];
  const ids = Object.keys(theme.brands);
  for (const id of brands) if (!ids.includes(id)) problems.push(`/brands: no theme for the brand "${id}"`);
  const names = [...new Set(ids.flatMap((id) => Object.keys(theme.brands[id].vars)))];
  for (const id of ids) {
    const at = `/brands/${id}`;
    if (!brands.includes(id)) problems.push(`${at}: the brand profile has no brand "${id}"`);
    const { vars } = theme.brands[id];
    for (const [name, value] of Object.entries(vars)) {
      if (!VAR_RE.test(name)) problems.push(`${at}/vars/${name}: a theme variable is a custom property, as --name`);
      else if (/url\(|image-set\(/i.test(decodeCssEscapes(value))) {
        problems.push(`${at}/vars/${name}: a theme value loads nothing, so it has no url() or image-set()`);
      }
    }
    const missing = names.filter((n) => !Object.hasOwn(vars, n));
    if (missing.length) problems.push(`${at}/vars: missing ${missing.join(', ')}, which another brand defines`);
  }
  return problems;
}

module.exports = { themeProblems };
