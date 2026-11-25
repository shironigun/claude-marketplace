'use strict';
const fs = require('fs');
const path = require('path');
const { usageError, checkError } = require('../errors');
const { readJson, writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, approvedFilm } = require('../film');
const { filmNext } = require('../progress');
const { PHASE_IDS } = require('../state');
const { screensStatus } = require('../screens');
const { builtDocs } = require('../stage');
const { readyTools } = require('../tools');
const { playerFiles, openPlayer, loadFilm: loadInPlayer, still, played, measure, writeStills } = require('../render');
const { framePlan, playedProblems, measuredProblems, purityProblems, logFindings, verifyReport } = require('../verify');

// One brand's film through the player, as the build composes it: what the player plays, what every moment of the plan
// measures, the beats rendered twice for purity, and the frames and sheets the reviewer reads.
async function checkBrand(launch, tools, fp, built, id, rebuild) {
  const docs = builtDocs(fp, built, id, rebuild);
  const film = JSON.parse(docs['modules/film.json'].text);
  const overlay = JSON.parse(docs['modules/brand.json'].text);
  const files = playerFiles(docs);
  const plan = framePlan(film);
  const beats = plan.filter((p) => p.kind === 'beat');
  const dir = path.join(fp.verify, id);
  fs.rmSync(dir, { recursive: true, force: true });
  const session = await openPlayer(tools, launch);
  let play;
  let written;
  const samples = [];
  try {
    const meta = await loadInPlayer(session, files);
    play = await played(session, meta);
    for (const p of plan) samples.push({ ...p, m: await measure(session, p.t) });
    const label = (p) => `${p.t.toFixed(3)} s  ${p.hook || p.scene}  ${p.kind}`;
    written = await writeStills(session, plan.map((p) => ({ t: p.t, scene: p.scene, label: label(p) })), dir, { sheets: true });
  } finally {
    await session.close();
  }
  const fresh = await openPlayer(tools, launch);
  const cold = [];
  try {
    await loadInPlayer(fresh, files);
    for (const p of [...beats].reverse()) cold.push({ ...p, png: await still(fresh, p.t, 0.5) });
  } finally {
    await fresh.close();
  }
  const log = logFindings(play.log);
  const problems = [
    ...playedProblems(film, play),
    ...measuredProblems(samples, overlay),
    ...purityProblems(beats.map((p) => ({ ...p, png: written.pngs.get(p.t) })), cold),
    ...log.problems,
  ];
  return { title: docs['film/meta'].title, dir, moments: plan.length, problems, notes: log.notes, warnings: log.warnings, sheets: written.sheets, frames: written.frames.length };
}

module.exports = {
  name: 'check',
  usage: 'check <subject slug> --film <film slug> [--brand <brand id>] [--repo <dir>]',
  summary: "The film checks of spec 5.13 on each brand's film through the Motion player's own renderer: timing, layout, stillness, exit before a move, bleed-through, purity, brand and the player's log, after the story's and screens' own checks. Writes each brand's frames, sheets, check.json and report.md in the film's verify folder.",
  flags: { film: 'string', brand: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    // Truth and must-not-show (spec 5.13): the story still passes gate 2 against the ledger and the brief as they are now.
    const fc = approvedFilm(rp, f);
    const next = filmNext(rp, f.subj, f.subjectState, f.fp, f.filmState);
    if (PHASE_IDS.indexOf(next) < PHASE_IDS.indexOf('verify')) throw checkError(`the films do not hold the film's build yet; the next step is ${next}`);
    const brands = args.flags.brand ? [args.flags.brand] : fc.mods.brands;
    for (const id of brands) if (!fc.mods.brands.includes(id)) throw usageError(`the film is not made for "${id}"`);
    const status = screensStatus(fc, rp, f.fp);
    const source = [...status.theme.problems.map((p) => `theme: ${p}`), ...status.screens.flatMap((s) => s.problems.map((p) => `${s.id}: ${p}`))];
    const built = readJson(path.join(f.fp.film, 'build.json'));
    const tools = readyTools(ctx.home);
    // playwright-core lives in the tools folder, installed on first use.
    const { chromium } = require(tools.playwrightDir);
    const rebuild = `sp build ${fc.subject} --film ${fc.film}`;
    return (async () => {
      const out = {};
      for (const id of brands) {
        const r = await checkBrand((o) => chromium.launch(o), tools, f.fp, built, id, rebuild);
        r.problems = [...source, ...r.problems];
        const record = { brand: id, inputs: built.inputs, at: ctx.now, moments: r.moments, problems: r.problems, notes: r.notes, warnings: r.warnings, sheets: r.sheets };
        writeJson(path.join(r.dir, 'check.json'), record);
        fs.writeFileSync(path.join(r.dir, 'report.md'), verifyReport({ ...record, title: r.title }));
        out[id] = { ...record, report: path.join(r.dir, 'report.md') };
      }
      const failed = Object.values(out).filter((r) => r.problems.length);
      const text = Object.values(out).map((r) => `${r.brand}: ${r.problems.length ? `${r.problems.length} problems\n  ${r.problems.join('\n  ')}` : 'every check passes'}${r.notes.length ? `\n  note: ${r.notes.join('\n  note: ')}` : ''}\n  ${r.report}`).join('\n');
      return { json: { brands: out }, text, exitCode: failed.length ? 1 : 0 };
    })();
  },
};
