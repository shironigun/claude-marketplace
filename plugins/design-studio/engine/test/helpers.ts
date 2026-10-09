import { mock } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs `body` with `target[method]` replaced by `impl`, then restores it.
// The builtin's ESM named exports are re-synced both ways, because the engine imports them by name.
export function withMocked(target: object, method: string, impl: (...a: unknown[]) => unknown, body: () => void): void {
  // node:test types `method` as a key of the exact object type, which the builtins' overloads defeat; the names are literals here.
  mock.method(target as never, method as never, impl as never);
  syncBuiltinESMExports();
  try {
    body();
  } finally {
    mock.restoreAll();
    syncBuiltinESMExports();
  }
}

export function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'design-studio-'));
}

export function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
}

export const FIXTURE = fileURLToPath(new URL('../../fixtures/mini-crm/', import.meta.url));
