import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value instanceof Map || value instanceof Set) throw new Error('sortKeysDeep: convert Map/Set to plain data before serialising');
  if (value !== null && typeof value === 'object') {
    // fromEntries defines own properties, so a key such as `__proto__` is kept as data instead of reaching the setter.
    const v = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(v).sort().filter((key) => v[key] !== undefined).map((key) => [key, sortKeysDeep(v[key])]));
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2) + '\n';
}

export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
}

export function writeJson(path: string, value: unknown): void {
  writeText(path, stableStringify(value));
}

export function writeJsonl(path: string, rows: readonly unknown[]): void {
  writeText(path, rows.map((r) => JSON.stringify(sortKeysDeep(r))).join('\n') + (rows.length ? '\n' : ''));
}
