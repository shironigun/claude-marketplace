'use strict';
const os = require('os');
const path = require('path');
const { parseArgs } = require('./args');
const { loadCommands } = require('./commands');
const { SpError, usageError } = require('./errors');

// engine/lib -> engine -> the plugin folder
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');

function usage(commands) {
  const lines = [...commands.values()].map((c) => `  sp ${c.usage}\n      ${c.summary}`);
  return `Usage: sp <command> [args] [--json] [--home <dir>]\n\n${lines.join('\n')}\n`;
}

// Runs one command and returns the exit code: 0 success, 1 a check failed, 2 the command was used wrongly,
// 3 an internal error.
function main(argv, io) {
  const [name, ...rest] = argv;
  // After `--` every word is an argument, so a `--json` there does not ask for the JSON error envelope.
  const end = rest.indexOf('--');
  const json = (end === -1 ? rest : rest.slice(0, end)).includes('--json');
  try {
    const commands = loadCommands();
    if (!name || name === 'help' || name === '--help') {
      io.stdout.write(usage(commands));
      return name ? 0 : 2;
    }
    const cmd = commands.get(name);
    if (!cmd) {
      io.stderr.write(`sp: unknown command "${name}"\n\n${usage(commands)}`);
      return 2;
    }
    const args = parseArgs(rest, cmd.flags);
    const env = io.env || {};
    const time = env.SP_NOW ? Date.parse(env.SP_NOW) : Date.now();
    if (Number.isNaN(time)) throw usageError('SP_NOW must be an ISO date');
    const ctx = {
      cwd: io.cwd,
      home: path.resolve(io.cwd, args.flags.home || env.SCREENPLAY_HOME || path.join(os.homedir(), '.screenplay')),
      now: new Date(time).toISOString(),
      pluginRoot: PLUGIN_ROOT,
    };
    const result = cmd.run(ctx, args) || {};
    if (args.flags.json) io.stdout.write(`${JSON.stringify(result.json ?? null, null, 2)}\n`);
    else if (result.text) io.stdout.write(`${result.text}\n`);
    return result.exitCode || 0;
  } catch (e) {
    const known = e instanceof SpError;
    const code = known ? e.code : 3;
    const message = known ? e.message : `internal error: ${e && e.message !== undefined ? e.message : e}`;
    io.stderr.write(`sp${name ? ` ${name}` : ''}: ${message}\n`);
    if (json) io.stdout.write(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
    return code;
  }
}

module.exports = { main, PLUGIN_ROOT };
