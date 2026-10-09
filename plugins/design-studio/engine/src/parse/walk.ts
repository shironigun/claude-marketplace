import type { N } from './parse.ts';

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'range', 'errors']);

export type Visitor = (node: N, parents: readonly N[]) => void | 'skip';

export function walk(root: N, visit: Visitor): void {
  const parents: N[] = [];
  const go = (node: N): void => {
    if (visit(node, parents) === 'skip') return;
    parents.push(node);
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child === 'object' && typeof child.type === 'string') go(child);
      } else if (value && typeof value === 'object' && typeof value.type === 'string') {
        go(value);
      }
    }
    parents.pop();
  };
  go(root);
}

export function lineOf(node: N): number {
  return node.loc?.start.line ?? 0;
}

export function endLineOf(node: N): number {
  return node.loc?.end.line ?? lineOf(node);
}

export function textOf(node: N, src: string): string {
  return src.slice(node.start ?? 0, node.end ?? 0);
}

/** TypeScript wrappers around a runtime expression (`x as T`, `x satisfies T`, `x!`, `<T>x`); only their `expression` is a value. */
export const TS_EXPRESSION_WRAPPERS: ReadonlySet<string> = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion']);
/** Everything `unwrap` looks through: the TypeScript expression wrappers and parentheses. */
export const EXPRESSION_WRAPPERS: ReadonlySet<string> = new Set([...TS_EXPRESSION_WRAPPERS, 'ParenthesizedExpression']);

export function unwrap(node: N | null | undefined): N | null {
  let n = node ?? null;
  while (n && EXPRESSION_WRAPPERS.has(n.type)) n = n.expression;
  return n;
}

/** The index of the nearest ancestor in `parents`, at or above `from`, that is not an expression wrapper (`unwrap` upwards). */
export function skipWrappers(parents: readonly N[], from: number): number {
  let k = from;
  while (k >= 0 && EXPRESSION_WRAPPERS.has(parents[k].type)) k--;
  return k;
}

export function containsJsx(node: N): boolean {
  let found = false;
  walk(node, (n) => {
    if (found) return 'skip';
    if (n.type === 'JSXElement' || n.type === 'JSXFragment') { found = true; return 'skip'; }
  });
  return found;
}

export function returnedExpr(fn: N): N | null {
  if (!fn.body) return null;
  if (fn.body.type !== 'BlockStatement') return fn.body;
  for (const s of fn.body.body) if (s.type === 'ReturnStatement') return s.argument ?? null;
  return null;
}
