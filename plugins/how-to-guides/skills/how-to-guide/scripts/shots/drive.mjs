// Drives a local or test build of the app through a plan and saves screenshots.
//   node drive.mjs <plan.json> --out <images folder> [--url http://localhost:3100] [--allow-remote]
// Screenshots come from demo data, so the URL must be a local host (localhost, 127.0.0.1, *.localhost, *.test)
// unless you pass --allow-remote for a test environment that holds only demo data. Never point it at production.
// A plan is a JSON array of steps, run in order (a failed step is reported and the run goes on):
//   {"go": "/reminders"}                       open a route (waits 8 s for the app to load; "wait" overrides)
//   {"text": "New Reminder", "exact": true}    select visible text ("nth" picks a later match)
//   {"role": ["button", "Create"]}             select by role and accessible name
//   {"sel": "[role=combobox]", "nth": 4}       select by CSS
//   {"fill": ["input[name=title]", "Spring service reminder"]}
//   {"type": "Hi @CustomerName, ..."}          type into the focused field
//   {"key": "Escape"}
//   {"hide": {"sel": "[role=tab]", "text": "Beta"}}   remove matching elements now and before every shot
//   {"eval": "document.title"}                 run JavaScript in the page and print the result
//   {"measure": {"text": "New Reminder", "clip": [57, 50]}}   print an element's x, y, w, h for callout.py
//                                              ("sel" instead of "text" for CSS; "clip" = the shot's clip x, y)
//   {"unanswered": true}                       with a demo-data stub that logs to window.__demo.log, print the calls it didn't answer
//   {"shot": "bc-list", "clip": [x, y, w, h]}  save <out>/<shot>.png; clip in CSS pixels of the 1440x900 window
//   {"wait": 2000}
// Clicks wait 1.5 s afterwards; any step takes "wait" in ms. Screenshots are 2x for sharp print.
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const arg = (name, d) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : d;
};
const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = resolve(arg('out', '.'));
const base = arg('url', 'http://localhost:3100').replace(/\/$/, '');
const host = new URL(base).hostname;
if (!/^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(host) && !process.argv.includes('--allow-remote')) {
  console.error(`${host} isn't a local host. Screenshots come from demo data only; pass --allow-remote for a test environment with demo data.`);
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/New_York' });
page.on('pageerror', (e) => console.log('PAGE ERROR', String(e.message).slice(0, 200)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hides = [];
const applyHides = () => page.evaluate((rules) => {
  for (const r of rules) {
    const re = r.text ? new RegExp(r.text, 'i') : null;
    document.querySelectorAll(r.sel).forEach((el) => { if (!re || re.test(el.textContent)) el.remove(); });
  }
}, hides);

for (const s of plan) {
  try {
    if (s.go) { await page.goto(base + s.go); await sleep(s.wait ?? 8000); await applyHides(); }
    else if (s.text) { await page.getByText(s.text, { exact: !!s.exact }).nth(s.nth || 0).click({ timeout: 5000 }); await sleep(s.wait ?? 1500); }
    else if (s.role) { await page.getByRole(s.role[0], { name: s.role[1] }).nth(s.nth || 0).click({ timeout: 5000 }); await sleep(s.wait ?? 1500); }
    else if (s.sel) { await page.locator(s.sel).nth(s.nth || 0).click({ timeout: 5000 }); await sleep(s.wait ?? 1500); }
    else if (s.fill) { await page.locator(s.fill[0]).nth(s.nth || 0).fill(s.fill[1]); await sleep(s.wait ?? 400); }
    else if (s.type) { await page.keyboard.type(s.type); await sleep(s.wait ?? 400); }
    else if (s.key) { await page.keyboard.press(s.key); await sleep(s.wait ?? 600); }
    else if (s.hide) { hides.push(s.hide); await applyHides(); }
    else if (s.eval) { console.log('eval', JSON.stringify(await page.evaluate(s.eval)).slice(0, 2500)); await sleep(s.wait ?? 300); }
    else if (s.measure) {
      const loc = s.measure.text ? page.getByText(s.measure.text, { exact: !!s.measure.exact }) : page.locator(s.measure.sel);
      const b = await loc.nth(s.measure.nth || 0).boundingBox();
      const [cx, cy] = s.measure.clip || [0, 0];
      console.log('measure', JSON.stringify(s.measure), b ? `x=${Math.round(b.x - cx)} y=${Math.round(b.y - cy)} w=${Math.round(b.width)} h=${Math.round(b.height)}` : 'not visible');
    } else if (s.unanswered) {
      const log = await page.evaluate(() => (window.__demo ? window.__demo.log : ['no demo stub on this page']));
      console.log([...new Set(log.filter((l) => !/-> (200|0)$/.test(l)))].join('\n') || 'every call answered');
    } else if (s.shot) {
      // Tooltips and hover states follow the pointer, so park it in the corner and let them fade.
      await applyHides(); await page.mouse.move(1439, 899); await sleep(s.settle ?? 900);
      const o = { path: join(out, s.shot + '.png') };
      if (s.clip) o.clip = { x: s.clip[0], y: s.clip[1], width: s.clip[2], height: s.clip[3] };
      await page.screenshot(o); console.log('shot', o.path);
    } else if (s.wait) await sleep(s.wait);
  } catch (e) { console.log('STEP FAILED', JSON.stringify(s), String(e.message).split('\n')[0]); }
}
await browser.close();
