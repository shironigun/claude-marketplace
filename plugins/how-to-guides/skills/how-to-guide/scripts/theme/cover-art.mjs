// Drawn artwork for the brochure covers (orbit, hexagon, facets, profile): one inline SVG per cover,
// on the same 850 x 1100 grid as the other patterns (100 units = 1 inch). The guide's `coverImage`
// fills the photo shape; without one, the shape gets a soft brand gradient instead.
// Text, logo and footer stay in HTML on top, placed by covers.css.

// The brand's primary colour leads every gradient, fading to a lighter (SOFT) or deeper (DEEP) shade.
// build.mjs passes the palette in; these are only the fallback. DUO is the photo's duotone matrix.
let PRIMARY = '#2b59c3', DEEP = '#1e3f8a', SOFT = '#7b97da', PALE = '#a9bce8', TINT = '#e9eef9', RING = '#c9d5f1',
  WASH = '#eef2fa', MID = '#5577cc', SHADOW = '#13285a', GROUND = '#f4f6f8', DUO = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0';

const f = (n) => +n.toFixed(1);
const pt = ([x, y]) => `${f(x)},${f(y)}`;

// A polygon with rounded corners: each corner becomes a quadratic curve r units long on either side.
function rounded(points, r) {
  const n = points.length;
  let d = '';
  points.forEach((p, i) => {
    const toward = (q) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), k = Math.min(r, len / 2) / len;
      return [p[0] + dx * k, p[1] + dy * k];
    };
    d += `${i ? 'L' : 'M'}${pt(toward(points[(i + n - 1) % n]))}Q${pt(p)} ${pt(toward(points[(i + 1) % n]))}`;
  });
  return d + 'Z';
}
const diamond = (cx, cy, h) => [[cx, cy - h], [cx + h, cy], [cx, cy + h], [cx - h, cy]];
const hexagon = (cx, cy, R) => [-90, -30, 30, 90, 150, 210].map((a) => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)]);
const arc = (cx, cy, r, a0, a1) => {
  const at = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  return `M${pt(at(a0))}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(at(a1))}`;
};

// The photo: the guide's cover image, cropped to fill the box, or a gradient when there is none.
const photo = (id, img, x, y, w, h, attrs = '') => img
  ? `<image href="${img}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" ${attrs}/>`
  : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-ph)" ${attrs}/>`;
const photoFallback = (id) => `<linearGradient id="${id}-ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${TINT}"/><stop offset="1" stop-color="${PALE}"/></linearGradient>`;
const grad = (id, a, b, x2 = 1, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const stripes = (id, color) => `<pattern id="${id}" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4.5" height="13" fill="${color}"/></pattern>`;

const ART = {
  // A ring-framed photo circle breaking out of a large blue arc, with small solid, outline and striped circles.
  orbit: (img) => `<defs>${photoFallback('o')}${grad('o-a', PRIMARY, SOFT)}${grad('o-b', RING, TINT)}${grad('o-c', PRIMARY, SOFT, 0, 1)}${stripes('o-s', PRIMARY)}
      <clipPath id="o-clip"><circle cx="560" cy="330" r="250"/></clipPath></defs>
    <rect width="850" height="1100" fill="${GROUND}"/>
    <circle cx="120" cy="40" r="520" fill="${WASH}"/>
    <circle cx="120" cy="40" r="440" fill="url(#o-b)"/>
    <circle cx="120" cy="40" r="350" fill="url(#o-a)"/>
    <g clip-path="url(#o-clip)"><rect x="310" y="80" width="500" height="500" fill="${GROUND}"/>${photo('o', img, 160, 130, 800, 400)}</g>
    <circle cx="560" cy="330" r="250" fill="none" stroke="#fff" stroke-width="10"/>
    <circle cx="560" cy="330" r="206" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="4"/>
    <path d="${arc(560, 330, 284, -70, 150)}" fill="none" stroke="${SOFT}" stroke-width="6" stroke-linecap="round"/>
    <path d="${arc(560, 330, 318, 25, 100)}" fill="none" stroke="${PRIMARY}" stroke-width="9" stroke-linecap="round"/>
    <circle cx="96" cy="480" r="38" fill="url(#o-c)"/>
    <circle cx="210" cy="560" r="38" fill="url(#o-s)"/>
    <circle cx="92" cy="590" r="20" fill="none" stroke="${SOFT}" stroke-width="4"/>
    <circle cx="800" cy="650" r="14" fill="none" stroke="${SOFT}" stroke-width="4"/>
    <circle cx="850" cy="780" r="56" fill="url(#o-c)"/>
    <circle cx="790" cy="1040" r="92" fill="url(#o-s)"/>`,

  // Brand-blue top with a chevron edge, a white hexagon holding the title and the photo, a two-column footer.
  hexagon: (img) => {
    const hex = rounded(hexagon(425, 560, 300), 26);
    return `<defs>${photoFallback('h')}${grad('h-a', PRIMARY, MID, 0, 1)}
      <clipPath id="h-clip"><path d="${hex}"/></clipPath>
      <filter id="h-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="${SHADOW}" flood-opacity=".2"/></filter></defs>
    <rect width="850" height="1100" fill="#fff"/>
    <path d="M0 0H850V470L425 715L0 470Z" fill="url(#h-a)"/>
    <path d="${rounded(hexagon(425, 560, 390), 40)}" fill="#fff" fill-opacity=".07"/>
    <path d="${rounded(hexagon(735, 150, 95), 14)}" fill="#fff" fill-opacity=".08"/>
    <path d="${rounded(hexagon(610, 190, 34), 6)}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>
    <path d="${rounded(hexagon(425, 560, 324), 30)}" fill="none" stroke="${PRIMARY}" stroke-opacity=".5" stroke-width="1.6"/>
    <path d="${hex}" fill="#fff" filter="url(#h-sh)"/>
    <g clip-path="url(#h-clip)">${photo('h', img, 125, 540, 600, 330)}
      <rect x="125" y="537" width="600" height="3" fill="${PRIMARY}"/></g>
    <path d="${rounded(hexagon(118, 840, 34), 6)}" fill="none" stroke="${PRIMARY}" stroke-width="2"/>
    <path d="M405 940L425 925L445 940M405 955L425 940L445 955" fill="none" stroke="${PRIMARY}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  },

  // Diamonds as a photo mosaic: four photo tiles in a big diamond, a blue diamond holding the title.
  facets: (img) => {
    const big = rounded(diamond(600, 330, 330), 16);
    return `<defs>${photoFallback('f')}${grad('f-a', PRIMARY, DEEP, 0, 1)}${grad('f-b', PRIMARY, SOFT)}${grad('f-t', PRIMARY, SOFT)}
      <clipPath id="f-clip"><path d="${big}"/></clipPath></defs>
    <rect width="850" height="1100" fill="#fff"/>
    <path d="${rounded(diamond(0, 0, 210), 10)}" fill="${WASH}"/>
    <path d="${rounded(diamond(850, 1100, 150), 10)}" fill="${WASH}"/>
    <g clip-path="url(#f-clip)"><rect x="270" y="0" width="660" height="660" fill="${GROUND}"/>${photo('f', img, 105, 82, 990, 495)}
      <path d="${rounded(diamond(765, 330, 165), 4)}" fill="url(#f-t)" fill-opacity=".62"/>
      <path d="M270 0L930 660M930 0L270 660" stroke="#fff" stroke-width="12"/></g>
    <path d="${rounded(diamond(600, 330, 352), 20)}" fill="none" stroke="${PALE}" stroke-opacity=".7" stroke-width="2"/>
    <path d="M330 500L930 1100H-270Z" fill="url(#f-a)"/>
    <path d="${rounded(diamond(850, 650, 56), 8)}" fill="url(#f-b)"/>
    <path d="${rounded(diamond(0, 480, 46), 7)}" fill="url(#f-b)"/>
    <path d="${rounded(diamond(150, 330, 22), 4)}" fill="${SOFT}" fill-opacity=".55"/>`;
  },

  // A full-width duotone photo across the top, cut by angled brand bands, with a text panel over its corner.
  profile: (img) => `<defs>${photoFallback('p')}
      <filter id="p-duo" color-interpolation-filters="sRGB"><feColorMatrix type="matrix"
        values="${DUO}"/></filter>
      <linearGradient id="p-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PRIMARY}" stop-opacity=".95"/><stop offset=".24" stop-color="${PRIMARY}" stop-opacity=".9"/><stop offset=".52" stop-color="${PRIMARY}" stop-opacity="0"/></linearGradient></defs>
    <rect width="850" height="1100" fill="#fff"/>
    ${photo('p', img, 0, 0, 850, 500, 'filter="url(#p-duo)"')}
    <rect width="850" height="500" fill="url(#p-top)"/>
    <rect x="520" y="372" width="330" height="128" fill="${PRIMARY}" fill-opacity=".95"/>
    <rect x="550" y="398" width="3" height="76" fill="#fff"/>
    <path d="M0 500H470L500 532H0Z" fill="${SOFT}"/>
    <path d="M512 500H850V532H542Z" fill="${PRIMARY}"/>
    <path d="M818 800L850 768V1100H818Z" fill="${PRIMARY}"/>`,
};

export const coverArt = (style, img, palette = {}) => {
  ({ GROUND = GROUND, PRIMARY = PRIMARY, DEEP = DEEP, SOFT = SOFT, PALE = PALE, TINT = TINT, RING = RING, WASH = WASH, MID = MID, SHADOW = SHADOW, DUO = DUO } = palette);
  return ART[style]
  ? `<svg class="cover-art" viewBox="0 0 850 1100" preserveAspectRatio="none" aria-hidden="true">${ART[style](img)}</svg>`
  : '';
};
