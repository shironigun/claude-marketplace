// The kit's core (spec 7.8): the namespace every kit file adds to, the frame and the window, the time and DOM helpers,
// and the scene each scene module asks for. Everything on screen is a pure function of the scene's time: the Motion
// player draws any frame in any order and expects the same picture each time (film rule 12).
(function (SP) {
  // The stage at 1080p, the window the screens were rebuilt for (spec 7.1), and the safe area (film rule 8).
  SP.STAGE = { w: 1920, h: 1080 };
  SP.WINDOW = { w: 1440, h: 900 };
  SP.SAFE = 40;
  // Where each look puts the window on the stage (spec 9): its left, its top and its scale. Full bleed fills the
  // frame's width from its top edge, so the top bar and the rail stay in every shot, and lets the window's last 90 px
  // fall below the frame. (A split caption panel arrives in release 2.)
  SP.LOOKS = {
    'floating-desk': { x: 240, y: 90, s: 1 },
    'full-bleed': { x: 0, y: 0, s: 4 / 3 },
  };

  SP.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // Ease in and out over [0, 1], flat at both ends: holds stay still (film rule 3).
  SP.smooth = (x) => {
    const p = SP.clamp(x, 0, 1);
    return p * p * (3 - 2 * p);
  };
  // Ease out with a small overshoot, for the logo's pop on a title card.
  SP.pop = (x) => {
    const p = SP.clamp(x, 0, 1) - 1;
    return 1 + p * p * (2.4 * p + 1.4);
  };
  SP.lerp = (a, b, p) => a + (b - a) * p;
  // How far a step that starts at `a` and takes `d` seconds has come at t, eased.
  SP.at = (t, a, d) => (d > 0 ? SP.smooth((t - a) / d) : t >= a ? 1 : 0);

  // An element with its class and attributes. Words are set as text, so nothing a story says is read as markup.
  SP.el = function (tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
  };
  SP.words = function (tag, cls, text) {
    const e = SP.el(tag, cls);
    e.textContent = text;
    return e;
  };
  // A stylesheet in the scene: its text goes in as text, never through the HTML parser (spec 5.11).
  SP.css = function (kit, text) {
    const s = SP.el('style');
    s.textContent = text;
    kit.stage.append(s);
    return s;
  };

  // The film's data, read once: its timing table and story (film.json) and this brand's overlay (brand.json).
  SP.data = function (kit) {
    if (!SP.film) SP.film = { film: kit.json('film.json'), brand: kit.json('brand.json') };
    return SP.film;
  };

  // The scene a scene module asks for (spec 5.12): a card, or a screen scene of the timing table. Its render is its
  // own, however the player calls it.
  SP.scene = function (id) {
    let play = null;
    return {
      init(kit) {
        const d = SP.data(kit);
        const sc = d.film.scenes[id];
        play = sc.kind === 'screen' ? SP.screen(kit, d, sc) : SP.card(kit, d, sc);
      },
      render(t) {
        play(t);
      },
    };
  };
})(SP);
