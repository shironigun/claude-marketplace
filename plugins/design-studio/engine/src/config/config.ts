import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { readText } from '../util/read.ts';
import { configSchema } from '../schemas/config.ts';
import { makeValidator } from '../schemas/validate.ts';

export interface AppConfig {
  product: string;
  appRoot: string;
  adapter: 'react-mui';
  sources: string[];
  exclude: string[];
  legacy: string[];
  libraryHome: string;
  themeEntry: string | null;
  providersEntry: string | null;
  locales: string[];
  density: { default: 'compact' | 'comfortable' };
  enforcement: 'advisory' | 'ratchet';
  protectedPaths: string[];
  modules: { roots: string[]; shared: string[] };
  storybook: { port: number; enableManifests: boolean; enableMcp: boolean };
}

export interface LoadedConfig { config: AppConfig; appRootAbs: string; configPath: string | null }

export const CONFIG_DIR = 'design-system';
export const CONFIG_FILE = 'design-studio.config.json';
export const DEFAULT_EXCLUDE = ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/__mocks__/**', '**/*.stories.*', '**/*.d.ts'];

type RequiredKeys = Pick<AppConfig, 'product' | 'appRoot' | 'sources' | 'libraryHome' | 'modules'>;

export function withDefaults(c: Partial<AppConfig> & RequiredKeys): AppConfig {
  return {
    adapter: 'react-mui',
    exclude: [...DEFAULT_EXCLUDE],
    legacy: [],
    themeEntry: null,
    providersEntry: null,
    locales: ['en'],
    enforcement: 'advisory',
    protectedPaths: [],
    ...c,
    density: { default: 'comfortable', ...(c.density ?? {}) },
    storybook: { port: 6006, enableManifests: true, enableMcp: true, ...(c.storybook ?? {}) },
  };
}

const validate = makeValidator(configSchema);

export function validateConfig(data: unknown): string[] {
  return validate(data);
}

export function configPathFor(appRootAbs: string): string {
  return join(appRootAbs, CONFIG_DIR, CONFIG_FILE);
}

export function loadConfig(configPath: string): LoadedConfig {
  const abs = resolve(configPath);
  let data: unknown;
  try {
    data = JSON.parse(readText(abs));
  } catch (e) {
    throw new Error(`Cannot read config ${abs}: ${(e as Error).message}`);
  }
  const errors = validateConfig(data);
  if (errors.length) throw new Error(`Invalid config ${abs}:\n  ${errors.join('\n  ')}`);
  const config = withDefaults(data as AppConfig);
  // appRoot is relative to the folder that holds design-system/ when the config lives there, else to the config's own folder.
  const dir = dirname(abs);
  const base = basename(dir) === CONFIG_DIR ? dirname(dir) : dir;
  const appRootAbs = isAbsolute(config.appRoot) ? config.appRoot : resolve(base, config.appRoot);
  return { config, appRootAbs, configPath: abs };
}
