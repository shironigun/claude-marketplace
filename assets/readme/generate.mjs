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
  design: { label: 'Design' },
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
    stats: ['2 skills', 'ADO_ORG + sign-in'],
  },
  {
    name: 'bug-suite', color: '#f87171', short: 'Bugs, defects, comments', category: 'bug-tracking', icon: 'BugReport', parallel: true,
    tagline: 'Bugs, defects and comments in house style',
    detail: 'Files story and regression bugs, production defects and ticket comments in Azure DevOps.',
    steps: ['Bug', 'Defect', 'Comment'],
    stats: ['3 skills', 'ADO_ORG + sign-in'],
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
  {
    name: 'design-intelligence', color: '#f472b6', short: 'Figma to compliant MUI', category: 'design', icon: 'Palette', neutral: true,
    tagline: 'From a Figma screen to compliant MUI code',
    detail: 'Analyses the screen, builds it in MUI to your design system, and reviews it until it passes.',
    steps: ['Analyse', 'Generate', 'Review', 'Fix', 'Pass'],
    stats: ['6 skills', '1 agent'],
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
    { title: 'Track it', cat: 'bug-tracking', note: 'File what broke, in house style', items: ['bug-suite'] },
    { title: 'Ship it', cat: 'release-management', note: 'Tell customers what changed', items: ['release-notes-suite'] },
    { title: 'Design & explain', cat: 'documentation', note: 'Screens, pages and guides', items: ['design-intelligence', 'feature-explainer', 'how-to-guides'] },
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
    { icon: 'VerifiedUser', title: 'Stay in control', text: 'No secrets in the repo; every tracker write waits for your OK.', code: 'browser sign-in · your .env' },
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

// ---- Use case: "You ask" on the left, a mock of what you get on the right. Made-up data, labelled as an example. ----
const USECASES = {
  'qa-engineering': {
    ask: 'Test story 1234 end to end.', command: '/test 1234',
    title: 'Story 1234 · Discount codes at checkout', kind: 'steps',
    rows: [['done', 'Understood: 6 rules, 2 gaps to confirm with product'], ['done', '14 test cases written, you approved them'], ['done', 'Published to the Test Plan, suite Checkout'],
      ['done', '9 API and 5 UI specs generated in your framework'], ['fail', 'Run: 13 passed, 1 failed (expired code accepted)'], ['wait', 'Bug drafted from the trace, waiting for your OK']],
    why: ['One front door: /qa', 'Nothing filed without your OK', 'Teaches the framework as it builds'],
  },
  'qa-toolkit': {
    ask: 'Write API test cases for POST /orders.', command: '/qa-toolkit:api-test-cases',
    title: 'API test cases · POST /orders', kind: 'table',
    cols: ['ID', 'Case', 'Expected'], widths: [70, 330, 270],
    rows: [['TC-01', 'Create an order with valid items', '201 and an order id'], ['TC-02', 'Items list is empty', '400 with a validation error'], ['TC-03', 'Product id does not exist', '404 Not Found'],
      ['TC-04', 'No auth token', '401 Unauthorized'], ['TC-05', 'Same request id sent twice', '409 Conflict']],
    why: ['No setup to start', 'Works with any tracker', 'One job, one skill'],
  },
  'api-testing': {
    ask: 'Generate the Playwright spec for POST /orders.', command: 'api-tester',
    title: 'orders.contract.spec.ts', kind: 'code',
    lines: ["test('POST /orders creates an order', async ({ request }) => {", "  const res = await request.post('/orders', { data: order });", '  expect(res.status()).toBe(201);',
      '  OrderSchema.parse(await res.json());   // zod contract', '});', '', "test('POST /orders rejects an empty order', async ({ request }) => {", "  const res = await request.post('/orders', { data: { items: [] } });", '  expect(res.status()).toBe(400);', '});'],
    why: ['Cases to specs, and back', 'zod checks every response shape', 'A red run becomes a bug draft'],
  },
  'ui-testing': {
    ask: 'Break this story into UI test cases.', command: 'tester / buggy',
    title: 'UI test case · Create an order', kind: 'table',
    cols: ['#', 'Action', 'Expected result'], widths: [40, 330, 300],
    rows: [['1', 'Open Orders, select New order', 'The New order drawer opens'], ['2', 'Add a product, select Save', 'The order is first in the list'], ['3', 'Clear Customer, select Save', '"Customer is required" displays'],
      ['4', 'Select the order', 'Its details match what you saved']],
    footer: 'Created as a Test Case and linked to the story, after your OK',
    why: ['Click-by-click house style', 'Created as Test Cases for you', 'Playwright UI specs too'],
  },
  'bug-suite': {
    ask: 'File a bug for story 123456: the total doesn\'t update.', command: 'bugger',
    title: 'Bug draft · waiting for your approval', kind: 'card',
    sections: [['Title', ['[Orders] Order total doesn\'t update after removing an item']], ['Steps', ['Environment: QA', 'Open an order with two items', 'Remove one item']],
      ['Observation', ['The total still includes the removed item']], ['I know this is resolved when', ['The total recalculates as soon as an item is removed']]],
    why: ['Bug, Defect or comment', 'Repro structure built in', 'Approval before every write'],
  },
  'release-notes-suite': {
    ask: 'What did we ship since the last notes?', command: 'harvester, then releaser',
    title: 'Shipped work, triaged', kind: 'buckets',
    rows: [['Story', 'Text customers when their order is ready', 'Announce'], ['Bug', 'Ready text used the wrong store name', 'Omit'], ['Bug', 'Ready text missing on the mobile app', 'Omit'],
      ['PR, no ticket', 'Faster loading of the orders list', 'Fold in'], ['Story', 'Export ready-text history to CSV', 'Defer to KB'], ['Task', 'Upgrade the build pipeline', 'Omit']],
    note: 'New: text customers the moment their order is ready.',
    why: ['Catches PRs with no ticket', 'Suppression, not prose', 'Brand variants from one run'],
  },
  'feature-explainer': {
    ask: 'Explain the refund flow, for QA.', command: '/feature-explainer:feature-explainer',
    title: 'One feature, an edition for each reader', kind: 'table',
    cols: ['Reader', 'The page leads with'], widths: [150, 520],
    rows: [['Product', 'The journey, rules as decisions, open questions'], ['QA', 'Rules as grids, what to test, every test case'], ['Design', 'Journeys per role, every state, the exact copy'],
      ['Development', 'Architecture, the contract, storage, errors'], ['Sales', 'The customer problem, 3 benefits, what not to say']],
    why: ['Researched read-only', 'Pictures first, detail collapsed', 'Private until you share it'],
  },
  'how-to-guides': {
    ask: 'Write a guide to Payment Reminders for our admins.', command: '/how-to-guides:how-to-guide',
    title: 'payment-reminders.pdf · 7 pages', kind: 'steps',
    rows: [['done', 'Learned the feature from the code and app, read-only'], ['done', 'Written to the standard: steps, AI callout, troubleshooting'], ['done', 'Built in your brand: How-to standard, no warnings'],
      ['wait', 'For product: 2 questions, 1 change request, 1 bug'], ['wait', 'Placeholder screenshots to replace: 1']],
    why: ['Facts from the source', 'Your brand, never ours', 'About 10 pages a reader opens'],
  },
  'design-intelligence': {
    ask: 'Build the Orders list from this Figma frame.', command: '@design-intelligence-steward',
    title: 'Orders list · mobile 430 x 932', kind: 'steps',
    rows: [['done', 'Analysed the frame: 9 components, 2 states missing'], ['done', 'Mapped to MUI with your tokens, no raw values'], ['done', 'Generated the screen and every state'],
      ['fail', 'Review: 2 contrast issues, 1 off-scale spacing'], ['done', 'Fixed and reviewed again: PASS']],
    why: ['Your design system, never ours', 'Reviewed until it passes', 'Org values stay on your machine'],
  },
};
const STATUS = { done: ['#16a34a', 'CheckCircle'], wait: ['#d97706', 'Lock'], fail: ['#dc2626', 'BugReport'] };
const BUCKET = { Announce: '#16a34a', 'Fold in': '#2563eb', Omit: '#64748b', 'Defer to KB': '#7c3aed' };
function usecase(p) {
  const u = USECASES[p.name], W = 1280, H = 600, c = p.color;
  const PX = 500, PY = 108, PW = W - PX - 64, PH = H - PY - 56;
  const left = [];
  left.push(`<text x="64" y="138" font-size="14" font-weight="700" letter-spacing="2" fill="#8b97b8">YOU ASK</text>`);
  const ask = wrap(u.ask, 21, 330);
  const bh = 36 + ask.length * 30;
  left.push(`<rect x="64" y="156" width="380" height="${bh}" rx="20" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-opacity=".55"/>`);
  ask.forEach((l, i) => left.push(`<text x="88" y="${192 + i * 30}" font-size="21" font-weight="600" fill="#ffffff">${esc(l)}</text>`));
  left.push(`<text x="64" y="${156 + bh + 32}" font-size="15" fill="${c}" font-family="Consolas, 'Cascadia Mono', Menlo, monospace">${esc(u.command)}</text>`);
  const wy = 156 + bh + 92;
  left.push(`<text x="64" y="${wy}" font-size="14" font-weight="700" letter-spacing="2" fill="#8b97b8">WHY IT HELPS</text>`);
  u.why.forEach((w, i) => left.push(`${icon('CheckCircle', 64, wy + 18 + i * 40, 22, c)}<text x="96" y="${wy + 35 + i * 40}" font-size="17" fill="#e6ebf7">${esc(w)}</text>`));
  // the arrow between ask and get
  left.push(`<path d="M${PX - 42} ${PY + PH / 2}h28m-10 -10 10 10-10 10" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);

  const r = [], ix = PX + 28, iw = PW - 56;
  let y = PY + 88;
  r.push(`<rect x="${PX}" y="${PY}" width="${PW}" height="${PH}" rx="18" fill="#f8fafc"/>`);
  r.push(`<rect x="${PX}" y="${PY}" width="${PW}" height="56" rx="18" fill="#e2e8f0"/><rect x="${PX}" y="${PY + 38}" width="${PW}" height="18" fill="#e2e8f0"/>`);
  r.push(`${icon(p.icon, PX + 24, PY + 16, 24, '#0f172a')}<text x="${PX + 60}" y="${PY + 35}" font-size="17" font-weight="700" fill="#0f172a">${esc(u.title)}</text>`);
  r.push(`<text x="${PX + PW - 24}" y="${PY + 35}" text-anchor="end" font-size="13" fill="#64748b">YOU GET</text>`);
  if (u.kind === 'steps') {
    u.rows.forEach(([s, t], i) => {
      const [col, ic] = STATUS[s], yy = y + i * 58;
      r.push(`<rect x="${ix}" y="${yy - 26}" width="${iw}" height="48" rx="10" fill="#ffffff" stroke="#e2e8f0"/>`);
      r.push(`${icon(ic, ix + 14, yy - 14, 24, col)}<text x="${ix + 50}" y="${yy + 4}" font-size="16.5" fill="#0f172a">${esc(t)}</text>`);
    });
  } else if (u.kind === 'table') {
    const xs = u.widths.reduce((a, w) => [...a, a.at(-1) + w], [ix]);
    r.push(`<rect x="${ix}" y="${y - 28}" width="${iw}" height="42" rx="8" fill="#e2e8f0"/>`);
    u.cols.forEach((h, i) => r.push(`<text x="${xs[i] + 14}" y="${y - 1}" font-size="13" font-weight="700" letter-spacing="1" fill="#334155">${esc(h.toUpperCase())}</text>`));
    u.rows.forEach((row, j) => {
      const yy = y + 28 + j * 50;
      r.push(`<rect x="${ix}" y="${yy - 4}" width="${iw}" height="46" fill="${j % 2 ? '#f1f5f9' : '#ffffff'}"/>`);
      row.forEach((cell, i) => r.push(`<text x="${xs[i] + 14}" y="${yy + 25}" font-size="16" ${i === 0 ? 'font-weight="700" fill="#0f172a"' : 'fill="#1e293b"'}>${esc(cell)}</text>`));
    });
    if (u.footer) r.push(`${icon('CheckCircle', ix, PY + PH - 46, 22, '#16a34a')}<text x="${ix + 32}" y="${PY + PH - 29}" font-size="15" font-weight="600" fill="#166534">${esc(u.footer)}</text>`);
  } else if (u.kind === 'code') {
    r.push(`<rect x="${ix}" y="${y - 26}" width="${iw}" height="${PH - 100}" rx="12" fill="#0f172a"/>`);
    u.lines.forEach((l, i) => {
      const [code, comment] = l.split('//');
      r.push(`<text x="${ix + 22}" y="${y + 4 + i * 30}" font-size="15" fill="#e2e8f0" xml:space="preserve" font-family="Consolas, 'Cascadia Mono', Menlo, monospace">${esc(code)}${comment ? `<tspan fill="#86efac">//${esc(comment)}</tspan>` : ''}</text>`);
    });
  } else if (u.kind === 'card') {
    u.sections.forEach(([label, lines]) => {
      r.push(`<text x="${ix}" y="${y}" font-size="13" font-weight="700" letter-spacing="1" fill="${label === 'Observation' ? '#b91c1c' : '#475569'}">${esc(label.toUpperCase())}</text>`);
      lines.forEach((l, i) => r.push(`<text x="${ix + (lines.length > 1 ? 18 : 0)}" y="${y + 25 + i * 24}" font-size="16.5" ${label === 'Title' ? 'font-weight="700" ' : ''}fill="#0f172a">${lines.length > 1 ? `${i + 1}.  ` : ''}${esc(l)}</text>`));
      y += 38 + lines.length * 24;
    });
    r.push(`<rect x="${ix}" y="${PY + PH - 62}" width="${iw}" height="40" rx="10" fill="#fef3c7" stroke="#f59e0b" stroke-opacity=".6"/>${icon('Lock', ix + 12, PY + PH - 54, 22, '#b45309')}<text x="${ix + 44}" y="${PY + PH - 36}" font-size="15" font-weight="600" fill="#92400e">Created in your tracker only after you approve the draft</text>`);
  } else if (u.kind === 'buckets') {
    u.rows.forEach(([tag, item, b], i) => {
      const yy = y + i * 46;
      r.push(`<rect x="${ix}" y="${yy - 26}" width="${iw}" height="40" rx="8" fill="#ffffff" stroke="#e2e8f0"/>`);
      r.push(`<text x="${ix + 14}" y="${yy}" font-size="13" font-weight="700" fill="#64748b">${esc(tag.toUpperCase())}</text>`);
      r.push(`<text x="${ix + 132}" y="${yy}" font-size="16" fill="#0f172a">${esc(item)}</text>`);
      const bw = width(b, 13, 600) + 22;
      r.push(`<rect x="${ix + iw - bw - 12}" y="${yy - 19}" width="${bw}" height="26" rx="13" fill="${BUCKET[b]}"/><text x="${ix + iw - 12 - bw / 2}" y="${yy - 1}" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff">${esc(b)}</text>`);
    });
    r.push(`<rect x="${ix}" y="${PY + PH - 70}" width="${iw}" height="48" rx="10" fill="#dcfce7" stroke="#16a34a" stroke-opacity=".5"/><text x="${ix + 16}" y="${PY + PH - 40}" font-size="13" font-weight="700" letter-spacing="1" fill="#166534">THE NOTE</text><text x="${ix + 110}" y="${PY + PH - 40}" font-size="16.5" font-weight="600" fill="#14532d">${esc(u.note)}</text>`);
  }
  return svg(W, H, `${p.name} in action: ${u.ask}`, `${frame(`u-${p.name}`, W, H, c, 26)}
${icon(p.icon, 64, 48, 30, c)}
<text x="106" y="72" font-size="26" font-weight="700" fill="#ffffff">${esc(p.name)} in action</text>
<text x="${W - 64}" y="72" text-anchor="end" font-size="14" fill="#8b97b8">Example with made-up data</text>
${left.join('\n')}
${r.join('\n')}`);
}

// ---- Explainers: one diagram per plugin, drawn for how that plugin actually works. ----
// Kept plain on purpose: one direction of flow, a short title and one line of detail per box.
function diagram(p) {
  const c = p.color, out = [];
  const node = (x, y, w, h, title, sub = '', { accent = false, dashed = false, tone = c, size = 17 } = {}) => {
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${accent ? tone : '#ffffff'}" fill-opacity="${accent ? 0.16 : 0.05}" stroke="${tone}" stroke-opacity="${accent ? 0.8 : 0.4}" ${dashed ? 'stroke-dasharray="6 5"' : ''}/>`);
    const lines = sub ? wrap(sub, 14, w - 28) : [];
    const top = y + h / 2 - (lines.length * 19) / 2 + (lines.length ? -2 : 6);
    out.push(`<text x="${x + w / 2}" y="${top}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#ffffff">${esc(title)}</text>`);
    lines.forEach((l, i) => out.push(`<text x="${x + w / 2}" y="${top + 22 + i * 19}" text-anchor="middle" font-size="14" fill="#aab4cf">${esc(l)}</text>`));
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  };
  // A point on a box's edge in the direction of (dx, dy), so arrows touch the box, not its centre.
  const edge = (n, dx, dy) => { const t = Math.min((n.w / 2) / Math.abs(dx || 1e-9), (n.h / 2) / Math.abs(dy || 1e-9)); return [n.cx + dx * t, n.cy + dy * t]; };
  const arrow = (a, b, { label = '', dashed = false, tone = c, gate = false, opacity = 0.85 } = {}) => {
    const dx = b.cx - a.cx, dy = b.cy - a.cy, [x1, y1] = edge(a, dx, dy), [x2, y2] = edge(b, -dx, -dy);
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, ex = x2 - ux * 4, ey = y2 - uy * 4;
    out.push(`<path d="M${x1 + ux * 4} ${y1 + uy * 4}L${ex} ${ey}" stroke="${tone}" stroke-opacity="${opacity}" stroke-width="2.2" fill="none" ${dashed ? 'stroke-dasharray="6 5"' : ''}/>`);
    out.push(`<path d="M${ex} ${ey}l${-ux * 11 - uy * 6} ${-uy * 11 + ux * 6}M${ex} ${ey}l${-ux * 11 + uy * 6} ${-uy * 11 - ux * 6}" stroke="${tone}" stroke-opacity="${opacity}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (gate) out.push(`<circle cx="${mx}" cy="${my}" r="14" fill="#fbbf24"/>${icon('Lock', mx - 9, my - 9, 18, '#0b1020')}`);
    if (label) out.push(`<text x="${mx}" y="${my - (gate ? 22 : 10)}" text-anchor="middle" font-size="13" font-weight="600" fill="#c7d0e6">${esc(label)}</text>`);
  };
  const bracket = (x, nodes, toNodes) => {
    const ys = nodes.map((n) => n.cy), top = Math.min(...ys), bot = Math.max(...ys);
    out.push(`<path d="M${x} ${top}V${bot}" stroke="${c}" stroke-opacity=".6" stroke-width="2.2"/>`);
    nodes.forEach((n) => {
      const ex = toNodes ? n.x - 4 : n.x + n.w + 4;
      out.push(`<path d="M${x} ${n.cy}H${ex}" stroke="${c}" stroke-opacity=".6" stroke-width="2"/>`);
      if (toNodes) out.push(`<path d="M${ex} ${n.cy}l-9 -5M${ex} ${n.cy}l-9 5" stroke="${c}" stroke-opacity=".8" stroke-width="2" stroke-linecap="round"/>`);
    });
    return { x, y: top, w: 0.001, h: bot - top, cx: x, cy: (top + bot) / 2 };
  };
  const tag = (x, y, text) => out.push(`<text x="${x}" y="${y}" font-size="13" font-weight="700" letter-spacing="2" fill="#8b97b8">${esc(text)}</text>`);
  const key = () => out.push(`<circle cx="${1216 - 168}" cy="94" r="11" fill="#fbbf24"/>${icon('Lock', 1216 - 175, 87, 14, '#0b1020')}<text x="${1216 - 150}" y="99" font-size="14" fill="#c7d0e6">waits for your OK</text>`);
  const pill = (x, y, w, text, tone = c) => node(x, y, w, 40, text, '', { tone, size: 15 });

  const draw = {
    'qa-engineering': () => {
      const hub = { cx: 640, cy: 372 };
      out.push(`<circle cx="640" cy="372" r="70" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-opacity=".8"/><text x="640" y="372" text-anchor="middle" font-size="28" font-weight="700" fill="#ffffff">/qa</text><text x="640" y="396" text-anchor="middle" font-size="14" fill="#aab4cf">one front door</text>`);
      const steps = [['Analyze', 'Reads the story, read-only'], ['Author cases', 'House-style, you approve them'], ['Publish', 'To a Test Plan and suite'], ['Automate', 'Playwright + TypeScript specs'], ['Run', 'The suite, real results'], ['File bug', 'From the failing trace']];
      const n = steps.map(([t, s], i) => { const a = (-90 + i * 60) * Math.PI / 180; return node(640 + 420 * Math.cos(a) - 115, 372 + 172 * Math.sin(a) - 36, 230, 72, t, s); });
      const gates = [2, 5];
      n.forEach((a, i) => { const b = n[(i + 1) % n.length]; arrow(a, b, i === 5 ? { label: 'next story', dashed: true } : { gate: gates.includes(i + 1) }); });
      n.forEach((a) => out.push(`<path d="M${hub.cx} ${hub.cy}L${a.cx} ${a.cy}" stroke="${c}" stroke-opacity=".14" stroke-width="1.5" stroke-dasharray="3 6"/>`));
      key();
    },
    'qa-toolkit': () => {
      const tools = [['API test cases', 'From an API spec or a sample response', false, 64, 160], ['UI test cases', 'From a screen or a user flow', false, 64, 360],
        ['Failure to bug', 'An API failure becomes a structured bug', true, 440, 160], ['Cases to tracker', 'Creates Test Case work items', true, 440, 360]];
      const tracker = node(900, 160, 316, 370, '', '', { accent: true });
      out.push(`<text x="1058" y="196" text-anchor="middle" font-size="18" font-weight="700" fill="#ffffff">Your tracker</text><text x="1058" y="218" text-anchor="middle" font-size="14" fill="#aab4cf">whatever you connect</text>`);
      ['Azure DevOps', 'Jira', 'Linear', 'Asana', 'GitHub Issues', 'Monday', 'ClickUp'].forEach((t, i) => pill(930, 236 + i * 40, 256, t, '#93c5fd'));
      tools.forEach(([t, s, uses, x, y]) => {
        const b = node(x, y, 320, 170, t, s);
        out.push(`<rect x="${x + 70}" y="${y + 126}" width="180" height="28" rx="14" fill="${uses ? c : '#64748b'}" fill-opacity=".18" stroke="${uses ? c : '#94a3b8'}" stroke-opacity=".6"/><text x="${x + 160}" y="${y + 145}" text-anchor="middle" font-size="13" font-weight="600" fill="${uses ? c : '#cbd5e1'}">${uses ? 'uses your tracker' : 'no connector needed'}</text>`);
        if (uses) arrow(b, { ...tracker, cy: b.cy, h: 0.001, w: 316 }, { label: 'connector' });
      });
      out.push(`<text x="64" y="578" font-size="15" fill="#c7d0e6">Each skill works on its own. Chain them when you want: write cases, push them, turn a red run into a bug.</text>`);
    },
    'api-testing': () => {
      tag(64, 146, 'THREE LEVELS OF API CASES');
      [['Contract', 'Response shapes checked with zod schemas'], ['Endpoints', 'The happy path and the negative matrix'], ['Workflows', 'Calls chained together, end to end']].forEach(([t, s], i) => node(64 + i * 391, 160, 370, 92, t, s));
      tag(64, 296, 'CASES AND SPECS, BOTH WAYS');
      const cases = node(64, 310, 380, 92, 'Test cases', 'Readable, house style');
      const specs = node(836, 310, 380, 92, 'Runnable specs', 'Playwright + TypeScript + zod');
      arrow(cases, specs, { label: 'api-tester writes the spec' });
      arrow({ ...specs, cy: specs.cy + 22 }, { ...cases, cy: cases.cy + 22 }, { label: '', dashed: true });
      out.push(`<text x="640" y="402" text-anchor="middle" font-size="13" font-weight="600" fill="#c7d0e6">or reads an existing spec back into cases</text>`);
      tag(64, 456, 'WHEN A RUN GOES RED');
      const red = node(64, 470, 250, 88, 'Red run', 'An assertion or a zod issue', { tone: '#f87171' });
      const bugger = node(366, 470, 250, 88, 'api-bugger', 'Triages the failure', { accent: true });
      const draft = node(668, 470, 250, 88, 'Bug draft', 'House style, for review');
      const file = node(966, 470, 250, 88, 'File it', 'with bug-suite or qa-engineering', { dashed: true });
      arrow(red, bugger); arrow(bugger, draft); arrow(draft, file, { gate: true });
      key();
    },
    'ui-testing': () => {
      const story = node(64, 300, 250, 110, 'Story or acceptance criteria', 'Paste it, or name the ticket');
      tag(380, 150, 'AUTHOR AND SCRIPT');
      const tester = node(380, 166, 240, 100, 'tester', 'Reviews like a senior QA analyst', { accent: true });
      const cases = node(690, 166, 250, 100, 'UI test cases', 'Click by click, house style');
      const spec = node(990, 166, 226, 100, 'UI spec', 'Playwright + TypeScript, both ways');
      tag(380, 430, 'CREATE IN YOUR TRACKER');
      const buggy = node(380, 446, 240, 100, 'buggy', 'Writes the cases for the ticket', { accent: true });
      const items = node(690, 446, 526, 100, 'Test Case work items', 'In Azure DevOps, linked to the source ticket');
      arrow(story, tester); arrow(story, buggy); arrow(tester, cases); arrow(cases, spec); arrow(buggy, items, { gate: true });
      out.push(`<text x="64" y="598" font-size="14" fill="#c7d0e6">tester needs no setup. buggy needs ADO_ORG and a browser sign-in.</text>`);
      key();
    },
    'bug-suite': () => {
      const root = node(64, 300, 240, 110, 'What happened?', 'Pick the skill by where you found it');
      const rows = [['Found while testing a story, or in regression', 'bugger', 'Bug', 'On the delivery board'], ['Found on production, by a live client', 'defector', 'Defect', 'On the support board'], ['An update for an existing ticket', 'commentor', 'Comment', 'In the team\'s voice']];
      rows.forEach(([cond, skill, res, where], i) => {
        const y = 150 + i * 158;
        const a = node(364, y, 330, 100, cond, '', { size: 15 });
        const s = node(760, y + 14, 180, 72, skill, '', { accent: true });
        const r = node(1006, y, 210, 100, res, where);
        arrow(root, a); arrow(a, s); arrow(s, r, { gate: true });
      });
      key();
    },
    'release-notes-suite': () => {
      out.push(`<path d="M300 140L1020 290V430L300 580Z" fill="${c}" fill-opacity=".05"/>`);
      tag(64, 146, 'EVERYTHING THAT SHIPPED');
      const src = ['User Stories', 'Bugs', 'Defects', 'Merged PRs', 'Commits', 'Deployments'].map((t, i) => pill(64, 160 + i * 62, 200, t));
      out.push(`<text x="64" y="560" font-size="13" fill="#aab4cf">every board, plus work</text><text x="64" y="578" font-size="13" fill="#aab4cf">that shipped with no ticket</text>`);
      const harvester = node(330, 300, 200, 110, 'harvester', 'Gathers it all, read-only', { accent: true });
      arrow(bracket(296, src, false), harvester);
      const inv = node(580, 300, 190, 110, 'Inventory', 'Complete, grouped by theme');
      const releaser = node(820, 300, 190, 110, 'releaser', 'Suppresses, then writes', { accent: true });
      [['Announce', '#16a34a'], ['Fold in', '#2563eb'], ['Omit', '#64748b'], ['Defer to KB', '#7c3aed']].forEach(([t, col], i) => {
        const x = 790 + (i % 2) * 128, y = 428 + Math.floor(i / 2) * 36;
        out.push(`<rect x="${x}" y="${y}" width="120" height="28" rx="14" fill="${col}"/><text x="${x + 60}" y="${y + 19}" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff">${t}</text>`);
      });
      const noteA = node(1060, 236, 156, 96, 'Note', 'Brand A');
      const noteB = node(1060, 378, 156, 96, 'Note', 'Brand B');
      arrow(harvester, inv); arrow(inv, releaser); arrow(releaser, noteA, { gate: true }); arrow(releaser, noteB, { gate: true });
      tag(580, 268, 'COMPLETE');
      tag(838, 268, 'CURATED');
      key();
    },
    'feature-explainer': () => {
      tag(64, 146, 'SOURCES');
      const src = [['Code and branches', 'read with git show'], ['Tickets', 'and their links'], ['Docs', 'and existing pages'], ['Live calls', 'only if you allow']].map(([t, s], i) => node(64, 160 + i * 104, 200, 88, t, s, { size: 15 }));
      const research = node(310, 300, 170, 110, 'Research', 'Read-only, every fact dated', { accent: true });
      arrow(bracket(282, src, false), research);
      tag(530, 146, 'AN EDITION FOR THE READER YOU NAME');
      const eds = [['Product', 'journey and decisions'], ['QA', 'rules and what to test'], ['Design', 'screens and every state'], ['Development', 'architecture and contract'], ['Sales', 'problem and benefits'], ['Everyone', 'how it works, detail folded']]
        .map(([t, s], i) => node(530, 160 + i * 70, 280, 60, t, s, { size: 15 }));
      const inB = bracket(505, eds, true); arrow(research, inB);
      const checks = node(860, 300, 170, 110, 'Checks', 'Style for that reader, layout on phone');
      arrow(bracket(836, eds, false), checks);
      const publish = node(1070, 300, 146, 110, 'Publish', 'Private until you share', { accent: true });
      arrow(checks, publish);
    },
    'how-to-guides': () => {
      tag(64, 146, '1  LEARN');
      const learn = [['Code', 'read-only'], ['The app', 'with demo data'], ['Help content', 'words readers know']].map(([t, s], i) => node(64, 160 + i * 112, 230, 96, t, s));
      tag(350, 146, '2  WRITE TO THE STANDARD');
      const parts = [['Before you begin', 'the problem, setup, availability'], ['How it works', 'every label on screen, once'], ['Tasks', 'action, then You\'ll see, then why'], ['Questions readers ask', 'short, direct answers'], ['If something goes wrong', 'what you see, what to do']]
        .map(([t, s], i) => node(350, 160 + i * 82, 400, 70, t, s, { size: 15 }));
      learn.forEach((l) => arrow(l, { ...parts[2], cy: l.cy }, { opacity: 0.45 }));
      tag(810, 146, '3  BUILD');
      const brand = node(810, 160, 406, 84, 'howto-brand.json', 'Your logo, colours, font and help line', { dashed: true });
      const pdf = node(810, 292, 406, 90, 'Branded PDF', 'Checked against the standard as it builds', { accent: true });
      arrow(brand, pdf); arrow(parts[1], pdf);
      tag(810, 432, '4  REPORT BACK TO PRODUCT');
      ['Questions', 'Change requests', 'Bugs'].forEach((t, i) => pill(810 + i * 140, 446, 126, t, '#fbbf24'));
      out.push(`<text x="810" y="516" font-size="14" fill="#aab4cf">Anything it can't confirm goes on a list,</text><text x="810" y="536" font-size="14" fill="#aab4cf">never into the guide as a guess.</text>`);
    },
    'design-intelligence': () => {
      tag(64, 146, 'INPUTS');
      const src = [['Figma screen', 'a frame or its link'], ['Your design system', 'local, never in the plugin'], ['Work item', 'optional context']].map(([t, s], i) => node(64, 160 + i * 120, 220, 100, t, s, { dashed: i === 1 }));
      const analyse = node(330, 300, 180, 110, 'Analyse', 'components, states, tokens', { accent: true });
      arrow(bracket(300, src, false), analyse);
      const generate = node(560, 300, 180, 110, 'Generate', 'MUI to your tokens');
      const review = node(790, 300, 180, 110, 'Review', 'against your rules', { accent: true });
      const pass = node(1030, 300, 186, 110, 'PASS', 'compliant screen');
      arrow(analyse, generate); arrow(generate, review); arrow(review, pass);
      tag(560, 470, 'FIX AND REVIEW AGAIN UNTIL IT PASSES');
      tag(330, 146, 'ONE STEWARD AGENT PICKS THE SKILLS AND ORDER');
    },
  };
  draw[p.name]();
  const subs = {
    'qa-engineering': 'One orchestrator runs the loop. Every step that writes to your tracker stops for your OK.',
    'qa-toolkit': 'Four tools that work on their own. Only two need a tracker, and any tracker works.',
    'api-testing': 'Cases at three levels, turned into runnable specs and back, and a bug draft when a run fails.',
    'ui-testing': 'One story, two paths: author cases and specs, or create Test Cases in your tracker.',
    'bug-suite': 'Pick by where you found it. Every draft waits for your approval before it is created.',
    'release-notes-suite': 'Gather everything that shipped, then keep only what customers can use.',
    'feature-explainer': 'Research once, read-only, then build the edition for the reader you name.',
    'how-to-guides': 'Facts from the source, written to a standard, built in your brand, with gaps sent back to product.',
    'design-intelligence': 'Your design system in, compliant MUI out, reviewed until it passes.',
  };
  const W = 1280, H = 620;
  return svg(W, H, `How ${p.name} works`, `${frame(`d-${p.name}`, W, H, c, 26)}
${icon(p.icon, 64, 46, 30, c)}
<text x="106" y="70" font-size="26" font-weight="700" fill="#ffffff">How ${esc(p.name)} works</text>
<text x="64" y="104" font-size="16" fill="#c7d0e6">${esc(subs[p.name])}</text>
${out.join('\n')}`);
}

const write = (rel, text) => { const p = join(HERE, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
write('hero.svg', hero());
write('map.svg', map());
write('how-it-works.svg', howItWorks());
for (const p of PLUGINS) {
  write(`cards/${p.name}.svg`, card(p)); write(`banners/${p.name}.svg`, banner(p));
  write(`usecases/${p.name}.svg`, usecase(p)); write(`diagrams/${p.name}.svg`, diagram(p));
}
console.log(`Wrote hero, map, how-it-works and ${PLUGINS.length} cards, banners, use cases and diagrams.`);
