import { withDefaults, type AppConfig } from '../src/config/config.ts';
import { readModuleInfo } from '../src/inventory/module-info.ts';
import { findComponents } from '../src/inventory/components.ts';
import { buildGraph, findRouteRefs, type FileUnit } from '../src/inventory/graph.ts';
import { createResolver } from '../src/inventory/resolve.ts';
import { file } from './parse-helpers.ts';
import { tmpDir } from './helpers.ts';

export const testConfig: AppConfig = withDefaults({
  product: 'Test',
  appRoot: '.',
  sources: ['src/**/*.{ts,tsx}'],
  libraryHome: 'src/shared',
  modules: { roots: ['src/features'], shared: ['src/shared'] },
});

export function buildUnits(sources: Record<string, string>): FileUnit[] {
  return Object.entries(sources).map(([f, s]) => {
    const ast = file(s, f);
    const info = readModuleInfo(ast, f);
    const { components, aliases, valueRefs } = findComponents(ast, s, f, info);
    return { file: f, info, components, aliases, routeRefs: findRouteRefs(ast), valueRefs };
  });
}

export function graphOf(sources: Record<string, string>, cfg: AppConfig = testConfig) {
  const units = buildUnits(sources);
  const graph = buildGraph(units, createResolver(tmpDir(), new Set(Object.keys(sources))), cfg);
  return { units, graph, components: units.flatMap((u) => u.components) };
}
