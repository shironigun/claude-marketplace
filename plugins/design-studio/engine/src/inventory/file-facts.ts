import type { N } from '../parse/parse.ts';
import { walk, lineOf, textOf, unwrap, skipWrappers } from '../parse/walk.ts';
import { keyName } from '../parse/literal.ts';
import { calleeName } from '../parse/callee.ts';
import { isColorLiteral } from '../adapters/react-mui/units.ts';
import { sha1 } from '../util/hash.ts';

export interface StatusMap { line: number; name: string | null; entries: number }
export interface FileFacts { file: string; normHash: string; normLength: number; statusMaps: StatusMap[]; copyComments: Array<{ line: number; text: string }> }

const STATUS_TONES = new Set(['success', 'error', 'warning', 'info', 'primary', 'secondary', 'default', 'neutral', 'danger']);
const COPY_RE = /\b(copied|copy of|copies|duplicated?|cloned?|ported|mirrors?)\b.{0,40}\b(from|of)\b|\bsame (shape|as)\b/i;
// A status map is a lookup table (status -> colour). Objects that are really styles or palette fragments are not:
// their colour-valued keys are CSS colour properties (color, bgcolor, borderColor, background, fill, stroke)...
const CSS_COLOR_KEY_RE = /color$|^(background|fill|stroke)$/i;
// ...or all palette-shape keys (main, light, dark, contrastText, 50..900, A100..A700).
const PALETTE_KEY_RE = /^(main|light|dark|contrastText|50|[1-9]00|A[1-7]00)$/;
const STYLE_CALLEES = new Set(['styled', 'makeStyles', 'withStyles', 'createStyles', 'css', 'sx']);
const FUNCTION_RE = /^(ArrowFunctionExpression|FunctionExpression)$/;

// Comment stripping is not string-aware: a `//` inside a string literal (unless it follows a `:`) is clipped too.
// That is a known heuristic, good enough for hashing and similarity.
export function normalizeSource(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1').replace(/\s+/g, ' ').trim();
}

function isColorValue(v: N | null): boolean {
  if (!v) return false;
  if (v.type === 'StringLiteral') {
    const s = String(v.value).trim();
    return isColorLiteral(s) || STATUS_TONES.has(s) || /^(success|error|warning|info|primary|secondary|grey|text)\.\w+$/.test(s);
  }
  if (v.type === 'ObjectExpression') {
    return v.properties.some((p: N) => p.type === 'ObjectProperty' && /^(color|bg|bgcolor|background|backgroundColor|fg|text|border|borderColor|main|light|dark)$/.test(keyName(p) ?? '') && isColorValue(unwrap(p.value)));
  }
  return false;
}

// True when the object is handed straight to a style API: a JSX attribute (`sx={{…}}`, `style={{…}}`) or an
// argument of styled(...)(…), styled.x(…), makeStyles(…), css(…) and the like, directly or as the value a
// function returns.
function isStyleArg(parents: readonly N[]): boolean {
  let k = skipWrappers(parents, parents.length - 1);
  if (parents[k]?.type === 'ReturnStatement') k = skipWrappers(parents, k - 2);
  if (FUNCTION_RE.test(parents[k]?.type ?? '')) k = skipWrappers(parents, k - 1);
  const holder = parents[k];
  if (!holder) return false;
  if (holder.type === 'JSXExpressionContainer') return parents[k - 1]?.type === 'JSXAttribute';
  return holder.type === 'CallExpression' && STYLE_CALLEES.has(calleeName(holder.callee, 'root') ?? '');
}

function valueKey(v: N, src: string): string {
  return v.type === 'StringLiteral' ? String(v.value).trim().toLowerCase() : textOf(v, src).replace(/\s+/g, '');
}

// `coloured` are the entries of one object literal whose values look like colours or tones.
function isStatusLookup(coloured: readonly N[], src: string): boolean {
  const keys = coloured.map((p) => keyName(p) ?? '');
  if (keys.some((k) => CSS_COLOR_KEY_RE.test(k))) return false;
  if (keys.every((k) => PALETTE_KEY_RE.test(k))) return false;
  return new Set(coloured.map((p) => valueKey(unwrap(p.value) as N, src))).size >= 2;
}

export function collectFileFacts(ast: N | null, src: string, file: string): FileFacts {
  const norm = normalizeSource(src);
  const statusMaps: StatusMap[] = [];
  const copyComments: Array<{ line: number; text: string }> = [];
  if (ast) {
    walk(ast, (n, parents) => {
      if (n.type !== 'ObjectExpression') return;
      const props = n.properties.filter((p: N) => p.type === 'ObjectProperty' && keyName(p) !== null);
      if (props.length < 3) return;
      const coloured = props.filter((p: N) => isColorValue(unwrap(p.value)));
      if (coloured.length < 3) return;
      if (!isStatusLookup(coloured, src) || isStyleArg(parents)) return;
      const k = skipWrappers(parents, parents.length - 1);
      const holder = k >= 0 ? parents[k] : null;
      statusMaps.push({ line: lineOf(n), name: holder?.type === 'VariableDeclarator' && holder.id.type === 'Identifier' ? holder.id.name : null, entries: coloured.length });
      return 'skip';
    });
    for (const c of ast.comments ?? []) if (COPY_RE.test(c.value)) copyComments.push({ line: lineOf(c), text: String(c.value).trim().slice(0, 120) });
  }
  return { file, normHash: sha1(norm), normLength: norm.length, statusMaps, copyComments };
}
