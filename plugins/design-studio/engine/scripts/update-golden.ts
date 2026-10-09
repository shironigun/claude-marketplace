import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config/config.ts';
import { runInventory } from '../src/inventory/run.ts';
import { writeJson } from '../src/util/write.ts';

const fixture = fileURLToPath(new URL('../../fixtures/mini-crm/', import.meta.url));
const { config, appRootAbs } = loadConfig(join(fixture, 'design-system', 'design-studio.config.json'));
const { registry } = runInventory({ appRootAbs, cfg: config, git: false });
writeJson(fileURLToPath(new URL('../test/golden/mini-crm.registry.json', import.meta.url)), registry);
console.log('golden registry updated');
