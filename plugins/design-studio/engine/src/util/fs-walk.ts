import { readdirSync, type Dirent } from 'node:fs';
import { join } from 'node:path';
import picomatch from 'picomatch';
import { cmp } from './compare.ts';
import { relPosix } from './paths.ts';

/** Folders the walker never enters (as well as any folder whose name starts with a dot). */
export const SKIP_DIRS: ReadonlySet<string> = new Set(['node_modules', 'dist', 'coverage', 'storybook-static']);

export interface WalkOptions {
  include: string[];
  exclude?: string[];
  /** Called for each folder that cannot be listed (app-relative POSIX path, `.` for the root); the folder is skipped. */
  onError?: (relDir: string, err: unknown) => void;
}

export function walkFiles(rootAbs: string, opts: WalkOptions): string[] {
  const isIncluded = picomatch(opts.include);
  const isExcluded = opts.exclude && opts.exclude.length > 0 ? picomatch(opts.exclude) : () => false;
  const out: string[] = [];
  const visit = (dirAbs: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dirAbs, { withFileTypes: true });
    } catch (e) {
      opts.onError?.(relPosix(rootAbs, dirAbs) || '.', e);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        visit(join(dirAbs, entry.name));
      } else if (entry.isFile()) {
        const rel = relPosix(rootAbs, join(dirAbs, entry.name));
        if (isIncluded(rel) && !isExcluded(rel)) out.push(rel);
      }
    }
  };
  visit(rootAbs);
  // Code-unit order, never the order the disk lists entries in (NTFS lists the folder `b` before the file `b.ts`).
  return out.sort(cmp);
}
