import { fileURLToPath } from 'node:url';
import { VERSION } from './version.ts';
import { COMMANDS } from './commands.ts';
import { samePath } from './util/paths.ts';
import type { Args, CliIO } from './cli-types.ts';

export const USAGE = `design-studio engine ${VERSION}

Usage:
  cli.mjs --version
  cli.mjs detect --app <dir>
  cli.mjs inventory --app <dir> [--config <file>] [--out <dir>] [--no-git]`;

export function parseArgs(args: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument: ${a}`);
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}

export async function main(argv: string[], io: CliIO): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === '--version') { io.out(VERSION); return 0; }
  if (!cmd || cmd === '--help' || cmd === 'help') { io.out(USAGE); return cmd ? 0 : 2; }
  // Own keys only: `constructor`, `toString` and the like are not commands.
  const handler = Object.hasOwn(COMMANDS, cmd) ? COMMANDS[cmd] : undefined;
  if (!handler) { io.err(`Unknown command: ${cmd}`); io.err(USAGE); return 2; }
  try {
    return await handler(parseArgs(rest), io);
  } catch (e) {
    io.err(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

function invokedDirectly(): boolean {
  return !!process.argv[1] && samePath(fileURLToPath(import.meta.url), process.argv[1]);
}

if (invokedDirectly()) {
  main(process.argv.slice(2), {
    out: (s) => { process.stdout.write(s + '\n'); },
    err: (s) => { process.stderr.write(s + '\n'); },
  }).then((code) => { process.exitCode = code; });
}
