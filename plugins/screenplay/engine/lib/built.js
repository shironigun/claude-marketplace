'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readJson } = require('./files');
const { kitBundle, kitCss } = require('./kit');
const { readState, decisionValue } = require('./state');

// What a build is made from, as one hash (spec 5.12): the subject's name and screen map (`subj`), which give the
// film's title and scene names, the film's mods, story and demo data, the screens the story shows (`screens`, their
// ids in the order it first shows them), the theme, the brand profile and its logo files (the user's in the profile,
// the repository's as its working tree holds them), and the kit. A stage writes a build only while these are what it
// was made from, and a changed logo file needs a new build.
function buildInputs(fp, rp, screens, subj) {
  const read = (file) => (fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file) : Buffer.alloc(0));
  const profile = readJson(rp.brands, { brands: [] });
  const repo = readJson(rp.repository, {}).path;
  const logos = profile.brands.flatMap((b) => Object.values(b.logos).flatMap((l) => {
    if (l.file) return [path.join(rp.profile, l.file)];
    return l.path && repo ? [path.join(repo, l.path)] : [];
  }));
  const files = [subj.screens, fp.mods, fp.beats, fp.demoData, ...screens.map((id) => path.join(fp.screens, `${id}.json`)), rp.theme, rp.brands, ...logos];
  const state = readState(subj.state);
  const h = crypto.createHash('sha256');
  h.update(`${decisionValue(state.decisions, 'Name') || state.name}\n`);
  for (const file of files) h.update(read(file));
  h.update(kitBundle());
  h.update(kitCss());
  return h.digest('hex').slice(0, 16);
}

// Whether every brand's film holds the film's build (spec 5.12): the build is current, and each brand of the film has
// a film whose writes of that build are all recorded.
function filmBuilt(rp, fp, screens, subj) {
  const built = readJson(path.join(fp.film, 'build.json'), null);
  const mods = readJson(fp.mods, null);
  if (!built || !mods || built.inputs !== buildInputs(fp, rp, screens, subj)) return false;
  const films = readJson(fp.films, {});
  return mods.brands.every((id) => films[id] && films[id].url && films[id].built === built.inputs);
}

// A film's verify results for a build (spec 5.13): each brand's check.json and the reviewer's review.json, or null for
// one that is missing or was made for another build.
function verifyResults(fp, brands, inputs) {
  const current = (file) => {
    const r = readJson(file, null);
    return r && r.inputs === inputs ? r : null;
  };
  return {
    checks: Object.fromEntries(brands.map((id) => [id, current(path.join(fp.verify, id, 'check.json'))])),
    review: current(path.join(fp.verify, 'review.json')),
  };
}

// Whether a film passed verify for its build: every brand's checks with no problem, and the reviewer's PASS.
function filmVerified(fp, brands, inputs) {
  const { checks, review } = verifyResults(fp, brands, inputs);
  return Object.values(checks).every((c) => c && !c.problems.length) && Boolean(review) && review.verdict === 'PASS';
}

module.exports = { buildInputs, filmBuilt, verifyResults, filmVerified };
