'use strict';
// example-desk: a tiny two-brand web app that screenplay's tests film. No dependencies; Node 20 or later.
// Run it with `node server.js`, then open http://127.0.0.1:5317 (or /partner for the partner brand).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const NOTE_LIMIT = 280;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};
const PAGES = { '/': 'index.html', '/reminders': 'reminders.html', '/customers': 'customers.html' };

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function resolveStatic(pathname) {
  const page = PAGES[pathname.replace(/^\/partner(?=\/|$)/, '') || '/'];
  if (page) return path.join(ROOT, 'public', page);
  const fromBrands = pathname.startsWith('/brands/');
  const base = path.join(ROOT, fromBrands ? 'brands' : 'public');
  let rel;
  try {
    rel = decodeURIComponent(pathname.slice(fromBrands ? '/brands/'.length : 1));
  } catch {
    return null;
  }
  const file = path.resolve(base, rel);
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return file;
}

function readBody(req) {
  return new Promise((resolve) => {
    let text = '';
    req.on('data', (chunk) => { text += chunk; });
    req.on('end', () => {
      try {
        resolve(text ? JSON.parse(text) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

function createApp(config = readJson('config.json')) {
  const db = { reminders: readJson('data/reminders.json'), customers: readJson('data/customers.json'), notifications: [] };
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': TYPES['.json'] });
    res.end(JSON.stringify(body));
  };
  const hasSession = (req) => /(?:^|;\s*)desk_session=demo(?:;|$)/.test(req.headers.cookie || '');

  async function api(req, res, url) {
    const p = url.pathname;
    const one = /^\/api\/reminders\/([\w-]+)(?:\/(send|snooze))?$/.exec(p);
    if (req.method === 'GET' && p === '/api/session') {
      return json(res, 200, { user: { name: 'Riley Chen', role: 'Manager' }, workspace: config.workspace });
    }
    if (req.method === 'GET' && p === '/api/dashboard') {
      const open = db.reminders.filter((r) => r.status === 'open');
      const sent = db.reminders.filter((r) => r.status === 'sent' && daysBetween(r.sentAt, config.today) < 7);
      return json(res, 200, {
        open: open.length,
        dueToday: open.filter((r) => r.due === config.today).length,
        sentThisWeek: sent.length,
        avgResponseHours: null,
      });
    }
    if (req.method === 'GET' && p === '/api/reminders') {
      const status = url.searchParams.get('status') || 'open';
      const list = db.reminders.filter((r) => r.status === status);
      return json(res, 200, list.sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id)));
    }
    if (one) {
      const reminder = db.reminders.find((r) => r.id === one[1]);
      if (!reminder) return json(res, 404, { error: 'no such reminder' });
      if (req.method === 'GET' && !one[2]) return json(res, 200, reminder);
      if (req.method === 'POST' && one[2] === 'snooze') {
        if (reminder.status !== 'open') return json(res, 409, { error: 'only an open reminder can be snoozed' });
        reminder.status = 'snoozed';
        return json(res, 200, reminder);
      }
      if (req.method === 'POST' && one[2] === 'send') {
        if (reminder.status !== 'open') return json(res, 409, { error: 'only an open reminder can be sent' });
        const body = await readBody(req);
        if (!body || typeof (body.note ?? '') !== 'string') return json(res, 400, { error: 'send a JSON body with a note' });
        const note = (body.note || '').trim();
        if (note.length > NOTE_LIMIT) return json(res, 400, { error: `note is at most ${NOTE_LIMIT} characters` });
        Object.assign(reminder, { status: 'sent', sentAt: config.today, note });
        db.notifications.unshift({ id: `N-${db.notifications.length + 1}`, text: `Reminder sent to ${reminder.customer}`, at: config.today });
        return json(res, 200, reminder);
      }
    }
    if (req.method === 'GET' && p === '/api/notifications') return json(res, 200, db.notifications);
    if (req.method === 'GET' && p === '/api/customers') {
      return json(res, 200, db.customers.map((c) => ({
        ...c, openReminder: db.reminders.some((r) => r.customerId === c.id && r.status === 'open'),
      })));
    }
    return json(res, 404, { error: 'not found' });
  }

  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (!hasSession(req)) return json(res, 401, { error: 'sign in first' });
      return api(req, res, url).catch(() => json(res, 500, { error: 'server error' }));
    }
    const file = resolveStatic(url.pathname);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
    if (file.endsWith('.html') && !hasSession(req)) headers['Set-Cookie'] = 'desk_session=demo; HttpOnly; Path=/; SameSite=Lax';
    res.writeHead(200, headers);
    return fs.createReadStream(file).pipe(res);
  });
}

if (require.main === module) {
  const config = readJson('config.json');
  createApp(config).listen(config.port, '127.0.0.1', () => process.stdout.write(`example-desk on http://127.0.0.1:${config.port}\n`));
}

module.exports = { createApp, NOTE_LIMIT };
