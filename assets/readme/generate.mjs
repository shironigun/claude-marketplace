// Draws every README image from one table, so the art stays consistent.
//   node assets/readme/generate.mjs
// Writes hero.svg, map.svg, how-it-works.svg, and cards/<plugin>.svg + banners/<plugin>.svg for every
// plugin in PLUGINS. Add a plugin: add a row here, run it, and link the card from the root README.
// Icons are Material Icons (filled), Apache-2.0 / MIT via @mui/icons-material, stored in icons.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ICONS = JSON.parse(readFileSync(join(HERE, 'icons.json'), 'utf8'));

// Categories are neutral labels; colour belongs to the plugin, and no two plugins share one.
const NEUTRAL = '#c7d0e6';
const CATEGORY = {
  testing: { label: 'Testing' },
  'bug-tracking': { label: 'Bug tracking' },
  'release-management': { label: 'Release management' },
  documentation: { label: 'Documentation' },
};

export const PLUGINS = [
  {
    name: 'qa-engineering', color: '#2dd4bf', short: 'The full QA loop', category: 'testing', icon: 'Hub', flagship: true, neutral: true,
    tagline: 'The whole QA loop in one orchestrator',
    detail: 'Story to cases to automation to a filed bug, with a human gate at every tracker write.',
    steps: ['Analyze', 'Author cases', 'Publish', 'Automate', 'Run', 'File bug'],
    stats: ['16 skills', '4 agents', '9 commands', '2 MCP servers'],
  },
  {
    name: 'qa-toolkit', color: '#38bdf8', short: 'Light QA building blocks', category: 'testing', icon: 'Handyman', neutral: true, parallel: true,
    tagline: 'Light QA building blocks',
    detail: 'Pick one job: API cases, UI cases, a failure turned into a bug, or cases pushed to a tracker.',
    steps: ['API cases', 'UI cases', 'Failure to bug', 'To tracker'],
    stats: ['4 skills', 'No setup'],
  },
  {
    name: 'api-testing', color: '#a3e635', short: 'API cases and specs', category: 'testing', icon: 'Api',
    tagline: 'API cases and Playwright specs, both ways',
    detail: 'Contract, endpoint and workflow cases, runnable Playwright + TypeScript + zod specs, and bug drafts.',
    steps: ['Contract', 'Endpoints', 'Workflows', 'Specs', 'Bug draft'],
    stats: ['2 skills', 'No setup'],
  },
  {
    name: 'ui-testing', color: '#f472b6', short: 'UI cases and specs', category: 'testing', icon: 'Mouse',
    tagline: 'UI test cases and Playwright UI specs',
    detail: 'Click-by-click UI cases from a story, created as Test Cases, and runnable UI specs.',
    steps: ['Story', 'UI cases', 'Test Cases', 'UI specs'],
    stats: ['2 skills', 'az login'],
  },
  {
    name: 'crm-bug-suite', color: '#f87171', short: 'Bugs, defects, comments', category: 'bug-tracking', icon: 'BugReport', parallel: true,
    tagline: 'Bugs, defects and comments in house style',
    detail: 'Files story and regression bugs, production defects and ticket comments in Azure DevOps.',
    steps: ['Bug', 'Defect', 'Comment'],
    stats: ['3 skills', 'az login'],
  },
  {
    name: 'release-notes-suite', color: '#fbbf24', short: 'Shipped work to notes', category: 'release-management', icon: 'NewReleases',
    tagline: 'From what shipped to what customers read',
    detail: 'Harvest every shipped ticket and untracked PR, then write short, benefit-led release notes.',
    steps: ['Harvest', 'Inventory', 'Suppress', 'Release note'],
    stats: ['2 skills', 'Brand variants'],
  },
  {
    name: 'feature-explainer', color: '#a78bfa', short: 'Visual explainer pages', category: 'documentation', icon: 'AutoStories', neutral: true,
    tagline: 'A visual explainer page for any reader',
    detail: 'Researched read-only, drawn as journeys, grids and annotated screens for product, QA, design, dev or sales.',
    steps: ['Research', 'Plan', 'Draw', 'Check', 'Publish'],
    stats: ['1 skill', '6 audiences'],
  },
  {
    name: 'how-to-guides', color: '#fb923c', short: 'Customer guides as PDFs', category: 'documentation', icon: 'MenuBook', neutral: true,
    tagline: 'Customer how-to guides as branded PDFs',
    detail: 'One feature, learned from the source and written to a standard, built in your own brand.',
    steps: ['Learn', 'Write', 'Screenshots', 'Build PDF', 'Review'],
    stats: ['1 skill', '16 covers'],
  },
];

const FONT = `font-family="'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif"`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const icon = (name, x, y, size, fill) => `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="${fill}">${ICONS[name].map((d) => `<path d="${d}"/>`).join('')}</g>`;
// Rough text width for a sans-serif face, used only to size pills and wrap lines.
const width = (text, size, weight = 400) => text.length * size * (weight >= 600 ? 0.58 : 0.53);
const wrap = (text, size, max) => {
  const lines = [''];
  for (const w of text.split(' ')) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (width(next, size) > max && lines.at(-1)) lines.push(w); else lines[lines.length - 1] = next;
  }
  return lines;
};
const defs = (id, accent) => `<defs>
  <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#151d3b"/></linearGradient>
  <radialGradient id="${id}-glow" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${accent}" stop-opacity=".28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
  <pattern id="${id}-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#ffffff" fill-opacity=".06"/></pattern>
</defs>`;
const frame = (id, w, h, accent, r = 24) => `${defs(id, accent)}
<rect width="${w}" height="${h}" rx="${r}" fill="url(#${id}-bg)"/>
<rect width="${w}" height="${h}" rx="${r}" fill="url(#${id}-dots)"/>
<rect width="${w}" height="${h}" rx="${r}" fill="url(#${id}-glow)"/>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="#ffffff" stroke-opacity=".08"/>`;
const pill = (x, y, text, color, { size = 13, fill = true } = {}) => {
  const w = width(text, size, 600) + 24;
  return { w, svg: `<rect x="${x}" y="${y}" width="${w}" height="${size + 14}" rx="${(size + 14) / 2}" fill="${color}" fill-opacity="${fill ? 0.16 : 0}" stroke="${color}" stroke-opacity=".55"/>
<text x="${x + w / 2}" y="${y + size + 3}" text-anchor="middle" font-size="${size}" font-weight="600" fill="${color}">${esc(text)}</text>` };
};
// A row of numbered steps joined by arrows, fitted to the width it is given.
const flow = (x, y, w, steps, accent, size = 14, parallel = false) => {
  const gap = 26, chip = (w - gap * (steps.length - 1)) / steps.length;
  return steps.map((s, i) => {
    const cx = x + i * (chip + gap);
    const arrow = !parallel && i < steps.length - 1 ? `<path d="M${cx + chip + 6} ${y + 22}h${gap - 12}m-6 -5 6 5-6 5" fill="none" stroke="${accent}" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `<rect x="${cx}" y="${y}" width="${chip}" height="44" rx="12" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".12"/>
<circle cx="${cx + 20}" cy="${y + 22}" r="${parallel ? 6 : 11}" fill="${accent}"/>${parallel ? '' : `<text x="${cx + 20}" y="${y + 27}" text-anchor="middle" font-size="12" font-weight="700" fill="#0b1020">${i + 1}</text>`}
<text x="${cx + 38}" y="${y + 27}" font-size="${size}" font-weight="600" fill="#e6ebf7">${esc(s)}</text>${arrow}`;
  }).join('\n');
};
const svg = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" ${FONT}>
<title>${esc(title)}</title>
${body}
</svg>
`;

// ---- Per-plugin card: the catalog tile in the root README ----
function card(p) {
  const c = { ...CATEGORY[p.category], color: p.color }, W = 640, H = 340;
  const tag = pill(176, 44, c.label, NEUTRAL);
  const badge = p.flagship ? pill(176 + tag.w + 10, 44, 'Flagship', '#ffffff') : p.neutral ? pill(176 + tag.w + 10, 44, 'Product-neutral', '#93c5fd') : pill(176 + tag.w + 10, 44, 'House-style template', '#cbd5e1');
  const lines = wrap(p.detail, 16, W - 88);
  return svg(W, H, `${p.name}: ${p.tagline}`, `${frame(`c-${p.name}`, W, H, c.color)}
<rect x="44" y="40" width="108" height="108" rx="26" fill="${c.color}" fill-opacity=".14" stroke="${c.color}" stroke-opacity=".5"/>
${icon(p.icon, 68, 64, 60, c.color)}
${tag.svg}${badge.svg}
<text x="176" y="112" font-size="34" font-weight="700" fill="#ffffff">${esc(p.name)}</text>
<text x="176" y="140" font-size="17" font-weight="500" fill="${c.color}">${esc(p.tagline)}</text>
${lines.slice(0, 2).map((l, i) => `<text x="44" y="${196 + i * 24}" font-size="16" fill="#c7d0e6">${esc(l)}</text>`).join('\n')}
${p.stats.reduce((acc, s) => { const b = pill(acc.x, 272, s, '#e6ebf7', { size: 13, fill: false }); acc.out += b.svg; acc.x += b.w + 10; return acc; }, { x: 44, out: '' }).out}
${icon('ArrowForward', W - 70, 276, 24, '#ffffff')}`);
}

// ---- Per-plugin banner: the top of each plugin README ----
function banner(p) {
  const c = { ...CATEGORY[p.category], color: p.color }, W = 1280, H = 400;
  const tag = pill(232, 70, c.label, NEUTRAL, { size: 15 });
  const kind = p.flagship ? 'Flagship · product-neutral' : p.neutral ? 'Product-neutral' : 'House-style template you retarget';
  const badge = pill(232 + tag.w + 12, 70, kind, p.flagship ? '#ffffff' : p.neutral ? '#93c5fd' : '#cbd5e1', { size: 15 });
  return svg(W, H, `${p.name}: ${p.tagline}`, `${frame(`b-${p.name}`, W, H, c.color, 28)}
<rect x="64" y="64" width="140" height="140" rx="34" fill="${c.color}" fill-opacity=".14" stroke="${c.color}" stroke-opacity=".5"/>
${icon(p.icon, 94, 94, 80, c.color)}
${tag.svg}${badge.svg}
<text x="232" y="152" font-size="54" font-weight="700" fill="#ffffff">${esc(p.name)}</text>
<text x="232" y="194" font-size="24" font-weight="500" fill="${c.color}">${esc(p.tagline)}</text>
<text x="64" y="268" font-size="15" font-weight="700" letter-spacing="2" fill="#8b97b8">${p.parallel ? 'WHAT IT DOES' : 'HOW IT WORKS'}</text>
${flow(64, 290, W - 128, p.steps, c.color, p.steps.length > 5 ? 15 : 16, p.parallel)}
<text x="${W - 64}" y="372" text-anchor="end" font-size="14" fill="#8b97b8">${esc(p.stats.join('  ·  '))}  ·  shironigun/marketplace</text>`);
}

// ---- Marketplace hero ----
function hero() {
  const W = 1280, H = 440;
  const tiles = PLUGINS.map((p, i) => {
    const c = { color: p.color }, col = i % 4, row = Math.floor(i / 4);
    const x = 760 + col * 118, y = 92 + row * 132;
    return `<rect x="${x}" y="${y}" width="100" height="100" rx="24" fill="${c.color}" fill-opacity=".13" stroke="${c.color}" stroke-opacity=".45"/>
${icon(p.icon, x + 26, y + 20, 48, c.color)}<text x="${x + 50}" y="${y + 90}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#c7d0e6">${esc(p.name.length > 15 ? p.name.replace('-suite', '') : p.name)}</text>`;
  }).join('\n');
  const cats = Object.values(CATEGORY).reduce((acc, c) => { const b = pill(acc.x, 300, c.label, NEUTRAL, { size: 14 }); acc.out += b.svg; acc.x += b.w + 10; return acc; }, { x: 72, out: '' }).out;
  return svg(W, H, 'shironigun marketplace: Claude Code plugins for QA, release and documentation work', `${frame('hero', W, H, '#7c9cff', 30)}
<text x="72" y="104" font-size="16" font-weight="700" letter-spacing="3" fill="#8b97b8">CLAUDE CODE PLUGIN MARKETPLACE</text>
<text x="72" y="170" font-size="60" font-weight="700" fill="#ffffff">shironigun</text>
<text x="72" y="222" font-size="30" font-weight="500" fill="#c7d0e6">Plugins for the work around shipping software:</text>
<text x="72" y="260" font-size="30" font-weight="500" fill="#c7d0e6">testing it, releasing it, explaining it.</text>
${cats}
<text x="72" y="384" font-size="16" fill="#8b97b8" font-family="Consolas, 'Cascadia Mono', Menlo, monospace">claude plugin marketplace add shironigun/marketplace</text>
${tiles}`);
}

// ---- Which plugin for which job ----
function map() {
  const W = 1280, H = 560;
  const lanes = [
    { title: 'Test it', cat: 'testing', note: 'Write cases, automate them, run them', items: ['qa-engineering', 'qa-toolkit', 'api-testing', 'ui-testing'] },
    { title: 'Track it', cat: 'bug-tracking', note: 'File what broke, in house style', items: ['crm-bug-suite'] },
    { title: 'Ship it', cat: 'release-management', note: 'Tell customers what changed', items: ['release-notes-suite'] },
    { title: 'Explain it', cat: 'documentation', note: 'Pages and guides people read', items: ['feature-explainer', 'how-to-guides'] },
  ];
  const lw = (W - 64 * 2 - 24 * 3) / 4;
  const body = lanes.map((l, i) => {
    const x = 64 + i * (lw + 24);
    const items = l.items.map((n, j) => {
      const p = PLUGINS.find((q) => q.name === n), c = { color: p.color }, y = 210 + j * 76;
      return `<rect x="${x + 16}" y="${y}" width="${lw - 32}" height="62" rx="14" fill="#ffffff" fill-opacity=".05" stroke="${c.color}" stroke-opacity="${p.flagship ? '.9' : '.3'}" stroke-width="${p.flagship ? 2 : 1}"/>
${icon(p.icon, x + 30, y + 17, 28, c.color)}
<text x="${x + 70}" y="${y + 28}" font-size="16" font-weight="700" fill="#ffffff">${esc(p.name)}</text>
<text x="${x + 70}" y="${y + 48}" font-size="12.5" fill="#aab4cf">${esc(p.short)}</text>`;
    }).join('\n');
    return `<rect x="${x}" y="110" width="${lw}" height="${H - 150}" rx="20" fill="#ffffff" fill-opacity=".03" stroke="#ffffff" stroke-opacity=".14"/>
<text x="${x + 20}" y="152" font-size="24" font-weight="700" fill="#ffffff">${esc(l.title)}</text>
<text x="${x + 20}" y="180" font-size="14" fill="#c7d0e6">${esc(l.note)}</text>
${items}${i < 3 ? `<path d="M${x + lw + 4} 150h16m-6 -6 6 6-6 6" fill="none" stroke="#8b97b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}`;
  }).join('\n');
  return svg(W, H, 'Which plugin for which job', `${frame('map', W, H, '#7c9cff', 26)}
<text x="64" y="72" font-size="30" font-weight="700" fill="#ffffff">Which plugin for which job</text>
<text x="${W - 64}" y="72" text-anchor="end" font-size="14" fill="#8b97b8">A bold outline marks the flagship</text>
${body}`);
}

// ---- How a plugin reaches your session ----
function howItWorks() {
  const W = 1280, H = 330;
  const steps = [
    { icon: 'Storefront', title: 'Add the marketplace', text: 'Claude Code clones this repo once and lists its plugins.', code: 'marketplace add' },
    { icon: 'Download', title: 'Install a plugin', text: 'Pick only what you need, for you, a project or one folder.', code: 'plugin install' },
    { icon: 'Terminal', title: 'Use it in a session', text: 'Skills as /plugin:skill, agents, commands and MCP servers.', code: '/qa-engineering:qa' },
    { icon: 'VerifiedUser', title: 'Stay in control', text: 'No secrets in the repo; every tracker write waits for your OK.', code: 'az login · your .env' },
  ];
  const sw = (W - 64 * 2 - 40 * 3) / 4;
  const body = steps.map((s, i) => {
    const x = 64 + i * (sw + 40);
    const lines = wrap(s.text, 15, sw - 40);
    return `<rect x="${x}" y="96" width="${sw}" height="190" rx="20" fill="#ffffff" fill-opacity=".05" stroke="#ffffff" stroke-opacity=".12"/>
<circle cx="${x + 40}" cy="140" r="22" fill="#7c9cff" fill-opacity=".16" stroke="#7c9cff" stroke-opacity=".5"/>
${icon(s.icon, x + 28, 128, 24, '#9db4ff')}
<text x="${x + 74}" y="134" font-size="13" font-weight="700" letter-spacing="1.5" fill="#8b97b8">STEP ${i + 1}</text>
<text x="${x + 74}" y="156" font-size="16" font-weight="700" fill="#ffffff">${esc(s.title)}</text>
${lines.map((l, j) => `<text x="${x + 20}" y="${202 + j * 21}" font-size="15" fill="#c7d0e6">${esc(l)}</text>`).join('\n')}
<text x="${x + 20}" y="266" font-size="13" fill="#9db4ff" font-family="Consolas, 'Cascadia Mono', Menlo, monospace">${esc(s.code)}</text>
${i < 3 ? `<path d="M${x + sw + 8} 190h24m-8 -8 8 8-8 8" fill="none" stroke="#7c9cff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}`;
  }).join('\n');
  return svg(W, H, 'How a plugin reaches your session', `${frame('how', W, H, '#7c9cff', 26)}
<text x="64" y="66" font-size="28" font-weight="700" fill="#ffffff">From marketplace to your session</text>
${body}`);
}

const write = (rel, text) => { const p = join(HERE, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
write('hero.svg', hero());
write('map.svg', map());
write('how-it-works.svg', howItWorks());
for (const p of PLUGINS) { write(`cards/${p.name}.svg`, card(p)); write(`banners/${p.name}.svg`, banner(p)); }
console.log(`Wrote hero, map, how-it-works and ${PLUGINS.length} cards and banners.`);
