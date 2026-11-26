'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { readyFilm, tempDir, inputFile } = require('./helpers');
const { ARGS, playerFiles, openPlayer, loadFilm, still, played, playerLog, writeStills } = require('../lib/render');

// A browser as playwright-core gives one, recording what verify asks of it: the page runs each page function against
// `anim`, the player's window.__animation.
function fakeChromium(anim) {
  const seen = { routes: [], init: [], closed: false };
  const page = {
    context: () => ({
      addInitScript: async (fn) => seen.init.push(fn),
      route: async (pattern, handler) => seen.routes.push([pattern, handler]),
    }),
    goto: async (url) => { seen.goto = url; },
    waitForFunction: async () => {},
    evaluate: async (fn, arg) => {
      global.window = { __animation: anim };
      try {
        return await fn(arg);
      } finally {
        delete global.window;
      }
    },
  };
  const browser = { newPage: async (o) => { seen.viewport = o.viewport; return page; }, close: async () => { seen.closed = true; } };
  return { seen, launch: async (o) => { seen.launch = o; return browser; } };
}
const request = (url, nav = false) => ({ request: () => ({ url: () => url, isNavigationRequest: () => nav }), continue: () => 'continue', abort: () => 'abort' });

test('render: the player opens in the user\'s Chromium with no network, loading only its own three files', async () => {
  const tools = { chromium: path.join('C:', 'Chrome', 'chrome.exe'), player: path.join(tempDir('sp-tools-'), 'player') };
  const { seen, launch } = fakeChromium({});
  const session = await openPlayer(tools, launch);
  assert.equal(seen.launch.executablePath, tools.chromium);
  assert.deepEqual(seen.launch.args, ARGS);
  // Every name resolves to nothing, every request goes to a closed local port, and WebRTC is gone.
  assert.ok(ARGS.includes('--host-resolver-rules=MAP * ^NOTFOUND'));
  assert.ok(ARGS.some((a) => a.startsWith('--proxy-server=')) && ARGS.includes('--force-webrtc-ip-handling-policy=disable_non_proxied_udp'));
  assert.equal(seen.init.length, 1);
  assert.deepEqual(seen.viewport, { width: 1920, height: 1080 });
  assert.equal(seen.goto, `${pathToFileURL(path.join(tools.player, 'index.html')).href}#tools`);
  // The first navigation names the player's folder; after it, only its three files and data: or blob: URLs load.
  const [[pattern, route]] = seen.routes;
  assert.equal(pattern, '**/*');
  const here = pathToFileURL(path.join(tools.player, 'index.html')).href;
  assert.equal(route(request(`${here}#tools`, true)), 'continue');
  assert.equal(route(request(here.replace(/index\.html$/, 'artifact-type/app.js'))), 'continue');
  assert.equal(route(request(here.replace(/index\.html$/, 'artifact-type/app.css?v=2'))), 'continue');
  assert.equal(route(request('data:image/png;base64,AA')), 'continue');
  assert.equal(route(request(here.replace(/index\.html$/, 'secrets.txt'))), 'abort');
  assert.equal(route(request(`${'https:'}//example.invalid/font.woff2`)), 'abort');
  assert.equal(route(request(pathToFileURL(path.join(tools.player, '..', 'tools.json')).href)), 'abort');
  await session.close();
  assert.ok(seen.closed);
  // A browser that cannot open the player is closed again.
  const broken = fakeChromium({});
  const launchBroken = async (o) => { const b = await broken.launch(o); return { ...b, newPage: async () => { throw new Error('no page'); } }; };
  await assert.rejects(openPlayer(tools, launchBroken), /no page/);
  assert.ok(broken.seen.closed);
});

test('render: a brand\'s film goes to the player as the stage would write it, and the player says what it plays', async () => {
  const docs = {
    'film/meta': { v: 1, title: 'Reminders, promo (Harbor)' },
    'film/script': { code: 'window.CUT = kit.scenes();' },
    'modules/shared.js': { kind: 'js', text: 'window.W = {};' },
    'modules/scenes.json': { kind: 'json', text: '{}' },
  };
  const files = playerFiles(docs);
  assert.deepEqual(files, {
    title: 'Reminders, promo (Harbor)', script: 'window.CUT = kit.scenes();', assets: [],
    modules: [{ name: 'shared.js', kind: 'js', text: 'window.W = {};' }, { name: 'scenes.json', kind: 'json', text: '{}' }],
  });
  const loads = [];
  const anim = {
    load: (f) => { loads.push(f); return { meta: { duration: 12, chapters: [{ t: 0 }, { t: 3 }] } }; },
    frame: (t, o) => `data:image/png;base64,${Buffer.from(`${t}@${o.scale}`).toString('base64')}`,
    score: () => ({ events: [{ t: 3.7, kind: 'fx', patch: 'pop', midi: 0, vel: 45 }] }),
    scoreReport: () => ({ unknown: ['cowbel'] }),
    consoleLog: () => [{ level: 'log', text: 'ready' }, { level: 'warn', text: 'fonts.sans names no family' }],
  };
  const session = await openPlayer({ chromium: 'chrome', player: tempDir('sp-tools-') }, fakeChromium(anim).launch);
  const meta = await loadFilm(session, files);
  assert.deepEqual(loads, [files]);
  assert.equal((await still(session, 4.75, 0.5)).toString(), '4.75@0.5');
  assert.deepEqual(await played(session, meta), {
    duration: 12, chapters: [0, 3], events: [{ t: 3.7, kind: 'fx', patch: 'pop' }], unknown: ['cowbel'],
    log: [{ level: 'warn', text: 'fonts.sans names no family' }],
  });
  // A film the player cannot load is refused, with the player's reason.
  const failing = await openPlayer({ chromium: 'chrome', player: tempDir('sp-tools-') }, fakeChromium({ load: () => ({ error: { message: 'scene-s-02.js: W is not defined' } }) }).launch);
  await assert.rejects(loadFilm(failing, files), /the player could not load the film: scene-s-02\.js: W is not defined/);
});

test('render: the stills of the moments at half size, a contact sheet a scene, and a full-size crop of each', async () => {
  const dir = tempDir('sp-verify-');
  const scales = [];
  const png = (text) => `data:image/png;base64,${Buffer.from(text).toString('base64')}`;
  // The page draws sheets and crops on its own canvas; this one names what it was asked to draw.
  const page = {
    evaluate: async (fn, arg) => {
      if (fn.name === 'drawSheet') return png(`sheet of ${arg[0].length}`);
      if (fn.name === 'cropStill') return png(`crop ${arg[1].w}x${arg[1].h}`);
      global.window = { __animation: { frame: (t, o) => { scales.push(o.scale); return png(String(t)); } } };
      try {
        return await fn(arg);
      } finally {
        delete global.window;
      }
    },
  };
  const moments = [{ t: 3, scene: 'S-02', label: '3.000 s' }, { t: 4.75, scene: 'S-02', label: '4.750 s' }, { t: 14, scene: 'S-03', label: '14.000 s' }];
  const out = await writeStills({ page }, moments, dir, { sheets: true, box: { x: 0, y: 0, w: 640, h: 360 } });
  assert.deepEqual(out.frames.map((f) => path.basename(f)), ['t_003.000.png', 't_004.750.png', 't_014.000.png']);
  assert.equal(fs.readFileSync(out.frames[1], 'utf8'), '4.75');
  assert.deepEqual(out.sheets.map((f) => [path.basename(f), fs.readFileSync(f, 'utf8')]), [['S-02.png', 'sheet of 2'], ['S-03.png', 'sheet of 1']]);
  assert.deepEqual(out.crops.map((f) => path.basename(f)), ['c_003.000_0_0_640_360.png', 'c_004.750_0_0_640_360.png', 'c_014.000_0_0_640_360.png']);
  assert.equal(fs.readFileSync(out.crops[0], 'utf8'), 'crop 640x360');
  assert.deepEqual(scales, [0.5, 1, 0.5, 1, 0.5, 1]);
  assert.equal(out.pngs.get(14).toString(), '14');
  // Without a sheet or a crop asked for, only the stills.
  const plain = await writeStills({ page }, moments.slice(0, 1), tempDir('sp-verify-'));
  assert.deepEqual([plain.frames.length, plain.sheets.length, plain.crops.length], [1, 0, 0]);
});

test('render: the player\'s log, read whenever it is asked, keeps every line but plain log ones', async () => {
  const lines = [{ level: 'log', text: 'ready' }, { level: 'warn', text: 'x'.repeat(700) }, { level: 'info', text: 'a\n\n## Fake   section\n' }];
  const session = { page: { evaluate: async (fn) => { global.window = { __animation: { consoleLog: () => lines } }; try { return await fn(); } finally { delete global.window; } } } };
  assert.deepEqual(await playerLog(session), [{ level: 'warn', text: 'x'.repeat(600) }, { level: 'info', text: 'a ## Fake section' }]);
  lines.push({ level: 'error', text: 'a raster that is not safe' });
  assert.deepEqual((await playerLog(session)).map((l) => l.level), ['warn', 'info', 'error']);
});

test('sp render: a built film, the times or the plan, and the installed renderer', () => {
  const { sp, runSp, repo, env } = readyFilm('reminders', 'promo');
  const render = (...more) => runSp(repo, ['render', 'reminders', '--film', 'promo', ...more], env);
  assert.match(render('--brand', 'harbor', '--plan').stderr, /the film has no build yet; run sp build reminders --film promo/);
  sp('build', 'reminders', '--film', 'promo');
  assert.equal(render('--brand', 'acme', '--plan').code, 2);
  assert.match(render('--brand', 'harbor').stderr, /give one of --at <seconds,\.\.\.>, --plan or --anchor/);
  assert.match(render('--brand', 'harbor', '--at', '1', '--plan').stderr, /give one of/);
  // A comment's anchor comes in a file: one that names no time inside the film, or a stretch that ends before it
  // starts, is refused.
  const anchor = (line) => inputFile(line, repo);
  assert.match(render('--brand', 'harbor', '--anchor', anchor('Location: 0:40')).stderr, /--anchor takes a file holding a comment's "Anchor detail" or "Element path" line, at a time inside the film/);
  assert.match(render('--brand', 'harbor', '--anchor', anchor('at 40.2 s, the point at x 10% y 10% of the frame')).stderr, /--anchor takes/);
  assert.match(render('--brand', 'harbor', '--anchor', anchor('Anchor detail: from 5.4 s to 2.1 s of the film')).stderr, /--anchor takes/);
  assert.equal(render('--brand', 'harbor', '--anchor', 'missing.txt').code, 2);
  assert.match(render('--brand', 'harbor', '--at', '1,40').stderr, /--at takes seconds inside the film, from 0 to under 35\.4/);
  assert.match(render('--brand', 'harbor', '--at', '1', '--crop', '0,0,2000,10').stderr, /--crop takes x,y,w,h in whole pixels inside the 1920 by 1080 stage/);
  const r = render('--brand', 'harbor', '--plan', '--sheet');
  assert.equal(r.code, 1);
  assert.match(r.stderr, /the renderer is not installed; read the Motion player's files into a folder and run sp render --install <folder>/);
});

test('sp check: once every brand\'s film holds the build, with the renderer installed', () => {
  const { sp, runSp, repo, env } = readyFilm('reminders', 'promo');
  const check = (...more) => runSp(repo, ['check', 'reminders', '--film', 'promo', ...more], env);
  const early = check();
  assert.equal(early.code, 1);
  assert.match(early.stderr, /the films do not hold the film's build yet; the next step is build/);
  sp('build', 'reminders', '--film', 'promo');
  for (const brand of ['harbor', 'lumen']) {
    const s = sp('stage', 'reminders', '--film', 'promo', '--brand', brand, '--json').json;
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--url', `${'https:'}//example.invalid/${brand}`);
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--versions', inputFile({ stage: s.id, ...Object.fromEntries(s.batches.flat().map((w) => [`${w.collection}/${w.doc_id}`, 1])) }, repo));
  }
  assert.equal(check('--brand', 'acme').code, 2);
  const r = check();
  assert.equal(r.code, 1);
  assert.match(r.stderr, /the renderer is not installed/);
});

test('sp check --review: three reviews vote on a checked build; gate 3 once it passes, then the comment loop', () => {
  const { sp, runSp, repo, env, film } = readyFilm('reminders', 'promo');
  const next = () => sp('status', 'reminders', '--film', 'promo', '--json').json.next;
  // Three reviews of the cut; one verdict given alone stands for all three.
  const review = (...values) => runSp(repo, ['check', 'reminders', '--film', 'promo', '--review', (values.length === 1 ? [values[0], values[0], values[0]] : values).map((v) => inputFile(v, repo)).join(',')], env);
  sp('build', 'reminders', '--film', 'promo');
  for (const brand of ['harbor', 'lumen']) {
    const s = sp('stage', 'reminders', '--film', 'promo', '--brand', brand, '--json').json;
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--url', `${'https:'}//example.invalid/${brand}`);
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--versions', inputFile({ stage: s.id, ...Object.fromEntries(s.batches.flat().map((w) => [`${w.collection}/${w.doc_id}`, 1])) }, repo));
  }
  assert.equal(next(), 'verify');
  const pass = { verdict: 'PASS', findings: [] };
  assert.match(review(pass).stderr, /the checks have not passed on this build for harbor, lumen; run sp check reminders --film promo first/);
  // What sp check writes when every check passes on the build, for each brand.
  const { inputs } = JSON.parse(fs.readFileSync(path.join(film, 'film', 'build.json'), 'utf8'));
  for (const brand of ['harbor', 'lumen']) {
    fs.mkdirSync(path.join(film, 'verify', brand), { recursive: true });
    fs.writeFileSync(path.join(film, 'verify', brand, 'check.json'), JSON.stringify({ brand, inputs, problems: [], notes: [], sheets: [`${brand}/sheets/S-01.png`] }));
  }
  assert.equal(next(), 'verify');
  // The reviewer's brief: each brand's sheets, frames and report, the story, the ledger, the rules and the schema.
  const b = JSON.parse(fs.readFileSync(sp('check', 'reminders', '--film', 'promo', '--brief', '--json').json.brief, 'utf8'));
  assert.deepEqual(b.brands.map((x) => [x.id, x.sheets]), [['harbor', ['harbor/sheets/S-01.png']], ['lumen', ['lumen/sheets/S-01.png']]]);
  assert.ok([b.beats, b.storyboard, b.truth, b.brief, b.rules, b.schema].every((p) => fs.existsSync(p)), JSON.stringify(b));
  assert.deepEqual(b.house, []);
  assert.equal(runSp(repo, ['check', 'reminders', '--film', 'promo', '--brief', '--review', 'x.json'], env).code, 2);
  // A verdict that does not fit the schema or the film is refused; a BLOCKED one keeps the film in verify.
  assert.equal(runSp(repo, ['check', 'reminders', '--film', 'promo', '--review', [pass, pass].map((v) => inputFile(v, repo)).join(',')], env).code, 2);
  assert.match(review(pass, { verdict: 'MAYBE', findings: [] }, pass).stderr, /review 2 has 1 problem:/);
  assert.match(review({ verdict: 'BLOCKED', findings: [] }).stderr, /review 1: a BLOCKED review names its findings/);
  const finding = { brand: 'harbor', scene: 'S-02', at: 12.9, rule: '4', text: 'The dialog opens off the frame.' };
  const { at: when, ...untimed } = finding;
  assert.match(review({ verdict: 'BLOCKED', findings: [untimed] }).stderr, /review 1 has 1 problem:/);
  assert.match(review({ verdict: 'PASS', findings: [finding] }).stderr, /review 1: a PASS has no findings/);
  assert.match(review(pass, pass, { verdict: 'BLOCKED', findings: [{ ...finding, scene: 'S-09' }] }).stderr, /review 3 names harbor S-09, which the film does not have/);
  // Two of three name the flaw: it blocks the cut, and review.json keeps every review.
  const blocked = review({ verdict: 'BLOCKED', findings: [finding] }, pass, { verdict: 'BLOCKED', findings: [{ ...finding, at: 13.1, text: 'Cut off.' }] });
  assert.equal(blocked.code, 1);
  assert.match(blocked.stdout, /the reviewers block the cut, on the flaws two or more of the 3 reviews name:\n {2}harbor S-02 \(rule 4, 2 of 3\): The dialog opens off the frame\./);
  assert.equal(JSON.parse(fs.readFileSync(path.join(film, 'verify', 'review.json'), 'utf8')).reviews.length, 3);
  assert.equal(next(), 'verify');
  assert.match(runSp(repo, ['confirm', 'gate-3', '--subject', 'reminders', '--film', 'promo'], env).stderr, /gate 3 comes once the films pass verify; the next step is verify/);
  // Two reviews block on different flaws: neither has two votes, so the cut passes.
  const other = { brand: 'lumen', scene: 'S-04', at: 25.6, rule: '8', text: 'The card holds the rows.' };
  const passed = review({ verdict: 'BLOCKED', findings: [finding] }, { verdict: 'BLOCKED', findings: [other] }, pass);
  assert.equal(passed.code, 0, passed.stderr);
  assert.match(passed.stdout, /the reviewers pass the cut: no flaw is named by two of the 3 reviews/);
  assert.equal(next(), 'gate-3');
  sp('confirm', 'gate-3', '--subject', 'reminders', '--film', 'promo');
  assert.equal(next(), 'review');
  // Status gives each brand's film, where the comments are.
  const status = sp('status', 'reminders', '--film', 'promo', '--json').json;
  assert.deepEqual(status.urls, { harbor: `${'https:'}//example.invalid/harbor`, lumen: `${'https:'}//example.invalid/lumen` });
  assert.match(status.gate3, /^2026-/);
  assert.match(fs.readFileSync(path.join(film, 'state.md'), 'utf8'), /- gate-3: passed /);
  // A new build needs the checks, the review and gate 3 again.
  sp('state', 'reminders', '--decision', 'Name: Nudges');
  assert.equal(next(), 'build');
});
