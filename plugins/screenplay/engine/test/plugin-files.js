'use strict';
// The plugin's own files, for the checks that keep it self-contained, product-neutral and consistent with the
// engine (spec P12, P13). Later plans add skills, agents and commands; these checks cover them as they arrive.
const fs = require('fs');
const path = require('path');
const { loadCommands } = require('../lib/commands');

const PLUGIN = path.resolve(__dirname, '..', '..');
const SHARED_DIR = path.join(PLUGIN, 'shared');
const SKILLS_DIR = path.join(PLUGIN, 'skills');
const COMMANDS_DIR = path.join(PLUGIN, 'commands');
const AGENTS_DIR = path.join(PLUGIN, 'agents');

// The other plugins of the marketplace. This plugin may not name them.
const FOREIGN = /\b(?:api-testing|bug-suite|design-intelligence|feature-explainer|how-to-guides|qa-engineering|qa-toolkit|release-notes-suite|ui-testing)\b/g;
// The only addresses the plugin may hold: the JSON Schema dialect, the SVG and XLink namespaces and local hosts.
const ALLOWED_URLS = ['https://json-schema.org/', 'http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink', 'http://localhost', 'http://127.0.0.1'];
const TEXT_FILE = /\.(?:md|js|json|html|css|svg|ts|tsx|graphql|cs|csproj|cshtml)$/;
const COMMANDS = loadCommands();

function walk(dir, filter = (name) => name.endsWith('.md'), out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, filter, out);
    else if (filter(e.name)) out.push(full);
  }
  return out.sort();
}

const rel = (file) => path.relative(PLUGIN, file).split(path.sep).join('/');

// The skill folder a file sits in, or null outside skills/.
function skillDirOf(file) {
  const r = path.relative(SKILLS_DIR, file);
  if (r.startsWith('..') || path.isAbsolute(r)) return null;
  return path.join(SKILLS_DIR, r.split(path.sep)[0]);
}

// Every Markdown file Claude reads at run time.
function runtimeMarkdown() {
  const skills = fs.existsSync(SKILLS_DIR) ? fs.readdirSync(SKILLS_DIR).sort().map((d) => path.join(SKILLS_DIR, d)) : [];
  return [
    ...walk(SHARED_DIR),
    ...skills.flatMap((d) => [path.join(d, 'SKILL.md'), ...walk(path.join(d, 'references'))]),
    ...walk(AGENTS_DIR),
    ...walk(COMMANDS_DIR),
  ].filter((f) => fs.existsSync(f));
}

function foreignNames(file) {
  const hits = [];
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(FOREIGN)) hits.push(`${rel(file)}:${i + 1}: ${m[0]}`);
  });
  return hits;
}

// An allowed address, or one that goes on from it with a path, port, query or fragment, so a host name that only
// starts like an allowed one never passes.
function allowedUrl(url) {
  return ALLOWED_URLS.some((a) => url === a || (url.startsWith(a) && (a.endsWith('/') || /^[/:?#]/.test(url.slice(a.length)))));
}

// Web and e-mail addresses anywhere in the plugin's text files.
function addressProblems() {
  const problems = [];
  for (const file of walk(PLUGIN, (name) => TEXT_FILE.test(name))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [url] of text.matchAll(/https?:\/\/[^\s"'`<>)\]]+/g)) {
      if (!allowedUrl(url)) problems.push(`${rel(file)}: ${url}`);
    }
    for (const [mail] of text.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) problems.push(`${rel(file)}: ${mail}`);
  }
  return problems;
}

// Code in a Markdown file: each fenced line and each inline span, with the line it sits on.
function codeSpans(text) {
  const spans = [];
  let fence = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const f = /^\s*(`{3,})/.exec(line);
    if (f && (!fence || f[1] === fence)) {
      fence = fence ? null : f[1];
      return;
    }
    if (fence) spans.push({ n: i + 1, code: line });
    else for (const m of line.matchAll(/`([^`]+)`/g)) spans.push({ n: i + 1, code: m[1] });
  });
  return spans;
}

// The sp commands and flags, playbook paths and plugin names a Markdown file names. `shared/…` paths resolve at
// the plugin root; `references/…` paths resolve in the skill the file belongs to.
function docProblems(file) {
  const text = fs.readFileSync(file, 'utf8');
  const problems = foreignNames(file);
  for (const { n, code } of codeSpans(text)) {
    // A quoted value is not a flag, and a pipe, `;` or `&&` ends the sp command.
    const plain = code.replace(/"[^"]*"|'[^']*'/g, '""');
    for (const part of plain.split(/\bsp\s+(?=[a-z])/).slice(1)) {
      const [command] = part.split(/\s*(?:\||;|&&)/);
      const [name] = command.split(/\s/);
      if (name === 'help') continue;
      const cmd = COMMANDS.get(name);
      if (!cmd) {
        problems.push(`${rel(file)}:${n}: no sp command "${name}"`);
        continue;
      }
      for (const [, flag] of command.matchAll(/--([a-z][a-z-]*)/g)) {
        if (!(flag in cmd.flags) && flag !== 'json' && flag !== 'home') problems.push(`${rel(file)}:${n}: sp ${name} has no --${flag}`);
      }
    }
  }
  for (const [ref] of text.matchAll(/(?:skills\/[\w-]+\/)?(?:references|shared)\/[\w./-]+\.md/g)) {
    const base = ref.startsWith('references/') ? skillDirOf(file) : PLUGIN;
    if (!base || !fs.existsSync(path.join(base, ref))) problems.push(`${rel(file)}: ${ref} does not exist`);
  }
  return problems;
}

// The `key: value` lines between the opening `---` lines; two-space keys nest under the key above them.
function frontmatter(file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(fs.readFileSync(file, 'utf8'));
  if (!m) return null;
  const data = {};
  let parent = null;
  const unquote = (v) => v.replace(/^"(.*)"$/, '$1');
  for (const line of m[1].split(/\r?\n/)) {
    const top = /^([\w-]+):\s*(.*)$/.exec(line);
    const nested = /^ {2}([\w-]+):\s*(.*)$/.exec(line);
    if (top) {
      parent = top[1];
      data[top[1]] = unquote(top[2]);
    } else if (nested && parent) {
      data[`${parent}.${nested[1]}`] = unquote(nested[2]);
    }
  }
  return { data, body: m[2] };
}

module.exports = {
  PLUGIN, SHARED_DIR, SKILLS_DIR, COMMANDS_DIR, AGENTS_DIR, walk, rel, skillDirOf, runtimeMarkdown, foreignNames,
  allowedUrl, addressProblems, codeSpans, docProblems, frontmatter,
};
