// The camera (spec 7.2): holds are perfectly still, and it moves only between shots, gliding or cutting as the mods
// say. A shot is a point of the stage at the frame's centre and a zoom: { cx, cy, z }.
(function (SP) {
  // The space a shot keeps round its target, in window pixels; the zooms a shot keeps to, never out past the whole
  // window and a small target close up (film rule 7); the zoom under which a shot is the whole window; and the share of
  // the frame a drawer's shot leaves free for its caption.
  SP.CAM = { pad: 48, zMin: 1, zMax: 2.4, snap: 1.1, room: 0.22 };

  // The whole window, as the look sets it on the stage: where every scene starts unless it carries a shot over.
  SP.wide = () => ({ cx: SP.STAGE.w / 2, cy: SP.STAGE.h / 2, z: 1 });

  // The shot that frames a box of the window (spec 7.2): the box with room round it fills the safe area, zoomed between
  // zMin and zMax, and the frame stays inside the window. A box on the window's right or left edge (a drawer, a
  // panel) sits to that side, leaving the other side free for captions.
  SP.shotFor = function (box, look) {
    if (!box) return SP.wide();
    const s = look.s;
    const safe = { w: SP.STAGE.w - 2 * SP.SAFE, h: SP.STAGE.h - 2 * SP.SAFE };
    const fit = Math.min(safe.w / ((box.w + 2 * SP.CAM.pad) * s), safe.h / ((box.h + 2 * SP.CAM.pad) * s));
    const z = SP.clamp(fit, SP.CAM.zMin, SP.CAM.zMax);
    if (z < SP.CAM.snap) return SP.wide();
    const half = { w: SP.STAGE.w / 2 / z, h: SP.STAGE.h / 2 / z };
    const win = { l: look.x, t: look.y, r: look.x + SP.WINDOW.w * s, b: look.y + SP.WINDOW.h * s };
    let cx = look.x + (box.x + box.w / 2) * s;
    const cy = look.y + (box.y + box.h / 2) * s;
    if (box.x + box.w >= SP.WINDOW.w - 4 && box.x > 4) cx -= SP.STAGE.w * SP.CAM.room / z;
    else if (box.x <= 4 && box.x + box.w < SP.WINDOW.w - 4) cx += SP.STAGE.w * SP.CAM.room / z;
    const keep = (c, lo, hi) => (lo > hi ? (lo + hi) / 2 : SP.clamp(c, lo, hi));
    return { cx: keep(cx, win.l + half.w, win.r - half.w), cy: keep(cy, win.t + half.h, win.b - half.h), z };
  };

  // The camera's moves through a scene: one for each beat that moves, from the shot before to the beat's shot, over
  // the beat's move window. `shots[i]` is beat i's shot; `start` the shot the scene opens on.
  SP.cameraKeys = function (beats, shots, start) {
    const keys = [];
    let last = start;
    beats.forEach((b, i) => {
      if (!b.move) return;
      keys.push({ t0: b.start + b.move[0], t1: b.start + b.move[1], from: last, to: shots[i] });
      last = shots[i];
    });
    return { start, keys };
  };

  // The widest a move between two shots draws back to on its way: wide enough at its middle to hold both shots'
  // centres, so a long move never crosses empty page close up.
  SP.dip = function (from, to) {
    const span = Math.min(SP.STAGE.w * 0.9 / Math.max(1, Math.abs(to.cx - from.cx)), SP.STAGE.h * 0.9 / Math.max(1, Math.abs(to.cy - from.cy)));
    return SP.clamp(span, 1, Math.min(from.z, to.z));
  };

  // The shot at t: still between moves; during one, eased, with the zoom in log space so it feels even, drawing back
  // through the dip on the way.
  SP.pose = function (cam, t) {
    let at = cam.start;
    for (const k of cam.keys) {
      if (t < k.t0) break;
      const p = SP.at(t, k.t0, k.t1 - k.t0);
      if (p >= 1) {
        at = k.to;
        continue;
      }
      const [a, b, m] = [k.from.z, k.to.z, SP.dip(k.from, k.to)].map(Math.log);
      const back = Math.max(0, (a + b) / 2 - m);
      at = { cx: SP.lerp(k.from.cx, k.to.cx, p), cy: SP.lerp(k.from.cy, k.to.cy, p), z: Math.exp(SP.lerp(a, b, p) - 4 * p * (1 - p) * back) };
    }
    return at;
  };

  // Where a point of the stage lands in the frame for a shot, and the transform that shows the world in that shot.
  SP.project = (shot, x, y) => ({ x: SP.STAGE.w / 2 + (x - shot.cx) * shot.z, y: SP.STAGE.h / 2 + (y - shot.cy) * shot.z });
  SP.transform = (shot) => `translate(${SP.STAGE.w / 2 - shot.cx * shot.z}px, ${SP.STAGE.h / 2 - shot.cy * shot.z}px) scale(${shot.z})`;
})(SP);
