#!/usr/bin/env node
// Reads ChatGPT and Claude data exports on this machine and finds what the user said about their work.
// Offline: it reads the files you name and prints to the terminal. Nothing is uploaded.
//
//   node chats.mjs list <export...>                         every conversation, newest first
//   node chats.mjs find <export...> --terms "a|b|c"         messages that mention any term
//        [--role user|assistant] [--limit 60] [--width 240]
//   node chats.mjs show <export...> --id <id prefix>        one conversation in full
//
// <export> is a conversations.json file, or a folder holding one (the unzipped export).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const day = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : 'no date');

// ChatGPT stores each conversation as a tree of message nodes in `mapping`.
function fromChatGPT(c) {
  const messages = Object.values(c.mapping || {})
    .map((n) => n && n.message)
    .filter((m) => m && ['user', 'assistant'].includes(m.author?.role))
    .map((m) => {
      const parts = (m.content?.parts || []).filter((p) => typeof p === 'string');
      if (typeof m.content?.text === 'string') parts.push(m.content.text);
      return { role: m.author.role, text: parts.join('\n').trim(), date: m.create_time ? new Date(m.create_time * 1000) : null };
    })
    .filter((m) => m.text)
    .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  return { tool: 'chatgpt', id: c.conversation_id || c.id || '', title: c.title || '(untitled)', date: c.create_time ? new Date(c.create_time * 1000) : null, messages };
}

// Claude keeps a flat chat_messages list. Older exports put the text in `text`, newer ones in content blocks.
function fromClaude(c) {
  const messages = (c.chat_messages || [])
    .map((m) => {
      const blocks = Array.isArray(m.content) ? m.content.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text) : [];
      const text = (blocks.length ? blocks.join('\n') : m.text || '').trim();
      return { role: m.sender === 'human' ? 'user' : 'assistant', text, date: m.created_at ? new Date(m.created_at) : null };
    })
    .filter((m) => m.text);
  return { tool: 'claude', id: c.uuid || '', title: c.name || '(untitled)', date: c.created_at ? new Date(c.created_at) : null, messages };
}

function conversationsIn(file) {
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { throw new Error(`${file}: not readable JSON (${e.message})`); }
  if (!Array.isArray(data)) return { convs: [], skipped: 0 }; // users.json, projects.json and the like
  const convs = [];
  let skipped = 0;
  for (const c of data) {
    if (c && typeof c === 'object' && c.mapping) convs.push(fromChatGPT(c));
    else if (c && typeof c === 'object' && Array.isArray(c.chat_messages)) convs.push(fromClaude(c));
    else skipped++;
  }
  return { convs, skipped };
}

// shortcut: reads each file whole; an export over ~500 MB hits Node's string limit, so split it first.
export function load(paths) {
  const files = paths.flatMap((p) => (statSync(p).isDirectory()
    ? readdirSync(p).filter((f) => /^conversations.*\.json$/i.test(f)).map((f) => join(p, f))
    : [p]));
  if (!files.length) throw new Error(`No conversations*.json found in: ${paths.join(', ')}`);
  const all = [];
  let skipped = 0;
  for (const f of files) {
    const r = conversationsIn(f);
    r.convs.forEach((c) => all.push({ ...c, file: basename(f) }));
    skipped += r.skipped;
  }
  return { convs: all.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)), skipped };
}

export function find(convs, terms, { role, limit = 60, width = 240 } = {}) {
  const words = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!words.length) throw new Error('Give at least one search term.');
  const hits = [];
  for (const c of convs) {
    for (const m of c.messages) {
      if (role && m.role !== role) continue;
      const low = m.text.toLowerCase();
      const word = words.find((w) => low.includes(w));
      if (!word) continue;
      const at = low.indexOf(word), from = Math.max(0, at - Math.floor(width / 2));
      const snippet = m.text.slice(from, from + width).replace(/\s+/g, ' ').trim();
      hits.push({ tool: c.tool, id: c.id, title: c.title, date: day(m.date || c.date), role: m.role, term: word, snippet: `${from > 0 ? '...' : ''}${snippet}${from + width < m.text.length ? '...' : ''}` });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

// The line a fact ledger can cite as its source.
export const cite = (h) => `${h.tool} chat "${h.title}", ${h.date}, ${h.role} message (id ${h.id.slice(0, 8)})`;

function main(argv) {
  const [cmd, ...rest] = argv;
  const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest.splice(i, 2)[1] : undefined; };
  const terms = opt('terms'), role = opt('role'), limit = opt('limit'), width = opt('width'), id = opt('id');
  if (!['list', 'find', 'show'].includes(cmd) || !rest.length) {
    console.log('Usage: node chats.mjs list|find|show <conversations.json or export folder...> [--terms "a|b"] [--role user] [--limit 60] [--id prefix]');
    return 2;
  }
  const { convs, skipped } = load(rest);
  if (cmd === 'list') {
    for (const c of convs) console.log(`${day(c.date)}  ${c.tool.padEnd(7)}  ${c.id.slice(0, 8)}  ${String(c.messages.length).padStart(4)} msgs  ${c.title}`);
    console.log(`\n${convs.length} conversations${skipped ? `, ${skipped} entries skipped (unknown format)` : ''}.`);
  } else if (cmd === 'find') {
    if (!terms) { console.log('find needs --terms "a|b|c"'); return 2; }
    const hits = find(convs, terms.split('|'), { role, limit: Number(limit) || 60, width: Number(width) || 240 });
    for (const h of hits) console.log(`[${cite(h)}] (${h.term})\n  ${h.snippet}\n`);
    console.log(`${hits.length} matches${hits.length === (Number(limit) || 60) ? ' (limit reached; narrow the terms or raise --limit)' : ''}.`);
  } else {
    const c = id && convs.find((x) => x.id.startsWith(id));
    if (!c) { console.log(`No conversation with an id starting "${id}". Run "list" to see ids.`); return 1; }
    console.log(`# ${c.title}\n${c.tool}, ${day(c.date)}, id ${c.id}\n`);
    // shortcut: long messages are cut at 3,000 characters; use "find" with a narrower term for the rest.
    for (const m of c.messages) console.log(`## ${m.role} (${day(m.date)})\n${m.text.length > 3000 ? `${m.text.slice(0, 3000)} [...cut]` : m.text}\n`);
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
