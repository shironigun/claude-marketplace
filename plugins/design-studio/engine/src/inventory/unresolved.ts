import { builtinModules } from 'node:module';
import { cmp } from '../util/compare.ts';
import type { PackageInfo } from '../detect/detect.ts';
import type { FileUnit } from './graph.ts';
import type { Resolver } from './resolve.ts';

/** Non-relative import specifiers that resolve to no scanned file and name no dependency or Node builtin. */
export interface UnresolvedImports { count: number; examples: string[] }

export const MAX_UNRESOLVED_EXAMPLES = 10;
const BUILTINS: ReadonlySet<string> = new Set(builtinModules);

// The package a bare specifier names: `@scope/name` or `name`, without any subpath.
const packageOf = (spec: string): string => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

/**
 * Every distinct non-relative specifier (imports, lazy imports, re-exports) that the resolver cannot map to a scanned
 * file and that is neither a dependency, devDependency or peerDependency of the app nor a Node builtin. Usually an
 * alias the tsconfig does not declare, so the import graph misses those edges.
 */
export function findUnresolved(units: readonly FileUnit[], resolver: Resolver, pkg: PackageInfo): UnresolvedImports {
  const deps = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies), ...Object.keys(pkg.peerDependencies)]);
  const found = new Set<string>();
  for (const u of units) {
    const specs = [...u.info.imports.map((i) => i.source), ...[...u.info.lazy.values()].map((l) => l.source), ...u.info.reexports.map((r) => r.source), ...u.info.starExports];
    for (const spec of specs) {
      if (spec.startsWith('.') || found.has(spec)) continue;
      const name = packageOf(spec);
      if (spec.startsWith('node:') || BUILTINS.has(spec) || BUILTINS.has(name) || deps.has(name)) continue;
      if (resolver.resolve(u.file, spec) === null) found.add(spec);
    }
  }
  const all = [...found].sort(cmp);
  return { count: all.length, examples: all.slice(0, MAX_UNRESOLVED_EXAMPLES) };
}
