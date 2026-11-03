#!/usr/bin/env node
'use strict';
// Lists the tools an MCP server offers and checks them against the names the playbooks rely on. Run it after
// changing the pinned server version in .mcp.json. It speaks MCP over stdio, one JSON-RPC message per line.
//   node list-mcp-tools.js --config <.mcp.json> --server <name> [--expect <names.txt>] [--timeout <seconds>]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const opts = { timeout: 180 };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!['config', 'server', 'expect', 'timeout'].includes(key) || argv[i + 1] === undefined) throw new Error(`bad argument ${argv[i]}`);
    opts[key] = key === 'timeout' ? Number(argv[i + 1]) : argv[i + 1];
  }
  if (!opts.config || !opts.server) throw new Error('usage: list-mcp-tools.js --config <file> --server <name> [--expect <file>] [--timeout <s>]');
  return opts;
}

// ${VAR} in the config comes from the environment, as Claude Code does it.
const expand = (value) => String(value).replace(/\$\{(\w+)\}/g, (m, name) => {
  if (process.env[name] === undefined) throw new Error(`${name} is not set`);
  return process.env[name];
});

function listTools(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    // On Windows a bare "npx" needs a shell; cmd.exe and absolute paths do not.
    const shell = process.platform === 'win32' && !path.isAbsolute(command) && !/^cmd(\.exe)?$/i.test(command);
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'inherit'], shell });
    const tools = [];
    let buffer = '';
    let done = false;
    let timer = null;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.stdin.destroy();
      child.stdout.destroy();
      child.kill();
      if (err) reject(err);
      else resolve(tools);
    };
    timer = setTimeout(() => finish(new Error(`no tool list within ${timeoutMs / 1000}s`)), timeoutMs);
    const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`);
    child.on('error', finish);
    child.stdin.on('error', finish); // a server that closes its input early (EPIPE) is a failure, not a crash
    child.on('close', (code) => finish(new Error(`the server exited (${code}) before listing its tools`)));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      for (let nl = buffer.indexOf('\n'); nl !== -1; nl = buffer.indexOf('\n')) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue; // a log line, not a protocol message
        }
        if (msg.method) continue; // a notification or a request from the server
        if (msg.error) {
          finish(new Error(`${msg.id === 1 ? 'initialize' : 'tools/list'} failed: ${msg.error.message}`));
          return;
        }
        if (msg.id === 1) {
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
        } else if (typeof msg.id === 'number' && msg.result) {
          tools.push(...(msg.result.tools || []).map((t) => t.name));
          if (!msg.result.nextCursor) {
            finish(null);
            return;
          }
          send({ jsonrpc: '2.0', id: msg.id + 1, method: 'tools/list', params: { cursor: msg.result.nextCursor } });
        }
      }
    });
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'fi-list-mcp-tools', version: '0.0.1' } } });
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config = JSON.parse(fs.readFileSync(opts.config, 'utf8'));
  const server = (config.mcpServers || {})[opts.server];
  if (!server) throw new Error(`no server "${opts.server}" in ${opts.config}`);
  const tools = (await listTools(expand(server.command), (server.args || []).map(expand), opts.timeout * 1000)).sort();
  console.log(`${tools.length} tools:\n${tools.map((t) => `  ${t}`).join('\n')}`);
  if (!opts.expect) return 0;
  const expected = fs.readFileSync(opts.expect, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const missing = expected.filter((t) => !tools.includes(t));
  console.log(missing.length
    ? `Missing ${missing.length} expected tools:\n${missing.map((t) => `  ${t}`).join('\n')}`
    : `All ${expected.length} expected tools are present.`);
  return missing.length ? 1 : 0;
}

main().then((code) => {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 2000).unref(); // a server's grandchild process must not keep this one alive
}, (e) => {
  console.error(`list-mcp-tools: ${e.message}`);
  process.exit(2);
});
