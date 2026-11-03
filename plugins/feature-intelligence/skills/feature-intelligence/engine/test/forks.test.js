'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tempDir, runFi } = require('./helpers');
const { readStamp } = require('../lib/forks');

test('forks: stamps in Markdown, code and JSON', () => {
  const dir = tempDir();
  const file = (name, text) => {
    fs.writeFileSync(path.join(dir, name), text);
    return path.join(dir, name);
  };
  assert.deepEqual(readStamp(file('a.md', '<!-- forked-from: qa-engineering/skills/story-intelligence/SKILL.md @ 1a2b3c4; forked-on: 2026-10-30; local-changes: none -->\n# x\n')), {
    plugin: 'qa-engineering', path: 'skills/story-intelligence/SKILL.md', commit: '1a2b3c4', forkedOn: '2026-10-30', localChanges: 'none',
  });
  assert.equal(readStamp(file('b.js', "'use strict';\n// forked-from: qa-engineering/template/scripts/scan-backend.ts @ abcdef1; forked-on: 2026-10-30; local-changes: ported to plain Node\n")).localChanges, 'ported to plain Node');
  const json = readStamp(file('c.json', '{\n  "_fork": "forked-from: qa-engineering/.mcp.json @ 2931a4b; forked-on: 2026-10-30; local-changes: Windows cmd /c launcher; ado server only",\n  "x": 1\n}\n'));
  assert.deepEqual([json.path, json.localChanges], ['.mcp.json', 'Windows cmd /c launcher; ado server only']);
  assert.equal(readStamp(file('d.md', '# no stamp\n')), null);
});

test('forks: upstream commits since the stamp, absent sources, unknown commits, --strict', () => {
  const repo = tempDir();
  const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true });
    fs.writeFileSync(path.join(repo, rel), text);
  };
  const commit = (message) => {
    git('add', '.');
    git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', message);
  };
  git('init', '-q');
  put('plugins/up/skills/a.md', 'one\n');
  commit('feat: a');
  const base = git('rev-parse', '--short', 'HEAD');
  put('plugins/fi/references/forks/up/a.md', `<!-- forked-from: up/skills/a.md @ ${base}; forked-on: 2026-10-30; local-changes: none -->\none\n`);
  put('plugins/fi/lib/x.js', `// forked-from: gone/lib/x.js @ ${base}; forked-on: 2026-10-30; local-changes: none\n`);
  put('plugins/fi/lib/y.js', '// forked-from: up/skills/a.md @ deadbee; forked-on: 2026-10-30; local-changes: none\n');
  put('plugins/up/skills/a.md', 'two\n');
  commit('feat: change a upstream');
  const r = runFi(repo, ['forks', '--plugin', 'plugins/fi', '--json']);
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(r.json.forks.map((f) => [f.file, f.state, f.commits.length]), [
    ['lib/x.js', 'source-absent', 0], ['lib/y.js', 'unknown-commit', 0], ['references/forks/up/a.md', 'behind', 1],
  ]);
  assert.match(r.json.forks[2].commits[0], /feat: change a upstream/);
  assert.equal(runFi(repo, ['forks', '--plugin', 'plugins/fi', '--strict']).code, 1);
  const alone = tempDir();
  fs.writeFileSync(path.join(alone, 'a.md'), `<!-- forked-from: up/skills/a.md @ ${base}; forked-on: 2026-10-30; local-changes: none -->\n`);
  const outside = runFi(alone, ['forks', '--plugin', '.', '--json'], { GIT_CEILING_DIRECTORIES: path.dirname(alone) });
  assert.deepEqual([outside.code, outside.json.forks.map((f) => f.state)], [0, ['no-repo']]);
});
