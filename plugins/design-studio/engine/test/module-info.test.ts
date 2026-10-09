import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readModuleInfo, resolveExport } from '../src/inventory/module-info.ts';
import { createResolver } from '../src/inventory/resolve.ts';
import { file } from './parse-helpers.ts';
import { tmpDir } from './helpers.ts';

test('readModuleInfo records local exports, re-exports, star exports and lazy imports', () => {
  const info = readModuleInfo(file(`import { lazy } from 'react';
import Inner from './inner';
export function A() { return null; }
export const B = 1, C = 2;
const D = 3;
export { D as Dee, Inner };
export default A;
export * from './star';
export { X as Why, default as Zed } from './other';
export type { T } from './types';
const Page = lazy(() => import('./page'));
const Named = lazy(() => import('./named').then((m) => ({ default: m.NamedPage })));`), 'src/index.tsx');
  assert.deepEqual([...info.exportsLocal], [['A', 'A'], ['B', 'B'], ['C', 'C'], ['Dee', 'D'], ['Inner', 'Inner'], ['default', 'A']]);
  assert.deepEqual(info.starExports, ['./star']);
  assert.deepEqual(info.reexports, [{ exported: 'Why', imported: 'X', source: './other' }, { exported: 'Zed', imported: 'default', source: './other' }]);
  assert.deepEqual([...info.lazy], [['Page', { source: './page', imported: 'default' }], ['Named', { source: './named', imported: 'NamedPage' }]]);
});

test('resolveExport follows barrels, default re-exports and imported bindings', () => {
  const sources: Record<string, string> = {
    'src/c/index.ts': `export * from './tag';\nexport { default as Title } from './title';\nimport { Drawer } from './drawer';\nexport { Drawer };`,
    'src/c/tag.tsx': `export function Tag() { return <i />; }`,
    'src/c/title.tsx': `export default function Title() { return <h1 />; }`,
    'src/c/drawer.tsx': `export const Drawer = () => <aside />;`,
  };
  const modules = new Map(Object.entries(sources).map(([f, s]) => [f, readModuleInfo(file(s, f), f)]));
  const resolver = createResolver(tmpDir(), new Set(Object.keys(sources)));
  assert.deepEqual(resolveExport(modules, resolver, 'src/c/index.ts', 'Tag'), { file: 'src/c/tag.tsx', local: 'Tag' });
  assert.deepEqual(resolveExport(modules, resolver, 'src/c/index.ts', 'Title'), { file: 'src/c/title.tsx', local: 'Title' });
  assert.deepEqual(resolveExport(modules, resolver, 'src/c/index.ts', 'Drawer'), { file: 'src/c/drawer.tsx', local: 'Drawer' });
  assert.equal(resolveExport(modules, resolver, 'src/c/index.ts', 'Missing'), null);
});

test('exported lazies are recorded and followed by resolveExport', () => {
  const sources: Record<string, string> = {
    'src/routes/lazy.ts': `import { lazy } from 'react';\nexport const Page = lazy(() => import('../pages/page'));\nexport default lazy(() => import('../pages/home'));`,
    'src/pages/page.tsx': `export default function Page() { return <main />; }`,
    'src/pages/home.tsx': `export default function Home() { return <main />; }`,
  };
  const modules = new Map(Object.entries(sources).map(([f, s]) => [f, readModuleInfo(file(s, f), f)]));
  assert.deepEqual([...(modules.get('src/routes/lazy.ts')?.lazy ?? [])], [['Page', { source: '../pages/page', imported: 'default' }], ['default', { source: '../pages/home', imported: 'default' }]]);
  const resolver = createResolver(tmpDir(), new Set(Object.keys(sources)));
  assert.deepEqual(resolveExport(modules, resolver, 'src/routes/lazy.ts', 'Page'), { file: 'src/pages/page.tsx', local: 'Page' });
  assert.deepEqual(resolveExport(modules, resolver, 'src/routes/lazy.ts', 'default'), { file: 'src/pages/home.tsx', local: 'Home' });
});
