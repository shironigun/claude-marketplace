// The walkthrough patterns the kit draws itself (spec 7.6, 9). A column sweep moves a band of focus across a table's
// columns; a row pop-in brings a new row into its list; a timeline build shows a history's events one at a time. Each
// acts on the first beat of its scene whose target it fits, from the moment the camera lands there, and leaves alone
// whatever must not show. The other patterns (a section tour, a tab tour, focused typing, a dialog's steps, a
// hand-off, and before and after counters) are the story's own beats, so every number a film shows is one the demo
// data holds.
(function (SP) {
  const ROWS = 'tr, li, [role=row], [role=listitem]';
  const shown = (e) => !e.closest('[data-sp-hide]');

  // The column a sweep over `n` columns has reached at t, sweeping its window [a, b] evenly, or -1 outside it.
  SP.sweepAt = (n, win, t) => (t < win[0] || t >= win[1] || !n ? -1 : Math.min(n - 1, Math.floor(((t - win[0]) / (win[1] - win[0])) * n)));

  // How many of `n` events a timeline build shows at t: none before its window [a, b], then one more at each even
  // step of it, every one from its last step on.
  SP.builtAt = (n, win, t) => (t < win[0] ? 0 : win[1] <= win[0] ? n : Math.min(n, 1 + Math.floor(((t - win[0]) / (win[1] - win[0])) * n)));

  // When the camera lands on a beat's target, in the scene's time, and the window a pattern plays in: from just after
  // the landing to the caption's end, or to just before the beat ends.
  const landed = (b) => b.start + (b.move ? b.move[1] : 0);
  const windowOf = (b) => [landed(b) + 0.2, b.start + (b.caption ? b.caption[1] : b.dur - 0.2)];
  // The table a sweep crosses: the target, or the first table in it, that may show.
  const tableOf = (node) => (node.matches('table') ? [node] : [...node.querySelectorAll('table')]).find(shown) || null;

  // Each pattern: whether it fits a target, and its part of the scene, built once and drawn at t.
  const PATTERNS = {
    'column-sweep': {
      fits: (node) => Boolean(tableOf(node)),
      make(w, b, node) {
        const table = tableOf(node);
        // Measured in the tab state the sweep plays in; a header cell that must not show, or has no width then, gets
        // no band.
        SP.showTabs(w, landed(b));
        const row = table.querySelector('thead tr') || table.querySelector('tr');
        const cells = (row ? [...row.children] : []).filter(shown).map((c) => SP.boxIn(c, w.win)).filter((box) => box.w > 0);
        const tbox = SP.boxIn(table, w.win);
        const bands = cells.map((box) => {
          const band = SP.el('div', 'sp-band');
          band.style.left = `${box.x - 6}px`;
          band.style.top = `${tbox.y - 6}px`;
          band.style.width = `${box.w + 12}px`;
          // A table longer than the window is banded only to the window's foot.
          band.style.height = `${Math.min(tbox.h + 12, SP.WINDOW.h - tbox.y + 6)}px`;
          w.lifts.append(band);
          return band;
        });
        const win = windowOf(b);
        return (t) => {
          const at = SP.sweepAt(bands.length, win, t);
          bands.forEach((band, i) => { band.style.visibility = i === at ? 'visible' : 'hidden'; });
        };
      },
    },
    'row-pop-in': {
      fits: (node) => node.matches(ROWS) && shown(node),
      make(w, b, node) {
        // Once in, the row has the screen's own look again.
        const was = { opacity: node.style.opacity, translate: node.style.translate, scale: node.style.scale };
        return (t) => {
          const p = SP.at(t, landed(b), 0.35);
          node.style.opacity = p < 1 ? String(p) : was.opacity;
          node.style.translate = p < 1 ? `0 ${8 * (1 - p)}px` : was.translate;
          node.style.scale = p < 1 ? String(0.97 + 0.03 * p) : was.scale;
        };
      },
    },
    'timeline-build': {
      fits: (node) => [...node.querySelectorAll(ROWS)].filter(shown).length > 1,
      make(w, b, node) {
        const events = [...node.querySelectorAll(ROWS)].filter(shown);
        const was = events.map((e) => e.style.visibility);
        const win = windowOf(b);
        return (t) => {
          const at = SP.builtAt(events.length, win, t);
          events.forEach((e, i) => { e.style.visibility = i < at ? was[i] : 'hidden'; });
        };
      },
    },
  };

  // The scene's pattern, on the first beat whose target fits it, or nothing for a pattern the beats carry. The beat it
  // acts on is kept in `w.patternBeat` (-1 for none): that beat is its own focus, and no callout lifts it.
  SP.patterns = function (kit, d, sc, w) {
    const pattern = PATTERNS[sc.pattern];
    const n = pattern ? sc.beats.findIndex((b, i) => w.targets[i].node && pattern.fits(w.targets[i].node)) : -1;
    w.patternBeat = n;
    return n < 0 ? () => {} : pattern.make(w, sc.beats[n], w.targets[n].node);
  };
})(SP);
