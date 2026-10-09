import { relative, resolve, sep } from 'node:path';

/** True when both paths name the same location; case-insensitive on Windows, where the file system is. */
export function samePath(a: string, b: string): boolean {
  const x = resolve(a);
  const y = resolve(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}

export function toPosix(p: string): string {
  return p.split(sep).join('/');
}

export function relPosix(fromAbs: string, toAbs: string): string {
  return toPosix(relative(fromAbs, toAbs));
}
