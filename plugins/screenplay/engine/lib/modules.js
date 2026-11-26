'use strict';

// The Motion type's limits on a film's modules (its film-api page): 200 KiB each, 48 in all and 2 MiB in all. A module
// is named with letters, digits, `_`, `.` and `-`, a letter or digit first. The Motion page keeps its own records of
// what a person changes by hand, and `layer-` names are the player's: a film's writer never writes either.
const MODULE_LIMITS = { moduleBytes: 200 * 1024, modules: 48, totalBytes: 2 * 1024 * 1024 };
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const PAGE_OWNED = new Set(['retyped.json', 'recolored.json', 'refaced.json', 'fetched-fonts.json', 'recut.json', 'retouched.json']);

const bytes = (text) => Buffer.byteLength(text, 'utf8');

// A screen's surfaces packed into as few JSON modules as fit (spec 5.11, 5.12): `items` are [key, html] in the order
// the film shows them, and each module is { name, kind: 'json', text } with `text` a JSON object of key to markup,
// named `<base>.json`, then `<base>-2.json` and on. A surface too big for a module with others goes in one of its own,
// as html, so no escaping can push it past the limit. Returns { modules, where }, where `where` maps a key to its module.
function packSurfaces(base, items, limit = MODULE_LIMITS.moduleBytes) {
  const modules = [];
  const where = {};
  let open = null;
  const name = () => (modules.length ? `${base}-${modules.length + 1}` : base);
  for (const [key, html] of items) {
    const entry = `${JSON.stringify(key)}:${JSON.stringify(html)}`;
    if (bytes(entry) + 2 > limit) {
      open = null;
      const own = { name: `${name()}.html`, kind: 'html', text: html };
      modules.push(own);
      where[key] = own.name;
    } else {
      if (!open || bytes(open.body) + bytes(entry) + 3 > limit) {
        open = { name: `${name()}.json`, kind: 'json', body: '' };
        modules.push(open);
      }
      open.body += `${open.body ? ',' : ''}${entry}`;
      where[key] = open.name;
    }
  }
  return {
    modules: modules.map((m) => (m.kind === 'json' ? { name: m.name, kind: 'json', text: `{${m.body}}` } : m)),
    where,
  };
}

// What keeps a film's modules out of the Motion type: a name it does not take, or one the page or the player keeps
// for itself, a module over its size, too many modules, or too many bytes in all. `modules` are { name, kind, text },
// every module of the film.
function moduleProblems(modules) {
  const problems = [];
  for (const m of modules) {
    if (!NAME.test(m.name)) problems.push(`module ${m.name}: not a name the Motion type takes`);
    else if (PAGE_OWNED.has(m.name) || /^layer-/.test(m.name)) problems.push(`module ${m.name}: a name the Motion page keeps for itself`);
    if (bytes(m.text) > MODULE_LIMITS.moduleBytes) {
      problems.push(`module ${m.name}: ${Math.ceil(bytes(m.text) / 1024)} KiB; a module takes at most ${MODULE_LIMITS.moduleBytes / 1024} KiB`);
    }
  }
  if (modules.length > MODULE_LIMITS.modules) problems.push(`${modules.length} modules; a film takes at most ${MODULE_LIMITS.modules}`);
  const total = modules.reduce((n, m) => n + bytes(m.text), 0);
  if (total > MODULE_LIMITS.totalBytes) {
    problems.push(`the modules take ${Math.ceil(total / 1024)} KiB; a film takes at most ${MODULE_LIMITS.totalBytes / 1024} KiB`);
  }
  return problems;
}

module.exports = { MODULE_LIMITS, packSurfaces, moduleProblems };
