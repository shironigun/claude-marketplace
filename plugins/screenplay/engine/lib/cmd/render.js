'use strict';
const fs = require('fs');
const path = require('path');
const { usageError, checkError } = require('../errors');
const { readJson } = require('../files');
const { repoInfo, checkHome, workspaceKey } = require('../paths');
const { loadFilm } = require('../film');
const { builtDocs } = require('../stage');
const { installTools, readyTools } = require('../tools');
const { playerFiles, openPlayer, loadFilm: loadInPlayer, still, sheet, crop } = require('../render');
const { framePlan } = require('../verify');

// A still's file name, in film order: t_012.300.png.
const stillName = (t) => `t_${t.toFixed(3).padStart(7, '0')}.png`;

// The times --at names, each a number of seconds inside the film.
function times(list, length) {
  const out = list.split(',').map((s) => Number(s.trim()));
  const bad = out.filter((t) => !Number.isFinite(t) || t < 0 || t >= length);
  if (bad.length || !out.length) throw usageError(`--at takes seconds inside the film, from 0 to under ${length}, separated by commas`);
  return out;
}

// --crop x,y,w,h: a part of the 1920 by 1080 stage.
function cropBox(text) {
  const [x, y, w, h] = text.split(',').map(Number);
  if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > 1920 || y + h > 1080) {
    throw usageError('--crop takes x,y,w,h in whole pixels inside the 1920 by 1080 stage');
  }
  return { x, y, w, h };
}

module.exports = {
  name: 'render',
  usage: 'render --install <player folder> | render <subject slug> --film <film slug> --brand <brand id> (--at <s,s,...> | --plan) [--sheet] [--crop x,y,w,h] [--repo <dir>]',
  summary: "Install the renderer (the Motion player's files the skill read into a folder, playwright-core and the user's own Chromium), or render a brand's film through it (spec 5.13, 12): stills at the times named or at every moment verify checks, contact sheets, and crops at full size.",
  flags: { install: 'string', film: 'string', brand: 'string', at: 'string', plan: 'boolean', sheet: 'boolean', crop: 'string', repo: 'string' },
  run(ctx, args) {
    if (args.flags.install) {
      const r = installTools(ctx.home, path.resolve(ctx.cwd, args.flags.install), ctx.env);
      return { json: r, text: `The renderer is installed: the Motion player, playwright-core ${r.playwright}, and ${r.chromium}` };
    }
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    const id = args.flags.brand;
    if (!id) throw usageError('missing --brand <brand id>');
    const mods = readJson(f.fp.mods, null);
    if (!mods || !mods.brands.includes(id)) throw usageError(`the film is not made for "${id}"`);
    if (!args.flags.at === !args.flags.plan) throw usageError('give one of --at <seconds,...> or --plan');
    const rebuild = `sp build ${f.subjectState.subject} --film ${f.filmState.film}`;
    const built = readJson(path.join(f.fp.film, 'build.json'), null);
    if (!built) throw checkError(`the film has no build yet; run ${rebuild}`);
    const docs = builtDocs(f.fp, built, id, rebuild);
    const film = JSON.parse(docs['modules/film.json'].text);
    const moments = args.flags.plan
      ? framePlan(film).map((p) => ({ t: p.t, label: `${p.t.toFixed(3)} s  ${p.scene}${p.hook ? ` ${p.hook}` : ''}  ${p.kind}`, scene: p.scene }))
      : times(args.flags.at, film.film.length).map((t) => ({ t, label: `${t.toFixed(3)} s`, scene: null }));
    const box = args.flags.crop ? cropBox(args.flags.crop) : null;
    const tools = readyTools(ctx.home);
    // playwright-core lives in the tools folder, installed on first use.
    const { chromium } = require(tools.playwrightDir);
    const dir = path.join(f.fp.verify, id);
    return (async () => {
      const session = await openPlayer(tools, (o) => chromium.launch(o));
      const out = { brand: id, frames: [], sheets: [], crops: [] };
      try {
        await loadInPlayer(session, playerFiles(docs));
        const shots = [];
        for (const m of moments) {
          const bytes = await still(session, m.t, 0.5);
          const file = path.join(dir, 'frames', stillName(m.t));
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, bytes);
          out.frames.push(file);
          shots.push({ ...m, png: bytes });
          if (box) {
            const part = path.join(dir, 'crops', `c_${m.t.toFixed(3).padStart(7, '0')}_${box.x}_${box.y}_${box.w}_${box.h}.png`);
            fs.mkdirSync(path.dirname(part), { recursive: true });
            fs.writeFileSync(part, await crop(session, await still(session, m.t, 1), box));
            out.crops.push(part);
          }
        }
        if (args.flags.sheet) {
          // One sheet a scene when the stills are the plan's, else one for all of them.
          const groups = new Map();
          for (const s of shots) groups.set(s.scene || 'stills', [...(groups.get(s.scene || 'stills') || []), s]);
          for (const [name, list] of groups) {
            const file = path.join(dir, 'sheets', `${name}.png`);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, await sheet(session, list));
            out.sheets.push(file);
          }
        }
      } finally {
        await session.close();
      }
      return { json: out, text: `${out.frames.length} stills, ${out.sheets.length} sheets and ${out.crops.length} crops of ${id}'s film in ${dir}` };
    })();
  },
};
