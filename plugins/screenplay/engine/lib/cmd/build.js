'use strict';
const fs = require('fs');
const path = require('path');
const { checkError } = require('../errors');
const { readJson, writeJson, writeFileAtomic } = require('../files');
const { repoInfo, isInside, checkHome, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, approvedFilm } = require('../film');
const { neededScreens, screensStatus } = require('../screens');
const { filmBuild } = require('../build');
const { buildInputs } = require('../built');
const { hash } = require('../stage');

module.exports = {
  name: 'build',
  usage: 'build <subject slug> --film <film slug> [--repo <dir>]',
  summary: "Build a film from its story, mods and screens (spec 5.12): the shared source every brand's film plays, in film/modules/, and each brand's overlay, in film/brands/.",
  flags: { film: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    const fc = approvedFilm(rp, f);
    const status = screensStatus(fc, rp, f.fp);
    if (!status.ready) {
      throw checkError(`the screens are not ready for the build; run sp screens ${fc.subject} --film ${fc.film} and rebuild what it lists`);
    }
    // A logo in the repository is read as its working tree holds it, where sp save brands checked it, and never
    // written there (spec P2).
    const readRepo = (p) => {
      const file = path.resolve(repo.dir, p);
      return isInside(file, repo.dir) && fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file) : null;
    };
    const readProfile = (file) => (fs.existsSync(path.join(rp.profile, file)) ? fs.readFileSync(path.join(rp.profile, file)) : null);
    const screens = neededScreens(fc).map((s) => readJson(path.join(f.fp.screens, `${s.id}.json`)));
    const built = filmBuild(fc, { screens, theme: readJson(rp.theme), profile: readJson(rp.brands), readRepo, readProfile });
    if (built.problems.length) {
      throw checkError(`the film cannot be built:\n  ${built.problems.join('\n  ')}`);
    }
    // The build replaces the film's source whole, so a module the film no longer has does not linger. Its record goes
    // first and comes back last, so a build that stops half-way leaves nothing a stage would send.
    fs.rmSync(path.join(f.fp.film, 'build.json'), { force: true });
    fs.rmSync(f.fp.modules, { recursive: true, force: true });
    fs.rmSync(f.fp.brands, { recursive: true, force: true });
    for (const m of built.modules) writeFileAtomic(path.join(f.fp.modules, m.name), m.text);
    for (const [id, brand] of Object.entries(built.brands)) writeJson(path.join(f.fp.brands, `${id}.json`), brand);
    writeJson(path.join(f.fp.film, 'build.json'), {
      inputs: buildInputs(f.fp, rp, neededScreens(fc).map((s) => s.id), f.subj),
      modules: Object.fromEntries(built.modules.map((m) => [m.name, hash(m.text)])),
    });
    const bytes = built.modules.reduce((n, m) => n + Buffer.byteLength(m.text), 0);
    return {
      json: {
        subject: fc.subject, film: fc.film, length: built.table.length, scenes: built.table.scenes.length,
        modules: built.modules.map((m) => m.name), brands: Object.keys(built.brands), bytes, source: f.fp.film,
      },
      text: `Built ${fc.film} of ${fc.subject}: ${built.table.scenes.length} scenes, ${built.table.length} s, ${built.modules.length} modules `
        + `(${Math.ceil(bytes / 1024)} KiB) and ${Object.keys(built.brands).length} brand overlays, in ${f.fp.film}`,
    };
  },
};
