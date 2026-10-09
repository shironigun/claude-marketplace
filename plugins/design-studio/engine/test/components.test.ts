import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findComponents, pascalFromFile } from '../src/inventory/components.ts';
import { readModuleInfo } from '../src/inventory/module-info.ts';
import { file } from './parse-helpers.ts';

function defs(src: string, f = 'src/m/x.tsx') {
  const ast = file(src, f);
  return findComponents(ast, src, f, readModuleInfo(ast, f));
}

test('finds function, arrow, memo, forwardRef, class, styled and anonymous default components', () => {
  const r = defs(`import { memo, forwardRef, Component } from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
export function A() { return <div />; }
export const B = () => <span />;
const C = memo(function Inner() { return <p />; });
export const D = forwardRef((p, ref) => <input ref={ref} />);
class E extends Component { render() { return <b />; } }
export const F = styled(Button)({ padding: 4 });
const helper = () => <i />;
export const NotAComponent = 42;
export default memo(() => <em />);`, 'src/m/widget-card.tsx');
  assert.deepEqual(r.components.map((c) => [c.name, c.local, c.exportNames]), [
    ['A', 'A', ['A']], ['B', 'B', ['B']], ['C', 'C', []], ['D', 'D', ['D']], ['E', 'E', []], ['F', 'F', ['F']], ['WidgetCard', 'default', ['default']],
  ]);
  assert.equal(r.components.find((c) => c.name === 'F')?.signals.styledTarget, 'Button');
});

test('signals: data hooks and API imports, slots, region, primary actions, page area and domain props', () => {
  const r = defs(`import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, Button, Container } from '@mui/material';
import { getLeads } from '../api/leads';
import type { Lead } from '../models/lead';
interface Props { title: ReactNode; actions?: ReactNode; renderRow: (l: Lead) => ReactNode; lead: Lead }
export function Page({ title, actions, children }: Props & { children?: ReactNode }) {
  const q = useQuery({ queryKey: ['x'], queryFn: getLeads });
  return <Container maxWidth="lg"><Dialog open>{title}{actions}<Button variant="contained">Save</Button><Button type="submit">Go</Button></Dialog></Container>;
}`);
  const c = r.components[0];
  assert.deepEqual(c.rendered.map((e) => e.name), ['Container', 'Dialog', 'Button', 'Button']);
  assert.deepEqual(c.signals.dataHooks, ['getLeads', 'useQuery']);
  assert.equal(c.signals.data, true);
  assert.equal(c.signals.slots, 4);
  assert.equal(c.signals.region, true);
  assert.equal(c.signals.primaryActions, 2);
  assert.equal(c.signals.pageArea, true);
  assert.equal(c.signals.domainProps, true);
});

test('memo(Foo) aliases are recorded so imports of the alias resolve', () => {
  const r = defs(`import { memo } from 'react';\nfunction Foo() { return <div />; }\nexport const X = memo(Foo);`);
  assert.deepEqual([...r.aliases], [['X', 'Foo']]);
});

test('pascalFromFile names anonymous defaults from the file or folder', () => {
  assert.equal(pascalFromFile('src/a/widget-card.tsx'), 'WidgetCard');
  assert.equal(pascalFromFile('src/lead_row/index.tsx'), 'LeadRow');
});

test('data signals ignore UI hooks and type-only uses of API imports', () => {
  const r = defs(`import { useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LeadDto } from '../api/types';
import { formatDate } from '../utils/service-utils';
import { getLeads } from '../api/leads-api';
export function A({ lead }: { lead: LeadDto }) { const wide = useMediaQuery('(min-width:600px)'); return <i>{formatDate(lead.at)}{String(wide)}</i>; }
export function B() { const go = useNavigate(); return <b onClick={() => go('/')} />; }
export function C() { return <u onClick={() => getLeads()} />; }`);
  assert.deepEqual(Object.fromEntries(r.components.map((c) => [c.name, c.signals.dataHooks])), { A: [], B: ['useNavigate'], C: ['getLeads'] });
});

test('slots are counted through forwardRef/memo generics, PropsWithChildren, class props and interface extends', () => {
  const r = defs(`import { forwardRef, memo, Component, type ReactNode, type PropsWithChildren } from 'react';
type P = { header: ReactNode; footer?: ReactNode };
interface Base { title: ReactNode }
interface Q extends Base { aside: ReactNode }
export const F = forwardRef<HTMLDivElement, P>((props, ref) => <div ref={ref} />);
export const M = memo<P>((props) => <div />);
export function W(props: PropsWithChildren<P>) { return <div />; }
export class K extends Component<P> { render() { return <div />; } }
export function I(props: Q) { return <div />; }`);
  assert.deepEqual(Object.fromEntries(r.components.map((c) => [c.name, c.signals.slots])), { F: 2, M: 2, W: 3, K: 2, I: 2 });
});

test('export default styled(X)(…) keeps the styled component as the default export', () => {
  const r = defs(`import Button from '@mui/material/Button';\nimport { styled } from '@mui/material/styles';\nexport default styled(Button)({ padding: 4 });`, 'src/m/fancy-button.tsx');
  assert.deepEqual(r.components.map((c) => [c.name, c.local, c.exportNames]), [['FancyButton', 'default', ['default']]]);
});

test('valueRefs lists the names used as a value from outside their own declaration', () => {
  const refs = (body: string) => defs(`import { memo } from 'react';\nfunction Cell() { return <i />; }\n${body}`).valueRefs;
  // Used as a value: an object value, a call argument, a module-level table, and from another component.
  assert.deepEqual(refs(`export function A() { return <X slots={{ day: Cell }} />; }`), ['Cell']);
  assert.deepEqual(refs(`export function A() { go(Cell); return <X />; }`), ['Cell']);
  assert.deepEqual(refs(`const MAP = { a: Cell };\nexport function A() { return <X m={MAP} />; }`), ['Cell']);
  assert.deepEqual(refs(`const MAP = { Cell };\nexport function A() { return <X m={MAP} />; }`), ['Cell']);
  assert.deepEqual(refs(`export default function A() { return <X c={[Cell]} />; }`), ['Cell']);
  // An alias of a component stands for the component.
  assert.deepEqual(refs(`const Alias = memo(Cell);\nexport function A() { return <X c={Alias} />; }`), ['Alias']);
  // Not a use: rendering it (the graph counts that), the property name `Cell`, its own declaration, a type position,
  // and the statements that only expose it.
  assert.deepEqual(refs(`export function A() { return <Cell />; }`), []);
  assert.deepEqual(refs(`export function A() { return <X a={{ Cell: 1 }} b={o.Cell} />; }`), []);
  assert.deepEqual(defs(`function Cell() { const self = Cell; return <i />; }`).valueRefs, []);
  assert.deepEqual(refs(`type P = typeof Cell;\nexport function A(p: { c: typeof Cell }) { return <X c={null as typeof Cell} />; }`), []);
  assert.deepEqual(refs(`export { Cell };`), []);
  assert.deepEqual(refs(`export default Cell;`), []);
  assert.deepEqual(refs(`export default memo(Cell);`), []);
  assert.deepEqual(refs(`const Alias = memo(Cell);`), []);
});

test('valueRefs ignores static members, Object.assign targets, plain aliases and binding positions', () => {
  const refs = (body: string) => defs(`import { memo } from 'react';\nfunction Cell() { return <i />; }\n${body}`).valueRefs;
  // The object of a member access, read or written, with or without a type assertion or optional chaining.
  assert.deepEqual(refs(`Cell.displayName = 'Cell';`), []);
  assert.deepEqual(refs(`Cell.propTypes = {};`), []);
  assert.deepEqual(refs(`Cell.defaultProps = {};`), []);
  assert.deepEqual(refs(`(Cell as any).displayName = 'Cell';`), []);
  assert.deepEqual(refs(`Cell!.displayName = 'Cell';`), []);
  assert.deepEqual(refs(`export function A() { return <X n={Cell?.displayName} m={Cell['k']} />; }`), []);
  // The target of Object.assign.
  assert.deepEqual(refs(`Object.assign(Cell, { extra: 1 });`), []);
  // A plain alias, exported or not, inside a component or at module level.
  assert.deepEqual(refs(`export const Alias = Cell;`), []);
  assert.deepEqual(refs(`const Alias = Cell as unknown;`), []);
  assert.deepEqual(refs(`export function A() { const Alias = Cell; return <X />; }`), []);
  // A binding position that merely reuses the name.
  assert.deepEqual(refs(`export const f = ({ Cell }) => 1;`), []);
  assert.deepEqual(refs(`export const f = ({ a: Cell }) => 1;`), []);
  assert.deepEqual(refs(`export const f = ({ Cell = 1 }) => 1;`), []);
  assert.deepEqual(refs(`export const f = ([Cell]) => 1;`), []);
  assert.deepEqual(refs(`export const f = (...Cell) => 1;`), []);
  assert.deepEqual(refs(`export function g(Cell) { return 1; }`), []);
  assert.deepEqual(refs(`export const h = function (Cell = 1) { return 1; };`), []);
  assert.deepEqual(refs(`export function A() { try { go(); } catch (Cell) { stop(); } return <X />; }`), []);
  assert.deepEqual(refs(`export function A() { const Cell = 1; return <X />; }`), []);
  assert.deepEqual(refs(`export function A() { const { Cell } = props; return <X />; }`), []);
  // Still a use: any other position, even next to the ignored ones.
  assert.deepEqual(refs(`Object.assign({}, Cell);`), ['Cell']);
  assert.deepEqual(refs(`Cell.displayName = 'Cell';\nexport function A() { return <X c={{ day: Cell }} />; }`), ['Cell']);
  assert.deepEqual(refs(`export const f = (a = Cell) => a;`), ['Cell']);
  assert.deepEqual(refs(`const Alias = wrap(Cell);`), ['Cell']);
  assert.deepEqual(refs(`const Alias = Cell || Other;`), ['Cell']);
  assert.deepEqual(refs(`export function A({ day = Cell }) { return <X />; }`), ['Cell']);
});
