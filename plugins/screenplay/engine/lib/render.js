'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const { checkError } = require('./errors');
const { PLAYER_FILES } = require('./tools');

// The Motion player's own offline entry (index.html#tools, window.__animation), opened in the user's Chromium with no
// network (spec 12, 13): the page loads only the player's three files, and the film's documents reach it through
// load(). The film's code comes from the app's repository, so it runs where it can reach nothing: every name resolves
// to nothing, every request goes to a closed local port, and WebRTC is gone.
const ARGS = [
  '--font-render-hinting=none', '--force-color-profile=srgb', '--disable-lcd-text', '--autoplay-policy=no-user-gesture-required',
  '--host-resolver-rules=MAP * ^NOTFOUND', '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=<-loopback>',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp', '--webrtc-ip-handling-policy=disable_non_proxied_udp',
];
// The stage the player renders: 1920 by 1080 at scale 1 (the kit's STAGE).
const STAGE = { width: 1920, height: 1080 };

// A brand's film as the player's load() takes it: its script and modules, from the documents the stage would write.
function playerFiles(docs) {
  return {
    title: docs['film/meta'].title,
    script: docs['film/script'].code,
    modules: Object.entries(docs).filter(([k]) => k.startsWith('modules/')).map(([k, d]) => ({ name: k.slice(8), kind: d.kind, text: d.text })),
    assets: [],
  };
}

// Opens the player: `tools` from readyTools, `launch` playwright-core's chromium.launch. Only the player's three files
// load, by the addresses the first navigation gives them, and data: and blob: URLs; anything else is refused.
async function openPlayer(tools, launch) {
  const browser = await launch({ executablePath: tools.chromium, args: ARGS });
  try {
    const page = await browser.newPage({ viewport: STAGE });
    const context = page.context();
    await context.addInitScript(() => {
      for (const k of ['RTCPeerConnection', 'webkitRTCPeerConnection']) Reflect.deleteProperty(globalThis, k);
    });
    let here = null;
    await context.route('**/*', (route) => {
      const request = route.request();
      const url = request.url().split(/[?#]/)[0];
      if (!here && request.isNavigationRequest()) here = url.slice(0, url.lastIndexOf('/') + 1);
      return PLAYER_FILES.some((f) => url === here + f) || /^(data|blob):/.test(url) ? route.continue() : route.abort();
    });
    await page.goto(`${pathToFileURL(path.join(tools.player, 'index.html')).href}#tools`);
    await page.waitForFunction(() => typeof window.__animation === 'object');
    return { page, close: () => browser.close() };
  } catch (e) {
    await browser.close();
    throw e;
  }
}

// Loads a film into an open player, and returns what the player says of it: { duration, chapters, ... }.
async function loadFilm(session, files) {
  const r = await session.page.evaluate((f) => window.__animation.load(f), files);
  if (r.error) throw checkError(`the player could not load the film: ${String(r.error.message || r.error).slice(0, 400)}`);
  return r.meta;
}

const png = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

// The still at t, from the player's own export raster, as PNG bytes; `scale` 1 is the full 1920 by 1080.
async function still(session, t, scale = 1) {
  return png(await session.page.evaluate(([time, s]) => window.__animation.frame(time, { scale: s }), [t, scale]));
}

// What the player plays (spec 5.13's timing check): its length and its scenes' starts, the score's events and the
// sounds it lacks, and the lines the film logged that were not plain logs (a font it could not load, a throw).
async function played(session, meta) {
  const r = await session.page.evaluate(async () => {
    const a = window.__animation;
    const score = await a.score();
    const report = await a.scoreReport();
    return { events: (score && score.events) || [], unknown: (report && report.unknown) || [], log: a.consoleLog() };
  });
  return {
    duration: meta.duration,
    chapters: meta.chapters.map((c) => c.t),
    events: r.events.map((e) => ({ t: e.t, kind: e.kind, patch: e.patch })),
    unknown: r.unknown,
    log: r.log.filter((l) => l.level !== 'log').map((l) => ({ level: String(l.level), text: String(l.text).slice(0, 600) })),
  };
}

// A contact sheet (spec 5.13): the stills in a grid, each under its label, drawn on a canvas in the player's page.
// `tiles` are { png, label }; each still is drawn `width` pixels wide.
async function sheet(session, tiles, columns = 4, width = 480) {
  const srcs = tiles.map((t) => ({ src: `data:image/png;base64,${t.png.toString('base64')}`, label: t.label }));
  return png(await session.page.evaluate(async function drawSheet([list, cols, w]) {
    const images = await Promise.all(list.map((t) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = t.src;
    })));
    const h = Math.round((w * 9) / 16);
    const pad = 8;
    const cap = 26;
    const canvas = document.createElement('canvas');
    canvas.width = cols * (w + pad) + pad;
    canvas.height = Math.ceil(images.length / cols) * (h + cap + pad) + pad;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.font = '15px sans-serif';
    images.forEach((img, k) => {
      const x = pad + (k % cols) * (w + pad);
      const y = pad + Math.floor(k / cols) * (h + cap + pad);
      g.fillStyle = '#222222';
      g.fillText(list[k].label, x, y + 18);
      g.drawImage(img, x, y + cap, w, h);
      g.strokeStyle = '#cccccc';
      g.strokeRect(x + 0.5, y + cap + 0.5, w - 1, h - 1);
    });
    return canvas.toDataURL('image/png');
  }, [srcs, columns, width]));
}

// A part of a still, at full scale: `box` is { x, y, w, h } on the 1920 by 1080 stage.
async function crop(session, pngBytes, box) {
  return png(await session.page.evaluate(async function cropStill([src, b]) {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = b.w;
    canvas.height = b.h;
    canvas.getContext('2d').drawImage(img, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    return canvas.toDataURL('image/png');
  }, [`data:image/png;base64,${pngBytes.toString('base64')}`, box]));
}

module.exports = { ARGS, STAGE, playerFiles, openPlayer, loadFilm, still, played, sheet, crop };
