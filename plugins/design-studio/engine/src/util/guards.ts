import { statSync } from 'node:fs';

/** A plain JSON object (not null, not an array): the shape user-written config files are checked against. */
export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isString = (v: unknown): v is string => typeof v === 'string';

/** True for an existing directory; false for anything else, including a path that cannot be stat'ed. */
export function isDir(abs: string): boolean {
  try { return statSync(abs).isDirectory(); } catch { return false; }
}
