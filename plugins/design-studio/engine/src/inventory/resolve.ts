import { existsSync } from 'node:fs';
import { dirname, join, posix, resolve as resolvePath } from 'node:path';
import { readText } from '../util/read.ts';
import { cmp } from '../util/compare.ts';
import { isDir, isObject, isString } from '../util/guards.ts';
import { relPosix } from '../util/paths.ts';

/** A tsconfig or jsconfig file the resolver read: its app-relative POSIX path and its text (line endings normalised). */
export interface ConfigInput { file: string; text: string }
export interface Resolver {
  resolve(fromFile: string, spec: string): string | null;
  /** Every tsconfig/jsconfig file read to find the aliases, sorted by path. */
  readonly configInputs: readonly ConfigInput[];
}

interface PathRule { prefix: string; suffix: string; wildcard: boolean; targets: string[] }
interface TsPaths { baseUrl: string | null; paths: PathRule[]; inputs: ConfigInput[] }
// What one config file and the files it extends say, before path targets are resolved: each rule keeps the folder
// of the file that defines it, which is what its targets are relative to when no baseUrl applies.
interface Layer { baseUrlAbs: string | null; rules: Array<{ pattern: string; targets: string[]; dirAbs: string }> }

// Each `extends` hop costs one level; a cycle stops here too.
const MAX_EXTENDS_DEPTH = 4;

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

export function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') { out += next ?? ''; i++; }
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && next === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && next === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}


// Layers in priority order, the first winning: the first baseUrl set, and for each pattern its first definition.
function mergeLayers(layers: readonly Layer[]): Layer {
  const seen = new Set<string>();
  const rules: Layer['rules'] = [];
  for (const l of layers) for (const r of l.rules) if (!seen.has(r.pattern)) { seen.add(r.pattern); rules.push(r); }
  return { baseUrlAbs: layers.find((l) => l.baseUrlAbs !== null)?.baseUrlAbs ?? null, rules };
}

/**
 * The aliases of the app's tsconfig.json (or, when it has none, its jsconfig.json). Relative `extends` (a string or an
 * array) are followed, with later entries and then the file itself winning; a package-name `extends` is skipped. The
 * root's `references` (each a file, or a folder holding tsconfig.json) are followed one level deep, as the default Vite
 * layout keeps `paths` in tsconfig.app.json; the root wins over them, and an earlier reference over a later one.
 * A config is user input, so every part of it is checked: valid JSON of the wrong shape gives no path rules, not an error.
 */
function readTsPaths(appRootAbs: string): TsPaths {
  const rel = (abs: string): string => relPosix(appRootAbs, abs) || '.';
  const inputs = new Map<string, string>();
  const none: Layer = { baseUrlAbs: null, rules: [] };
  const load = (abs: string): Record<string, unknown> | null => {
    let text: string;
    try { text = readText(abs); } catch { return null; }
    inputs.set(rel(abs), text);
    try {
      const json: unknown = JSON.parse(stripJsonComments(text));
      return isObject(json) ? json : null;
    } catch {
      return null;
    }
  };
  // One config file and what it extends.
  const chain = (abs: string, depth: number): { layer: Layer; json: Record<string, unknown> | null } => {
    if (depth > MAX_EXTENDS_DEPTH || !existsSync(abs)) return { layer: none, json: null };
    const json = load(abs);
    if (!json) return { layer: none, json: null };
    const dir = dirname(abs);
    const ext = isString(json.extends) ? [json.extends] : Array.isArray(json.extends) ? json.extends.filter(isString) : [];
    const bases = ext.filter((e) => e.startsWith('.')).map((e) => chain(resolvePath(dir, e.endsWith('.json') ? e : `${e}.json`), depth + 1).layer);
    const co = isObject(json.compilerOptions) ? json.compilerOptions : {};
    const own: Layer = {
      baseUrlAbs: isString(co.baseUrl) ? resolvePath(dir, co.baseUrl) : null,
      rules: isObject(co.paths)
        ? Object.entries(co.paths).flatMap(([pattern, targets]) => (Array.isArray(targets) ? [{ pattern, targets: targets.filter(isString), dirAbs: dir }] : []))
        : [],
    };
    return { layer: mergeLayers([own, ...bases.reverse()]), json };
  };
  // A project's path targets resolve against its merged baseUrl when it has one, else against the defining file's folder (as in TypeScript).
  const resolved = (l: Layer): Layer => ({
    baseUrlAbs: l.baseUrlAbs,
    rules: l.rules.map((r) => ({ ...r, targets: r.targets.map((t) => posix.normalize(posix.join(rel(l.baseUrlAbs ?? r.dirAbs), t))) })),
  });
  const tsconfig = join(appRootAbs, 'tsconfig.json');
  const rootAbs = existsSync(tsconfig) ? tsconfig : join(appRootAbs, 'jsconfig.json');
  const root = chain(rootAbs, 0);
  const references = Array.isArray(root.json?.references) ? root.json.references : [];
  const referenced = references.flatMap((r: unknown) => {
    if (!isObject(r) || !isString(r.path)) return [];
    const abs = resolvePath(dirname(rootAbs), r.path);
    return [resolved(chain(isDir(abs) ? join(abs, 'tsconfig.json') : abs, 1).layer)];
  });
  const merged = mergeLayers([resolved(root.layer), ...referenced]);
  return {
    baseUrl: merged.baseUrlAbs ? rel(merged.baseUrlAbs) : null,
    paths: merged.rules.map(({ pattern, targets }): PathRule => {
      const star = pattern.indexOf('*');
      return { prefix: star >= 0 ? pattern.slice(0, star) : pattern, suffix: star >= 0 ? pattern.slice(star + 1) : '', wildcard: star >= 0, targets };
    }),
    inputs: [...inputs].map(([file, text]) => ({ file, text })).sort((a, b) => cmp(a.file, b.file)),
  };
}

export function createResolver(appRootAbs: string, files: ReadonlySet<string>): Resolver {
  const ts = readTsPaths(appRootAbs);
  const tryBase = (base: string): string | null => {
    const normalized = posix.normalize(base);
    const b = normalized.replace(/^\.\//, '').replace(/\/+$/, '');
    const prefix = b === '.' || b === '' ? '' : `${b}/`;
    // A trailing slash or the app root can only mean a directory, so only index files qualify.
    if (prefix === '' || normalized.endsWith('/')) {
      for (const name of INDEX_FILES) if (files.has(prefix + name)) return prefix + name;
      return null;
    }
    for (const ext of EXTENSIONS) if (files.has(b + ext)) return b + ext;
    return null;
  };
  return {
    configInputs: ts.inputs,
    resolve(fromFile, spec) {
      if (spec.startsWith('.')) return tryBase(posix.join(posix.dirname(fromFile), spec));
      for (const p of ts.paths) {
        const match = p.wildcard ? spec.startsWith(p.prefix) && spec.endsWith(p.suffix) : spec === p.prefix;
        if (!match) continue;
        const mid = p.wildcard ? spec.slice(p.prefix.length, spec.length - p.suffix.length) : '';
        for (const t of p.targets) { const r = tryBase(t.replace('*', mid)); if (r) return r; }
      }
      if (ts.baseUrl !== null) return tryBase(posix.join(ts.baseUrl, spec));
      return null;
    },
  };
}
