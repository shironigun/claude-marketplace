'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, analysedFixture, inputFile, EXAMPLES } = require('./helpers');
const { readText } = require('../lib/text');

const EXPECTED = path.join(EXAMPLES, 'expected', 'example-desk');
// The films the expected outputs plan (spec 11.1, 14.1): a promo of the Reminders feature and a walkthrough of the
// whole desk.
const FILMS = [['reminders', 'promo'], ['the-desk', 'walkthrough']];

for (const [subject, format] of FILMS) {
  test(`expected: the ${format} of ${subject} saves on its analysis, passes gate 2 on its expected storyboard, and its screens from code ready it for the build`, () => {
    const { repo, env, sp } = analysedFixture(subject);
    sp('save', 'brands', inputFile(JSON.parse(fs.readFileSync(path.join(EXPECTED, 'brands.json'), 'utf8')), repo));
    sp('confirm', 'brands');
    sp('confirm', 'gate-1', '--subject', subject);
    sp('state', subject, '--decision', 'Release: new');
    sp('film', subject, format);
    const film = path.join(EXPECTED, subject, format);
    for (const kind of ['mods', 'beats', 'demo-data']) {
      sp('save', kind, path.join(film, `${kind}.json`), '--subject', subject, '--film', format);
    }
    const { saved } = sp('storyboard', subject, '--film', format, '--json').json;
    assert.equal(fs.readFileSync(saved, 'utf8'), readText(fs.readFileSync(path.join(film, 'storyboard.md'))));
    sp('confirm', 'gate-2', '--subject', subject, '--film', format);
    assert.equal(runSp(repo, ['status', subject, '--film', format, '--json'], env).json.next, 'ui');
    // The screens rebuilt from example-desk's code (spec 5.11): the theme, then each screen the story shows.
    sp('save', 'theme', inputFile(JSON.parse(fs.readFileSync(path.join(EXPECTED, 'theme.json'), 'utf8')), repo));
    const screens = fs.readdirSync(path.join(film, 'screens')).sort();
    for (const file of screens) {
      const screen = JSON.parse(fs.readFileSync(path.join(film, 'screens', file), 'utf8'));
      sp('save', 'screen', inputFile(screen, repo), '--subject', subject, '--film', format);
    }
    // What must not show is marked where the screens show it: the drawer's hidden History tab (T-05) and, on the
    // dashboard, the response time that is never filled (T-04).
    const surfaces = screens.flatMap((file) => JSON.parse(fs.readFileSync(path.join(film, 'screens', file), 'utf8')).scenes.flatMap((s) => s.surfaces));
    const details = surfaces.filter((x) => x.action === 'Details');
    assert.ok(details.length > 0);
    for (const s of details) assert.match(JSON.stringify(s.html), /data-sp-hide='T-05'/);
    if (format === 'walkthrough') assert.match(JSON.stringify(surfaces.filter((x) => x.kind === 'page')), /data-sp-hide='T-04'/);
    const status = runSp(repo, ['screens', subject, '--film', format, '--json'], env).json;
    assert.deepEqual(status.screens.map((s) => [s.id, s.saved, s.problems]), screens.map((f) => [path.basename(f, '.json'), true, []]));
    assert.deepEqual([status.theme, status.ready, status.next], [{ saved: true, problems: [] }, true, 'build']);
  });
}

test('expected: the films and their screens use made-up names, never the seed data\'s', () => {
  const seed = ['customers.json', 'reminders.json']
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'example-desk', 'data', f), 'utf8')));
  const names = new Set(seed.flatMap((r) => [r.name, r.company, r.customer, r.owner, r.subject].filter(Boolean)));
  for (const [subject, format] of FILMS) {
    const dir = path.join(EXPECTED, subject, format);
    const files = ['beats.json', 'demo-data.json', ...fs.readdirSync(path.join(dir, 'screens')).map((f) => path.join('screens', f))];
    const text = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    for (const name of names) assert.ok(!text.includes(name), `${subject}/${format} uses "${name}" from the seed data`);
  }
});
