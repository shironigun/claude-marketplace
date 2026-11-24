// The score (spec 5.12, 9, P8): an original groove on the beat under the screens, a ring and a hit when the title
// lands, one last chord on the end card, and the app's own sounds on the frames they belong to: a click on each click,
// a pop as each caption comes in, a tick for each typed character. Every time comes from the film's one timing table,
// the one the scenes read, so a retimed film keeps every sound on its frame.
(function (SP) {
  // Four bars that turn (I, V, vi, IV in C), their bass notes, and the tempo each pacing sets.
  const CHORDS = [['C4', 'E4', 'G4'], ['B3', 'D4', 'G4'], ['A3', 'C4', 'E4'], ['A3', 'C4', 'F4']];
  const BASS = ['C2', 'G2', 'A2', 'F2'];
  const BPM = { standard: 100, calm: 90, brisk: 108 };

  // The film's sound events, in seconds of the film: its clicks, caption pops and typed characters, the title's ring
  // and hit, the end card's chord, and the stretch the groove plays under (from the first screen to the end card).
  SP.cues = function (film) {
    const out = { clicks: [], pops: [], ticks: [], ring: null, hit: null, end: null, groove: null };
    for (const id of film.order) {
      const sc = film.scenes[id];
      if (sc.kind === 'title') {
        // The ring as the logo comes in, the hit as the title lands: the card's own times (cards.js).
        const intro = SP.INTROS[film.mods.intro] || SP.INTROS.boom;
        out.ring = sc.start + intro.logo[0];
        out.hit = sc.start + intro.words;
      } else if (sc.kind === 'end') {
        out.end = sc.start + SP.CARD.words;
      } else if (sc.kind === 'screen') {
        if (!out.groove) out.groove = [sc.start, sc.start];
        out.groove[1] = sc.start + sc.dur;
        for (const b of sc.beats) {
          if (b.do === 'click' && b.act !== null) out.clicks.push(sc.start + b.start + b.act);
          if (b.label && b.caption) out.pops.push(sc.start + b.start + b.caption[0]);
          if (b.typing && b.text) {
            // SP.typed shows k characters once k of the n spans have passed, so tick k waits for character k.
            const each = (b.typing[1] - b.typing[0]) / b.text.length;
            for (let k = 1; k <= b.text.length; k += 1) out.ticks.push(sc.start + b.start + b.typing[0] + k * each);
          }
        }
      }
    }
    return out;
  };

  // The score module's work: `S` is the player's score builder, and the film's data comes from its timing table.
  SP.score = function (S, T, kit) {
    const film = (SP.film && SP.film.film) || kit.json('film.json');
    const c = SP.cues(film);
    // Velocities are on the player's own scale, as its sound reference writes them (a soft pad at 30), not 0 to 1.
    S.tempo(BPM[film.mods.pacing] || BPM.standard, { t0: c.groove ? c.groove[0] : 0 });
    S.program('pad', 'pad', { gain: -12, rev: 0.5 });
    S.program('bass', 'bass', { gain: -10 });
    if (c.groove) {
      const bar = S.beat(4) - S.beat(0);
      for (let t = c.groove[0], k = 0; t < c.groove[1] - 0.05; t += bar, k += 1) {
        // The last bar stops with the screens, so nothing of the groove rings on under the end card's chord.
        const left = c.groove[1] - t;
        S.chord('pad', CHORDS[k % 4], { t, dur: Math.min(bar, left), vel: 45 });
        S.note('bass', BASS[k % 4], { t, dur: Math.min(bar * 0.9, left), vel: 55 });
        for (let q = 0; q < 4 && t + q * (bar / 4) < c.groove[1]; q += 1) {
          const at = t + q * (bar / 4);
          if (q % 2 === 0) S.drum('kick', { t: at, vel: 40 });
          if (at + bar / 8 < c.groove[1]) S.drum('hat', { t: at + bar / 8, vel: 20 });
        }
      }
    }
    if (c.ring !== null) S.fx('ding', c.ring, { vel: 70 });
    if (c.hit !== null && film.mods.intro === 'boom') {
      S.drum('kick', { t: c.hit, vel: 100 });
      S.drum('crash', { t: c.hit, vel: 45 });
    }
    for (const t of c.clicks) S.fx('click', t, { vel: 80 });
    for (const t of c.pops) S.fx('pop', t, { vel: 45 });
    if (c.ticks.length) S.ticks(c.ticks, { vel: 35 });
    if (c.end !== null) {
      S.chord('pad', ['C3', 'G3', 'C4', 'E4'], { t: c.end, dur: 2.6, vel: 70 });
      S.fx('chime', c.end, { vel: 60 });
    }
    S.master({ gain: -6, fadeOut: 1.2 });
  };
})(SP);
