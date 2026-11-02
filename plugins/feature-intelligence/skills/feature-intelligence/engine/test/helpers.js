'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const FI = path.join(__dirname, '..', 'fi.js');
const FIXTURES = path.join(__dirname, 'fixtures');

function tempDir(prefix = 'fi-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Runs the CLI in `cwd` with a fixed clock. With --json, the parsed output is in `json`.
function runFi(cwd, args, env = {}) {
  const r = spawnSync(process.execPath, [FI, ...args], {
    cwd, encoding: 'utf8', env: { ...process.env, FI_NOW: '2026-10-30T10:00:00.000Z', FI_ROOT: '', ...env },
  });
  let json;
  if (args.includes('--json')) {
    try {
      json = JSON.parse(r.stdout);
    } catch {
      json = undefined;
    }
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

module.exports = { FI, FIXTURES, tempDir, runFi };
