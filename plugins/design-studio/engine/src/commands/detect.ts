import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from '../cli-types.ts';
import { detectStack, proposeConfig } from '../detect/detect.ts';
import { stableStringify } from '../util/write.ts';

export const detectCommand: Command = async (args, io) => {
  if (typeof args.app !== 'string') { io.err('detect: --app <dir> is required'); return 2; }
  const app = resolve(args.app);
  if (!existsSync(join(app, 'package.json'))) { io.err(`detect: no package.json in ${app}`); return 1; }
  const stack = detectStack(app);
  io.out(stableStringify({ stack, proposedConfig: proposeConfig(stack, app) }).trimEnd());
  return 0;
};
