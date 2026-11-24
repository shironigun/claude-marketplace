'use strict';

// Strips the BOM and turns CRLF and CR into LF, so results never depend on line-ending settings.
function readText(bufOrString) {
  return String(bufOrString).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

// Lowercase letters, digits and single hyphens, at most 64 characters. Accents are dropped, not replaced.
function slugify(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

module.exports = { readText, slugify };
