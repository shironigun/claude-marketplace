'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// A stamp opens a line as a comment (<!--, //) or the JSON "_fork" value, so the same words inside a string are not one.
const STAMP_RE = /^[ \t]*(?:<!--|\/\/|"_fork"\s*:\s*")[ \t]*forked-from:\s*([\w.-]+)\/([^\s@;]+)\s*@\s*([0-9a-f]{7,40})\s*;\s*forked-on:\s*(\d{4}-\d{2}-\d{2})\s*;\s*local-changes:\s*([^\n"]*?)\s*(?:-->|")?\s*,?\s*$/m;
const TEXT_FILES = new Set(['.md', '.js', '.cjs', '.mjs', '.ts', '.json', '.py', '.txt', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full, out);
    } else if (TEXT_FILES.has(path.extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

// The stamp near the top of a forked file (spec 9.4), or null.
function readStamp(file) {
  const m = STAMP_RE.exec(fs.readFileSync(file, 'utf8').slice(0, 2000));
  if (!m || m[2].split('/').includes('..')) return null; // a source path never leaves its plugin
  return { plugin: m[1], path: m[2], commit: m[3], forkedOn: m[4], localChanges: m[5] };
}

const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// Every stamped file under the plugin, with the upstream commits since its stamp when the source is in the same
// repository. It only reports; pulling a change in is a deliberate edit with a new stamp.
function checkForks(pluginRoot) {
  let top = null;
  try {
    top = git(pluginRoot, ['rev-parse', '--show-toplevel']);
  } catch {
    top = null;
  }
  const forks = [];
  for (const file of walk(pluginRoot).sort()) {
    const stamp = readStamp(file);
    if (!stamp) continue;
    const source = `plugins/${stamp.plugin}/${stamp.path}`;
    const entry = { file: path.relative(pluginRoot, file).split(path.sep).join('/'), ...stamp, source, state: '', commits: [] };
    if (!top) {
      entry.state = 'no-repo';
    } else if (!fs.existsSync(path.join(top, source))) {
      entry.state = 'source-absent';
    } else {
      try {
        git(top, ['cat-file', '-e', `${stamp.commit}^{commit}`]);
        const log = git(top, ['log', '--oneline', `${stamp.commit}..HEAD`, '--', source]);
        entry.commits = log ? log.split('\n') : [];
        entry.state = entry.commits.length ? 'behind' : 'current';
      } catch {
        entry.state = 'unknown-commit';
      }
    }
    forks.push(entry);
  }
  return forks;
}

module.exports = { STAMP_RE, readStamp, checkForks };
