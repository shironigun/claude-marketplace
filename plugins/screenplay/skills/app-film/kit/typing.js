// Typing (spec 7.5): the field being typed into is the focus, with the app's own focused look (which the build answers
// to data-sp-focus), and the words appear in it at the pace the timing table sets.
(function (SP) {
  // The words a typed beat shows at t: none before its typing starts, all of them once it ends, and in between as many
  // as its span has reached.
  SP.typed = function (text, span, t) {
    if (t < span[0]) return '';
    const n = Math.floor(text.length * SP.clamp((t - span[0]) / Math.max(0.001, span[1] - span[0]), 0, 1));
    return text.slice(0, n);
  };

  // What a field shows at t over every beat that types into it, in order: the words of the latest typing that has
  // started, or null while none has, when it shows what the screen drew in it.
  SP.fieldAt = function (beats, t) {
    const started = beats.filter((b) => t >= b.start + b.typing[0]);
    if (!started.length) return null;
    const b = started[started.length - 1];
    return SP.typed(b.text, [b.start + b.typing[0], b.start + b.typing[1]], t);
  };

  // The field a typed beat fills: its target, or the first field inside it; none when it holds no field, since only a
  // field's words are ever written.
  const FIELD = 'input, textarea, [contenteditable]';
  const fieldOf = (node) => (node.matches(FIELD) ? node : node.querySelector(FIELD));

  // The scene's typing: each field takes the focus while one of its typed beats runs, from the beat's act to its end,
  // and shows the words typed so far, or what the screen drew in it before any typing starts.
  SP.typing = function (kit, d, sc, w) {
    const fields = new Map();
    sc.beats.forEach((b, n) => {
      const field = b.do === 'type' && b.text && w.targets[n].node ? fieldOf(w.targets[n].node) : null;
      if (!field) return;
      if (!fields.has(field)) {
        fields.set(field, { beats: [], drawn: field.tagName === 'INPUT' ? field.getAttribute('value') : field.innerHTML, shown: undefined });
      }
      fields.get(field).beats.push(b);
    });
    return (t) => {
      for (const [field, f] of fields) {
        field.toggleAttribute('data-sp-focus', f.beats.some((b) => t >= b.start + b.act && t < b.start + b.dur));
        const words = SP.fieldAt(f.beats, t);
        if (words === f.shown) continue;
        f.shown = words;
        if (field.tagName === 'INPUT') {
          if (words === null && f.drawn === null) field.removeAttribute('value');
          else field.setAttribute('value', words === null ? f.drawn : words);
        } else if (words === null) field.innerHTML = f.drawn;
        else field.textContent = words;
      }
    };
  };
})(SP);
