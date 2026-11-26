// Title, act and end cards (spec 7.7): centred as one block on the ground, the brand logo large and the title semibold.
// The title card plays the intro the mods chose; an act card holds still; the end card carries one tagline, the
// release status chip and, when that mod is on, the demo-data note. Every card's words are gone before the cut
// (film rule 4).
(function (SP) {
  // When each part of a card comes in, in seconds: the logo and the words below it, which follow one another from below
  // by a stagger. The title card's times go by its intro, and every other card's are `CARD`. The score reads these
  // times too, so a retimed card keeps its sounds on their frames (spec P8).
  SP.INTROS = {
    boom: { logo: [0.15, 0.5], words: 0.8 },
    'calm-reveal': { logo: [0.2, 0.9], words: 1.0 },
    splash: { logo: [0.15, 0.5], words: 0.7 },
  };
  SP.CARD = { logo: [0.1, 0.45], words: 0.15 };
  const STAGGER = 0.11;
  const ENTER = 0.45;
  const EXIT = 0.35;

  // A card scene's render. `sc` is its entry in the timing table, with its text and line.
  SP.card = function (kit, d, sc) {
    const mods = d.film.mods;
    const brand = d.brand;
    const intro = sc.kind === 'title' ? SP.INTROS[mods.intro] || SP.INTROS.boom : null;
    const ground = SP.el('div', 'ground sp-ground');
    const block = SP.el('div', `sp-card sp-card-${sc.kind}`);
    const logo = sc.kind === 'act' ? null : SP.el('img', 'sp-card-logo', { src: brand.logos[brand.card], alt: brand.name });
    const words = [SP.words('div', 'sp-card-title', sc.text)];
    if (brand.font && brand.font.title) words[0].style.fontWeight = String(brand.font.title);
    if (sc.line) words.push(SP.words('div', 'sp-card-line', sc.line));
    if (sc.kind === 'end' && d.film.chip) words.push(SP.words('div', 'sp-card-chip', d.film.chip));
    if (sc.kind === 'end' && mods.demoNote === 'on') words.push(SP.words('div', 'sp-card-note', 'Shown with demo data'));
    if (logo) block.append(logo);
    block.append(...words);
    kit.stage.append(ground, block);
    const first = intro ? intro.words : SP.CARD.words;
    return (t) => {
      const out = 1 - SP.at(t, sc.dur - EXIT, EXIT);
      if (logo) {
        const [a, b] = intro ? intro.logo : SP.CARD.logo;
        const p = mods.intro === 'calm-reveal' || !intro ? SP.at(t, a, b - a) : SP.pop(SP.clamp((t - a) / (b - a), 0, 1));
        logo.style.opacity = String(SP.clamp(p, 0, 1) * out);
        logo.style.transform = `scale(${intro && mods.intro !== 'calm-reveal' ? Math.max(0, p) : 1})`;
      }
      words.forEach((e, i) => {
        const p = SP.at(t, first + i * STAGGER, ENTER);
        e.style.opacity = String(p * out);
        e.style.transform = `translateY(${24 * (1 - p)}px)`;
      });
      // A splash opens into the app: the block grows and clears in its last moments.
      if (mods.intro === 'splash' && sc.kind === 'title') {
        const q = SP.at(t, sc.dur - 0.6, 0.6);
        block.style.transform = `scale(${1 + 0.5 * q})`;
      }
    };
  };
})(SP);
