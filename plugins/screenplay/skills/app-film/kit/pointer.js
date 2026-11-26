// The pointer (spec 7.4, 9): a cursor that moves to each control a beat acts on, ripples on a click, and stays pinned
// to its target while the camera moves; or none, when each control shows its own pressed state. Either way the target
// shows the app's own hover and pressed looks, which the build answers to data-sp-hover and data-sp-active.
(function (SP) {
  SP.POINTER = { travel: 0.6, hover: 0.25, press: 0.15, ripple: 0.45, from: { x: 140, y: 110 } };

  // The cursor's path through a scene: for each beat that acts on a target, the point it goes to (a field's start, any
  // other target's middle), in stage pixels before the camera, and when its travel there starts and ends.
  SP.cursorKeys = function (sc, w) {
    const keys = [];
    sc.beats.forEach((b, n) => {
      const target = w.targets[n];
      if (b.act === null || !target.node) return;
      const box = target.box;
      const x = b.do === 'type' ? box.x + Math.min(24, box.w / 4) : box.x + box.w / 2;
      const at = { x: w.look.x + x * w.look.s, y: w.look.y + (box.y + box.h / 2) * w.look.s };
      const landed = b.start + (b.move ? b.move[1] : 0);
      const end = b.start + b.act;
      keys.push({ t0: Math.min(end, Math.max(landed, end - SP.POINTER.travel)), t1: end, at, click: b.do === 'click' });
    });
    return keys;
  };

  // Where the cursor is at t, and how much of it shows: it comes in on its first travel from a little below and to the
  // right, eases from point to point, and rests on each target until the next travel.
  SP.cursorAt = function (keys, t) {
    if (!keys.length || t < keys[0].t0) return null;
    const first = keys[0];
    let from = { x: first.at.x + SP.POINTER.from.x, y: first.at.y + SP.POINTER.from.y };
    let at = from;
    for (const k of keys) {
      if (t < k.t0) break;
      const p = SP.at(t, k.t0, k.t1 - k.t0);
      at = { x: SP.lerp(from.x, k.at.x, p), y: SP.lerp(from.y, k.at.y, p) };
      from = k.at;
    }
    return { ...at, alpha: SP.at(t, first.t0, 0.2) };
  };

  // Whether a target shows the app's hover and pressed looks at t, over every beat that acts on it: hovered with a
  // cursor from just before each act (through the beat's end for a point), and pressed a moment after each click.
  SP.statesAt = function (beats, t, cursor) {
    let hover = false;
    let press = false;
    for (const b of beats) {
      const act = b.start + b.act;
      hover = hover || (cursor && t >= act - 0.05 && t < (b.do === 'point' ? b.start + b.dur : act + SP.POINTER.hover));
      press = press || (b.do === 'click' && t >= act && t < act + SP.POINTER.press);
    }
    return { hover, press };
  };

  // The pointer's render: the cursor and its ripples in the frame, and the hover and pressed states on the targets.
  SP.pointer = function (kit, d, sc, w) {
    const keys = SP.cursorKeys(sc, w);
    const show = d.film.mods.pointer === 'cursor';
    const cursor = SP.el('div', 'sp-cursor');
    const ripple = SP.el('div', 'sp-ripple');
    if (show) w.overlay.append(ripple, cursor);
    // A target's states come from all its beats together, so one beat's "off" never hides another's "on".
    const acted = new Map();
    sc.beats.forEach((b, n) => {
      const node = w.targets[n].node;
      if (!node || b.act === null || b.do === 'type') return;
      if (!acted.has(node)) acted.set(node, []);
      acted.get(node).push(b);
    });
    return (t, pose) => {
      for (const [node, beats] of acted) {
        const s = SP.statesAt(beats, t, show);
        node.toggleAttribute('data-sp-hover', s.hover);
        node.toggleAttribute('data-sp-active', s.press);
      }
      if (!show) return;
      const at = SP.cursorAt(keys, t);
      cursor.style.visibility = at ? 'visible' : 'hidden';
      if (at) {
        const p = SP.project(pose, at.x, at.y);
        cursor.style.opacity = String(at.alpha);
        cursor.style.transform = `translate(${p.x}px, ${p.y}px)`;
      }
      const click = keys.find((k) => k.click && t >= k.t1 && t < k.t1 + SP.POINTER.ripple);
      ripple.style.visibility = click ? 'visible' : 'hidden';
      if (click) {
        const p = SP.project(pose, click.at.x, click.at.y);
        const q = (t - click.t1) / SP.POINTER.ripple;
        ripple.style.opacity = String(0.5 * (1 - q));
        ripple.style.transform = `translate(${p.x}px, ${p.y}px) scale(${0.3 + 0.9 * q})`;
      }
    };
  };
})(SP);
