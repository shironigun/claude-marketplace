'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { readyFilm } = require('./helpers');

for (const [subject, format, scenes] of [['reminders', 'promo', 5], ['the-desk', 'walkthrough', 10]]) {
  test(`build: the ${format} of ${subject} builds its shared source and both brands' overlays`, () => {
    const { sp, film } = readyFilm(subject, format);
    const r = sp('build', subject, '--film', format, '--json').json;
    assert.equal(r.scenes, scenes);
    const modules = path.join(film, 'film', 'modules');
    const names = fs.readdirSync(modules).sort();
    assert.deepEqual(names, [...r.modules].sort());
    for (const name of ['scenes.json', 'base.css', 'shared.js', 'film.json', 'score.js', 'scr-01.css', 'scr-01.json']) assert.ok(names.includes(name), name);
    assert.equal(names.filter((n) => /^scene-s-\d{2}\.js$/.test(n)).length, scenes);
    assert.deepEqual(r.brands, ['harbor', 'lumen']);
    // The kit runs as the player runs it, and each scene module asks it for its scene.
    const ctx = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(modules, 'shared.js'), 'utf8'), ctx);
    assert.equal(typeof ctx.window.W.sp.scene, 'function');
    assert.equal(fs.readFileSync(path.join(modules, 'scene-s-02.js'), 'utf8'), "kit.scene('s-02', W.sp.scene('S-02'));\n");
    const story = JSON.parse(fs.readFileSync(path.join(modules, 'film.json'), 'utf8'));
    assert.equal(story.chip, 'New');
    assert.deepEqual(story.order.length, scenes);
    const motion = JSON.parse(fs.readFileSync(path.join(modules, 'scenes.json'), 'utf8'));
    assert.equal(motion.scenes.reduce((n, s) => n + s.dur, 0).toFixed(1), String(story.film.length.toFixed(1)));
    const lumen = JSON.parse(fs.readFileSync(path.join(film, 'film', 'brands', 'lumen.json'), 'utf8'));
    assert.deepEqual(Object.keys(lumen.overlay.logos), ['full', 'collapsed']);
    assert.match(lumen.colours, /^#stage \{ --ground: #f3f7f6; --main: #00796b;/);
    assert.match(lumen.title, /\(Lumen\)$/);
  });
}

test('build: a walkthrough beat on the element its click selected holds; one on another element moves', () => {
  const { sp, film } = readyFilm('the-desk', 'walkthrough');
  sp('build', 'the-desk', '--film', 'walkthrough');
  const story = JSON.parse(fs.readFileSync(path.join(film, 'film', 'modules', 'film.json'), 'utf8'));
  // "the Snoozed tab" is clicked, then what it shows is held: two elements, so the camera moves.
  assert.notEqual(story.scenes['S-05'].beats[2].move, null);
});

test('build: only after the screens are ready, and a new build leaves no module of the last one behind', () => {
  const { sp, film, runSp, repo, env } = readyFilm('reminders', 'promo');
  const stray = path.join(film, 'film', 'modules', 'scr-09.css');
  fs.mkdirSync(path.dirname(stray), { recursive: true });
  fs.writeFileSync(stray, '.sp-scr-09 {}');
  sp('build', 'reminders', '--film', 'promo');
  assert.equal(fs.existsSync(stray), false);
  fs.rmSync(path.join(film, 'screens', 'SCR-01.json'));
  const r = runSp(repo, ['build', 'reminders', '--film', 'promo'], env);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /the screens are not ready for the build; run sp screens reminders --film promo/);
});
