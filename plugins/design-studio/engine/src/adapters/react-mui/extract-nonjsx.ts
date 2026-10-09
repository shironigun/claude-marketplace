import type { N } from '../../parse/parse.ts';
import { walk, lineOf, textOf, unwrap, returnedExpr } from '../../parse/walk.ts';
import { keyName } from '../../parse/literal.ts';
import { calleeName, isStyledRef } from '../../parse/callee.ts';
import { jsxName } from '../../parse/jsx.ts';
import { parseCssDeclarations } from '../../parse/css.ts';
import { kindOf, normalizeColor, type Ctx, type ThemeFacts } from './units.ts';
import { createCollector, type Collector, type Sample, type StyleRefs } from './collector.ts';

function styleRoot(arg: N | null | undefined): N | null {
  const a = unwrap(arg);
  if (!a) return null;
  if (a.type === 'ObjectExpression') return a;
  if (a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression') {
    const r = unwrap(returnedExpr(a));
    return r?.type === 'ObjectExpression' ? r : null;
  }
  return null;
}

function targetName(arg: N | null | undefined, src: string): string {
  const a = unwrap(arg);
  if (!a) return '?';
  if (a.type === 'Identifier') return a.name;
  if (a.type === 'StringLiteral') return a.value;
  return textOf(a, src).slice(0, 40);
}

// The name of the module-level `const X = …` (exported or not) that the node with these ancestors sits in, if any.
function topLevelConst(parents: readonly N[]): string | null {
  let i = parents.findIndex((p) => p.type === 'Program') + 1;
  if (i === 0) return null;
  if (parents[i]?.type === 'ExportNamedDeclaration') i++;
  const decl = parents[i]?.type === 'VariableDeclaration' ? parents[i + 1] : null;
  return decl?.type === 'VariableDeclarator' && decl.id.type === 'Identifier' ? decl.id.name : null;
}

// Runs `collect` and gives what it collected to the module-level const it sits in, so a component that uses that
// const by name (a makeStyles hook, a styled component) can count it.
function owned(c: Collector, parents: readonly N[], collect: () => void): void {
  const owner = topLevelConst(parents);
  const m = c.mark();
  collect();
  if (owner !== null) c.own(m, owner);
}

export function collectMakeStyles(ast: N, c: Collector): void {
  walk(ast, (n, parents) => {
    if (n.type !== 'CallExpression') return;
    const callee = unwrap(n.callee);
    const inner = callee?.type === 'CallExpression' && calleeName(callee.callee, 'last') === 'makeStyles';
    const name = calleeName(n.callee, 'last');
    const direct = name === 'makeStyles' || name === 'createStyles' || name === 'withStyles';
    if (!inner && !direct) return;
    const root = styleRoot(n.arguments[0]);
    if (!root) return;
    owned(c, parents, () => {
      for (const cls of root.properties) {
        if (cls.type !== 'ObjectProperty') continue;
        const value = unwrap(cls.value);
        if (value?.type === 'ObjectExpression') c.collectObject(value, 'makeStyles', `.${keyName(cls) ?? '?'}`);
      }
    });
  });
}

export function collectStyled(ast: N, c: Collector, src: string): void {
  walk(ast, (n, parents) => {
    if (n.type === 'CallExpression') {
      const callee = unwrap(n.callee);
      if (callee?.type === 'CallExpression' && unwrap(callee.callee)?.type === 'Identifier' && isStyledRef(callee.callee)) {
        const root = styleRoot(n.arguments[0]);
        if (root) owned(c, parents, () => c.collectObject(root, 'styled', targetName(callee.arguments[0], src)));
        return;
      }
      if (callee?.type === 'MemberExpression' && isStyledRef(callee)) {
        const root = styleRoot(n.arguments[0]);
        if (root) owned(c, parents, () => c.collectObject(root, 'styled', callee.property.name ?? '?'));
      }
      return;
    }
    if (n.type === 'TaggedTemplateExpression') {
      const tag = unwrap(n.tag);
      const styledTag =
        (tag?.type === 'CallExpression' && isStyledRef(tag.callee)) ||
        (tag?.type === 'MemberExpression' && isStyledRef(tag)) ||
        (tag?.type === 'Identifier' && (tag.name === 'css' || tag.name === 'keyframes'));
      if (!styledTag) return;
      const text = n.quasi.quasis.map((q: N) => q.value.cooked ?? '').join(' var(--expr) ');
      const element = tag?.type === 'CallExpression' ? targetName(tag.arguments[0], src) : tag?.type === 'MemberExpression' ? tag.property.name : 'css';
      owned(c, parents, () => { for (const d of parseCssDeclarations(text)) c.pushCss(d.property, d.value, lineOf(n) + d.line - 1, element); });
    }
  });
}

export function collectConstObjects(ast: N, c: Collector, src: string, refs: StyleRefs): void {
  for (const stmt0 of ast.program.body) {
    const stmt = stmt0.type === 'ExportNamedDeclaration' ? stmt0.declaration : stmt0;
    if (!stmt || stmt.type !== 'VariableDeclaration') continue;
    for (const d of stmt.declarations) {
      if (d.id.type !== 'Identifier') continue;
      const name: string = d.id.name;
      const rawInit = d.init;
      const typeNodes = [d.id.typeAnnotation, rawInit?.type === 'TSAsExpression' || rawInit?.type === 'TSSatisfiesExpression' ? rawInit.typeAnnotation : null];
      const typeText = typeNodes.filter((t): t is N => !!t).map((t) => textOf(t, src)).join(' ');
      const init = unwrap(rawInit);
      const obj = init?.type === 'ObjectExpression' ? init : init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') ? unwrap(returnedExpr(init)) : null;
      if (!obj || obj.type !== 'ObjectExpression') continue;
      const ctx: Ctx | null = /SxProps|SystemStyleObject/.test(typeText) ? 'sx' : /CSSProperties/.test(typeText) ? 'style' : refs.sx.has(name) ? 'sx' : refs.style.has(name) ? 'style' : null;
      if (!ctx) continue;
      const direct = obj.properties.some((p: N) => p.type === 'ObjectProperty' && kindOf(keyName(p) ?? '') !== 'other');
      const m = c.mark();
      if (direct) c.collectObject(obj, ctx, name);
      else {
        for (const p of obj.properties) {
          const v = p.type === 'ObjectProperty' ? unwrap(p.value) : null;
          if (v?.type === 'ObjectExpression') c.collectObject(v, ctx, `${name}.${keyName(p) ?? '?'}`);
        }
      }
      c.own(m, name);
    }
  }
}

const HEX_OR_FN = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?)\(.*\))$/i;

export function collectColorLiterals(ast: N, c: Collector): void {
  walk(ast, (n, parents) => {
    if (n.type !== 'StringLiteral' || c.consumed.has(n.start ?? -1)) return;
    const value = String(n.value).trim();
    if (!HEX_OR_FN.test(value)) return;
    const parent = parents[parents.length - 1];
    if (!parent || parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration') return;
    const property = parent.type === 'ObjectProperty' ? (keyName(parent) ?? '(value)') : parent.type === 'JSXAttribute' ? jsxName(parent.name) : '(value)';
    c.pushColor(normalizeColor(value), lineOf(n), property);
  });
}

export function extractCssFile(src: string, file: string, theme: ThemeFacts): Sample[] {
  const c = createCollector(src, file, theme);
  for (const d of parseCssDeclarations(src)) c.pushCss(d.property, d.value, d.line, null);
  return c.samples;
}
