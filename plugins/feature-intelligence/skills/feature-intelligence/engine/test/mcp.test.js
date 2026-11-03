'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tempDir } = require('./helpers');
const { readStamp } = require('../lib/forks');

const PLUGIN = path.join(__dirname, '..', '..', '..', '..');
const TOOLS = path.join(__dirname, '..', 'tools');

const FAKE_SERVER = `
const readline = require('readline');
const send = (m) => process.stdout.write(JSON.stringify(m) + '\\n');
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method === 'initialize') send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '1' } } });
  if (msg.method === 'tools/list' && !msg.params.cursor) send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'wit_get_work_item' }], nextCursor: 'page-2' } });
  if (msg.method === 'tools/list' && msg.params.cursor) send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'wit_create_work_item' }] } });
});
`;

test('mcp: the bundled server is pinned, token-free and stamped as a fork', () => {
  const text = fs.readFileSync(path.join(PLUGIN, '.mcp.json'), 'utf8');
  const ado = JSON.parse(text).mcpServers.ado;
  assert.deepEqual([ado.type, ado.command], ['stdio', 'cmd']);
  assert.deepEqual(ado.args, ['/c', 'npx', '-y', '@azure-devops/mcp@2.10.0', '${ADO_ORG}', '--authentication', 'interactive']);
  assert.doesNotMatch(text, /token|password|secret|\bpat\b/i);
  assert.deepEqual([readStamp(path.join(PLUGIN, '.mcp.json')).plugin, readStamp(path.join(PLUGIN, '.mcp.json')).path], ['qa-engineering', '.mcp.json']);
  const expected = fs.readFileSync(path.join(TOOLS, 'ado-expected-tools.txt'), 'utf8').split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  assert.equal(expected.length, 14);
});

test('mcp: list-mcp-tools reads every page and checks the expected names', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'server.js'), FAKE_SERVER);
  fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({ mcpServers: { fake: { type: 'stdio', command: process.execPath, args: ['${SERVER_JS}'] } } }));
  fs.writeFileSync(path.join(dir, 'ok.txt'), '# expected\nwit_get_work_item\nwit_create_work_item\n');
  fs.writeFileSync(path.join(dir, 'missing.txt'), 'wit_get_work_item\ncore_list_project_teams\n');
  const run = (expect) => spawnSync(process.execPath, [
    path.join(TOOLS, 'list-mcp-tools.js'), '--config', path.join(dir, 'mcp.json'), '--server', 'fake', '--expect', path.join(dir, expect),
  ], { encoding: 'utf8', env: { ...process.env, SERVER_JS: path.join(dir, 'server.js') }, timeout: 30000 });
  const ok = run('ok.txt');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /2 tools:\n {2}wit_create_work_item\n {2}wit_get_work_item/);
  assert.match(ok.stdout, /All 2 expected tools are present\./);
  const missing = run('missing.txt');
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /Missing 1 expected tools:\n {2}core_list_project_teams/);
});
