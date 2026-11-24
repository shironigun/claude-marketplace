'use strict';
const path = require('path');
const { usageError, checkError } = require('../errors');
const { readJson, writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey } = require('../paths');
const { loadFilm, approvedFilm } = require('../film');
const { neededScreens } = require('../screens');
const { buildInputs } = require('../built');
const { builtDocs, stagePlan, writeStage } = require('../stage');
const { moduleProblems } = require('../modules');

module.exports = {
  name: 'stage',
  usage: 'stage <subject slug> --film <film slug> --brand <brand id> [--repo <dir>]',
  summary: "The pinned writes that bring one brand's Motion film to the build (spec 5.12): each changed document as a file in the inbox, in batches for ArtifactData, and the title to create the film with when it has none yet.",
  flags: { film: 'string', brand: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    const fc = approvedFilm(rp, f);
    const id = args.flags.brand;
    if (!id) throw usageError('missing --brand <brand id>');
    if (!fc.mods.brands.includes(id)) throw usageError(`the film is not made for "${id}"; its brands are ${fc.mods.brands.join(', ')}`);
    // A stage writes the film the user approved: the build must come from the story, screens and kit as they are now.
    const built = readJson(path.join(f.fp.film, 'build.json'), null);
    if (!built || built.inputs !== buildInputs(f.fp, rp, neededScreens(fc).map((s) => s.id), f.subj)) {
      throw checkError(`the film has changed since its build; run sp build ${fc.subject} --film ${fc.film}`);
    }
    const docs = builtDocs(f.fp, built, id, `sp build ${fc.subject} --film ${fc.film}`);
    const brand = readJson(path.join(f.fp.brands, `${id}.json`));
    const known = readJson(f.fp.films, {})[id] || null;
    // The brand's modules as its film will hold them, with its own scenes.json, base.css and brand.json, are within
    // the Motion type's limits before anything is staged.
    const problems = moduleProblems(Object.entries(docs).filter(([k]) => k.startsWith('modules/')).map(([k, doc]) => ({ name: k.slice(8), ...doc })));
    if (problems.length) throw checkError(`the film cannot be staged for ${id}:\n  ${problems.join('\n  ')}`);
    const plan = stagePlan(docs, known, ctx.now);
    const dir = path.join(rp.inbox, 'stage', `${fc.subject}.${fc.film}.${id}`);
    const { id: stageId, batches } = writeStage(dir, docs, plan, built.inputs);
    const url = (known && known.url) || null;
    const writes = batches.reduce((n, b) => n + b.length, 0);
    // A film with nothing left to write holds the build.
    if (!writes && url && known.built !== built.inputs) writeJson(f.fp.films, { ...readJson(f.fp.films, {}), [id]: { ...known, built: built.inputs } });
    return {
      json: { subject: fc.subject, film: fc.film, brand: id, url, create: url ? null : { title: brand.title }, id: stageId, batches, stage: dir },
      text: [
        url ? `${brand.title}: ${url}` : `${brand.title}: no film yet; create it from the Motion type with this title, then sp record --url`,
        writes ? `${writes} writes in ${batches.length} batches, staged in ${dir} as stage ${stageId}` : 'nothing to write: the film holds the build',
      ].join('\n'),
    };
  },
};
