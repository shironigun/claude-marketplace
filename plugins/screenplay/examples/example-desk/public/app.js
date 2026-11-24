'use strict';
// The shell every page shares: session, brand theme, side rail, notifications, and the API helper.
const api = (url, init = {}) =>
  fetch(url, { credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${url}`))));
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const prefix = location.pathname.startsWith('/partner') ? '/partner' : '';
const NAV = [['dashboard', '/', 'Dashboard'], ['reminders', '/reminders', 'Reminders'], ['customers', '/customers', 'Customers']];

function renderRail(brandId, active) {
  const logo = DeskBrand.railLogo(brandId);
  document.getElementById('rail').innerHTML =
    `<img class="rail-logo" src="${logo.src}" alt="${DeskBrand.BRANDS[brandId].name}" style="height:${logo.height}px;padding-left:${logo.inset}px">`
    + NAV.map(([id, href, label]) => `<a class="rail-link${id === active ? ' active' : ''}" href="${prefix}${href}">${label}</a>`).join('');
}

// A failure here is logged, so the rest of the page still works.
async function renderNotifications() {
  try {
    const notes = await api('/api/notifications');
    const badge = document.getElementById('badge');
    badge.textContent = String(notes.length);
    badge.hidden = notes.length === 0;
    document.getElementById('notes').innerHTML = notes.length
      ? notes.map((n) => `<li class="note">${esc(n.text)}<time>${esc(n.at)}</time></li>`).join('')
      : '<li class="note">Nothing new</li>';
  } catch (e) {
    console.error('Could not show the notifications', e);
  }
}

async function startShell() {
  const session = await fetch('/api/session', { credentials: 'include' }).then((r) => r.json());
  const brandId = DeskBrand.brandFor(session.workspace, location.pathname);
  const theme = document.createElement('link');
  theme.rel = 'stylesheet';
  theme.href = DeskBrand.BRANDS[brandId].theme;
  document.head.appendChild(theme);
  document.body.dataset.brand = brandId;
  renderRail(brandId, document.body.dataset.page);
  document.getElementById('bell').addEventListener('click', () => {
    const panel = document.getElementById('panel');
    panel.hidden = !panel.hidden;
  });
  await renderNotifications();
  return session;
}

async function renderDashboard() {
  const d = await api('/api/dashboard');
  document.getElementById('c-open').textContent = d.open;
  document.getElementById('c-due').textContent = d.dueToday;
  document.getElementById('c-sent').textContent = d.sentThisWeek;
  document.getElementById('c-avg').textContent = d.avgResponseHours == null ? '—' : `${d.avgResponseHours} h`;
}

async function renderCustomers() {
  const rows = await api('/api/customers');
  document.getElementById('customer-rows').innerHTML = rows.map((c) =>
    `<tr><td>${esc(c.name)}${c.openReminder ? ' <span class="tag">Reminder</span>' : ''}</td><td>${esc(c.company)}</td><td>${esc(c.city)}</td></tr>`).join('');
}

const RENDER = { dashboard: renderDashboard, customers: renderCustomers };
window.deskReady = startShell().then(async (session) => {
  const page = document.body.dataset.page;
  if (RENDER[page]) await RENDER[page]().catch((e) => console.error(`Could not render the ${page} page`, e));
  return session;
});
