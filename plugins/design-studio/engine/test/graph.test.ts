import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moduleOf, sharedRootOf } from '../src/inventory/modules.ts';
import { findRouteRefs } from '../src/inventory/graph.ts';
import { file } from './parse-helpers.ts';
import { graphOf, testConfig } from './pipeline-helpers.ts';

const SOURCES: Record<string, string> = {
  'src/shared/index.ts': `export * from './tag';`,
  'src/shared/tag.tsx': `import Chip from '@mui/material/Chip';\nexport function Tag() { return <Chip />; }`,
  'src/features/leads/LeadRow.tsx': `import { Tag } from '../../shared';\nimport { Box } from '@mui/material';\nimport * as Mui from '@mui/material';\nexport function LeadRow() { return <Box><Tag /><Mui.Button /><div /></Box>; }`,
  'src/features/leads/LeadsPage.tsx': `import { LeadRow } from './LeadRow';\nexport function LeadsPage() { return <LeadRow />; }`,
  'src/features/deals/Deal.tsx': `import { LeadRow } from '../leads/LeadRow';\nexport function Deal() { return <LeadRow />; }`,
  'src/routes.tsx': `import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { LeadsPage } from './features/leads/LeadsPage';
const Deal = lazy(() => import('./features/deals/Deal').then((m) => ({ default: m.Deal })));
export const routes = [{ path: '/deal', element: <Deal /> }];
export function R() { return <Route path="/leads" element={<Guard><LeadsPage /></Guard>} />; }
function Guard({ children }) { return <>{children}</>; }`,
};

test('moduleOf and sharedRootOf group files', () => {
  assert.equal(moduleOf('src/features/leads/LeadRow.tsx', testConfig), 'leads');
  assert.equal(moduleOf('src/shared/tag.tsx', testConfig), 'shared');
  assert.equal(sharedRootOf('src/shared/tag.tsx', testConfig), 'src/shared');
  assert.equal(moduleOf('src/routes.tsx', testConfig), null);
  assert.equal(moduleOf('src/features/loose.tsx', testConfig), null);
});

test('importers resolve through barrels; renders and library primitives are recorded', () => {
  const { graph } = graphOf(SOURCES);
  assert.deepEqual([...(graph.importers.get('src/shared/tag.tsx#Tag') ?? [])], ['src/features/leads/LeadRow.tsx']);
  assert.deepEqual([...(graph.importers.get('src/features/leads/LeadRow.tsx#LeadRow') ?? [])].sort(), ['src/features/deals/Deal.tsx', 'src/features/leads/LeadsPage.tsx']);
  assert.deepEqual([...(graph.renders.get('src/features/leads/LeadRow.tsx#LeadRow') ?? [])], ['src/shared/tag.tsx#Tag']);
  assert.deepEqual([...(graph.library.get('src/features/leads/LeadRow.tsx#LeadRow') ?? [])].sort(), ['dom:div', 'mui:Box', 'mui:Button']);
  assert.deepEqual([...(graph.library.get('src/shared/tag.tsx#Tag') ?? [])], ['mui:Chip']);
});

test('routes come from Route elements (leaf children) and route objects, including lazy imports', () => {
  const { graph } = graphOf(SOURCES);
  assert.deepEqual([...graph.routes].sort(), ['src/features/deals/Deal.tsx#Deal', 'src/features/leads/LeadsPage.tsx#LeadsPage']);
});

test('imports that reach into another feature module are recorded', () => {
  const { graph } = graphOf(SOURCES);
  assert.deepEqual(graph.crossFeature, [{ from: 'src/features/deals/Deal.tsx', to: 'src/features/leads/LeadRow.tsx', fromModule: 'deals', toModule: 'leads' }]);
});

const TAG = { 'src/shared/index.ts': `export * from './tag';`, 'src/shared/tag.tsx': `export function Tag() { return <span />; }` };

test('a namespace import of a local module records importers as well as renders', () => {
  const { graph } = graphOf({
    ...TAG,
    'src/features/leads/Row.tsx': `import * as UI from '../../shared';\nexport function Row() { return <UI.Tag />; }`,
  });
  assert.deepEqual([...(graph.importers.get('src/shared/tag.tsx#Tag') ?? [])], ['src/features/leads/Row.tsx']);
  assert.deepEqual([...(graph.renders.get('src/features/leads/Row.tsx#Row') ?? [])], ['src/shared/tag.tsx#Tag']);
});

test('a cross-feature lazy import is recorded once, even alongside a static import of the same file', () => {
  const b = { 'src/features/b/B.tsx': `export default function B() { return <div />; }\nexport function Other() { return <div />; }` };
  const lazyOnly = graphOf({
    ...b,
    'src/features/a/A.tsx': `import { lazy } from 'react';\nconst B = lazy(() => import('../b/B'));\nexport function A() { return <B />; }`,
  });
  assert.deepEqual(lazyOnly.graph.crossFeature, [{ from: 'src/features/a/A.tsx', to: 'src/features/b/B.tsx', fromModule: 'a', toModule: 'b' }]);
  assert.deepEqual([...(lazyOnly.graph.renders.get('src/features/a/A.tsx#A') ?? [])], ['src/features/b/B.tsx#B']);
  const both = graphOf({
    ...b,
    'src/features/a/A.tsx': `import { lazy } from 'react';\nimport { Other } from '../b/B';\nconst B = lazy(() => import('../b/B'));\nexport function A() { return <><B /><Other /></>; }`,
  });
  assert.equal(both.graph.crossFeature.length, 1);
});

const refs = (src: string): string[] => findRouteRefs(file(src, 'r.tsx'));

test('findRouteRefs reads nested Route children, fragments, wrappers, index routes and component props', () => {
  assert.deepEqual(refs(`const r = <Route path="/a" element={<A />}><Route path="b" element={<B />} /></Route>;`), ['A', 'B']);
  assert.deepEqual(refs(`const r = <Route path="/a" element={<><A /><B /></>} />;`), ['A', 'B']);
  assert.deepEqual(refs(`const r = <Route path="/a" element={<Suspense fallback={<Spinner />}><Page /></Suspense>} />;`), ['Page']);
  assert.deepEqual(refs(`const r = [{ index: true, element: <Home /> }];`), ['Home']);
  assert.deepEqual(refs(`const r = [<Route path="/x" component={X} />, { path: '/y', Component: Y }];`), ['X', 'Y']);
  assert.deepEqual(refs(`const r = [{ path: '/p', children: [{ path: 'c', element: <Child /> }] }];`), ['Child']);
});

test('findRouteRefs follows conditional and logical elements and keeps dotted member names', () => {
  assert.deepEqual(refs(`const r = <Route path="/a" element={ok ? <A /> : <B />} />;`), ['A', 'B']);
  assert.deepEqual(refs(`const r = <Route path="/a" element={ok && <Page />} />;`), ['Page']);
  assert.deepEqual(refs(`const r = <Route path="/a" element={<Guard>{ok ? <A /> : <B />}</Guard>} />;`), ['A', 'B']);
  assert.deepEqual(refs(`const r = <Route path="/a" element={<Pages.Home />} />;`), ['Pages.Home']);
});

test('an object is a route only with a path key or index: true', () => {
  assert.deepEqual(refs(`const n = { index: 0, label: 'x', component: Panel };`), []);
  assert.deepEqual(refs(`const n = { index: false, element: <Panel /> };`), []);
  assert.deepEqual(refs(`const n = { path: ROUTES.home, element: <Home /> };`), ['Home']);
});

test('a conditional route element and a namespaced route element resolve to components', () => {
  const { graph } = graphOf({
    'src/features/pages/index.ts': `export { Home } from './Home';\nexport { About } from './About';`,
    'src/features/pages/Home.tsx': `export function Home() { return <div />; }`,
    'src/features/pages/About.tsx': `export function About() { return <div />; }`,
    'src/routes.tsx': `import * as Pages from './features/pages';\nimport { About } from './features/pages';\nexport const routes = [{ path: '/', element: <Pages.Home /> }, { path: '/about', element: ok ? <About /> : null }];`,
  });
  assert.deepEqual([...graph.routes].sort(), ['src/features/pages/About.tsx#About', 'src/features/pages/Home.tsx#Home']);
  assert.deepEqual([...(graph.importers.get('src/features/pages/Home.tsx#Home') ?? [])], ['src/routes.tsx']);
});

test('member elements on a non-namespace local or a prop are not recorded as dom elements', () => {
  const { graph } = graphOf({
    'src/features/leads/Menu.tsx': `export function Menu({ item, props }) { return <div><item.icon /><props.Foo /></div>; }`,
  });
  assert.deepEqual([...(graph.library.get('src/features/leads/Menu.tsx#Menu') ?? [])], ['dom:div']);
});

test('a styled target is attributed to a library, a dom tag, or a local component', () => {
  const { graph } = graphOf({
    'src/shared/base.tsx': `export function Base() { return <div />; }`,
    'src/features/x/styles.tsx': [
      `import * as Mui from '@mui/material';`,
      `import Button from '@mui/material/Button';`,
      `import { styled } from '@mui/material/styles';`,
      `import * as Local from '../../shared/base';`,
      `import { Base } from '../../shared/base';`,
      `export const A = styled(Mui.Button)({});`,
      `export const B = styled('div')({});`,
      `export const C = styled.span\`color: red;\`;`,
      `export const D = styled(Base)({});`,
      `export const E = styled(Local.Base)({});`,
      `export const F = styled(Button)({});`,
      `export const G = styled(Missing.Thing)({});`,
    ].join('\n'),
  });
  const lib = (n: string): string[] => [...(graph.library.get(`src/features/x/styles.tsx#${n}`) ?? [])];
  const rend = (n: string): string[] => [...(graph.renders.get(`src/features/x/styles.tsx#${n}`) ?? [])];
  assert.deepEqual(lib('A'), ['mui:Button']);
  assert.deepEqual(lib('B'), ['dom:div']);
  assert.deepEqual(lib('C'), ['dom:span']);
  assert.deepEqual(rend('D'), ['src/shared/base.tsx#Base']);
  assert.deepEqual(rend('E'), ['src/shared/base.tsx#Base']);
  assert.deepEqual(lib('F'), ['mui:Button']);
  assert.deepEqual(lib('G'), ['unknown:Missing.Thing']);
  assert.deepEqual([...(graph.importers.get('src/shared/base.tsx#Base') ?? [])], ['src/features/x/styles.tsx']);
});
