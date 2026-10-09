import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { DEFAULT_EXCLUDE, configPathFor, loadConfig, validateConfig, withDefaults } from '../src/config/config.ts';
import { tmpDir, writeTree } from './helpers.ts';

const valid = {
  product: 'Example App',
  appRoot: '.',
  adapter: 'react-mui',
  sources: ['src/**/*.tsx'],
  libraryHome: 'src/components/shared',
  modules: { roots: ['src/components'], shared: ['src/components/shared'] },
};

test('a minimal config is valid', () => {
  assert.deepEqual(validateConfig(valid), []);
});

test('a missing required field is reported', () => {
  const { product: _omit, ...rest } = valid;
  assert.ok(validateConfig(rest).some((e) => e.includes('product')));
});

test('unknown fields are rejected', () => {
  assert.ok(validateConfig({ ...valid, colour: 'red' }).some((e) => /additional properties/.test(e)));
});

test('withDefaults fills optional fields', () => {
  const c = withDefaults(valid as Parameters<typeof withDefaults>[0]);
  assert.deepEqual(c.exclude, DEFAULT_EXCLUDE);
  assert.equal(c.enforcement, 'advisory');
  assert.equal(c.density.default, 'comfortable');
});

test('loadConfig resolves appRoot from the folder that contains design-system/', () => {
  const root = tmpDir();
  const app = join(root, 'app');
  writeTree(app, { 'design-system/design-studio.config.json': JSON.stringify(valid) });
  const loaded = loadConfig(configPathFor(app));
  assert.equal(loaded.appRootAbs, app);
  assert.equal(loaded.config.product, 'Example App');
});

test('loadConfig resolves appRoot from the config\'s own folder when that folder is not design-system/', () => {
  const root = tmpDir();
  writeTree(root, { 'tools/ds.json': JSON.stringify(valid), 'tools/up.json': JSON.stringify({ ...valid, appRoot: '../app' }) });
  assert.equal(loadConfig(join(root, 'tools', 'ds.json')).appRootAbs, join(root, 'tools'));
  assert.equal(loadConfig(join(root, 'tools', 'up.json')).appRootAbs, join(root, 'app'));
});

test('loadConfig names the file when the config is invalid', () => {
  const app = tmpDir();
  writeTree(app, { 'design-system/design-studio.config.json': '{"product": ""}' });
  assert.throws(() => loadConfig(configPathFor(app)), /Invalid config .*design-studio\.config\.json/);
});

test('withDefaults keeps nested defaults when a config supplies them partially', () => {
  const c = withDefaults({ ...(valid as Parameters<typeof withDefaults>[0]), density: {} as never, storybook: { port: 7000 } as never });
  assert.equal(c.density.default, 'comfortable');
  assert.deepEqual(c.storybook, { port: 7000, enableManifests: true, enableMcp: true });
});
