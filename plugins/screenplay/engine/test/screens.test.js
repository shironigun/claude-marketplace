'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runSp, filmRepo, validJson, inputFile } = require('./helpers');
const { neededScreens, screenBrief } = require('../lib/screens');

// The sample app's promo with its plan saved and gate 2 passed; `sp` and `save` run more.
function approved() {
  const f = filmRepo();
  const sp = (...args) => runSp(f.repo, args, f.env);
  const save = (kind, value, ...rest) => sp('save', kind, inputFile(value, f.repo), ...rest);
  for (const kind of ['mods', 'beats', 'demo-data']) assert.equal(save(kind, validJson(kind), '--subject', 'orders', '--film', 'promo').code, 0, kind);
  assert.equal(sp('storyboard', 'orders', '--film', 'promo').code, 0);
  assert.equal(sp('confirm', 'gate-2', '--subject', 'orders', '--film', 'promo').code, 0);
  return { ...f, sp, save };
}

test('screens: the story\'s screens in the order it first shows them, each with its scenes', () => {
  const beats = validJson('beats');
  const [title, scene, end] = beats.scenes;
  beats.scenes = [title, scene, { ...scene, id: 'S-03', screen: 'SCR-02' }, { ...scene, id: 'S-04' }, end];
  assert.deepEqual(neededScreens({ beats }), [{ id: 'SCR-01', scenes: ['S-02', 'S-04'] }, { id: 'SCR-02', scenes: ['S-03'] }]);
});

test('screens: the UI builder\'s brief holds the scenes with their hooks, surfaces and answers, the theme and what must not show', () => {
  const fc = {
    subject: 'orders', film: 'promo', format: 'promo', screens: validJson('screens').screens, calls: validJson('api-calls').calls,
    truth: validJson('truth').entries, forbidden: ['Dana Fox'], beats: validJson('beats'), demo: validJson('demo-data'),
    mods: validJson('mods'), brands: validJson('brands').brands.map((b) => ({ id: b.id, name: b.name, chrome: b.chrome })),
  };
  const brief = screenBrief(fc, validJson('theme'), 'SCR-01');
  assert.deepEqual(brief.places, { header: { sample: { logo: 'full', height: 28 } } });
  assert.deepEqual([brief.kind, brief.prefix, brief.screen.id], ['screen', 'sp-scr-01', 'SCR-01']);
  assert.deepEqual(brief.theme, ['--primary', '--secondary', '--background', '--text', '--title-weight']);
  const [scene] = brief.scenes;
  assert.deepEqual([scene.scene, scene.state, scene.persona.name], ['S-02', 'populated', 'Dana Reyes']);
  assert.deepEqual(scene.beats.map((b) => b.hook), ['S-02.1', 'S-02.2', 'S-02.3', 'S-02.4', 'S-02.5']);
  assert.deepEqual(scene.surfaces, [{ kind: 'page' }, { kind: 'drawer', action: 'Open order' }]);
  assert.deepEqual([scene.openBefore, scene.tabs], [[], []]);
  assert.deepEqual(scene.answers.map((c) => c.id), ['API-01', 'API-02']);
  assert.deepEqual([brief.mustNotShow, brief.forbidden, brief.limits.cssBytes], [[], ['Dana Fox'], 150 * 1024]);
  assert.equal(screenBrief(fc, null, 'SCR-01').theme, null);
});

test('sp screens: after gate 2, where the theme and each screen stand, their briefs, and the build once all pass', () => {
  const early = filmRepo();
  assert.match(runSp(early.repo, ['screens', 'orders', '--film', 'promo'], early.env).stderr, /the screens come after gate 2; the next step is mods/);
  const f = approved();
  const status = () => f.sp('screens', 'orders', '--film', 'promo', '--json').json;
  let s = status();
  assert.deepEqual([s.theme, s.ready, s.next], [{ saved: false, problems: [] }, false, 'ui']);
  assert.deepEqual(s.screens, [{ id: 'SCR-01', title: 'Orders list', scenes: ['S-02'], saved: false, problems: [] }]);
  const inbox = path.join(f.env.SCREENPLAY_HOME, 'shop', 'inbox');
  const brief = f.sp('screens', 'orders', '--film', 'promo', '--brief', 'SCR-01', '--json');
  assert.equal(brief.code, 0, brief.stderr);
  assert.deepEqual(brief.json, { brief: path.join(inbox, 'orders.promo.SCR-01.brief.json'), result: path.join(inbox, 'orders.promo.SCR-01.json') });
  // The brief says where to read the code, at which commit, how the app draws, and the shape to return.
  const b = JSON.parse(fs.readFileSync(brief.json.brief, 'utf8'));
  const head = spawnSync('git', ['-C', f.repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  assert.deepEqual([b.prefix, b.repository, b.branch, b.commit], ['sp-scr-01', f.repo, null, head]);
  assert.deepEqual(Object.keys(b.stack), ['frameworks', 'theming', 'i18n', 'fonts', 'layout']);
  assert.deepEqual([b.window, path.basename(b.schema), fs.existsSync(b.example)], [{ width: 1440, height: 900 }, 'screen.schema.json', true]);
  const theme = f.sp('screens', 'orders', '--film', 'promo', '--brief', 'theme', '--json').json;
  assert.equal(theme.result, path.join(inbox, 'theme.json'));
  const t = JSON.parse(fs.readFileSync(theme.brief, 'utf8'));
  assert.deepEqual([t.repository, t.branch, t.commit, path.basename(t.schema)], [f.repo, null, head, 'theme.schema.json']);
  assert.deepEqual(t.brands.map((x) => [x.id, Object.keys(x.evidence)[0]]), [['sample', 'palette.primary']]);
  assert.match(f.sp('screens', 'orders', '--film', 'promo', '--brief', 'SCR-09').stderr, /the story shows no screen "SCR-09"; use theme or one of: SCR-01/);
  assert.equal(f.save('theme', validJson('theme')).code, 0);
  assert.equal(f.save('screen', validJson('screen'), '--subject', 'orders', '--film', 'promo').code, 0);
  s = status();
  assert.deepEqual([s.theme.saved, s.screens[0].saved, s.screens[0].problems, s.ready, s.next], [true, true, [], true, 'build']);
  assert.ok(s.bytes > 0 && s.bytes < s.limit);
  assert.equal(f.sp('status', 'orders', '--film', 'promo', '--json').json.next, 'build');
  const text = f.sp('screens', 'orders', '--film', 'promo').stdout;
  for (const line of [/^theme: saved$/m, /^SCR-01 Orders list \(S-02\): saved$/m, /^size: 2 KiB of 1536 KiB$/m, /^ready for the build$/m]) assert.match(text, line);
  // A theme saved later without a variable the screen reads: the screen no longer passes, so the build waits.
  const thin = validJson('theme');
  delete thin.brands.sample.vars['--primary'];
  thin.brands.sample.evidence.shift();
  assert.equal(f.save('theme', thin).code, 0);
  s = status();
  assert.deepEqual([s.screens[0].problems, s.ready], [["/css: var(--primary) is in no brand's theme and not set here"], false]);
});
