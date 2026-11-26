'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { runSp, tempDir, repoFiles, FIXTURES } = require('./helpers');
const { matches, detectStack } = require('../lib/detect');

// A copy outside any git repository, so the detectors see only the fixture (not the plugin's own repository).
function copyStack(name) {
  const dest = path.join(tempDir(), name);
  fs.cpSync(path.join(FIXTURES, 'stacks', name), dest, { recursive: true });
  return dest;
}

const ids = (list) => list.map((f) => f.id);
const FRONT = ['frameworks', 'routing', 'apiStyles', 'contracts', 'auth', 'theming', 'devServers', 'i18n', 'fonts'];
const shape = (s) => [...FRONT.map((k) => ids(s.frontend[k])), ids(s.backend.languages), ids(s.backend.frameworks), s.layout.kind];

function detect(repo, env = { SCREENPLAY_HOME: tempDir('sp-home-') }) {
  const r = runSp(repo, ['detect', '--json'], env);
  assert.equal(r.code, 0, r.stderr);
  return r.json;
}

test('detect: React and Vite with REST calls, bearer auth, CSS variables, i18next and Fontsource', () => {
  const repo = copyStack('react-vite-rest');
  const before = repoFiles(repo);
  const home = tempDir('sp-home-');
  const r = detect(repo, { SCREENPLAY_HOME: home });
  assert.deepEqual(shape(r.stack), [
    ['react'], ['react-router'], ['rest'], ['typescript-types'], ['bearer-token'], ['css-variables'], ['vite'],
    ['i18next'], ['fontsource'], [], [], 'single',
  ]);
  assert.deepEqual(r.stack.frontend.apiStyles[0].evidence, ["src/api.ts: fetch('/api/orders"]);
  assert.deepEqual(r.stack.frontend.frameworks[0].evidence, ['package.json: dependencies.react']);
  const saved = path.join(home, 'react-vite-rest', 'profile', 'stack.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(saved, 'utf8')), r.stack);
  assert.deepEqual(repoFiles(repo), before); // nothing written in the repository, at any depth
  const text = runSp(repo, ['detect'], { SCREENPLAY_HOME: home });
  assert.equal(text.stdout, 'react on vite; API: rest; auth: bearer-token; theme: css-variables; backend: none; layout: single\n');
});

test('detect: Next with GraphQL, SSO, Tailwind and a GraphQL schema', () => {
  assert.deepEqual(shape(detect(copyStack('next-graphql')).stack), [
    ['react', 'next'], ['next-file-routes'], ['graphql'], ['graphql-schema'], ['oauth-sso'], ['tailwind'], ['next'],
    [], [], [], [], 'single',
  ]);
});

test('detect: ASP.NET with Razor pages, an OpenAPI file and response DTOs', () => {
  assert.deepEqual(shape(detect(copyStack('dotnet-razor')).stack), [
    ['aspnet-razor'], [], [], ['openapi', 'backend-dtos'], [], ['css-variables'], [], [], [], ['dotnet'], ['aspnet-core'], 'single',
  ]);
});

test('detect: a monorepo lists its packages and finds the API server in one of them', () => {
  const s = detect(copyStack('monorepo')).stack;
  assert.deepEqual(s.layout, { kind: 'monorepo', packages: ['apps/api', 'apps/web'] });
  assert.deepEqual(shape(s).slice(0, 2), [['react'], ['server-routes']]);
  assert.deepEqual(s.frontend.routing[0].evidence, ["apps/api/server.js: app.get('/"]);
  assert.deepEqual([ids(s.backend.languages), ids(s.backend.frameworks)], [['node'], ['express']]);
  assert.deepEqual(s.frontend.frameworks[0].evidence, ['apps/web/package.json: dependencies.react']);
});

test('detect: plain pages are static-html; dependency folders are never read', () => {
  const repo = path.join(tempDir(), 'pages');
  fs.mkdirSync(path.join(repo, 'node_modules', 'vue'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'index.html'), '<h1>Hi</h1>');
  fs.writeFileSync(path.join(repo, 'node_modules', 'vue', 'package.json'), '{"dependencies":{"vue":"3"}}');
  fs.writeFileSync(path.join(repo, 'package.json'), '{ not json');
  const r = detect(repo);
  assert.deepEqual(r.skipped, [{ path: 'package.json', reason: 'invalid JSON' }]);
  assert.match(runSp(repo, ['detect']).stdout, /^skipped package\.json: invalid JSON$/m);
  assert.deepEqual(r.stack.frontend.frameworks, [{ id: 'static-html', evidence: ['index.html'] }]);
  assert.deepEqual(r.stack.layout, { kind: 'single', packages: [] });
});

test('detect: a package.json that is not a JSON object is skipped, like an unparseable one', () => {
  const repo = path.join(tempDir(), 'odd');
  fs.mkdirSync(path.join(repo, 'a'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'b'));
  fs.writeFileSync(path.join(repo, 'package.json'), 'null');
  fs.writeFileSync(path.join(repo, 'a', 'package.json'), '[]');
  fs.writeFileSync(path.join(repo, 'b', 'package.json'), '5');
  const r = detect(repo);
  assert.deepEqual(r.skipped, [
    { path: 'a/package.json', reason: 'not a JSON object' },
    { path: 'b/package.json', reason: 'not a JSON object' },
    { path: 'package.json', reason: 'not a JSON object' },
  ]);
  assert.deepEqual(r.stack.layout, { kind: 'single', packages: [] });
});

const NOW = '2026-11-12T10:00:00.000Z';

test('detect: the walk stops at the file cap and says so', () => {
  const repo = tempDir();
  for (const name of ['a.txt', 'b.txt', 'c.txt']) fs.writeFileSync(path.join(repo, name), 'x');
  const skipped = (maxFiles) => detectStack(repo, { repository: 'capped', now: NOW, maxFiles }).skipped;
  assert.deepEqual(skipped(2), [{ path: '.', reason: 'stopped after 2 files' }]);
  assert.deepEqual(skipped(3), []);
});

// Unreadable entries are hard to make on Windows, so the reads fail by hand here.
test('detect: a folder or a file it cannot read is skipped, and the scan goes on', () => {
  const repo = tempDir();
  fs.mkdirSync(path.join(repo, 'locked'));
  fs.writeFileSync(path.join(repo, 'locked', 'hidden.css'), ':root { --hidden: 1; }');
  fs.writeFileSync(path.join(repo, 'broken.css'), ':root { --broken: 1; }');
  fs.writeFileSync(path.join(repo, 'theme.css'), ':root { --theme: 1; }');
  const { readdirSync, readFileSync } = fs;
  const denied = () => Object.assign(new Error('permission denied'), { code: 'EACCES' });
  fs.readdirSync = (dir, ...rest) => {
    if (path.basename(String(dir)) === 'locked') throw denied();
    return readdirSync(dir, ...rest);
  };
  fs.readFileSync = (file, ...rest) => {
    if (path.basename(String(file)) === 'broken.css') throw denied();
    return readFileSync(file, ...rest);
  };
  try {
    const { stack, skipped } = detectStack(repo, { repository: 'locked', now: NOW });
    assert.deepEqual(skipped, [{ path: 'locked', reason: 'unreadable' }, { path: 'broken.css', reason: 'unreadable' }]);
    assert.deepEqual(stack.frontend.theming, [{ id: 'css-variables', evidence: ['theme.css: --theme:'] }]);
  } finally {
    Object.assign(fs, { readdirSync, readFileSync });
  }
});

test('detect: an @font-face block with a url() source is self-hosted; one with local() sources only is system', () => {
  const repo = tempDir();
  fs.writeFileSync(path.join(repo, 'files.css'), "@font-face {\n  font-family: 'A';\n  src: url('./a.woff2') format('woff2');\n}\n");
  fs.writeFileSync(path.join(repo, 'local.css'), "@font-face {\n  font-family: 'B';\n  src: local('Arial');\n}\n");
  fs.writeFileSync(path.join(repo, 'mixed.css'), "@font-face { font-family: 'C'; src: local('C'); }\n@font-face { font-family: 'D'; src: local('D'), url(d.woff2); }\n");
  assert.deepEqual(detectStack(repo, { repository: 'fonts', now: NOW }).stack.frontend.fonts, [
    { id: 'self-hosted', evidence: ['files.css: @font-face', 'mixed.css: @font-face'] },
    { id: 'system', evidence: ['local.css: @font-face', 'mixed.css: @font-face'] },
  ]);
});

test('detect: after it, the next step of a new subject is the screen map', () => {
  const repo = copyStack('react-vite-rest');
  const env = { SCREENPLAY_HOME: tempDir('sp-home-') };
  assert.equal(runSp(repo, ['init', 'Orders', '--json'], env).code, 0);
  detect(repo, env);
  assert.equal(runSp(repo, ['status', 'orders', '--json'], env).json.next, 'screens');
});

test('detect: globs match base names, or whole paths when they hold a slash', () => {
  assert.ok(matches('a/b/vite.config.ts', 'vite.config.*'));
  assert.ok(!matches('a/b/vite.config.ts', 'webpack.config.*'));
  assert.ok(matches('Web/Views/Home/Index.cshtml', '*.cshtml'));
  assert.ok(matches('api/openapi.json', 'api/*.json'));
  assert.ok(!matches('x/api/openapi.json', 'api/*.json'));
});
