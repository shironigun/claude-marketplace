'use strict';
const path = require('path');
const { parseArgs } = require('./args');
const { loadCommands } = require('./commands');
const { FiError, usageError } = require('./errors');

// engine/lib -> engine -> skills/feature-intelligence -> skills -> the plugin folder
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function usage(commands) {
  const lines = [...commands.values()].map((c) => `  fi ${c.usage}\n      ${c.summary}`);
  return `Usage: fi <command> [args] [--json] [--root <dir>]\n\n${lines.join('\n')}\n`;
}

// Runs one command and returns the exit code: 0 success, 1 a check failed, 2 the command was used wrongly, 3 an internal error.
function main(argv, io) {
  const commands = loadCommands();
  const [name, ...rest] = argv;
  if (!name || name === 'help' || name === '--help') {
    io.stdout.write(usage(commands));
    return name ? 0 : 2;
  }
  const cmd = commands.get(name);
  if (!cmd) {
    io.stderr.write(`fi: unknown command "${name}"\n\n${usage(commands)}`);
    return 2;
  }
  try {
    const args = parseArgs(rest, cmd.flags);
    const env = io.env || {};
    const time = env.FI_NOW ? Date.parse(env.FI_NOW) : Date.now();
    if (Number.isNaN(time)) throw usageError('FI_NOW must be an ISO date');
    const ctx = {
      root: path.resolve(io.cwd, args.flags.root || env.FI_ROOT || '.'),
      now: new Date(time).toISOString(),
      pluginRoot: PLUGIN_ROOT,
    };
    const result = cmd.run(ctx, args) || {};
    if (args.flags.json) io.stdout.write(`${JSON.stringify(result.json ?? null, null, 2)}\n`);
    else if (result.text) io.stdout.write(`${result.text}\n`);
    return result.exitCode || 0;
  } catch (e) {
    const known = e instanceof FiError;
    const code = known ? e.code : 3;
    const message = known ? e.message : `internal error: ${e && e.message !== undefined ? e.message : e}`;
    io.stderr.write(`fi ${name}: ${message}\n`);
    if (rest.includes('--json')) io.stdout.write(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
    return code;
  }
}

module.exports = { main, PLUGIN_ROOT };
