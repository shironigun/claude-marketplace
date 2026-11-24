'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { readyFilm, inputFile, EXAMPLES } = require('./helpers');
const { BATCH, brandDocs, stagePlan, recordVersions } = require('../lib/stage');

const NOW = '2026-11-12T10:00:00.000Z';
const BRAND = {
  title: 'Orders, promo (Sample)', colours: '#stage { --ground: #fafafa; }\n',
  scenes: { palettes: [['#fafafa', '#4a3fb5', '#202124', '#d9822b']], theirs: 0, background: '#fafafa', fonts: {} },
  overlay: { brand: 'sample' },
};
const MODULES = [
  { name: 'scenes.json', text: JSON.stringify({ v: 1, stage: 'final', look: 'x', width: 1920, height: 1080, fps: 60, scenes: [] }) },
  { name: 'base.css', text: '.ground { background: var(--ground); }\n' },
  { name: 'shared.js', text: 'window.W = {};\n' },
  { name: 'scene-s-01.js', text: "kit.scene('s-01', W.sp.scene('S-01'));\n" },
];
const keysOf = (batch) => batch.map((w) => `${w.collection}/${w.doc_id}`);

test('stage: a brand\'s film is the shared modules with its own scenes.json, base.css and brand.json, its meta and script', () => {
  const docs = brandDocs(MODULES, BRAND);
  assert.deepEqual(Object.keys(docs).sort(), ['film/meta', 'film/script', 'modules/base.css', 'modules/brand.json', 'modules/scene-s-01.js', 'modules/scenes.json', 'modules/shared.js']);
  const scenes = JSON.parse(docs['modules/scenes.json'].text);
  assert.deepEqual(Object.keys(scenes), ['v', 'stage', 'look', 'palettes', 'theirs', 'background', 'fonts', 'width', 'height', 'fps', 'scenes']);
  assert.equal(docs['modules/base.css'].text, '#stage { --ground: #fafafa; }\n.ground { background: var(--ground); }\n');
  assert.deepEqual([docs['modules/scene-s-01.js'].kind, docs['modules/brand.json'].kind], ['js', 'json']);
  assert.deepEqual(docs['film/script'], { code: 'window.CUT = kit.scenes();' });
});

test('stage: a new film gets every document, the modules first and what makes it play last, in batches the store takes', () => {
  const many = [...MODULES, ...Array.from({ length: 60 }, (_, i) => ({ name: `m${i}.json`, text: '{}' }))];
  const plan = stagePlan(brandDocs(many, BRAND), null, NOW);
  const writes = plan.batches.flat();
  assert.equal(writes.length, 67);
  assert.ok(writes.every((w) => w.op === 'set' && !w.if_version));
  assert.ok(plan.batches.every((b) => b.length <= BATCH.writes));
  assert.deepEqual(keysOf(plan.batches.at(-1)), ['modules/scenes.json', 'film/meta', 'film/script']);
  assert.deepEqual(plan.meta, { v: 1, title: 'Orders, promo (Sample)', updatedAt: NOW });
});

test('stage: once recorded, an unchanged film needs no write; a change is pinned, and a gone module deleted once the film moves on', () => {
  const docs = brandDocs(MODULES, BRAND);
  const first = stagePlan(docs, null, NOW);
  const all = Object.fromEntries(first.batches.flat().map((w) => [`${w.collection}/${w.doc_id}`, 3]));
  const known = recordVersions({ url: 'u' }, { hashes: first.hashes, removed: [] }, all);
  assert.deepEqual(stagePlan(docs, known, NOW).batches, []);
  // A document no build wrote (one the film held when it was created) is never deleted.
  known.docs['modules/sample.js'] = { version: 2, hash: null };
  const changed = brandDocs([...MODULES.slice(0, 2), { name: 'shared.js', text: 'window.W = { v: 2 };\n' }], BRAND);
  const plan = stagePlan(changed, known, NOW);
  assert.deepEqual(plan.batches.map((b) => b.map((w) => [w.op, `${w.collection}/${w.doc_id}`, w.if_version])), [
    [['set', 'modules/shared.js', 3]],
    [['set', 'film/meta', 3]],
    [['delete', 'modules/scene-s-01.js', 3]],
  ]);
  const after = recordVersions(known, { hashes: plan.hashes, removed: plan.removed }, { 'modules/shared.js': 4, 'modules/scene-s-01.js': null, 'film/meta': 4 });
  assert.equal(after.docs['modules/shared.js'].version, 4);
  assert.equal(after.docs['modules/scene-s-01.js'], undefined);
  // A delete the store refused, held at its version, is deleted by the next stage, pinned to that version.
  const held = recordVersions(known, { hashes: plan.hashes, removed: plan.removed }, { 'modules/scene-s-01.js': { version: 5 } });
  assert.deepEqual(stagePlan(changed, held, NOW).batches.at(-1).map((w) => [w.op, w.doc_id, w.if_version]), [['delete', 'scene-s-01.js', 5]]);
});

test('sp stage and sp record: a film to create, its writes as files, then nothing left to write once recorded', () => {
  const { sp, film, runSp, repo, env } = readyFilm('reminders', 'promo');
  sp('build', 'reminders', '--film', 'promo');
  const s = sp('stage', 'reminders', '--film', 'promo', '--brand', 'harbor', '--json').json;
  assert.deepEqual([s.url, s.create], [null, { title: 'Reminders, promo (Harbor)' }]);
  const writes = s.batches.flat();
  assert.ok(writes.every((w) => w.op === 'set' && fs.existsSync(w.file_path)));
  // film.json names each scene's surface modules, so it switches the film with scenes.json, after every module.
  assert.deepEqual(keysOf(s.batches.at(-1)), ['modules/film.json', 'modules/scenes.json', 'film/meta', 'film/script']);
  assert.deepEqual(JSON.parse(fs.readFileSync(writes.find((w) => w.doc_id === 'script').file_path, 'utf8')), { code: 'window.CUT = kit.scenes();' });
  assert.match(fs.readFileSync(path.join(s.stage, 'stage.json'), 'utf8'), /\n}\n$/);
  const url = 'https:' + '//example.invalid/film-1';
  sp('record', 'reminders', '--film', 'promo', '--brand', 'harbor', '--url', url);
  assert.match(s.id, /^[0-9a-f]{16}$/);
  const versions = { stage: s.id, ...Object.fromEntries(writes.map((w) => [`${w.collection}/${w.doc_id}`, 1])) };
  sp('record', 'reminders', '--film', 'promo', '--brand', 'harbor', '--versions', inputFile(versions, repo));
  const again = sp('stage', 'reminders', '--film', 'promo', '--brand', 'harbor', '--json').json;
  assert.deepEqual([again.url, again.create, again.batches], [url, null, []]);
  const films = JSON.parse(fs.readFileSync(path.join(film, 'film', 'films.json'), 'utf8'));
  assert.equal(Object.keys(films.harbor.docs).length, writes.length);
  // A version for a document the stage did not write, versions that are not an object, and a brand the film is not
  // made for are refused.
  const record = (...more) => runSp(repo, ['record', 'reminders', '--film', 'promo', ...more], env);
  const last = (more) => inputFile({ stage: again.id, ...more }, repo);
  assert.match(record('--brand', 'harbor', '--versions', last({ 'modules/x.js': 1 })).stderr, /modules\/x\.js was not staged for harbor/);
  // The last stage found nothing left to write, so a version for one of its documents, or null for one, is refused too.
  assert.match(record('--brand', 'harbor', '--versions', last({ 'modules/shared.js': 2 })).stderr, /modules\/shared\.js was not staged for harbor/);
  assert.match(record('--brand', 'harbor', '--versions', last({ 'film/script': null })).stderr, /film\/script was not staged for harbor/);
  // The versions name the stage their batch came from: none, or an older one, is refused.
  assert.match(record('--brand', 'harbor', '--versions', inputFile({ 'modules/shared.js': 2 }, repo)).stderr, /the versions name no stage/);
  assert.match(record('--brand', 'harbor', '--versions', inputFile({ stage: s.id === again.id ? 'other' : s.id, 'modules/shared.js': 2 }, repo)).stderr,
    /the versions are for another stage than harbor's last one; record only the batches of the last stage/);
  assert.match(record('--brand', 'harbor', '--versions', inputFile(null, repo)).stderr, /the versions are an object of "<collection>\/<doc id>" to a version/);
  assert.match(record('--brand', 'acme', '--url', url).stderr, /the film is not made for "acme"; its brands are harbor, lumen/);
  assert.equal(runSp(repo, ['stage', 'reminders', '--film', 'promo', '--brand', 'acme'], env).code, 2);
});

test('sp stage: only the modules the build wrote, as it wrote them', () => {
  const { sp, film, runSp, repo, env } = readyFilm('reminders', 'promo');
  sp('build', 'reminders', '--film', 'promo');
  const modules = path.join(film, 'film', 'modules');
  fs.writeFileSync(path.join(modules, 'notes.tmp'), 'x');
  const s = sp('stage', 'reminders', '--film', 'promo', '--brand', 'harbor', '--json').json;
  assert.ok(!s.batches.flat().some((w) => w.doc_id === 'notes.tmp'));
  // A brand's documents are checked as its film will hold them: a base.css its colours push over the limit is refused
  // before anything is staged.
  const brandFile = path.join(film, 'film', 'brands', 'lumen.json');
  const brand = JSON.parse(fs.readFileSync(brandFile, 'utf8'));
  fs.writeFileSync(brandFile, JSON.stringify({ ...brand, colours: `/* ${'x'.repeat(200 * 1024)} */\n${brand.colours}` }));
  const big = runSp(repo, ['stage', 'reminders', '--film', 'promo', '--brand', 'lumen'], env);
  assert.equal(big.code, 1);
  assert.match(big.stderr, /the film cannot be staged for lumen:\n {2}module base\.css: \d+ KiB; a module takes at most 200 KiB/);
  assert.ok(!fs.existsSync(s.stage.replace(/harbor$/, 'lumen')));
  fs.appendFileSync(path.join(modules, 'shared.js'), '\n');
  const r = runSp(repo, ['stage', 'reminders', '--film', 'promo', '--brand', 'harbor'], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /film\/modules\/shared\.js is not as the build wrote it; run sp build reminders --film promo/);
});

test('status: a film whose every brand\'s film holds its build goes on to verify', () => {
  const { sp, repo } = readyFilm('reminders', 'promo');
  const next = () => sp('status', 'reminders', '--film', 'promo', '--json').json.next;
  assert.equal(next(), 'build');
  sp('build', 'reminders', '--film', 'promo');
  for (const brand of ['harbor', 'lumen']) {
    const s = sp('stage', 'reminders', '--film', 'promo', '--brand', brand, '--json').json;
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--url', `${'https:'}//example.invalid/${brand}`);
    const versions = { stage: s.id, ...Object.fromEntries(s.batches.flat().map((w) => [`${w.collection}/${w.doc_id}`, 1])) };
    if (brand === 'harbor') assert.equal(next(), 'build');
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--versions', inputFile(versions, repo));
  }
  assert.equal(next(), 'verify');
  // The film's title and scene names come from the subject's name: a new one needs a new build.
  sp('state', 'reminders', '--decision', 'Name: Nudges');
  assert.equal(next(), 'build');
  sp('state', 'reminders', '--decision', 'Name: Reminders');
  assert.equal(next(), 'verify');
});

test('status: a stage recorded part-way leaves the film to build, and a stage with nothing to write holds the build', () => {
  const { sp, repo } = readyFilm('reminders', 'promo');
  const next = () => sp('status', 'reminders', '--film', 'promo', '--json').json.next;
  const ids = {};
  const stage = (brand) => {
    const s = sp('stage', 'reminders', '--film', 'promo', '--brand', brand, '--json').json;
    ids[brand] = s.id;
    return s.batches;
  };
  const record = (brand, writes) => sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--versions',
    inputFile({ stage: ids[brand], ...Object.fromEntries(writes.map((w) => [`${w.collection}/${w.doc_id}`, 1])) }, repo));
  const theme = JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'expected', 'example-desk', 'theme.json'), 'utf8'));
  sp('build', 'reminders', '--film', 'promo');
  for (const brand of ['harbor', 'lumen']) {
    const batches = stage(brand);
    sp('record', 'reminders', '--film', 'promo', '--brand', brand, '--url', `${'https:'}//example.invalid/${brand}`);
    record(brand, batches.flat());
  }
  assert.equal(next(), 'verify');
  // A theme change for lumen alone leaves harbor's film nothing to write, and that stage records it as holding the
  // new build.
  theme.brands.lumen.vars['--brand-primary'] = '#00695c';
  sp('save', 'theme', inputFile(theme, repo));
  sp('build', 'reminders', '--film', 'promo');
  assert.deepEqual(stage('harbor'), []);
  record('lumen', stage('lumen').flat());
  assert.equal(next(), 'verify');
  // A new name rewrites film.json, scenes.json and the meta in one batch. Lumen's batch stops after its first write.
  const rename = (name) => {
    sp('state', 'reminders', '--decision', `Name: ${name}`);
    sp('storyboard', 'reminders', '--film', 'promo');
    sp('confirm', 'gate-2', '--subject', 'reminders', '--film', 'promo');
    sp('build', 'reminders', '--film', 'promo');
  };
  rename('Nudges');
  record('harbor', stage('harbor').flat());
  const part = stage('lumen').flat();
  assert.deepEqual(part.map((w) => w.doc_id), ['film.json', 'scenes.json', 'meta']);
  record('lumen', part.slice(0, 1));
  assert.equal(next(), 'build');
  // Back to the old name: lumen's film holds part of the renamed build, so it holds neither build.
  rename('Reminders');
  record('harbor', stage('harbor').flat());
  assert.equal(next(), 'build');
  record('lumen', stage('lumen').flat());
  assert.equal(next(), 'verify');
});

test('sp record: a document the store holds as it is gets pinned writes, and one no build wrote is left alone', () => {
  const { sp, repo } = readyFilm('reminders', 'promo');
  sp('build', 'reminders', '--film', 'promo');
  const s = sp('stage', 'reminders', '--film', 'promo', '--brand', 'harbor', '--json').json;
  sp('record', 'reminders', '--film', 'promo', '--brand', 'harbor', '--url', `${'https:'}//example.invalid/h`);
  const versions = { stage: s.id, ...Object.fromEntries(s.batches.flat().map((w) => [`${w.collection}/${w.doc_id}`, 1])) };
  // The store refused shared.js, which had changed, and the user said to write the build over it; the film also held a
  // document of its own when it was created.
  versions['modules/shared.js'] = { version: 7 };
  versions['modules/sample.js'] = { version: 2 };
  sp('record', 'reminders', '--film', 'promo', '--brand', 'harbor', '--versions', inputFile(versions, repo));
  const again = sp('stage', 'reminders', '--film', 'promo', '--brand', 'harbor', '--json').json;
  assert.deepEqual(again.batches.map((b) => b.map((w) => [w.doc_id, w.if_version])), [[['shared.js', 7]], [['meta', 1]]]);
});

test('sp stage: never a film older than its story and screens', () => {
  const { sp, film, runSp, repo, env } = readyFilm('reminders', 'promo');
  sp('build', 'reminders', '--film', 'promo');
  const screen = JSON.parse(fs.readFileSync(path.join(film, 'screens', 'SCR-01.json'), 'utf8'));
  screen.guesses.push('A later guess.');
  sp('save', 'screen', inputFile(screen, repo), '--subject', 'reminders', '--film', 'promo');
  const r = runSp(repo, ['stage', 'reminders', '--film', 'promo', '--brand', 'lumen'], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /the film has changed since its build; run sp build reminders --film promo/);
});
