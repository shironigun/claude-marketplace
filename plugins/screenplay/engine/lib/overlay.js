'use strict';
const { LOGO_TYPES, PROLOG, logoProblems } = require('./logos');
const { cssProblems } = require('./screen');

// The most a brand's overlay may take: it is one Motion module (spec 5.12).
const OVERLAY_BYTES = 200 * 1024;
const bytes = (text) => Buffer.byteLength(text, 'utf8');

// A colour `amount` (0 to 1) of the way to white (amount > 0) or black (amount < 0), as #rrggbb.
function shade(hex, amount) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const to = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  return `#${[r, g, b].map((c) => Math.round(c + (to - c) * a).toString(16).padStart(2, '0')).join('')}`;
}

// The film's own four colours for a brand (spec 7.1, 7.7): its ground, light or deep in the brand's main colour, then
// the main, second and accent colours of its cards and chips. The Motion page offers a film's four colours to swap, so
// no two may be alike: a colour equal to one before it is shaded until it differs.
function filmColours(palette, ground) {
  const p = { background: '#f6f8fb', text: '#1d2733', ...palette };
  const accent = p.info || p.secondary || p.success || p.primary;
  const four = ground === 'deep' ? [p.primary, '#ffffff', p.background, accent] : [p.background, p.primary, p.text, accent];
  const out = [];
  for (const c of four.map((x) => x.toLowerCase())) {
    let next = c;
    for (let step = 1; out.includes(next); step += 1) next = shade(c, (parseInt(c.slice(1, 3), 16) > 127 ? -0.12 : 0.12) * step);
    out.push(next);
  }
  const [g, main, second, acc] = out;
  return { ground: g, main, second, accent: acc };
}

// Svg as an image takes it: an image reads svg as XML, so its root needs the SVG namespace, which markup written in a
// page leaves out, and the xlink one when it uses xlink (spec D23). The root is the first element after what a file
// may open with, never an <svg> inside a comment before it.
function standalone(svg) {
  const head = svg.match(PROLOG)[0];
  return head + svg.slice(head.length).replace(/^<svg\b[^>]*>/i, (root) => {
    let r = root;
    if (/\bxlink:/.test(svg) && !/\sxmlns:xlink\s*=/.test(r)) r = r.replace(/^<svg/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    if (!/\sxmlns\s*=/.test(r)) r = r.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    return r;
  });
}

// A logo of a brand as a data: image (spec 5.3, D23): its file in the repository, as the working tree holds it (where
// `sp save brands` checked it); the svg the code draws; or the user's file in the profile. `readRepo(path)` and
// `readProfile(file)` give a Buffer, or null for no such file.
function logoData(logo, at, readRepo, readProfile) {
  let data = null;
  if (typeof logo.svg === 'string') data = Buffer.from(logo.svg, 'utf8');
  else if (logo.path) data = readRepo(logo.path);
  else if (logo.file) data = readProfile(logo.file);
  if (!data) return { problems: [`${at}: ${logo.path || logo.file} is not there to read`] };
  const text = logo.format === 'svg' ? data.toString('utf8') : null;
  const problems = logoProblems(data.length, logo.format, at, text);
  const image = text === null ? data : Buffer.from(standalone(text), 'utf8');
  return { problems, uri: `data:${LOGO_TYPES[logo.format]};base64,${image.toString('base64')}` };
}

// What the film's CSS refuses in a brand's theme variables, set on its window: they are checked as a screen's CSS is.
const varsProblems = (vars) => cssProblems(`.sp-window { ${Object.entries(vars).map(([k, v]) => `${k}: ${v};`).join(' ')} }`, 'sp-window')
  .map((p) => p.replace(/^\/css: /, ''));

// The same for every brand of a theme, at `sp save theme`, so a value no film can take is refused before a build.
const themeCssProblems = (theme) => Object.entries(theme.brands).flatMap(([id, t]) => varsProblems(t.vars).map((p) => `/brands/${id}/vars: ${p}`));

// A brand's overlay (spec 5.12, P6): what one brand's film shows over the shared source. Its theme's variables, set on
// the film's window; each logo its places and cards show, as a data: image; the places it shows a logo in; the film's
// own four colours for the ground the mods chose; and its UI font for the film's type and its title weight. The theme's
// values go into the film's CSS, so they are checked as a screen's CSS is. Returns { overlay, problems }.
function brandOverlay({ brand, theme, mods, readRepo, readProfile }) {
  const at = `brand ${brand.id}`;
  const problems = [];
  const themed = theme && theme.brands[brand.id];
  if (!themed) problems.push(`${at}: the theme has no variables for ${brand.name}; rebuild the theme (sp screens --brief theme)`);
  const vars = themed ? themed.vars : {};
  problems.push(...varsProblems(vars).map((p) => `${at}: theme ${p}`));
  // The cards show the full logo, or on a deep ground the dark one: a full logo in the brand's main colour would vanish
  // on a ground of that colour. Each place shows its own.
  const card = mods.ground === 'deep' ? 'dark' : 'full';
  if (!brand.logos[card]) {
    const deep = card === 'dark' ? [' on a deep ground', ', or choose the light ground'] : ['', ''];
    problems.push(`${at}: ${brand.name} has no ${card} logo for the film's cards${deep[0]}; supply one with sp logo ${brand.id} ${card} <file>${deep[1]}`);
  }
  for (const [place, p] of Object.entries(brand.chrome || {})) {
    if (!brand.logos[p.logo]) problems.push(`${at}: ${brand.name} shows the ${p.logo} logo in its ${place}, which it has not; supply its file with sp logo ${brand.id} ${p.logo} <file>`);
  }
  const wanted = [...new Set([card, ...Object.values(brand.chrome || {}).map((p) => p.logo)])].filter((v) => brand.logos[v]);
  const logos = {};
  for (const variant of wanted) {
    const got = logoData(brand.logos[variant], `${at} logo ${variant}`, readRepo, readProfile);
    problems.push(...got.problems);
    if (got.uri) logos[variant] = got.uri;
  }
  const overlay = {
    brand: brand.id,
    name: brand.name,
    vars,
    logos,
    card,
    places: brand.chrome || {},
    colours: filmColours(brand.palette, mods.ground),
    font: { family: brand.type.family, weights: brand.type.weights.slice(0, 4), title: brand.type.titleWeight || 600 },
  };
  const size = bytes(JSON.stringify(overlay));
  if (size > OVERLAY_BYTES) problems.push(`${at}: the overlay takes ${Math.ceil(size / 1024)} KiB, more than the ${OVERLAY_BYTES / 1024} KiB of a module; use smaller logos`);
  return { overlay, problems };
}

module.exports = { OVERLAY_BYTES, shade, filmColours, themeCssProblems, brandOverlay };
