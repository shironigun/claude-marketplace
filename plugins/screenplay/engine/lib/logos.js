'use strict';

// The logo variants a brand profile names, the formats the engine takes with their media types, and the most a logo may
// take: a film carries it inline in each brand's overlay, one Motion module of 200 KiB (spec 5.3, 5.12).
const LOGO_VARIANTS = ['full', 'mark', 'collapsed', 'favicon', 'dark'];
const LOGO_TYPES = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', ico: 'image/x-icon' };
const LOGO_BYTES = 64 * 1024;

// The only named characters XML knows unless a doctype names more. An image reads svg as XML, so `&nbsp;` breaks it.
const XML_NAMES = ['amp', 'lt', 'gt', 'quot', 'apos'];
// What an svg file may open with before its <svg>: the XML declaration, comments and a doctype.
const PROLOG = /^(?:\s|<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^[>]*(?:\[[\s\S]*?\])?\s*>)*/i;

// What keeps a logo out of a film: more bytes than it may take, or svg that is not one <svg> element (after what a
// file may open with) or that names a character XML does not know. A film shows a logo as an image, which runs and
// loads nothing, so the markup is not checked further.
function logoProblems(bytes, format, at, text = null) {
  const problems = [];
  if (bytes > LOGO_BYTES) problems.push(`${at}: ${Math.ceil(bytes / 1024)} KiB; a logo takes at most ${LOGO_BYTES / 1024} KiB`);
  if (format === 'svg' && text !== null) {
    const body = text.replace(PROLOG, '');
    if (!/^<svg[\s>]/i.test(body) || !/<\/svg>\s*$/i.test(body)) problems.push(`${at}: an svg logo is one <svg> element`);
    // Every & starts a reference XML reads: a number, or a name it knows, each closed by ;.
    const declared = [...text.matchAll(/<!ENTITY\s+([A-Za-z][\w.-]*)/g)].map((m) => m[1]);
    for (const [ref, name] of body.matchAll(/&(?:#\d+;|#x[0-9A-Fa-f]+;|([A-Za-z][\w.-]*);)?/g)) {
      if (ref === '&') {
        problems.push(`${at}: a bare & is not XML, and an image reads svg as XML; write it as &amp;`);
        break;
      }
      if (name && !XML_NAMES.includes(name) && !declared.includes(name)) {
        problems.push(`${at}: &${name}; is a character XML does not know, and an image reads svg as XML; write the character itself`);
        break;
      }
    }
  }
  return problems;
}

// The logos drawn in code that a brand profile holds as markup, each checked as a logo.
function profileLogoProblems(profile) {
  return profile.brands.flatMap((b, i) => Object.entries(b.logos)
    .filter(([, logo]) => typeof logo.svg === 'string')
    .flatMap(([k, logo]) => logoProblems(Buffer.byteLength(logo.svg), 'svg', `/brands/${i}/logos/${k}`, logo.svg)));
}

// A new brand profile keeps the logos the user supplied (spec D23), unless it gives that logo itself.
function keepSuppliedLogos(profile, saved) {
  if (!profile || !Array.isArray(profile.brands)) return profile;
  for (const old of (saved && saved.brands) || []) {
    const now = profile.brands.find((b) => b && b.id === old.id);
    if (!now || !now.logos || typeof now.logos !== 'object') continue;
    for (const [k, logo] of Object.entries(old.logos)) if (logo.file && !Object.hasOwn(now.logos, k)) now.logos[k] = logo;
  }
  return profile;
}

module.exports = { LOGO_VARIANTS, LOGO_TYPES, LOGO_BYTES, PROLOG, logoProblems, profileLogoProblems, keepSuppliedLogos };
