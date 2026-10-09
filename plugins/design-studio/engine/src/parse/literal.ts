import type { N } from './parse.ts';
import { textOf, unwrap } from './walk.ts';

export type SV =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'spacing'; args: SV[] }
  | { k: 'themeRef'; path: string }
  | { k: 'resp'; items: SV[] }
  | { k: 'cond'; items: SV[] }
  | { k: 'tpl'; parts: SV[]; statics: string }
  | { k: 'unknown'; text: string };

const BREAKPOINTS = new Set(['xs', 'sm', 'md', 'lg', 'xl']);
const THEME_ROOT = /^(theme|t|muiTheme)\.(palette|typography|shape|shadows|zIndex|spacing|breakpoints|transitions|vars)\b/;

export function keyName(prop: N): string | null {
  if (!prop.key || prop.computed) return null;
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'StringLiteral') return prop.key.value;
  if (prop.key.type === 'NumericLiteral') return String(prop.key.value);
  return null;
}

export function evalStatic(input: N | null | undefined, src: string): SV {
  const node = unwrap(input);
  if (!node) return { k: 'unknown', text: '' };
  switch (node.type) {
    case 'NumericLiteral':
      return { k: 'num', v: node.value };
    case 'StringLiteral':
      return { k: 'str', v: node.value };
    case 'UnaryExpression': {
      const arg = unwrap(node.argument);
      if ((node.operator === '-' || node.operator === '+') && arg?.type === 'NumericLiteral') {
        return { k: 'num', v: node.operator === '-' ? -arg.value : arg.value };
      }
      break;
    }
    case 'TemplateLiteral': {
      if (node.expressions.length === 0) return { k: 'str', v: node.quasis[0]?.value.cooked ?? '' };
      const statics = node.quasis.map((q: N) => q.value.cooked ?? '').join(' ');
      return { k: 'tpl', parts: node.expressions.map((e: N) => evalStatic(e, src)), statics };
    }
    case 'CallExpression': {
      const callee = unwrap(node.callee);
      const isSpacing =
        (callee?.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.property.name === 'spacing') ||
        (callee?.type === 'Identifier' && callee.name === 'spacing');
      if (isSpacing) return { k: 'spacing', args: node.arguments.map((a: N) => evalStatic(a, src)) };
      break;
    }
    case 'MemberExpression':
    case 'OptionalMemberExpression': {
      const text = textOf(node, src);
      if (THEME_ROOT.test(text)) return { k: 'themeRef', path: text };
      break;
    }
    case 'ObjectExpression': {
      const props = node.properties;
      if (props.length > 0 && props.every((p: N) => p.type === 'ObjectProperty' && BREAKPOINTS.has(keyName(p) ?? ''))) {
        return { k: 'resp', items: props.map((p: N) => evalStatic(p.value, src)) };
      }
      break;
    }
    case 'ArrayExpression':
      return { k: 'resp', items: node.elements.filter((e: N | null) => e !== null).map((e: N) => evalStatic(e, src)) };
    case 'ConditionalExpression':
      return { k: 'cond', items: [evalStatic(node.consequent, src), evalStatic(node.alternate, src)] };
    case 'LogicalExpression':
      return { k: 'cond', items: node.operator === '&&' ? [evalStatic(node.right, src)] : [evalStatic(node.left, src), evalStatic(node.right, src)] };
    case 'ArrowFunctionExpression':
      if (node.body.type !== 'BlockStatement') return evalStatic(node.body, src);
      break;
  }
  return { k: 'unknown', text: textOf(node, src).slice(0, 120) };
}
