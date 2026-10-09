import type { N } from './parse.ts';
import { unwrap } from './walk.ts';

/**
 * Names a callee (or any reference) in one of three forms, looking through type assertions and parentheses:
 * - `dotted`: the whole name of an identifier or a plain member chain (`memo`, `React.memo`, `styled.div`);
 * - `last`: the final segment of an identifier or a plain member access (`memo` for `React.memo`);
 * - `root`: the identifier a chain of member accesses and calls starts from (`styled` for `styled(Box)(…)`,
 *   `styled.div` and `styled['div']`).
 * Anything else (a computed member for `dotted`/`last`, a literal, a function) gives null.
 */
export function calleeName(n: N | null | undefined, form: 'dotted' | 'last' | 'root'): string | null {
  const c = unwrap(n);
  if (!c) return null;
  if (c.type === 'Identifier') return c.name;
  if (form === 'root') {
    if (c.type === 'MemberExpression') return calleeName(c.object, 'root');
    if (c.type === 'CallExpression') return calleeName(c.callee, 'root');
    return null;
  }
  if (c.type !== 'MemberExpression' || c.computed || c.property.type !== 'Identifier') return null;
  if (form === 'last') return c.property.name;
  const o = calleeName(c.object, 'dotted');
  return o === null ? null : `${o}.${c.property.name}`;
}

/**
 * True for `styled` itself and for a member access on it (`styled.div`, `styled['div']`, `styled.div.attrs`):
 * the names a styled factory is called through.
 */
export function isStyledRef(n: N | null | undefined): boolean {
  const c = unwrap(n);
  if (!c) return false;
  if (c.type === 'Identifier') return c.name === 'styled';
  return c.type === 'MemberExpression' && isStyledRef(c.object);
}
