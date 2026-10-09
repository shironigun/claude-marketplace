import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import fs, { writeFileSync } from 'node:fs';
import { sha1 } from '../src/util/hash.ts';
import { cmp } from '../src/util/compare.ts';
import { appRelative, firstLine } from '../src/util/messages.ts';
import { readText } from '../src/util/read.ts';
import { sortKeysDeep, stableStringify } from '../src/util/write.ts';
import { walkFiles } from '../src/util/fs-walk.ts';
import { addTo, bucketOf, groupBy, pushTo } from '../src/util/multimap.ts';
import { tmpDir, withMocked, writeTree } from './helpers.ts';

test('sha1 matches the known digest', () => {
  assert.equal(sha1('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
});

test('stableStringify sorts keys at every depth and drops undefined', () => {
  assert.equal(
    stableStringify({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: undefined } }),
    '{\n  "a": {\n    "d": [\n      3,\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n',
  );
});

test('sortKeysDeep refuses Maps so nothing is silently lost', () => {
  assert.throws(() => sortKeysDeep({ m: new Map() }), /convert Map\/Set/);
});

test('readText strips a BOM and normalises line endings', () => {
  const f = join(tmpDir(), 'a.txt');
  writeFileSync(f, '﻿one\r\ntwo\rthree');
  assert.equal(readText(f), 'one\ntwo\nthree');
});

test('walkFiles returns sorted app-relative POSIX paths and skips dependencies', () => {
  const root = tmpDir();
  writeTree(root, { 'src/b/c.ts': '', 'src/a.tsx': '', 'src/b/c.test.ts': '', 'src/d.css': '', 'node_modules/x/y.ts': '', '.cache/z.ts': '' });
  assert.deepEqual(walkFiles(root, { include: ['src/**/*.{ts,tsx}'], exclude: ['**/*.test.*'] }), ['src/a.tsx', 'src/b/c.ts']);
});

test('walkFiles orders a file before the folder of the same stem, by code unit, whatever order the disk lists them in', () => {
  // NTFS lists the folder `b` before the file `b.ts`; '.' (0x2E) sorts before '/' (0x2F), so the file comes first.
  const root = tmpDir();
  writeTree(root, { 'src/b/c.ts': '', 'src/b.ts': '', 'src/b-c.ts': '' });
  assert.deepEqual(walkFiles(root, { include: ['src/**/*.ts'] }), ['src/b-c.ts', 'src/b.ts', 'src/b/c.ts']);
});

// readdirSync, except that listing the folder whose path ends with `failing` throws.
function failListing(failing: string): (...a: unknown[]) => unknown {
  const real = fs.readdirSync as (...a: unknown[]) => unknown;
  return (p, ...rest) => {
    if (String(p).endsWith(failing)) throw new Error(`EACCES: permission denied, scandir '${String(p)}'`);
    return real(p, ...rest);
  };
}

test('walkFiles skips a folder it cannot list and reports it through onError', () => {
  const root = tmpDir();
  writeTree(root, { 'src/a/x.ts': '', 'src/b/y.ts': '', 'src/c.ts': '' });
  const errors: Array<[string, string]> = [];
  withMocked(fs, 'readdirSync', failListing(join('src', 'a')), () => {
    const files = walkFiles(root, { include: ['src/**/*.ts'], onError: (dir, e) => { errors.push([dir, (e as Error).message.split(',')[0]]); } });
    assert.deepEqual(files, ['src/b/y.ts', 'src/c.ts']);
  });
  assert.deepEqual(errors, [['src/a', 'EACCES: permission denied']]);
});

test('walkFiles reports an unlistable root as "."', () => {
  const root = tmpDir();
  const dirs: string[] = [];
  withMocked(fs, 'readdirSync', failListing(root), () => {
    assert.deepEqual(walkFiles(root, { include: ['**/*'], onError: (dir) => { dirs.push(dir); } }), []);
  });
  assert.deepEqual(dirs, ['.']);
});

test('cmp orders strings by code unit and is a total order', () => {
  assert.equal(cmp('a', 'b'), -1);
  assert.equal(cmp('b', 'a'), 1);
  assert.equal(cmp('a', 'a'), 0);
  assert.deepEqual(['b', 'B', 'a', 'A', '_'].sort(cmp), ['A', 'B', '_', 'a', 'b']);
});

test('firstLine takes the first line of an error or of any thrown value', () => {
  assert.equal(firstLine(new Error('one\ntwo')), 'one');
  assert.equal(firstLine('plain\nmore'), 'plain');
});

test('appRelative turns every absolute form of the app root into an app-relative POSIX path', () => {
  const win = 'C:\\work\\app';
  assert.equal(appRelative("open 'C:\\work\\app\\src\\a b.tsx'", win), "open 'src/a b.tsx'");
  assert.equal(appRelative('seen C:/work/app/src/x.tsx and C:\\work\\app\\src\\y.tsx.', win), 'seen src/x.tsx and src/y.tsx.');
  assert.equal(appRelative('root is C:\\work\\app)', win), 'root is .)');
  assert.equal(appRelative('under /home/u/app/src/x.tsx, then /home/u/app', '/home/u/app'), 'under src/x.tsx, then .');
  assert.equal(appRelative('a trailing slash C:\\work\\app\\ is the root', 'C:\\work\\app\\'), 'a trailing slash . is the root');
});

test('appRelative leaves siblings that merely share the root as a prefix, and unrelated text, alone', () => {
  assert.equal(appRelative("open '/home/u/app2/src/x.tsx'", '/home/u/app'), "open '/home/u/app2/src/x.tsx'");
  assert.equal(appRelative('Unexpected token (1:38)', '/home/u/app'), 'Unexpected token (1:38)');
  assert.equal(appRelative('/etc/hosts', '/'), '/etc/hosts');
});

test('the multimap helpers create a bucket on first use and keep insertion order', () => {
  const lists = new Map<string, number[]>();
  pushTo(lists, 'a', 1);
  pushTo(lists, 'a', 2);
  assert.deepEqual([...lists], [['a', [1, 2]]]);
  const sets = new Map<string, Set<string>>();
  addTo(sets, 'k', 'x');
  addTo(sets, 'k', 'x');
  assert.deepEqual([...(sets.get('k') ?? [])], ['x']);
  assert.deepEqual([...groupBy(['bb', 'a', 'cc'], (s) => s.length)], [[2, ['bb', 'cc']], [1, ['a']]]);
  assert.equal(bucketOf(new Map<string, number[]>(), 'z', () => [7])[0], 7);
});
