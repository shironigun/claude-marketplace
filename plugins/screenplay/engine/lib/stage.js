'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { kindOf } = require('./build');
const { writeJson } = require('./files');

// What one ArtifactData batch may hold (the Artifact tools): 50 writes and 1 MiB, kept to 900 KiB for the batch's own
// wrapping.
const BATCH = { writes: 50, bytes: 900 * 1024 };
// The script every Motion film of scenes plays (the Motion type's film-api page).
const SCRIPT = 'window.CUT = kit.scenes();';
// The documents that make a film playable, written last and in this order once every module they name is there:
// film.json names each scene's surface modules, and every scene reads it.
const LAST = ['modules/film.json', 'modules/scenes.json', 'film/meta', 'film/script'];

const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

// A brand's film as the Motion store holds it (spec 5.12, P6): `film/meta` and `film/script`, and a module document
// for each shared module, with the brand's own scenes.json, base.css and brand.json. `modules` are { name, text } from
// film/modules/, `brand` the overlay from film/brands/<id>.json. Returns a map of "<collection>/<doc id>" to the
// document.
function brandDocs(modules, brand) {
  const docs = {};
  for (const { name, text } of modules) {
    let body = text;
    if (name === 'scenes.json') {
      const s = JSON.parse(text);
      body = `${JSON.stringify({ v: s.v, stage: s.stage, look: s.look, ...brand.scenes, width: s.width, height: s.height, fps: s.fps, scenes: s.scenes }, null, 2)}\n`;
    } else if (name === 'base.css') {
      body = brand.colours + text;
    }
    docs[`modules/${name}`] = { kind: kindOf(name), text: body };
  }
  docs['modules/brand.json'] = { kind: 'json', text: `${JSON.stringify(brand.overlay)}\n` };
  docs['film/meta'] = { v: 1, title: brand.title };
  docs['film/script'] = { code: SCRIPT };
  return docs;
}

// The writes that bring a brand's film from what films.json says it holds to the build (spec 5.12): each document
// whose content changed, pinned to the version last recorded (a new one is not pinned), and a delete for each module
// a build wrote that this build no longer has. A document no build wrote (one the film held when it was created) is
// never deleted. The modules go first, in batches the store takes; then the documents that switch the film to this
// build, in one batch of their own; then the deletes, so the film never names a module that is gone. `known` is the
// brand's films.json entry, `now` the time for film/meta.
function stagePlan(docs, known, now) {
  const recorded = (known && known.docs) || {};
  const hashes = Object.fromEntries(Object.entries(docs).map(([key, doc]) => [key, hash(doc)]));
  const changed = Object.keys(docs).filter((key) => !recorded[key] || recorded[key].hash !== hashes[key]);
  const removed = Object.keys(recorded).filter((key) => key.startsWith('modules/') && !docs[key] && recorded[key].hash);
  const write = (key, op) => {
    const [collection, ...rest] = key.split('/');
    const w = { op, collection, doc_id: rest.join('/'), key };
    if (recorded[key] && recorded[key].version) w.if_version = recorded[key].version;
    return w;
  };
  // The meta's time changes with every stage; it goes with the last batch when anything changed.
  const last = changed.length || removed.length ? LAST.filter((k) => changed.includes(k) || k === 'film/meta').map((k) => write(k, 'set')) : [];
  const size = (w) => (w.op === 'delete' ? 200 : Buffer.byteLength(JSON.stringify(docs[w.key])) + 200);
  // Writes in order, in batches the store takes.
  const pack = (writes) => writes.reduce((out, w) => {
    const open = out[out.length - 1];
    if (!open || open.length >= BATCH.writes || open.reduce((n, x) => n + size(x), 0) + size(w) > BATCH.bytes) out.push([w]);
    else open.push(w);
    return out;
  }, []);
  const batches = pack(changed.filter((k) => !LAST.includes(k)).map((k) => write(k, 'set')));
  if (last.length) batches.push(last);
  batches.push(...pack(removed.map((k) => write(k, 'delete'))));
  return { batches, hashes, removed, writes: batches.flat().map((w) => w.key), meta: { ...docs['film/meta'], updatedAt: now } };
}

// Writes a stage into its folder: each document to write as its own JSON file, which ArtifactData sends as the
// document (its `file_path`), and the plan beside them (stage.json) for `sp record`, with `inputs`, what the
// build was made from. Returns the batches with each write's file.
function writeStage(dir, docs, plan, inputs) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const batches = plan.batches.map((b) => b.map((w) => {
    const out = { op: w.op, collection: w.collection, doc_id: w.doc_id };
    if (w.op === 'set') {
      out.file_path = path.join(dir, `${w.key.replace(/\//g, '__')}.json`);
      fs.writeFileSync(out.file_path, JSON.stringify(w.key === 'film/meta' ? plan.meta : docs[w.key]));
    }
    if (w.if_version) out.if_version = w.if_version;
    return out;
  }));
  writeJson(path.join(dir, 'stage.json'), { inputs, hashes: plan.hashes, removed: plan.removed, writes: plan.writes });
  return batches;
}

// films.json after a brand's writes: the versions the store gave back, each with the hash of what the stage wrote,
// and no entry for a deleted module. `versions` maps "<collection>/<doc id>" to the version, to null after a delete,
// or to { version } for a document the store holds as it is: one it refused because it had changed, which the next
// stage writes again pinned to that version once the user says so, or one the film held when it was created. A
// module the stage deletes keeps its hash when held, so the next stage deletes it again. Once every write of the
// stage is recorded, the brand's film holds the stage's build; until then it holds none.
function recordVersions(entry, stage, versions) {
  const docs = { ...(entry.docs || {}) };
  for (const [key, v] of Object.entries(versions)) {
    if (v === null) delete docs[key];
    else if (typeof v === 'object') docs[key] = { version: v.version, hash: stage.removed.includes(key) && docs[key] ? docs[key].hash : null };
    else docs[key] = { version: v, hash: stage.hashes[key] || null };
  }
  const writes = stage.writes || [];
  const done = writes.length > 0 && writes.every((key) => (stage.removed.includes(key) ? !docs[key] : docs[key] && docs[key].hash === stage.hashes[key]));
  const { built, ...rest } = entry;
  return { ...rest, docs, ...(done ? { built: stage.inputs } : {}) };
}

module.exports = { BATCH, SCRIPT, hash, brandDocs, stagePlan, writeStage, recordVersions };
