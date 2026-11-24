'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');
const { readyFilm, tempDir } = require('./helpers');
const { ARGS, playerFiles, openPlayer, loadFilm, still, played } = require('../lib/render');

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

test('sp render: a built film, the times or the plan, and the installed renderer', () => {
  const { sp, runSp, repo, env } = readyFilm('reminders', 'promo');
  const render = (...more) => runSp(repo, ['render', 'reminders', '--film', 'promo', ...more], env);
  assert.match(render('--brand', 'harbor', '--plan').stderr, /the film has no build yet; run sp build reminders --film promo/);
  sp('build', 'reminders', '--film', 'promo');
  assert.equal(render('--brand', 'acme', '--plan').code, 2);
  assert.match(render('--brand', 'harbor').stderr, /give one of --at <seconds,\.\.\.> or --plan/);
  assert.match(render('--brand', 'harbor', '--at', '1,40').stderr, /--at takes seconds inside the film, from 0 to under 34.8/);
  assert.match(render('--brand', 'harbor', '--at', '1', '--crop', '0,0,2000,10').stderr, /--crop takes x,y,w,h in whole pixels inside the 1920 by 1080 stage/);
  const r = render('--brand', 'harbor', '--plan', '--sheet');
  assert.equal(r.code, 1);
  assert.match(r.stderr, /the renderer is not installed; read the Motion player's files into a folder and run sp render --install <folder>/);
});
