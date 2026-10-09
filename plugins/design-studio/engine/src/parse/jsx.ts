import type { N } from './parse.ts';
import { unwrap } from './walk.ts';

export function jsxName(name: N): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${jsxName(name.object)}.${name.property.name}`;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return '?';
}

export function jsxAttr(opening: N, attrName: string): N | null {
  for (const a of opening.attributes ?? []) {
    if (a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === attrName) return a;
  }
  return null;
}

export function jsxAttrExpr(attr: N | null): N | null {
  const v = attr?.value;
  if (!v) return null;
  if (v.type === 'StringLiteral') return v;
  if (v.type === 'JSXExpressionContainer') return v.expression.type === 'JSXEmptyExpression' ? null : unwrap(v.expression);
  if (v.type === 'JSXElement' || v.type === 'JSXFragment') return v;
  return null;
}

export function jsxAttrString(opening: N, attrName: string): string | null {
  const attr = jsxAttr(opening, attrName);
  if (!attr) return null;
  if (attr.value === null || attr.value === undefined) return 'true';
  const v = jsxAttrExpr(attr);
  if (!v) return null;
  if (v.type === 'StringLiteral') return v.value;
  if (v.type === 'TemplateLiteral' && v.expressions.length === 0) return v.quasis[0]?.value.cooked ?? '';
  return '{expr}';
}
