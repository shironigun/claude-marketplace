import type { N } from '../../parse/parse.ts';
import { walk, unwrap } from '../../parse/walk.ts';
import { jsxName, jsxAttrExpr, jsxAttrString } from '../../parse/jsx.ts';
import { keyName } from '../../parse/literal.ts';
import { muiPrimitiveName, type ImportBinding } from '../../parse/imports.ts';
import { kindOf, type ThemeFacts } from './units.ts';
import { createCollector, type Collector, type Sample, type StyleBlock, type StyleRefs } from './collector.ts';
import { collectColorLiterals, collectConstObjects, collectMakeStyles, collectStyled } from './extract-nonjsx.ts';

export interface PrimitiveUse { name: string; props: Record<string, string> }
/** `owners` maps a sample to the module-level const that holds it (see Collector.owners); internal only. */
export interface FileExtract { samples: Sample[]; primitives: PrimitiveUse[]; blocks: StyleBlock[]; owners: Map<Sample, string> }

const SYSTEM_PROP_HOSTS = new Set(['Box', 'Stack', 'Grid', 'Grid2', 'Typography', 'Container', 'Link']);
const CENSUS_PROPS = ['variant', 'size', 'color', 'orientation', 'elevation', 'fontSize'];

export function refsOf(expr: N | null): string[] {
  const n = unwrap(expr);
  if (!n) return [];
  if (n.type === 'Identifier') return [n.name];
  if (n.type === 'MemberExpression') {
    let o: N | null = n;
    while (o && o.type === 'MemberExpression') o = unwrap(o.object);
    return o?.type === 'Identifier' ? [o.name] : [];
  }
  if (n.type === 'ArrayExpression') return n.elements.flatMap((e: N | null) => refsOf(e));
  if (n.type === 'ObjectExpression') return n.properties.filter((p: N) => p.type === 'SpreadElement').flatMap((p: N) => refsOf(p.argument));
  if (n.type === 'LogicalExpression') return refsOf(n.right);
  if (n.type === 'ConditionalExpression') return [...refsOf(n.consequent), ...refsOf(n.alternate)];
  return [];
}

function collectNested(c: Collector, obj: N, element: string, depth: number): void {
  for (const p of obj.properties) {
    if (p.type !== 'ObjectProperty') continue;
    const key = keyName(p);
    const value = unwrap(p.value);
    if (key === 'sx') c.collectSx(value, 'sx', element);
    else if (key === 'style') c.collectSx(value, 'style', element);
    else if (value?.type === 'ObjectExpression' && depth < 2) collectNested(c, value, element, depth + 1);
  }
}

export function collectJsx(ast: N, c: Collector, imports: ImportBinding[]): { primitives: PrimitiveUse[]; refs: StyleRefs } {
  const importMap = new Map(imports.map((b) => [b.local, b]));
  const primitives: PrimitiveUse[] = [];
  const refs: StyleRefs = { sx: new Set(), style: new Set() };
  walk(ast, (n) => {
    if (n.type !== 'JSXOpeningElement') return;
    const element = jsxName(n.name);
    const mui = muiPrimitiveName(element, importMap);
    for (const attr of n.attributes) {
      if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier') continue;
      const name: string = attr.name.name;
      const expr = jsxAttrExpr(attr);
      if (name === 'sx') { c.collectSx(expr, 'sx', element); for (const r of refsOf(expr)) refs.sx.add(r); }
      else if (name === 'style') { c.collectSx(expr, 'style', element); for (const r of refsOf(expr)) refs.style.add(r); }
      else if (name.endsWith('Props') && expr?.type === 'ObjectExpression') collectNested(c, expr, `${element}.${name}`, 0);
      else if (mui && SYSTEM_PROP_HOSTS.has(mui) && expr && kindOf(name) !== 'other' && !(mui === 'Container' && name === 'maxWidth')) c.pushValue('system-prop', name, expr, element, false, false);
    }
    if (mui) {
      const props: Record<string, string> = {};
      for (const p of CENSUS_PROPS) { const v = jsxAttrString(n, p); if (v !== null) props[p] = v; }
      primitives.push({ name: mui, props });
    }
  });
  return { primitives, refs };
}

export function extractStyles(ast: N, src: string, file: string, imports: ImportBinding[], theme: ThemeFacts): FileExtract {
  const c = createCollector(src, file, theme);
  const { primitives, refs } = collectJsx(ast, c, imports);
  collectMakeStyles(ast, c);
  collectStyled(ast, c, src);
  collectConstObjects(ast, c, src, refs);
  collectColorLiterals(ast, c);
  return { samples: c.samples, primitives, blocks: c.blocks, owners: c.owners };
}
