// Callouts (spec 7.3, 9): one at a time, each caption a plain "label: value" in the product's own words, and each gone
// before the camera moves (film rule 4). Focus-pop, the default, blurs and dims the rest of the app and lifts the target
// in a card: 12 px of padding on every side at 1080p, its corners the target's radius plus the padding, and nothing but
// the target in it (film rule 8); a field being typed into, a control being clicked and a pattern's target are the
// focus themselves (spec 7.4-7.6). A caption chip sits in clear space inside the safe area, with a leader that ends on
// the target's edge, never on its words (film rule 9). Chip-and-leader leaves the app as it is; numbered steps badge
// each target with its step, inside the safe area; a subtitle bar runs the captions along the bottom of the frame.
(function (SP) {
  SP.LIFT = { pad: 12, gap: 44, blur: 2.5, dim: 0.86, fade: 0.2 };

  // Where a chip of size `chip` sits beside a target's box on screen: to its right, left, below or above, the first
  // side with room inside the safe area, else the side with the most, kept inside the safe area.
  SP.chipSpot = function (box, chip) {
    const s = SP.SAFE;
    const W = SP.STAGE.w;
    const H = SP.STAGE.h;
    const g = SP.LIFT.gap;
    const cy = SP.clamp(box.y + box.h / 2 - chip.h / 2, s, H - s - chip.h);
    const cx = SP.clamp(box.x + box.w / 2 - chip.w / 2, s, W - s - chip.w);
    const sides = [
      { side: 'right', x: box.x + box.w + g, y: cy, room: W - s - (box.x + box.w + g + chip.w) },
      { side: 'left', x: box.x - g - chip.w, y: cy, room: box.x - g - chip.w - s },
      { side: 'below', x: cx, y: box.y + box.h + g, room: H - s - (box.y + box.h + g + chip.h) },
      { side: 'above', x: cx, y: box.y - g - chip.h, room: box.y - g - chip.h - s },
    ];
    const fit = sides.find((p) => p.room >= 0) || sides.reduce((a, b) => (b.room > a.room ? b : a));
    return { side: fit.side, x: SP.clamp(fit.x, s, W - s - chip.w), y: SP.clamp(fit.y, s, H - s - chip.h) };
  };

  // A chip's leader: from the middle of the chip's side that faces the target to the nearest point of the target's
  // facing edge.
  SP.leader = function (box, spot, chip) {
    const midX = spot.x + chip.w / 2;
    const midY = spot.y + chip.h / 2;
    const alongY = SP.clamp(midY, box.y, box.y + box.h);
    const alongX = SP.clamp(midX, box.x, box.x + box.w);
    if (spot.side === 'right') return { x1: spot.x, y1: midY, x2: box.x + box.w, y2: alongY };
    if (spot.side === 'left') return { x1: spot.x + chip.w, y1: midY, x2: box.x, y2: alongY };
    if (spot.side === 'below') return { x1: midX, y1: spot.y, x2: alongX, y2: box.y + box.h };
    return { x1: midX, y1: spot.y + chip.h, x2: alongX, y2: box.y };
  };

  // A captioned beat's step number in a film of numbered steps: its place among the film's captioned beats, from 1.
  SP.stepOf = function (film, id, n) {
    let k = 0;
    for (const sid of film.order) {
      const sc = film.scenes[sid];
      for (const [i, b] of (sc.beats || []).entries()) {
        if (b.label) k += 1;
        if (sid === id && i === n) return k;
      }
    }
    return null;
  };

  // How far a callout has come in at t over its caption window [in, out]: up over `fade`, and down to nothing by out.
  SP.envelope = (t, win) => Math.min(SP.at(t, win[0], SP.LIFT.fade), 1 - SP.at(t, win[1] - SP.LIFT.fade, SP.LIFT.fade));

  // An element's pseudo-elements as the page draws them (a check, a toggle's knob, an asterisk, a placeholder), as
  // rules in `sheet` for its copy: the copy sits outside the screen's body, where none of the screen's rules reach. A
  // placeholder is copied only when the browser gives it a colour of its own.
  let copies = 0;
  function pseudoRules(e, copy, sheet) {
    for (const pseudo of ['::before', '::after', '::placeholder']) {
      if (pseudo === '::placeholder' && !e.matches('input[placeholder], textarea[placeholder]')) continue;
      const cs = getComputedStyle(e, pseudo);
      const drawn = pseudo === '::placeholder' ? cs.color && cs.color !== getComputedStyle(e).color : cs.content && cs.content !== 'none' && cs.content !== 'normal';
      if (!cs.length || !drawn) continue;
      if (!copy.hasAttribute('data-sp-copy')) copy.setAttribute('data-sp-copy', String((copies += 1)));
      const at = sheet.insertRule(`.sp-lift [data-sp-copy="${copy.getAttribute('data-sp-copy')}"]${pseudo} {}`, sheet.cssRules.length);
      const rule = sheet.cssRules[at];
      for (let k = 0; k < cs.length; k += 1) rule.style.setProperty(cs[k], cs.getPropertyValue(cs[k]));
    }
  }

  // A copy of the target with each element's computed style written on it, and its pseudo-elements' in `sheet`, so it
  // looks as it does in the page wherever it sits; it keeps the box it has in the window.
  function styledCopy(node, box, sheet) {
    const copy = node.cloneNode(true);
    const from = [node, ...node.querySelectorAll('*')];
    const to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((e, i) => {
      const cs = getComputedStyle(e);
      for (let k = 0; k < cs.length; k += 1) to[i].style.setProperty(cs[k], cs.getPropertyValue(cs[k]));
      to[i].removeAttribute('id');
      to[i].removeAttribute('data-sp');
      pseudoRules(e, to[i], sheet);
    });
    for (const [k, v] of Object.entries({ position: 'absolute', inset: 'auto', left: '0', top: '0', margin: '0', transform: 'none', translate: 'none', scale: 'none' })) {
      copy.style.setProperty(k, v);
    }
    copy.style.width = `${box.w}px`;
    copy.style.height = `${box.h}px`;
    return copy;
  }

  // A node's size on the stage, whatever scale the player draws it at.
  function sizeOn(node, stage) {
    const a = node.getBoundingClientRect();
    const s = stage.getBoundingClientRect().width / SP.STAGE.w;
    return { w: a.width / s, h: a.height / s };
  }

  // The colour the app paints behind a node: the background of its first ancestor that has one, else white.
  function behind(node) {
    for (let e = node; e && e.nodeType === 1; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c)) return c;
    }
    return '#ffffff';
  }

  // The scene's callouts, built once: each captioned beat's chip (and leader, card or badge, by style), placed for the
  // shot the beat holds. Returns the render that shows each in its caption window.
  SP.callouts = function (kit, d, sc, w) {
    const style = d.film.mods.callouts;
    const parts = [];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'sp-leaders');
    svg.setAttribute('viewBox', `0 0 ${SP.STAGE.w} ${SP.STAGE.h}`);
    w.overlay.append(svg);
    const sheet = style === 'focus-pop' ? SP.css(kit, '').sheet : null;
    sc.beats.forEach((b, n) => {
      const target = w.targets[n];
      if (!b.label || !b.caption || !target.node) return;
      // The target as the caption shows it: the whole frame at its beat's act, or at the caption's start for a hold,
      // kept inside the caption, so a pointed control shows its hover and a form the words typed into it.
      w.frameAt(b.start + SP.clamp(b.act === null ? b.caption[0] : b.act, b.caption[0], b.caption[1]));
      const shot = w.shots[n];
      const a = SP.project(shot, w.look.x + target.box.x * w.look.s, w.look.y + target.box.y * w.look.s);
      const k = shot.z * w.look.s;
      const box = { x: a.x, y: a.y, w: target.box.w * k, h: target.box.h * k };
      const part = { win: [b.start + b.caption[0], b.start + b.caption[1]], els: [] };
      const chip = SP.el('div', style === 'subtitle-bar' ? 'sp-subtitle' : 'sp-chip');
      chip.append(SP.words('b', '', b.label), document.createTextNode(': '), SP.words('span', '', b.value));
      w.overlay.append(chip);
      part.els.push(chip);
      if (style !== 'subtitle-bar') {
        const size = sizeOn(chip, kit.stage);
        const spot = SP.chipSpot(box, { w: size.w, h: size.h });
        chip.style.left = `${spot.x}px`;
        chip.style.top = `${spot.y}px`;
        const l = SP.leader(box, spot, { w: size.w, h: size.h });
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        for (const [key, v] of Object.entries(l)) line.setAttribute(key, String(v));
        line.setAttribute('class', 'sp-leader');
        svg.append(line);
        part.els.push(line);
      }
      if (style === 'numbered-steps') {
        const badge = SP.words('div', 'sp-step', String(SP.stepOf(d.film, sc.id, n)));
        badge.style.left = `${SP.clamp(box.x - 18, SP.SAFE, SP.STAGE.w - SP.SAFE - 36)}px`;
        badge.style.top = `${SP.clamp(box.y - 18, SP.SAFE, SP.STAGE.h - SP.SAFE - 36)}px`;
        w.overlay.append(badge);
        part.els.push(badge);
      }
      // A typed field, a clicked control and the beat a pattern acts on are their own focus (spec 7.4-7.6): the words
      // appear in the field, the control shows its pressed look and what its click shows, and the pattern plays on the
      // target, so none is lifted as a still copy.
      if (style === 'focus-pop' && b.do !== 'type' && b.do !== 'click' && n !== w.patternBeat) {
        // The card frames the target's box (without what must not show), 12 px out at 1080p whatever the shot's zoom.
        // The copy keeps the target's own box and size, and the card cuts it to that frame.
        const pad = SP.LIFT.pad / k;
        const own = SP.boxIn(target.node, w.win);
        const radius = parseFloat(getComputedStyle(target.node).borderTopLeftRadius) || 0;
        const card = SP.el('div', 'sp-lift');
        card.style.left = `${target.box.x - pad}px`;
        card.style.top = `${target.box.y - pad}px`;
        card.style.width = `${target.box.w + 2 * pad}px`;
        card.style.height = `${target.box.h + 2 * pad}px`;
        card.style.borderRadius = `${radius + pad}px`;
        card.style.background = behind(target.node);
        const copy = styledCopy(target.node, own, sheet);
        copy.style.left = `${pad + own.x - target.box.x}px`;
        copy.style.top = `${pad + own.y - target.box.y}px`;
        card.append(copy);
        w.lifts.append(card);
        part.card = card;
      }
      parts.push(part);
    });
    return (t) => {
      let blur = 0;
      for (const p of parts) {
        const e = SP.envelope(t, p.win);
        for (const el of p.els) {
          el.style.opacity = String(e);
          el.style.visibility = e > 0 ? 'visible' : 'hidden';
        }
        if (p.card) {
          p.card.style.opacity = String(e);
          p.card.style.visibility = e > 0 ? 'visible' : 'hidden';
          p.card.style.transform = `scale(${0.98 + 0.02 * e})`;
          blur = Math.max(blur, e);
        }
      }
      w.body.style.filter = blur > 0 ? `blur(${SP.LIFT.blur * blur}px) brightness(${1 - (1 - SP.LIFT.dim) * blur})` : '';
    };
  };
})(SP);
