'use strict';
const { CATALOG, formatOf } = require('./catalog');

const modOf = (id) => CATALOG.mods.find((m) => m.id === id);

// Where the mods form starts (spec 5.8, 10): each mod's default, then the format's own defaults, then the mods of the
// house style, the user's and then the repository's; the status chip the release status calls for, and every brand.
// No pattern yet: the skill proposes one per screen.
function preselect(fc) {
  const choice = Object.fromEntries(CATALOG.mods.map((m) => [m.id, m.options[0].id]));
  Object.assign(choice, formatOf(fc.format).defaults, fc.house ? fc.house.mods : {});
  const chip = modOf('chip').options.find((o) => o.release === fc.release);
  if (chip) choice.chip = chip.id;
  return { format: fc.format, ...choice, patterns: [], brands: fc.brands.map((b) => b.id) };
}

// What is wrong with a film's mods beyond their schema: an option the catalog lacks or that arrives in release 2,
// a format other than the film's, a pattern on a screen the map lacks, a brand the profile lacks, and the release
// status the end card rests on (spec 8, rule 10).
function modsProblems(mods, fc) {
  const problems = [];
  if (mods.format !== fc.format) {
    problems.push(formatOf(mods.format)
      ? `/format: this film is a ${fc.format}; make a ${mods.format} as another film: sp film ${fc.subject} ${mods.format}`
      : `/format: this film is a ${fc.format}, not "${mods.format}"`);
  }
  for (const m of CATALOG.mods) {
    const option = m.options.find((o) => o.id === mods[m.id]);
    const allowed = m.options.filter((o) => !o.r2).map((o) => o.id).join(', ');
    if (!option) problems.push(`/${m.id}: "${mods[m.id]}" is not an option; use one of: ${allowed}`);
    else if (option.r2) problems.push(`/${m.id}: ${option.label} arrives in release 2; use one of: ${allowed}`);
  }
  const screens = fc.screens.map((s) => s.id);
  const patterns = CATALOG.patterns.map((p) => p.id);
  mods.patterns.forEach((p, i) => {
    if (!screens.includes(p.screen)) problems.push(`/patterns/${i}: the screen map has no ${p.screen}`);
    if (!patterns.includes(p.pattern)) problems.push(`/patterns/${i}: "${p.pattern}" is not a pattern; use one of: ${patterns.join(', ')}`);
    if (mods.patterns.findIndex((q) => q.screen === p.screen && q.pattern === p.pattern) !== i) {
      problems.push(`/patterns/${i}: ${p.pattern} on ${p.screen} twice`);
    }
  });
  const brands = fc.brands.map((b) => b.id);
  mods.brands.forEach((b, i) => {
    if (!brands.includes(b)) problems.push(`/brands/${i}: the brand profile has no brand "${b}"`);
    if (mods.brands.indexOf(b) !== i) problems.push(`/brands/${i}: "${b}" twice`);
  });
  // On a deep ground the cards show each brand's dark logo, since a full logo in the brand's main colour would vanish
  // on it (spec 7.7): one the brand has not is asked for now, before gate 2, not first at the build.
  if (mods.ground === 'deep') {
    for (const b of fc.brands.filter((x) => mods.brands.includes(x.id) && !(x.logos || []).includes('dark'))) {
      problems.push(`/ground: a deep ground's cards show each brand's dark logo, which ${b.name} has not; choose the light ground, or supply one with sp logo ${b.id} dark <file>`);
    }
  }
  if (!fc.release) {
    problems.push(`the release status is not recorded: sp state ${fc.subject} --decision "Release: <released|new|beta|unreleased>"`);
  } else if (fc.release === 'unreleased' && mods.chip === 'none') {
    problems.push('/chip: unreleased work carries a status chip (spec 8, rule 10)');
  }
  return problems;
}

// The mods in words, in catalog order, as [label, choice] pairs for people to read.
function modChoices(mods, fc) {
  const named = (list, id, field = 'label') => (list.find((x) => x.id === id) || { [field]: id })[field];
  const patterns = mods.patterns
    .map((p) => `${named(CATALOG.patterns, p.pattern)} on ${named(fc.screens, p.screen, 'title')} (${p.screen})`);
  return [
    ['Format', named(CATALOG.formats, mods.format)],
    ...CATALOG.mods.map((m) => [m.label, named(m.options, mods[m.id])]),
    ['Walkthrough patterns', patterns.length ? patterns.join('; ') : 'none'],
    ['Brands', mods.brands.map((b) => named(fc.brands, b, 'name')).join(', ')],
  ];
}

module.exports = { preselect, modsProblems, modChoices };
