import type { N } from '../../parse/parse.ts';
import { walk, lineOf, textOf, unwrap, returnedExpr } from '../../parse/walk.ts';
import { evalStatic, keyName } from '../../parse/literal.ts';
import { sha1 } from '../../util/hash.ts';
import { kindOf, toAtoms, type Ctx, type Kind, type ThemeFacts, type ValueClass } from './units.ts';

export interface Sample {
  file: string;
  line: number;
  ctx: Ctx;
  kind: Kind;
  property: string;
  raw: string;
  cls: ValueClass;
  px: number | null;
  element: string | null;
  conditional: boolean;
  responsive: boolean;
  selector: boolean;
}
/** `owner` is the module-level const that holds the block (`const ROW_SX = {…}`), or null. */
export interface StyleBlock { hash: string; line: number; props: number; owner: string | null }
export interface StyleRefs { sx: Set<string>; style: Set<string> }
/** How many samples and blocks a collector held at some point, so the ones pushed since can be given an owner. */
export interface CollectorMark { samples: number; blocks: number }

export interface Collector {
  readonly samples: Sample[];
  readonly blocks: StyleBlock[];
  readonly consumed: Set<number>;
  /**
   * The module-level const each sample belongs to (a style object, a makeStyles hook, a styled component), for samples
   * that have one. Internal: it never reaches samples.jsonl.
   */
  readonly owners: Map<Sample, string>;
  mark(): CollectorMark;
  /** Gives every sample and block collected since `m` the owner `name`. */
  own(m: CollectorMark, name: string): void;
  pushValue(ctx: Ctx, prop: string, valueNode: N, element: string | null, selector: boolean, conditional: boolean): void;
  collectObject(obj: N, ctx: Ctx, element: string | null, selector?: boolean, conditional?: boolean): void;
  collectSx(expr: N | null, ctx: Ctx, element: string | null, conditional?: boolean): void;
  pushCss(prop: string, value: string, line: number, element: string | null): void;
  pushColor(raw: string, line: number, property: string): void;
}

export function createCollector(src: string, file: string, theme: ThemeFacts): Collector {
  const samples: Sample[] = [];
  const blocks: StyleBlock[] = [];
  const consumed = new Set<number>();
  const owners = new Map<Sample, string>();
  const mark = (): CollectorMark => ({ samples: samples.length, blocks: blocks.length });
  const own = (m: CollectorMark, name: string): void => {
    for (const s of samples.slice(m.samples)) owners.set(s, name);
    for (const b of blocks.slice(m.blocks)) b.owner = name;
  };

  const pushValue = (ctx: Ctx, prop: string, valueNode: N, element: string | null, selector: boolean, conditional: boolean): void => {
    const atoms = toAtoms(ctx, prop, evalStatic(valueNode, src), theme, { conditional, responsive: false });
    walk(valueNode, (n) => { if (n.type === 'StringLiteral') consumed.add(n.start ?? -1); });
    for (const a of atoms) {
      samples.push({ file, line: lineOf(valueNode), ctx, kind: kindOf(prop), property: prop, raw: a.raw, cls: a.cls, px: a.px, element, conditional: a.conditional, responsive: a.responsive, selector });
    }
  };

  const visitObject = (obj: N, ctx: Ctx, element: string | null, selector: boolean, conditional: boolean, top: boolean): void => {
    let styleProps = 0;
    for (const p of obj.properties) {
      if (p.type !== 'ObjectProperty') continue;
      const value = unwrap(p.value);
      if (!value) continue;
      const key = keyName(p);
      if (key === null || kindOf(key) === 'other') {
        if (value.type === 'ObjectExpression') visitObject(value, ctx, element, true, conditional, false);
        continue;
      }
      styleProps++;
      pushValue(ctx, key, value, element, selector, conditional);
    }
    if (top && styleProps >= 3) blocks.push({ hash: sha1(textOf(obj, src).replace(/\s+/g, '')).slice(0, 12), line: lineOf(obj), props: styleProps, owner: null });
  };

  const collectObject = (obj: N, ctx: Ctx, element: string | null, selector = false, conditional = false): void => {
    visitObject(obj, ctx, element, selector, conditional, true);
  };

  const collectSx = (expr: N | null, ctx: Ctx, element: string | null, conditional = false): void => {
    const n = unwrap(expr);
    if (!n) return;
    if (n.type === 'ObjectExpression') { collectObject(n, ctx, element, false, conditional); return; }
    if (n.type === 'ArrayExpression') { for (const el of n.elements) if (el) collectSx(el, ctx, element, conditional); return; }
    if (n.type === 'LogicalExpression') { collectSx(n.right, ctx, element, true); return; }
    if (n.type === 'ConditionalExpression') { collectSx(n.consequent, ctx, element, true); collectSx(n.alternate, ctx, element, true); return; }
    if (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') collectSx(returnedExpr(n), ctx, element, conditional);
  };

  const pushCss = (prop: string, value: string, line: number, element: string | null): void => {
    for (const a of toAtoms('css', prop, { k: 'str', v: value }, theme)) {
      samples.push({ file, line, ctx: 'css', kind: kindOf(prop), property: prop, raw: a.raw, cls: a.cls, px: a.px, element, conditional: false, responsive: false, selector: false });
    }
  };

  const pushColor = (raw: string, line: number, property: string): void => {
    samples.push({ file, line, ctx: 'literal', kind: 'color', property, raw, cls: 'raw-color', px: null, element: null, conditional: false, responsive: false, selector: false });
  };

  return { samples, blocks, consumed, owners, mark, own, pushValue, collectObject, collectSx, pushCss, pushColor };
}
