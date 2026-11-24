// Scans a product's code (read only) for brand assets and prints a DRAFT brand profile as JSON.
// The draft is for a person to confirm: repos hold old logos, partner logos and several brands.
// Usage: node detect-brand.mjs <repo-folder>
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const SKIP = /(^|\/)(node_modules|\.git|dist|build|out|bin|obj|coverage|vendor|\.next|[^/]*\.bak|backups?)(\/|$)/i;

function listFiles() {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.toString('utf8').split('\0').filter(Boolean).filter(f => !SKIP.test(f));
  } catch {
    const files = [];
    const walk = rel => {
      for (const name of readdirSync(path.join(root, rel))) {
        const r = rel ? `${rel}/${name}` : name;
        if (SKIP.test(r)) continue;
        if (statSync(path.join(root, r)).isDirectory()) walk(r); else files.push(r);
      }
    };
    walk('');
    return files;
  }
}

const read = rel => { try { const p = path.join(root, rel); return statSync(p).size < 512 * 1024 ? readFileSync(p, 'utf8') : ''; } catch { return ''; } };

function imageSize(rel) {
  try {
    if (rel.toLowerCase().endsWith('.png')) {
      const b = readFileSync(path.join(root, rel)).subarray(0, 24);
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    }
    if (rel.toLowerCase().endsWith('.svg')) {
      const t = read(rel);
      const vb = t.match(/viewBox\s*=\s*["'][\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
      if (vb) return { w: +vb[1], h: +vb[2] };
      const w = t.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i), h = t.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
      if (w && h) return { w: +w[1], h: +h[1] };
    }
  } catch { /* unreadable image: size stays unknown */ }
  return null;
}

// The brand a file belongs to, from its name: "Logo_PartnerEdition_Collapsed.svg" -> "partneredition", "product-app-logo.png" -> "productapp", "logo.png" -> "".
const brandOf = rel => path.basename(rel).replace(/\.[^.]+$/, '').toLowerCase()
  .replace(/@\dx|\d+x\d+/g, '')
  .split(/[-_ .]+/)
  .map(w => w.replace(/^logo(?=[a-z])|(?<=[a-z])logo$/, ''))
  .filter(w => w && !/^\d+$/.test(w) && !/^(logo|logos|icon|icons|mark|brand|wordmark|color|colour|white|light|dark|inverse|negative|mono|collapsed|full|small|large|old|new|splash|imageset|favicon)$/.test(w))
  .join('');

// How likely a file is to be the product's main logo. Higher is better; below 0 drops it.
// c = { path, ext, w, h, onDark, brand }: path is relative to the repo, w/h are null when unknown.
function scoreLogo(c) {
  const name = path.basename(c.path).toLowerCase(), p = c.path.toLowerCase();
  // App-store, browser and OS icons are never a document logo.
  if (/favicon|android-icon|apple-icon|apple-touch|ms-icon|playstore|mstile|launcher|appicon|splash/.test(p)) return -1;
  if (c.w && c.h && Math.max(c.w, c.h) < 64) return -1;
  let s = 0;
  if (c.ext === 'svg') s += 3;                                   // stays sharp in print
  if (/logo|wordmark/.test(name)) s += 3;
  if (/(^|\/)(public|assets|static|images|img|brand)(\/|$)/.test(p)) s += 2;
  if (/old|legacy|deprecated|unused|archive/.test(p)) s -= 5;
  if (/partner|vendor|client|customer|sponsor|integration|third[-_]?party/.test(p)) s -= 4;
  if (/(^|\/)(docs?|documentation|mobile|ios|android|test|tests|samples?|examples?)(\/|$)/.test(p)) s -= 2;
  return s;
}

const files = listFiles();

// Logos and marks
const logos = files
  .filter(f => /\.(png|svg|webp)$/i.test(f) && /logo|brand|wordmark|mark|icon/i.test(path.basename(f)))
  .map(f => {
    const size = imageSize(f);
    const c = { path: f, ext: path.extname(f).slice(1).toLowerCase(), w: size?.w ?? null, h: size?.h ?? null,
      onDark: /white|inverse|negative|on[-_]?dark|light/i.test(path.basename(f)), brand: brandOf(f) };
    return { ...c, shape: !size ? 'unknown' : size.w / size.h > 1.6 ? 'wide' : size.w / size.h > 0.8 ? 'square' : 'tall', score: scoreLogo(c) };
  })
  .filter(c => c.score >= 0)
  .sort((a, b) => b.score - a.score);

// Colours, from theme-like files. MUI colour names (colors.indigo[500]) resolve through the project's own @mui/material.
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const themeFiles = files.filter(f => /\.(ts|tsx|js|jsx|mjs|json|css|scss|less)$/i.test(f)
  && /theme|palette|colou?rs?|tokens|variables|brand|tailwind\.config/i.test(f)
  && !/(test|spec|stories|mock)/i.test(f));
let mui;
const muiColors = from => {
  if (mui === undefined) { try { mui = createRequire(path.join(root, from))('@mui/material/colors'); } catch { mui = null; } }
  return mui;
};
function resolve(raw, from) {
  const v = raw.trim().replace(/^['"`]|['"`],?$|,$/g, '').trim();
  if (HEX.test(v)) return { value: v.length === 4 ? '#' + [...v.slice(1)].map(x => x + x).join('') : v.toLowerCase() };
  const m = v.match(/^(?:colors\.)?([a-zA-Z]+)(?:\[['"]?(\w+)['"]?\]|\.(\w+))$/);
  const hex = m && muiColors(from)?.[m[1]]?.[m[2] || m[3]];
  return hex ? { value: hex.toLowerCase(), expr: v } : { value: null, expr: v };
}
const colors = { primary: [], deep: [], accent: [], ink: [] };
const add = (role, raw, from) => {
  const r = resolve(raw, from);
  if (r.value && /^#(fff|ffffff|000|000000)$/i.test(r.value)) return;
  if (!colors[role].some(x => (x.value ?? x.expr) === (r.value ?? r.expr))) colors[role].push({ ...r, from });
};
const block = (t, key) => t.match(new RegExp(`\\b${key}\\s*:\\s*\\{([^}]*)\\}`))?.[1];
const field = (b, key) => b?.match(new RegExp(`\\b${key}\\s*:\\s*([^,\\n}]+)`))?.[1];
for (const f of themeFiles) {
  const t = read(f);
  const p = block(t, 'primary');
  if (field(p, 'main')) add('primary', field(p, 'main'), f);
  if (field(p, 'dark')) add('deep', field(p, 'dark'), f);
  const s = block(t, 'secondary');
  if (field(s, 'main')) add('accent', field(s, 'main'), f);
  const tx = block(t, 'text');
  if (field(tx, 'primary')) add('ink', field(tx, 'primary'), f);
  for (const m of t.matchAll(/(?:--|\$)(?:color-|brand-)?(primary|accent|secondary)(?:-color)?\s*:\s*(#[0-9a-f]{3,6})\b/gi)) add(m[1].toLowerCase() === 'primary' ? 'primary' : 'accent', m[2], f);
  for (const m of t.matchAll(/\b(primary|accent)\s*:\s*['"](#[0-9a-f]{3,6})['"]/gi)) add(m[1].toLowerCase(), m[2], f);
}

// Fonts: MUI typography, @font-face, Google Fonts links, and font files in the repo.
const fonts = [];
const addFont = (family, from, extra = {}) => {
  family = family.trim().replace(/^['"]|['"]$/g, '');
  if (!family || /^(inherit|sans-serif|serif|monospace|system-ui|-apple-system|roboto|arial|helvetica|material icons.*)$/i.test(family)) return;
  const known = fonts.find(x => x.family.toLowerCase() === family.toLowerCase());
  if (known) Object.assign(known, Object.fromEntries(Object.entries(extra).filter(([k]) => !known[k])));
  else fonts.push({ family, from, ...extra });
};
const fontFiles = files.filter(f => /\.(woff2|woff|ttf|otf)$/i.test(f));
for (const f of files.filter(f => /\.(ts|tsx|js|jsx|css|scss|less|html)$/i.test(f) && !/(test|spec|stories)/i.test(f))) {
  const t = read(f);
  if (!/fontFamily|font-family|fonts\.googleapis/.test(t)) continue;
  for (const m of t.matchAll(/fontFamily\s*:\s*['"`]([^'"`,]+)/g)) if (/theme|typography/i.test(f)) addFont(m[1], f);
  for (const m of t.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*([^;]+);[^}]*url\(\s*['"]?([^'")]+)/g)) addFont(m[1], f, { file: m[2] });
  for (const m of t.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&:]+)/g)) addFont(decodeURIComponent(m[1]).replace(/\+/g, ' '), f, { url: `https://fonts.google.com/specimen/${m[1]}` });
}
// A font's url() is a web path; point it at the file in the repo instead.
for (const font of fonts) {
  const byUrl = font.file && fontFiles.find(f => path.basename(f) === path.basename(font.file.split(/[?#]/)[0]));
  const byName = fontFiles.find(f => path.basename(f).toLowerCase().startsWith(font.family.toLowerCase().replace(/\s+/g, '')));
  font.file = byUrl || byName || undefined;
}

// Product name: page titles and web manifests, skipping framework defaults.
const product = [];
for (const f of files.filter(f => /(^|\/)(index\.html|manifest\.json|site\.webmanifest)$/i.test(f))) {
  const t = read(f);
  const names = f.endsWith('.html') ? [t.match(/<title>([^<]+)<\/title>/i)?.[1]] : [t.match(/"name"\s*:\s*"([^"]+)"/)?.[1], t.match(/"short_name"\s*:\s*"([^"]+)"/)?.[1]];
  for (const n of names) if (n && !/^(app|react app|vite app|vite \+ react)$/i.test(n.trim()) && !product.some(p => p.value === n.trim())) product.push({ value: n.trim(), from: f });
}
// The app that holds the theme is the product readers use, so its title comes first.
const near = colors.primary[0]?.from ?? '';
const shared = f => { let i = 0; while (i < f.length && f[i] === near[i]) i++; return f.lastIndexOf('/', i); };
product.sort((a, b) => shared(b.from) - shared(a.from));

const pick = list => list.find(x => x.value)?.value;
// With several brands, the draft takes the logos named after the product, plus the unnamed ones (logo.png).
const main = (product[0]?.value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const own = logos.filter(c => c.brand === '' || (main && (main.startsWith(c.brand) || c.brand.startsWith(main))));
const top = (pred = () => true) => (own.length ? own : logos).find(c => pred(c))?.path;
const brands = [...new Set(logos.map(c => c.brand))];
console.log(JSON.stringify({
  root,
  note: 'A draft. Confirm every field with a person before writing howto-brand.json, then copy the chosen files into the profile folder.',
  brands: brands.length > 1 ? Object.fromEntries(brands.map(b => [b || '(unnamed)', logos.filter(c => c.brand === b).map(c => c.path)])) : undefined,
  draft: {
    product: product[0]?.value,
    logo: top(c => !c.onDark && c.shape !== 'square'),
    logoOnDark: top(c => c.onDark && c.shape !== 'square'),
    mark: top(c => c.shape === 'square'),
    colors: { primary: pick(colors.primary), deep: pick(colors.deep), accent: pick(colors.accent), ink: pick(colors.ink) },
    font: fonts[0] && { family: fonts[0].family, file: fonts[0].file, url: fonts[0].url },
  },
  candidates: { product, logos, colors, fonts },
}, null, 2));
