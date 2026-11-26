// The world of a screen scene (spec 7.1, 5.11): the ground, the app's window framed for the look, and in the window one
// body of the screen's class holding the page and each layer the scene shows, each in a wrapper of its own, as the
// app's body holds its root and its portals, so the screen's CSS applies as written (a rule for the body's children
// reaches them through the wrapper: lib/filmcss.js). Layers open on the beats that open them, a tab click shows what
// its tab names, the logo slots show the brand's logos, and nothing on the must-not-show list is painted.
(function (SP) {
  // How long a layer takes to open, eased: product UI only eases (no overshoot).
  const OPEN = 0.25;

  // When each surface shows, in seconds from the scene's start: the page from the start; a layer a beat names, when a
  // click on it acts, or from that beat's start for any other beat; any other layer from the start, as one an earlier
  // scene left open.
  SP.layerTimes = function (sc) {
    return sc.surfaces.map((s, i) => {
      if (s.kind === 'page') return 0;
      const b = sc.beats.find((x) => SP.openedSurface(sc, x) === i);
      if (!b) return 0;
      return b.start + (b.do === 'click' && b.act !== null ? b.act + 0.1 : 0);
    });
  };

  // The surface a beat opens: the index of the layer its action names, or -1.
  SP.openedSurface = (sc, b) => (b.opens ? sc.surfaces.findIndex((s) => s.kind !== 'page' && s.kind === b.opens.kind && s.action === b.opens.action) : -1);

  // The tabs the scene's beats click, each with the moment its click lands.
  SP.tabSwitches = (sc) => sc.beats.filter((b) => b.tab && b.act !== null).map((b) => ({ at: b.start + b.act + 0.1, label: b.tab }));

  // The tab state a group of tab panels shows at t: the label of the last switch to one of its labels, or null for the
  // state the screen starts in.
  SP.tabAt = (switches, labels, t) => switches.filter((s) => s.at <= t && labels.includes(s.label)).map((s) => s.label).pop() || null;

  // When a beat's target is measured: at the beat's start, in the tab state its act sees. Every earlier click's switch
  // has landed by then, since a switch lands inside its own beat, and the beat's own click has not switched yet.
  SP.measureAt = (b) => b.start;

  // A node's box in window pixels, whatever scale the player and the look draw the window at.
  SP.boxIn = function (node, win) {
    const a = node.getBoundingClientRect();
    const b = win.getBoundingClientRect();
    const s = b.width / SP.WINDOW.w;
    return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s };
  };

  // The box a shot of a target frames: the target's own, or, when it holds something that must not show, the union of
  // its children that hold none (spec 5.11: such an element stays out of frame).
  SP.frameBox = function (node, win) {
    if (!node.querySelector('[data-sp-hide]')) return SP.boxIn(node, win);
    const kept = [...node.children].filter((c) => !c.matches('[data-sp-hide]') && !c.querySelector('[data-sp-hide]'));
    if (!kept.length) return SP.boxIn(node, win);
    const boxes = kept.map((c) => SP.boxIn(c, win));
    const l = Math.min(...boxes.map((b) => b.x));
    const t = Math.min(...boxes.map((b) => b.y));
    const r = Math.max(...boxes.map((b) => b.x + b.w));
    const btm = Math.max(...boxes.map((b) => b.y + b.h));
    return { x: l, y: t, w: r - l, h: btm - t };
  };

  // The world of a screen scene, built once: the elements, the times of its layers and tabs, and its tab groups.
  SP.world = function (kit, d, sc) {
    const look = SP.LOOKS[d.film.mods.look] || SP.LOOKS['floating-desk'];
    const vars = Object.entries(d.brand.vars).map(([k, v]) => `${k}: ${v};`).join(' ');
    SP.css(kit, `.sp-window { ${vars} }\n${kit.module(sc.css)}`);
    const world = SP.el('div', 'sp-world');
    const win = SP.el('div', 'sp-window');
    win.style.left = `${look.x}px`;
    win.style.top = `${look.y}px`;
    win.style.transform = `scale(${look.s})`;
    const body = SP.el('div', `sp-body ${sc.prefix}`);
    const surfaces = sc.surfaces.map((s) => {
      // The action that opens a layer names it, so verify can find the layer a beat opens.
      const box = SP.el('div', 'sp-surface', { 'data-kind': s.kind, ...(s.action ? { 'data-sp-action': s.action } : {}) });
      if (s.kind === 'dialog') box.append(SP.el('div', 'sp-backdrop'));
      box.insertAdjacentHTML('beforeend', s.module.endsWith('.json') ? kit.json(s.module)[s.key] : kit.module(s.module));
      body.append(box);
      return { kind: s.kind, box };
    });
    win.append(body);
    world.append(SP.el('div', 'ground sp-ground'), win);
    kit.stage.append(world);
    // Each logo slot shows the logo its brand shows in that place, at that brand's size (spec 5.3, 5.12).
    for (const slot of body.querySelectorAll('[data-sp-slot~="logo"]')) {
      const place = d.brand.places[slot.getAttribute('data-sp-logo')];
      slot.textContent = '';
      if (!place || !d.brand.logos[place.logo]) continue;
      const img = SP.el('img', 'sp-logo', { src: d.brand.logos[place.logo], alt: d.brand.name });
      img.style.height = `${place.height}px`;
      if (place.inset) img.style.paddingLeft = `${place.inset}px`;
      slot.append(img);
    }
    // Nothing on the must-not-show list is painted, whatever the screen's CSS says (spec 5.11): inline and important,
    // so no rule of the screen's outranks it, and see-through, so no child it holds shows either.
    for (const e of body.querySelectorAll('[data-sp-hide]')) {
      e.style.setProperty('visibility', 'hidden', 'important');
      e.style.setProperty('opacity', '0', 'important');
    }
    // A style attribute's own transition or animation goes too: an inline important one would outrank the kit's
    // layer, and a frame never depends on the clock (film rule 12).
    for (const e of body.querySelectorAll('[style]')) {
      e.style.removeProperty('transition');
      e.style.removeProperty('animation');
    }
    // Tab panels, grouped by their parent; the kit shows and hides them itself, whatever the app's CSS says of hidden.
    const groups = new Map();
    for (const e of body.querySelectorAll('[data-sp-state]')) {
      if (!groups.has(e.parentElement)) groups.set(e.parentElement, []);
      groups.get(e.parentElement).push({ e, label: e.getAttribute('data-sp-state'), first: !e.hasAttribute('hidden') });
      e.removeAttribute('hidden');
    }
    return {
      look, world, win, body, surfaces,
      layerAt: SP.layerTimes(sc),
      switches: SP.tabSwitches(sc),
      groups: [...groups.values()].map((g) => ({ items: g, labels: g.map((x) => x.label) })),
    };
  };

  // Shows each group's panels for the tab state at t.
  SP.showTabs = function (w, t) {
    for (const g of w.groups) {
      const label = SP.tabAt(w.switches, g.labels, t);
      for (const x of g.items) {
        if (label === null ? x.first : x.label === label) x.e.removeAttribute('data-sp-off');
        else x.e.setAttribute('data-sp-off', '');
      }
    }
  };

  // Shows each layer as it opens at t: a drawer slides in a little, a dialog settles, a toast rises. The motion goes on
  // the layer's own elements through the separate translate and scale properties: a transform on the surface would
  // take the app's fixed drawers out of the window, and the app's own transform (a centred toast) stays as it is.
  SP.showLayers = function (w, t) {
    w.surfaces.forEach((s, i) => {
      const at = w.layerAt[i];
      const p = at <= 0 ? 1 : SP.at(t, at, OPEN);
      s.box.style.visibility = p > 0 ? 'visible' : 'hidden';
      s.box.style.opacity = String(p);
      const q = 1 - p;
      for (const e of s.box.children) {
        if (e.classList.contains('sp-backdrop')) continue;
        e.style.translate = s.kind === 'drawer' ? `${24 * q}px 0` : s.kind === 'toast' ? `0 ${12 * q}px` : '';
        e.style.scale = s.kind === 'dialog' ? String(1 - 0.03 * q) : '';
      }
    });
  };

  // A screen scene (spec 5.11, 7.2-7.5): builds the world, measures every beat's target in the state its act sees,
  // plans the camera's shots, adds its pattern, the pointer, typing and then the callouts, and returns its render.
  // The lifted cards ride with the window under the camera; the chips, leaders and cursor sit in the frame above it.
  SP.screen = function (kit, d, sc) {
    const w = SP.world(kit, d, sc);
    w.targets = sc.beats.map((b) => {
      SP.showTabs(w, SP.measureAt(b));
      const node = w.body.querySelector(`[data-sp~="${b.hook}"]`);
      const box = node && SP.frameBox(node, w.win);
      return box && box.w > 0 && box.h > 0 ? { node, box } : { node: null, box: null };
    });
    // A layer a beat opens joins the shot that beat holds, so the layer opens in frame; a layer keeps its layout while
    // it waits to show, so its box is there to measure. A target inside a dialog or toast frames that whole layer,
    // which is seen whole or not at all. A beat whose target is not there, or has no box then, holds the shot before
    // it. The scene opens on the whole window.
    const layerBox = (surface) => {
      const root = surface && [...surface.children].find((c) => !c.classList.contains('sp-backdrop'));
      const box = root && SP.boxIn(root, w.win);
      return box && box.w > 0 && box.h > 0 ? box : null;
    };
    const opened = sc.beats.map((b) => {
      const i = SP.openedSurface(sc, b);
      return i < 0 ? null : layerBox(w.surfaces[i].box);
    });
    const boxes = w.targets.map((x) => x.box && SP.shotBox(x.box, layerBox(x.node.closest('.sp-surface[data-kind="dialog"], .sp-surface[data-kind="toast"]'))));
    w.shots = SP.shotBoxes(sc.beats, boxes, opened).map((box) => (box ? SP.shotFor(box, w.look) : null));
    w.shots.forEach((s, i) => { if (!s) w.shots[i] = i ? w.shots[i - 1] : SP.wide(); });
    w.cam = SP.cameraKeys(sc.beats, w.shots, SP.wide());
    w.lifts = SP.el('div', 'sp-lifts');
    w.lifts.style.left = w.win.style.left;
    w.lifts.style.top = w.win.style.top;
    w.lifts.style.transform = w.win.style.transform;
    w.world.append(w.lifts);
    w.overlay = SP.el('div', 'sp-overlay');
    kit.stage.append(w.overlay);
    const parts = [SP.patterns, SP.pointer, SP.typing].map((part) => part(kit, d, sc, w));
    // The frame at t but for its callouts: tabs, layers, camera, pattern, hover and pressed looks, focus and typed
    // words. The callouts come last, so a lifted card copies its target as this frame shows it at the card's moment.
    w.frameAt = (t) => {
      SP.showTabs(w, t);
      SP.showLayers(w, t);
      const pose = SP.pose(w.cam, t);
      w.world.style.transform = SP.transform(pose);
      parts.forEach((render) => render(t, pose));
      return pose;
    };
    const callouts = SP.callouts(kit, d, sc, w);
    return (t) => callouts(t, w.frameAt(t));
  };
})(SP);
