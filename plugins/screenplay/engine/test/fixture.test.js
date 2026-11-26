'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, fixtureRepo, EXAMPLES } = require('./helpers');

const APP = path.join(EXAMPLES, 'example-desk');
const { createApp, NOTE_LIMIT } = require(path.join(APP, 'server.js'));
const { brandFor, railLogo } = require(path.join(APP, 'public', 'brand.js'));

async function withServer(fn) {
  const server = createApp({ port: 0, today: '2026-11-12', workspace: { name: 'Example Desk', partner: false } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('example-desk: pages set the session cookie; the API refuses calls without it', async () => {
  await withServer(async (base) => {
    const page = await fetch(`${base}/partner/reminders`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Reminders/);
    const cookie = page.headers.get('set-cookie').split(';')[0];
    assert.equal(cookie, 'desk_session=demo');
    assert.equal((await fetch(`${base}/api/reminders`)).status, 401);
    const list = await (await fetch(`${base}/api/reminders?status=open`, { headers: { cookie } })).json();
    assert.deepEqual(list.map((r) => r.id), ['R-101', 'R-102', 'R-103', 'R-106']);
    assert.equal((await fetch(`${base}/brands/..%2fserver.js`)).status, 404);
  });
});

test('example-desk: sending takes a note of at most 280 characters, marks the reminder sent and adds a notification; only an open reminder can be sent or snoozed', async () => {
  await withServer(async (base) => {
    const cookie = 'desk_session=demo';
    const get = async (url) => (await fetch(`${base}${url}`, { headers: { cookie } })).json();
    const post = (url, body) => fetch(`${base}${url}`, {
      method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal((await post('/api/reminders/R-101/send', { note: 'x'.repeat(NOTE_LIMIT + 1) })).status, 400);
    const sent = await (await post('/api/reminders/R-101/send', { note: 'Quote attached.' })).json();
    assert.deepEqual([sent.status, sent.sentAt, sent.note], ['sent', '2026-11-12', 'Quote attached.']);
    const again = await post('/api/reminders/R-101/send', { note: 'Again.' });
    assert.deepEqual([again.status, await again.json()], [409, { error: 'only an open reminder can be sent' }]);
    const snooze = await post('/api/reminders/R-101/snooze', {});
    assert.deepEqual([snooze.status, await snooze.json()], [409, { error: 'only an open reminder can be snoozed' }]);
    assert.deepEqual((await get('/api/notifications')).map((n) => n.text), ['Reminder sent to Ava Brooks']);
    assert.deepEqual(await get('/api/dashboard'), { open: 3, dueToday: 1, sentThisWeek: 2, avgResponseHours: null });
    assert.deepEqual((await get('/api/customers')).filter((c) => c.openReminder).map((c) => c.id), ['C-1', 'C-2', 'C-3']);
    assert.equal((await post('/api/reminders/R-999/send', { note: 'x' })).status, 404);
  });
});

test('example-desk: the brand rule and the side-rail logo', () => {
  assert.equal(brandFor({ partner: false }, '/reminders'), 'harbor');
  assert.equal(brandFor({ partner: true }, '/reminders'), 'lumen');
  assert.equal(brandFor({ partner: false }, '/partner/reminders'), 'lumen');
  assert.equal(brandFor({ partner: false }, '/partnership'), 'harbor');
  assert.deepEqual(railLogo('lumen'), { src: '/brands/lumen/mark.svg', height: 25, inset: 10 });
  assert.deepEqual(railLogo('harbor'), { src: '/brands/harbor/logo.svg', height: 32, inset: 0 });
});

test('example-desk: sp detect finds exactly the expected stack', () => {
  const r = runSp(fixtureRepo(), ['detect', '--json']);
  assert.equal(r.code, 0, r.stderr);
  const expected = JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'expected', 'example-desk', 'stack.json'), 'utf8'));
  assert.deepEqual(r.json.stack, expected);
});

test('example-desk: no third-party dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(APP, 'package.json'), 'utf8'));
  assert.deepEqual([pkg.dependencies, pkg.devDependencies], [undefined, undefined]);
});
