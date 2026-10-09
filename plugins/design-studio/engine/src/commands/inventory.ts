import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Command } from '../cli-types.ts';
import { configPathFor, loadConfig, type AppConfig } from '../config/config.ts';
import { detectStack, proposeConfig } from '../detect/detect.ts';
import { runInventory, writeInventory } from '../inventory/run.ts';
import { registrySchema } from '../schemas/registry.ts';
import { makeValidator } from '../schemas/validate.ts';
import { samePath } from '../util/paths.ts';

const validateRegistry = makeValidator(registrySchema);

export const inventoryCommand: Command = async (args, io) => {
  if (typeof args.app !== 'string') { io.err('inventory: --app <dir> is required'); return 2; }
  const app = resolve(args.app);
  if (!existsSync(app)) { io.err(`inventory: --app <dir> does not exist: ${app}`); return 2; }
  let outDir = typeof args.out === 'string' ? resolve(args.out) : null;
  const configPath = typeof args.config === 'string' ? resolve(args.config) : existsSync(configPathFor(app)) ? configPathFor(app) : null;
  let cfg: AppConfig;
  let appRootAbs = app;
  if (configPath) {
    const loaded = loadConfig(configPath);
    cfg = loaded.config;
    appRootAbs = loaded.appRootAbs;
    if (!existsSync(appRootAbs)) { io.err(`inventory: app root does not exist: ${appRootAbs}`); return 2; }
    // The config decides the app root; an --app that names another folder is a mistake, never silently ignored.
    if (!samePath(app, appRootAbs)) { io.err(`inventory: --app ${app} does not match the config's app root ${appRootAbs}`); return 2; }
    outDir ??= join(dirname(configPath), 'inventory');
  } else {
    if (!outDir) { io.err('inventory: no design-system/design-studio.config.json found; pass --config <file>, or --out <dir> to run with a detected config'); return 2; }
    cfg = proposeConfig(detectStack(app), app);
  }
  const result = runInventory({ appRootAbs, cfg, git: args['no-git'] !== true });
  // Every write is schema-checked (spec §11): an invalid registry stops here and nothing is written.
  const errors = validateRegistry(result.registry);
  if (errors.length) {
    io.err(`inventory: the registry failed schema validation; nothing was written to ${outDir}`);
    for (const e of errors) io.err(`  ${e}`);
    return 1;
  }
  writeInventory(result, outDir);
  const unverified = result.registry.parseErrors.length ? ` (${result.registry.parseErrors.length} file(s) UNVERIFIED: could not be read or analysed)` : '';
  io.out(`inventory: ${result.registry.metrics.files} files, ${result.registry.metrics.components} components, ${result.registry.families.length} families -> ${outDir}${unverified}`);
  return 0;
};
