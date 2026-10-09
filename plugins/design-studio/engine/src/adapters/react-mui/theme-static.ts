import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../../util/read.ts';
import { firstLine } from '../../util/messages.ts';
import { parseSource, type N } from '../../parse/parse.ts';
import { walk, unwrap, skipWrappers } from '../../parse/walk.ts';
import { keyName } from '../../parse/literal.ts';
import { DEFAULT_THEME, type ThemeFacts } from './units.ts';

export interface CheckedTheme {
  facts: ThemeFacts;
  /**
   * Why the configured theme entry could not be used, or not all of it (`read: …` or `parse: …`, ending with what
   * stands in for it); null when nothing is wrong.
   */
  problem: string | null;
}

// The top-level `const NAME = <number>` declarations of a file, so `spacing: SPACING` and `{ spacing }` can be read.
function numericConsts(ast: N): Map<string, number> {
  const out = new Map<string, number>();
  for (const s0 of ast.program.body) {
    const s = s0.type === 'ExportNamedDeclaration' ? s0.declaration : s0;
    if (s?.type !== 'VariableDeclaration' || s.kind !== 'const') continue;
    for (const d of s.declarations) {
      const init = unwrap(d.init);
      if (d.id.type === 'Identifier' && init?.type === 'NumericLiteral') out.set(d.id.name, init.value);
    }
  }
  return out;
}

// True when the object at parents[i] is not the value of another object's property: the theme options themselves
// (a createTheme argument, a variable's value, an export), not something nested inside them.
const isRootObject = (parents: readonly N[], i: number): boolean => parents[i]?.type === 'ObjectExpression' && parents[skipWrappers(parents, i - 1)]?.type !== 'ObjectProperty';

/**
 * The theme's spacing and radius units: the top-level `spacing` and `shape.borderRadius` of the theme options,
 * as numbers or same-file numeric consts. Not configuring a theme entry, or one that sets neither unit, is fine and
 * gives the library defaults. A configured entry that is missing, unreadable or unparseable, or that sets a unit in a
 * form that cannot be read statically (a function, an array, a string, an imported name), gives the library default
 * for what it could not read together with a `problem`, so the caller can say what stands in.
 */
export function readThemeFactsChecked(appRootAbs: string, themeEntry: string | null): CheckedTheme {
  const fallback = (problem: string | null): CheckedTheme => ({ facts: DEFAULT_THEME, problem });
  if (!themeEntry) return fallback(null);
  const abs = join(appRootAbs, themeEntry);
  if (!existsSync(abs)) return fallback('read: file not found; library defaults used');
  let src: string;
  try { src = readText(abs); } catch (e) { return fallback(`read: ${firstLine(e)}; library defaults used`); }
  let ast: N;
  try { ast = parseSource(src, abs); } catch (e) { return fallback(`parse: ${firstLine(e)}; library defaults used`); }
  const consts = numericConsts(ast);
  const numberOf = (v: N | null | undefined): number | null => {
    const u = unwrap(v);
    if (u?.type === 'NumericLiteral') return u.value;
    if (u?.type === 'Identifier') return consts.get(u.name) ?? null;
    return null;
  };
  // The first occurrence of each unit decides; `value` is null when it is set but cannot be read.
  const units: { spacing: { value: number | null } | null; radius: { value: number | null } | null } = { spacing: null, radius: null };
  walk(ast, (n, parents) => {
    if (n.type !== 'ObjectProperty') return;
    const key = keyName(n);
    // Component overrides and defaultProps (e.g. MuiStack spacing) are not the theme's own units.
    if (key === 'components') return 'skip';
    const top = parents.length - 1;
    if (key === 'spacing' && units.spacing === null && isRootObject(parents, top)) units.spacing = { value: numberOf(n.value) };
    if (key === 'borderRadius' && units.radius === null) {
      const k = skipWrappers(parents, top - 1);
      const shape = parents[k];
      if (shape?.type === 'ObjectProperty' && keyName(shape) === 'shape' && isRootObject(parents, k - 1)) units.radius = { value: numberOf(n.value) };
    }
  });
  const unreadable = [units.spacing?.value === null ? 'spacing' : null, units.radius?.value === null ? 'shape.borderRadius' : null].filter((x): x is string => x !== null);
  const problem = unreadable.length === 0 ? null
    : unreadable.length === 1 ? `parse: ${unreadable[0]} is set but not statically readable; library default used`
      : `parse: ${unreadable.join(' and ')} are set but not statically readable; library defaults used`;
  const spacing = units.spacing?.value ?? null;
  const radius = units.radius?.value ?? null;
  if (spacing === null && radius === null) return fallback(problem);
  return { facts: { spacingUnit: spacing ?? DEFAULT_THEME.spacingUnit, radiusUnit: radius ?? DEFAULT_THEME.radiusUnit, source: 'static' }, problem };
}
