'use strict';
// The Reminders feature: a queue in three tabs, a drawer per reminder, and a dialog that sends it.
let status = 'open';
let current = null;
let requests = 0;
const $ = (id) => document.getElementById(id);

// Tabs can be clicked faster than the server answers, so only the newest request fills the table.
async function loadRows() {
  const request = ++requests;
  const rows = await api(`/api/reminders?status=${status}`);
  if (request !== requests) return;
  $('rows').innerHTML = rows.map((r) =>
    `<tr data-id="${esc(r.id)}"><td>${esc(r.customer)}</td><td>${esc(r.subject)}</td><td>${esc(r.due)}</td><td>${esc(r.owner)}</td><td>${esc(r.channel)}</td></tr>`).join('');
  $('empty').hidden = rows.length > 0;
}

async function openDrawer(id) {
  current = await api(`/api/reminders/${encodeURIComponent(id)}`);
  $('d-title').textContent = current.customer;
  $('d-details').innerHTML = [['Subject', current.subject], ['Due', current.due], ['Owner', current.owner], ['Channel', current.channel], ['Status', current.status]]
    .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  $('d-send').disabled = current.status !== 'open';
  $('d-snooze').disabled = current.status !== 'open';
  $('drawer').hidden = false;
}

function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  setTimeout(() => { $('toast').hidden = true; }, 3000);
}

async function send() {
  let sent;
  try {
    sent = await api(`/api/reminders/${encodeURIComponent(current.id)}/send`, {
      method: 'POST', body: JSON.stringify({ note: $('note').value.trim() }),
    });
  } catch (e) {
    toast(`Could not send: ${e.message}`);
    return;
  }
  $('drawer').hidden = true;
  toast(`Reminder sent to ${sent.customer}`);
  await Promise.all([loadRows(), renderNotifications()]);
}

window.deskReady.then(() => {
  const tabs = document.querySelectorAll('.main .tabs [role=tab]');
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    status = tab.dataset.status;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    loadRows();
  }));
  $('rows').addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (row) openDrawer(row.dataset.id);
  });
  $('d-close').addEventListener('click', () => { $('drawer').hidden = true; });
  $('d-snooze').addEventListener('click', async () => {
    await api(`/api/reminders/${encodeURIComponent(current.id)}/snooze`, { method: 'POST' });
    $('drawer').hidden = true;
    await loadRows();
  });
  $('d-send').addEventListener('click', () => {
    $('note').value = '';
    $('send-dialog').returnValue = '';
    $('send-dialog').showModal();
  });
  $('send-dialog').addEventListener('close', () => {
    if ($('send-dialog').returnValue === 'send') send();
  });
  return loadRows();
});
