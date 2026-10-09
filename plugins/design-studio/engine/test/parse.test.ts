import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSource, type N } from '../src/parse/parse.ts';
import { walk, containsJsx } from '../src/parse/walk.ts';
import { jsxName, jsxAttrString } from '../src/parse/jsx.ts';
import { evalStatic, keyName, type SV } from '../src/parse/literal.ts';
import { calleeName, isStyledRef } from '../src/parse/callee.ts';
import { expr, file } from './parse-helpers.ts';

const ev = (code: string): SV => { const { node, src } = expr(code); return evalStatic(node, src); };

test('parseSource handles TSX with generics, type-only imports and JSX', () => {
  const ast = file(`import type { FC } from 'react';\nexport const B: FC<{ a: number }> = ({ a }) => <div>{a}</div>;\nfunction id<T,>(x: T): T { return x; }`);
  assert.equal(ast.program.body.length, 3);
});

test('parseSource parses .ts files without the JSX plugin', () => {
  const ast = parseSource('const x = <number>y;', 'a.ts');
  assert.equal(ast.program.body[0].declarations[0].init.type, 'TSTypeAssertion');
});

test('walk visits depth-first with parents and honours skip', () => {
  const seen: string[] = [];
  walk(file('const a = { b: { c: 1 } };'), (n, parents) => {
    if (n.type !== 'ObjectProperty') return;
    seen.push(`${n.key.name}@${parents.length}`);
    if (n.key.name === 'b') return 'skip';
  });
  assert.deepEqual(seen, ['b@5']);
});

test('containsJsx finds JSX anywhere in a subtree', () => {
  assert.equal(containsJsx(expr('() => cond ? <a /> : null').node), true);
  assert.equal(containsJsx(expr('() => 1').node), false);
});

test('jsxName and jsxAttrString read element names and attributes', () => {
  const opening = expr('<Mui.Button size="small" disabled count={2} label={"a"} />').node.openingElement;
  assert.equal(jsxName(opening.name), 'Mui.Button');
  assert.equal(jsxAttrString(opening, 'size'), 'small');
  assert.equal(jsxAttrString(opening, 'disabled'), 'true');
  assert.equal(jsxAttrString(opening, 'count'), '{expr}');
  assert.equal(jsxAttrString(opening, 'label'), 'a');
  assert.equal(jsxAttrString(opening, 'missing'), null);
});

test('evalStatic reads literals', () => {
  assert.deepEqual(ev('2'), { k: 'num', v: 2 });
  assert.deepEqual(ev('-1.5'), { k: 'num', v: -1.5 });
  assert.deepEqual(ev("'8px 16px'"), { k: 'str', v: '8px 16px' });
  assert.deepEqual(ev('`12px`'), { k: 'str', v: '12px' });
});

test('evalStatic recognises theme.spacing calls and theme references', () => {
  assert.deepEqual(ev('theme.spacing(1, 2)'), { k: 'spacing', args: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('theme.palette.primary.main'), { k: 'themeRef', path: 'theme.palette.primary.main' });
  assert.deepEqual(ev('(theme) => theme.spacing(3)'), { k: 'spacing', args: [{ k: 'num', v: 3 }] });
});

test('evalStatic expands responsive and conditional values', () => {
  assert.deepEqual(ev('{ xs: 1, md: 2 }'), { k: 'resp', items: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('[1, 2]'), { k: 'resp', items: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('open ? 1 : 2'), { k: 'cond', items: [{ k: 'num', v: 1 }, { k: 'num', v: 2 }] });
  assert.deepEqual(ev('dense && 0.5'), { k: 'cond', items: [{ k: 'num', v: 0.5 }] });
});

test('evalStatic keeps template parts and reports unknowns', () => {
  assert.equal(ev('`${theme.spacing(2)} 4px`').k, 'tpl');
  assert.deepEqual(ev('size'), { k: 'unknown', text: 'size' });
});

test('keyName returns null for spreads and computed keys instead of throwing', () => {
  const props = expr('{ ...base, a: 1, "b-c": 2, [k]: 3 }').node.properties;
  assert.deepEqual(props.map((p: N) => keyName(p)), [null, 'a', 'b-c', null]);
});

test('calleeName gives the dotted, last and root forms of a callee', () => {
  const callee = (code: string): N => expr(code).node.callee;
  const forms = (code: string) => (['dotted', 'last', 'root'] as const).map((f) => calleeName(callee(code), f));
  assert.deepEqual(forms('memo(x)'), ['memo', 'memo', 'memo']);
  assert.deepEqual(forms('React.memo(x)'), ['React.memo', 'memo', 'React']);
  assert.deepEqual(forms('(Object as any).assign(x)'), ['Object.assign', 'assign', 'Object']);
  assert.deepEqual(forms('styled(Box)(x)'), [null, null, 'styled']);
  assert.deepEqual(forms("styled['div'](x)"), [null, null, 'styled']);
  assert.deepEqual(forms('make().makeStyles(x)'), [null, 'makeStyles', 'make']);
  assert.equal(calleeName(null, 'dotted'), null);
});

test('isStyledRef accepts styled and any member access on it, computed or not', () => {
  const ref = (code: string): boolean => isStyledRef(expr(code).node);
  assert.deepEqual(['styled', 'styled.div', "styled['div']", 'styled.div.attrs', '(styled as any).span'].map(ref), [true, true, true, true, true]);
  assert.deepEqual(['css', 'emotion.styled', 'styled()', 'styledX'].map(ref), [false, false, false, false]);
});
