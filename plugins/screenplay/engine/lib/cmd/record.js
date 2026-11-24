'use strict';
const path = require('path');
const { usageError } = require('../errors');
const { readJson, writeJson } = require('../files');
const { repoInfo, checkHome, repoPaths, workspaceKey } = require('../paths');
const { loadFilm } = require('../film');
const { readJsonFile } = require('../args');
const { recordVersions } = require('../stage');

module.exports = {
  name: 'record',
  usage: 'record <subject slug> --film <film slug> --brand <brand id> (--url <film url> | --versions <file>) [--repo <dir>]',
  summary: "Record a brand's Motion film in films.json (spec 5.12): its url once it is created, or the versions the store gave back for the writes of its last stage.",
  flags: { film: 'string', brand: 'string', url: 'string', versions: 'string', repo: 'string' },
  run(ctx, args) {
    const repo = repoInfo(args.flags.repo || ctx.cwd);
    checkHome(ctx.home, repo);
    const key = workspaceKey(ctx.home, repo);
    const rp = repoPaths(ctx.home, key);
    const f = loadFilm(ctx.home, key, args._[0], args.flags.film);
    const id = args.flags.brand;
    if (!id) throw usageError('missing --brand <brand id>');
    const mods = readJson(f.fp.mods, null);
    if (!mods || !mods.brands.includes(id)) {
      throw usageError(`the film is not made for "${id}"; its brands are ${mods ? mods.brands.join(', ') : 'not chosen yet'}`);
    }
    const { url, versions } = args.flags;
    if (!url === !versions) throw usageError('give one of --url <film url> or --versions <file>');
    const films = readJson(f.fp.films, {});
    let entry = films[id] || {};
    if (url) {
      if (!/^https:\/\/\S+$/.test(url)) throw usageError(`${url} is not a film's url`);
      // Another url is another film, which holds none of the documents recorded for the last one.
      if (entry.url !== url) entry = { url, docs: {} };
    } else {
      const stage = readJson(path.join(rp.inbox, 'stage', `${f.subjectState.subject}.${f.filmState.film}.${id}`, 'stage.json'), null);
      if (!stage) throw usageError(`no stage for ${id}; run sp stage first`);
      const given = readJsonFile(ctx.cwd, versions);
      if (!given || typeof given !== 'object' || Array.isArray(given)) {
        throw usageError(`${versions}: the versions are an object of "<collection>/<doc id>" to a version`);
      }
      // A version is only for a set the stage planned, and null only for a delete it planned (spec 5.12: only what
      // the batch's result says was written).
      const removed = new Set(stage.removed);
      const sets = new Set((stage.writes || []).filter((k) => !removed.has(k)));
      for (const [doc, v] of Object.entries(given)) {
        // A document of the film the stage did not write (one its creation made) is recorded by its version alone.
        const held = v !== null && typeof v === 'object';
        const planned = v === null ? removed.has(doc) : sets.has(doc);
        if (held ? !/^(film|modules)\/[^/]+$/.test(doc) : !planned) throw usageError(`${doc} was not staged for ${id}`);
        const n = held ? v.version : v;
        if (v !== null && !(Number.isInteger(n) && n >= 1)) {
          throw usageError(`${doc}: a version is a whole number from 1, { "version": n } for a document the store holds as it is, or null after a delete`);
        }
      }
      entry = recordVersions(entry, stage, given);
    }
    writeJson(f.fp.films, { ...films, [id]: entry });
    const n = Object.keys(entry.docs || {}).length;
    return {
      json: { brand: id, url: entry.url || null, docs: n, films: f.fp.films },
      text: `Recorded ${id}'s film${entry.url ? ` at ${entry.url}` : ''}: ${n} documents`,
    };
  },
};
