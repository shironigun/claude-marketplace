'use strict';
const path = require('path');
const { usageError, checkError } = require('../errors');
const { readJson } = require('../files');
const { repoInfo, checkHome, workspaceKey } = require('../paths');
const { loadFilm } = require('../film');
const { builtDocs } = require('../stage');
const { installTools, readyTools } = require('../tools');
const { playerFiles, openPlayer, loadFilm: loadInPlayer, measure, writeStills } = require('../render');
const { parseAnchor, momentAt, pickAt, anchorCrop } = require('../comment');
const { readTextFile } = require('../args');
const { framePlan } = require('../verify');

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
  usage: 'render --install <player folder> | render <subject slug> --film <film slug> --brand <brand id> (--at <s,s,...> | --plan | --anchor <file>) [--sheet] [--crop x,y,w,h] [--repo <dir>]',
  summary: "Install the renderer (the Motion player's files the skill read into a folder, playwright-core and the user's own Chromium), or render a brand's film through it (spec 5.13, 5.15, 12): stills at the times named or at every moment verify checks, contact sheets, and crops at full size; or, for a comment's anchor (its Anchor detail or Element path line, in a file), the still there, the scene, beat and element it points at, and a crop round it.",
  flags: { install: 'string', film: 'string', brand: 'string', at: 'string', plan: 'boolean', anchor: 'string', sheet: 'boolean', crop: 'string', repo: 'string' },
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
    if ([args.flags.at, args.flags.plan, args.flags.anchor].filter(Boolean).length !== 1) {
      throw usageError('give one of --at <seconds,...>, --plan or --anchor <a file holding a comment\'s anchor>');
    }
    const rebuild = `sp build ${f.subjectState.subject} --film ${f.filmState.film}`;
    const built = readJson(path.join(f.fp.film, 'build.json'), null);
    if (!built) throw checkError(`the film has no build yet; run ${rebuild}`);
    const docs = builtDocs(f.fp, built, id, rebuild);
    const film = JSON.parse(docs['modules/film.json'].text);
    // The anchor comes in a file, so no comment's text passes through a shell.
    const anchor = args.flags.anchor ? parseAnchor(readTextFile(ctx.cwd, args.flags.anchor)) : null;
    if (args.flags.anchor && (!anchor || anchor.t >= film.film.length || (anchor.to !== undefined && (anchor.to <= anchor.t || anchor.to > film.film.length)))) {
      throw usageError('--anchor takes a file holding a comment\'s "Anchor detail" or "Element path" line, at a time inside the film');
    }
    let moments;
    if (anchor) moments = [anchor.t, ...(anchor.to !== undefined ? [Math.min(anchor.to, film.film.length - 0.01)] : [])].map((t) => ({ t, label: `${t.toFixed(3)} s`, scene: null }));
    else if (args.flags.plan) moments = framePlan(film).map((p) => ({ t: p.t, label: `${p.t.toFixed(3)} s  ${p.scene}${p.hook ? ` ${p.hook}` : ''}  ${p.kind}`, scene: p.scene }));
    else moments = times(args.flags.at, film.film.length).map((t) => ({ t, label: `${t.toFixed(3)} s`, scene: null }));
    const point = anchor && anchor.x !== undefined;
    const box = args.flags.crop ? cropBox(args.flags.crop) : point ? anchorCrop(anchor) : null;
    const tools = readyTools(ctx.home);
    // playwright-core lives in the tools folder, installed on first use.
    const { chromium } = require(tools.playwrightDir);
    const dir = path.join(f.fp.verify, id);
    return (async () => {
      const session = await openPlayer(tools, (o) => chromium.launch(o));
      let written;
      let element = null;
      try {
        await loadInPlayer(session, playerFiles(docs));
        // What the comment points at: the element at its point (a box's middle), in the frame measured at its time.
        if (point) {
          const at = anchor.w !== undefined ? [anchor.x + anchor.w / 2, anchor.y + anchor.h / 2] : [anchor.x, anchor.y];
          const m = await measure(session, anchor.t).catch(() => null);
          element = m ? pickAt(m, ...at) : null;
        }
        written = await writeStills(session, moments, dir, { sheets: args.flags.sheet, box });
      } finally {
        await session.close();
      }
      const out = { brand: id, frames: written.frames, sheets: written.sheets, crops: written.crops };
      if (anchor) {
        Object.assign(out, { anchor, at: momentAt(film, anchor.t), element });
        if (anchor.to !== undefined) out.until = momentAt(film, Math.min(anchor.to, film.film.length - 0.01));
        const what = out.at.beat ? `${out.at.beat.hook} (${out.at.beat.do} ${out.at.beat.target}), its ${out.at.moment}` : `the ${out.at.kind} card`;
        const on = element ? (element.hooks ? `, on the target of ${element.hooks.join(', ')}` : `, on a ${element.kind}`) : '';
        return { json: out, text: `At ${anchor.t} s: ${out.at.scene}, ${what}${on}\n${out.frames.join('\n')}${out.crops.length ? `\n${out.crops.join('\n')}` : ''}` };
      }
      return { json: out, text: `${out.frames.length} stills, ${out.sheets.length} sheets and ${out.crops.length} crops of ${id}'s film in ${dir}` };
    })();
  },
};
