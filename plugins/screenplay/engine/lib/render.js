'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { checkError } = require('./errors');
const { PLAYER_FILES } = require('./tools');
const { alphaOf, imageOpaque } = require('./verify');

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

// What verify's checks read in the film's own frame (the player's srcdoc), at the time the player was sought to, in
// stage pixels: the camera, the app's window, every hook's element, the callouts and a card's parts, each layer with
// whether something opaque covers it, and each logo in a place. Runs in the page, given `alphaOf` (lib/verify.js), which
// the page has not otherwise. `scale` is the window's own size on the stage, the look's scale times the camera's zoom.
function measureFrame(alphaOf, imageOpaque) {
  const r1 = (n) => Math.round(n * 10) / 10;
  const box = (e) => {
    const r = e.getBoundingClientRect();
    return { x: r1(r.x), y: r1(r.y), w: r1(r.width), h: r1(r.height) };
  };
  const shown = (e) => {
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const opaque = (e) => {
    const cs = getComputedStyle(e);
    return alphaOf(cs.backgroundColor) >= 1 || imageOpaque(cs.backgroundImage, alphaOf);
  };
  const all = (sel, kind) => [...document.querySelectorAll(sel)].map((e) => ({ kind, ...box(e), shown: shown(e) }));
  const world = document.querySelector('.sp-world');
  const win = document.querySelector('.sp-window');
  const body = document.querySelector('.sp-window > .sp-body');
  // The focus-pop's blur and dim on the window's body are a callout too: they leave with the caption.
  const focus = body && getComputedStyle(body).filter !== 'none' ? [{ kind: 'focus', ...box(win), shown: true }] : [];
  return {
    camera: world ? ((d) => [d.a, d.b, d.c, d.d, d.e, d.f].map(r1))(new DOMMatrix(getComputedStyle(world).transform)) : null,
    scale: win ? win.getBoundingClientRect().width / 1440 : 1,
    window: win ? box(win) : null,
    hooks: [...document.querySelectorAll('[data-sp]')].flatMap((e) => e.getAttribute('data-sp').split(/\s+/).filter(Boolean)
      .map((hook) => ({ hook, ...box(e), shown: shown(e) }))),
    callouts: [...all('.sp-chip', 'chip'), ...all('.sp-subtitle', 'caption'), ...all('.sp-lift', 'lifted card'), ...all('.sp-step', 'step badge'), ...all('.sp-leader', 'leader'), ...focus],
    cards: all('.sp-card > *', 'card'),
    layers: [...document.querySelectorAll('.sp-surface:not([data-kind="page"])')].map((s) => {
      const root = [...s.children].find((c) => !c.classList.contains('sp-backdrop'));
      if (!root) return null;
      const b = box(root);
      // Something opaque covers nearly all of the layer: its own background, or one of its parts'.
      const covered = [root, ...root.querySelectorAll('*')].some((e) => opaque(e) && box(e).w * box(e).h >= 0.9 * b.w * b.h);
      return { kind: s.getAttribute('data-kind'), ...b, shown: shown(root), opaque: covered };
    }).filter(Boolean),
    logos: [...document.querySelectorAll('[data-sp-logo] img.sp-logo')].map((e) => ({
      place: e.closest('[data-sp-logo]').getAttribute('data-sp-logo'), src: e.getAttribute('src'), ...box(e), shown: shown(e),
    })),
  };
}

// The film at t, measured in its own frame: the player is sought to t first. Null when the frame is not there, which
// the checks report.
async function measure(session, t) {
  await session.page.evaluate((time) => window.__animation.seek(time), t);
  const frame = session.page.frames().find((f) => f.url() === 'about:srcdoc');
  return frame ? frame.evaluate(`(${measureFrame})(${alphaOf}, ${imageOpaque})`) : null;
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

// A still's file name, in film order: t_012.300.png.
const stillName = (t) => `t_${t.toFixed(3).padStart(7, '0')}.png`;

// Writes the stills of `moments` ({ t, label, scene }) at half size into dir/frames; asked, a contact sheet a scene
// (one for all when the moments name none) into dir/sheets, and a full-size crop of `box` from each into dir/crops.
// Returns the files written, and each still's bytes by its time.
async function writeStills(session, moments, dir, { sheets = false, box = null } = {}) {
  const out = { frames: [], sheets: [], crops: [], pngs: new Map() };
  const write = (file, bytes) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, bytes);
    return file;
  };
  for (const m of moments) {
    const bytes = await still(session, m.t, 0.5);
    out.pngs.set(m.t, bytes);
    out.frames.push(write(path.join(dir, 'frames', stillName(m.t)), bytes));
    if (box) {
      const name = `c_${m.t.toFixed(3).padStart(7, '0')}_${box.x}_${box.y}_${box.w}_${box.h}.png`;
      out.crops.push(write(path.join(dir, 'crops', name), await crop(session, await still(session, m.t, 1), box)));
    }
  }
  if (sheets) {
    const groups = new Map();
    for (const m of moments) groups.set(m.scene || 'stills', [...(groups.get(m.scene || 'stills') || []), { label: m.label, png: out.pngs.get(m.t) }]);
    for (const [name, list] of groups) out.sheets.push(write(path.join(dir, 'sheets', `${name}.png`), await sheet(session, list)));
  }
  return out;
}

module.exports = { ARGS, STAGE, playerFiles, openPlayer, loadFilm, still, played, measureFrame, measure, sheet, crop, writeStills };
