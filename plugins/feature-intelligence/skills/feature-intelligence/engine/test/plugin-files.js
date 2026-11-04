'use strict';
// The plugin's own Markdown (skill, playbooks, forks, subagents, commands), for the checks that keep it
// self-contained (spec P10) and consistent with the engine.
const fs = require('fs');
const path = require('path');
const { STAMP_RE } = require('../lib/forks');
const { loadCommands } = require('../lib/commands');

const PLUGIN = path.resolve(__dirname, '..', '..', '..', '..');
const SKILL_DIR = path.join(PLUGIN, 'skills', 'feature-intelligence');

// Names of other plugins and of their skills, agents and state files. Only a fork stamp may name them.
const FOREIGN = /\b(?:qa-engineering|release-notes-suite|feature-explainer|qa-context|house-profile|story-intelligence|code-intelligence|kb-builder|qa-orchestrator|author-api-cases|author-ui-cases|ado-publish|failure-to-bug)\b/g;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out.sort();
}

const rel = (file) => path.relative(PLUGIN, file).split(path.sep).join('/');

// Every Markdown file Claude reads at run time.
function runtimeMarkdown() {
  return [
    path.join(SKILL_DIR, 'SKILL.md'),
    ...walk(path.join(SKILL_DIR, 'references')),
    ...walk(path.join(PLUGIN, 'agents')),
    ...walk(path.join(PLUGIN, 'commands')),
  ].filter((f) => fs.existsSync(f));
}

// Lines that name another plugin, outside fork stamps. The forks folder is named for its source
// (references/forks/<plugin>/, spec 4.1), so a path into it is not a reference to that plugin.
function foreignNames(file) {
  const hits = [];
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (STAMP_RE.test(line)) return;
    for (const m of line.replace(/forks\/[\w-]+\//g, 'forks/').matchAll(FOREIGN)) hits.push(`${rel(file)}:${i + 1}: ${m[0]}`);
  });
  return hits;
}

const COMMANDS = loadCommands();
// Commands later plans add: a playbook may name one only on a line that says which plan or phase brings it.
const LATER = new Set(['render', 'lint', 'board', 'tickets', 'impact', 'diff', 'snapshot', 'atlas']);
const LATER_NOTE = /\b(?:plan [34]|phase [234])\b/i;
const ADO_TOOLS = new Set(fs.readFileSync(path.join(SKILL_DIR, 'engine', 'tools', 'ado-expected-tools.txt'), 'utf8')
  .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
const ADO_TOOL_RE = /\b(?:wit|core|work|search|repo|wiki|testplan|pipelines|advsec)_[a-z_]+\b/g;

// Code in a Markdown file: each fenced line and each inline span, with the source line it sits on.
function codeSpans(text) {
  const spans = [];
  let fence = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const f = /^\s*(`{3,})/.exec(line);
    if (f && (!fence || f[1] === fence)) {
      fence = fence ? null : f[1];
      return;
    }
    if (fence) spans.push({ n: i + 1, line, code: line });
    else for (const m of line.matchAll(/`([^`]+)`/g)) spans.push({ n: i + 1, line, code: m[1] });
  });
  return spans;
}

// Problems with the fi commands, flags, Azure DevOps tools and playbook paths a Markdown file names.
function docProblems(file) {
  const text = fs.readFileSync(file, 'utf8');
  const problems = foreignNames(file);
  for (const { n, line, code } of codeSpans(text)) {
    for (const part of code.split(/\bfi\s+(?=[a-z])/).slice(1)) {
      const [name] = part.split(/\s/);
      const cmd = COMMANDS.get(name);
      if (!cmd) {
        if (!(LATER.has(name) && LATER_NOTE.test(line))) problems.push(`${rel(file)}:${n}: no fi command "${name}"`);
        continue;
      }
      for (const [, flag] of part.matchAll(/--([a-z][a-z-]*)/g)) {
        if (!(flag in cmd.flags) && flag !== 'json' && flag !== 'root') problems.push(`${rel(file)}:${n}: fi ${name} has no --${flag}`);
      }
    }
  }
  for (const m of text.matchAll(ADO_TOOL_RE)) if (!ADO_TOOLS.has(m[0])) problems.push(`${rel(file)}: ${m[0]} is not in ado-expected-tools.txt`);
  for (const line of text.split(/\r?\n/).filter((l) => !STAMP_RE.test(l))) {
    for (const m of line.matchAll(/references\/[\w./-]+\.md/g)) {
      if (!fs.existsSync(path.join(SKILL_DIR, m[0]))) problems.push(`${rel(file)}: ${m[0]} does not exist`);
    }
  }
  return problems;
}

// The `key: value` lines between the opening `---` lines of a skill, subagent or command file.
function frontmatter(file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(fs.readFileSync(file, 'utf8'));
  if (!m) return null;
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
  }
  return { data, body: m[2] };
}

const AGENTS_DIR = path.join(PLUGIN, 'agents');
const COMMANDS_DIR = path.join(PLUGIN, 'commands');

module.exports = {
  PLUGIN, SKILL_DIR, AGENTS_DIR, COMMANDS_DIR, walk, rel, runtimeMarkdown, foreignNames, codeSpans, docProblems, frontmatter,
};
