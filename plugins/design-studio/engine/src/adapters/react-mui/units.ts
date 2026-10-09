import type { SV } from '../../parse/literal.ts';

export type Ctx = 'sx' | 'system-prop' | 'style' | 'makeStyles' | 'styled' | 'css' | 'literal' | 'unknown';
export type Kind = 'spacing' | 'radius' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'size' | 'position' | 'border' | 'shadow' | 'zIndex' | 'color' | 'other';
export type ValueClass = 'theme' | 'theme-ref' | 'px' | 'rem' | 'em' | 'pct' | 'viewport' | 'calc' | 'keyword' | 'var' | 'zero' | 'raw-color' | 'unitless' | 'literal' | 'unknown';
export interface Atom { cls: ValueClass; px: number | null; raw: string; conditional: boolean; responsive: boolean }
export interface Flags { conditional: boolean; responsive: boolean }
export interface ThemeFacts { spacingUnit: number; radiusUnit: number; source: 'static' | 'default' }

export const DEFAULT_THEME: ThemeFacts = { spacingUnit: 8, radiusUnit: 4, source: 'default' };

export const SPACING_PROPS = new Set([
  'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'marginX', 'marginY',
  'marginInline', 'marginInlineStart', 'marginInlineEnd', 'marginBlock', 'marginBlockStart', 'marginBlockEnd',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingX', 'paddingY',
  'paddingInline', 'paddingInlineStart', 'paddingInlineEnd', 'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd',
  'gap', 'rowGap', 'columnGap', 'gridGap', 'spacing', 'rowSpacing', 'columnSpacing',
]);
const SIZE_PROPS = new Set(['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'flexBasis']);
const POSITION_PROPS = new Set(['top', 'right', 'bottom', 'left', 'inset']);
const BORDER_PROPS = new Set(['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth', 'outline']);
const COLOR_PROPS = new Set(['color', 'bgcolor', 'backgroundColor', 'background', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke', 'caretColor', 'textDecorationColor']);

export function kindOf(prop: string): Kind {
  if (SPACING_PROPS.has(prop)) return 'spacing';
  if (prop === 'borderRadius' || /^border(Top|Bottom)(Left|Right)Radius$/.test(prop)) return 'radius';
  if (prop === 'fontSize') return 'fontSize';
  if (prop === 'fontWeight') return 'fontWeight';
  if (prop === 'lineHeight') return 'lineHeight';
  if (prop === 'letterSpacing') return 'letterSpacing';
  if (SIZE_PROPS.has(prop)) return 'size';
  if (POSITION_PROPS.has(prop)) return 'position';
  if (BORDER_PROPS.has(prop)) return 'border';
  if (prop === 'boxShadow' || prop === 'textShadow') return 'shadow';
  if (prop === 'zIndex') return 'zIndex';
  if (COLOR_PROPS.has(prop)) return 'color';
  return 'other';
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const COLOR_FN = /^(?:rgba?|hsla?)\(/i;
const NAMED_COLORS = new Set(['black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'silver', 'gold', 'navy', 'teal', 'maroon', 'olive', 'lime', 'aqua', 'cyan', 'magenta', 'violet', 'indigo', 'crimson', 'coral', 'salmon', 'tomato', 'khaki', 'beige', 'ivory', 'lavender', 'turquoise', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey', 'whitesmoke', 'gainsboro', 'dimgray', 'dimgrey']);
const COLOR_KEYWORDS = new Set(['transparent', 'inherit', 'initial', 'unset', 'currentcolor', 'none']);
const KEYWORDS = new Set(['auto', 'inherit', 'initial', 'unset', 'none', 'normal', 'revert', 'fit-content', 'max-content', 'min-content']);
const NUM = /^-?(?:\d+\.?\d*|\.\d+)$/;

export function isColorLiteral(s: string): boolean {
  const t = s.trim();
  return HEX.test(t) || COLOR_FN.test(t) || NAMED_COLORS.has(t.toLowerCase());
}

export function normalizeColor(s: string): string {
  const t = s.trim().toLowerCase();
  if (HEX.test(t) && (t.length === 4 || t.length === 5)) return '#' + t.slice(1).split('').map((c) => c + c).join('');
  return t.replace(/\s+/g, '');
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

function mk(cls: ValueClass, px: number | null, raw: string, flags: Flags): Atom {
  return { cls, px: px === null ? null : r3(px), raw, conditional: flags.conditional, responsive: flags.responsive };
}

function tokenAtom(tok: string, flags: Flags): Atom {
  if (tok === '0' || tok === '0px' || tok === '-0') return mk('zero', 0, tok, flags);
  let m: RegExpMatchArray | null;
  if ((m = tok.match(/^(-?(?:\d+\.?\d*|\.\d+))px$/))) return mk('px', Number(m[1]), tok, flags);
  if ((m = tok.match(/^(-?(?:\d+\.?\d*|\.\d+))rem$/))) return mk('rem', Number(m[1]) * 16, tok, flags);
  if ((m = tok.match(/^(-?(?:\d+\.?\d*|\.\d+))em$/))) return mk('em', Number(m[1]) * 16, tok, flags);
  if (tok.endsWith('%')) return mk('pct', null, tok, flags);
  if (/^-?(?:\d+\.?\d*|\.\d+)(?:vh|vw|dvh|svh|lvh|vmin|vmax|ch|ex)$/.test(tok)) return mk('viewport', null, tok, flags);
  if (NUM.test(tok)) return mk('unitless', null, tok, flags);
  if (KEYWORDS.has(tok.toLowerCase())) return mk('keyword', null, tok, flags);
  return mk('unknown', null, tok, flags);
}

function stringAtoms(kind: Kind, ctx: Ctx, value: string, flags: Flags): Atom[] {
  const v = value.replace(/!important/g, '').trim();
  if (v === '') return [];
  const sxLike = ctx === 'sx' || ctx === 'system-prop';
  if (/\bcalc\(/i.test(v)) return [mk('calc', null, v, flags)];
  if (/^var\(/i.test(v)) return [mk('var', null, v, flags)];
  if (kind === 'color') {
    if (isColorLiteral(v)) return [mk('raw-color', null, normalizeColor(v), flags)];
    if (COLOR_KEYWORDS.has(v.toLowerCase())) return [mk('keyword', null, v, flags)];
    if (sxLike && (v === 'divider' || /^[a-zA-Z]+(\.[a-zA-Z0-9]+)+$/.test(v))) return [mk('theme-ref', null, v, flags)];
    return [mk('unknown', null, v, flags)];
  }
  if (kind === 'shadow') return [mk(v.toLowerCase() === 'none' ? 'keyword' : 'literal', null, v.replace(/\s+/g, ' '), flags)];
  if (kind === 'fontWeight') return [mk(/^fontWeight[A-Z]\w*$/.test(v) ? 'theme-ref' : 'unitless', null, v, flags)];
  if (kind === 'fontSize' && sxLike && /^(h[1-6]|subtitle[12]|body[12]|caption|button|overline)$/.test(v)) return [mk('theme-ref', null, v, flags)];
  if (kind === 'border') {
    const m = v.match(/(-?(?:\d+\.?\d*|\.\d+))px/);
    if (m) return [mk('px', Number(m[1]), v, flags)];
    return [mk(v.toLowerCase() === 'none' || v === '0' ? 'keyword' : 'unknown', null, v, flags)];
  }
  return v.split(/\s+/).map((t) => tokenAtom(t, flags));
}

function numberAtom(kind: Kind, prop: string, ctx: Ctx, n: number, theme: ThemeFacts, flags: Flags): Atom {
  const raw = String(n);
  const sxLike = ctx === 'sx' || ctx === 'system-prop';
  if (n === 0 && (kind === 'spacing' || kind === 'radius' || kind === 'size' || kind === 'position')) return mk('zero', 0, raw, flags);
  switch (kind) {
    case 'spacing': return sxLike ? mk('theme', n * theme.spacingUnit, raw, flags) : mk('px', n, raw, flags);
    // Only `borderRadius` carries the shape.borderRadius transform in MUI system; corner props are plain px.
    case 'radius': return sxLike && prop === 'borderRadius' ? mk('theme', n * theme.radiusUnit, raw, flags) : mk('px', n, raw, flags);
    case 'size': return sxLike && n > 0 && n <= 1 ? mk('pct', null, raw, flags) : mk('px', n, raw, flags);
    case 'fontSize': case 'position': case 'letterSpacing': case 'border': return mk('px', n, raw, flags);
    case 'shadow': return sxLike ? mk('theme-ref', null, `shadows[${n}]`, flags) : mk('literal', null, raw, flags);
    case 'fontWeight': case 'lineHeight': case 'zIndex': return mk('unitless', null, raw, flags);
    default: return mk('unknown', null, raw, flags);
  }
}

export function toAtoms(ctx: Ctx, prop: string, value: SV, theme: ThemeFacts, flags: Flags = { conditional: false, responsive: false }): Atom[] {
  const kind = kindOf(prop);
  if (kind === 'other') return [];
  switch (value.k) {
    case 'num':
      return [numberAtom(kind, prop, ctx, value.v, theme, flags)];
    case 'str':
      return stringAtoms(kind, ctx, value.v, flags);
    case 'spacing':
      return value.args.flatMap((a) =>
        a.k === 'num' ? [mk('theme', a.v * theme.spacingUnit, `spacing(${a.v})`, flags)]
          : a.k === 'str' ? stringAtoms(kind, ctx, a.v, flags)
            : [mk('var', null, 'spacing(?)', flags)]);
    case 'themeRef':
      return [mk('theme-ref', null, value.path, flags)];
    case 'resp':
      return value.items.flatMap((i) => toAtoms(ctx, prop, i, theme, { ...flags, responsive: true }));
    case 'cond':
      return value.items.flatMap((i) => toAtoms(ctx, prop, i, theme, { ...flags, conditional: true }));
    case 'tpl': {
      if (/\bcalc\(/i.test(value.statics)) return [mk('calc', null, value.statics.trim(), flags)];
      const fromParts = value.parts.flatMap((p) => (p.k === 'spacing' || p.k === 'themeRef' ? toAtoms(ctx, prop, p, theme, flags) : []));
      const pxs = [...value.statics.matchAll(/(-?(?:\d+\.?\d*|\.\d+))px/g)].map((m) => mk('px', Number(m[1]), m[0], flags));
      const atoms = [...fromParts, ...pxs];
      return atoms.length ? atoms : [mk('var', null, value.statics.trim() || '${…}', flags)];
    }
    case 'unknown':
      return [mk('var', null, value.text, flags)];
  }
}
