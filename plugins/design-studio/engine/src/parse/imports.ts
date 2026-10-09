import type { N } from './parse.ts';
import { lineOf } from './walk.ts';

export interface ImportBinding { local: string; imported: string; source: string; typeOnly: boolean; line: number }

export function readImports(ast: N): ImportBinding[] {
  const out: ImportBinding[] = [];
  for (const stmt of ast.program.body) {
    if (stmt.type !== 'ImportDeclaration') continue;
    const source: string = stmt.source.value;
    const declType = stmt.importKind === 'type' || stmt.importKind === 'typeof';
    for (const s of stmt.specifiers) {
      const typeOnly = declType || s.importKind === 'type' || s.importKind === 'typeof';
      if (s.type === 'ImportDefaultSpecifier') out.push({ local: s.local.name, imported: 'default', source, typeOnly, line: lineOf(s) });
      else if (s.type === 'ImportNamespaceSpecifier') out.push({ local: s.local.name, imported: '*', source, typeOnly, line: lineOf(s) });
      else if (s.type === 'ImportSpecifier') out.push({ local: s.local.name, imported: s.imported.type === 'Identifier' ? s.imported.name : s.imported.value, source, typeOnly, line: lineOf(s) });
    }
  }
  return out;
}

export function libraryOf(source: string): string | null {
  if (source.startsWith('.') || source.startsWith('/')) return null;
  if (source.startsWith('@mui/icons-material')) return 'icon';
  if (/^@mui\/(material|system|lab|joy|x-[\w-]+)(\/|$)/.test(source)) return 'mui';
  if (source === 'react-router-dom' || source === 'react-router') return 'router';
  return source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0];
}

export function muiPrimitiveName(element: string, imports: ReadonlyMap<string, ImportBinding>): string | null {
  const [base, member] = element.split('.');
  const b = imports.get(base);
  if (!b || libraryOf(b.source) !== 'mui') return null;
  if (member) return member;
  if (b.imported === '*') return null;
  if (b.imported === 'default') return b.source.split('/').pop() ?? b.local;
  return b.imported;
}
