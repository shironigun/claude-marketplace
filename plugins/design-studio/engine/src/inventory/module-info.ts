import type { N } from '../parse/parse.ts';
import { walk, unwrap } from '../parse/walk.ts';
import { keyName } from '../parse/literal.ts';
import { readImports, type ImportBinding } from '../parse/imports.ts';
import { isStyledRef } from '../parse/callee.ts';
import type { Resolver } from './resolve.ts';

export interface ModuleInfo {
  file: string;
  imports: ImportBinding[];
  exportsLocal: Map<string, string>;
  reexports: Array<{ exported: string; imported: string; source: string }>;
  starExports: string[];
  lazy: Map<string, { source: string; imported: string }>;
}

const nameOf = (n: N): string => (n.type === 'Identifier' ? n.name : String(n.value));

function firstIdentArg(call: N): string | null {
  const callee = unwrap(call.callee);
  // styled(Base)(...) / styled.x(...) build a NEW component; the base is not what the module exports.
  if (callee?.type === 'CallExpression' && isStyledRef(callee.callee)) return null;
  const a = unwrap(call.arguments?.[0]);
  if (a?.type === 'Identifier') return a.name;
  if (a?.type === 'CallExpression') return firstIdentArg(a);
  if (callee?.type === 'CallExpression') return firstIdentArg(callee) ?? null;
  return null;
}

function lazyTarget(init0: N | null | undefined): { source: string; imported: string } | null {
  const init = unwrap(init0);
  if (!init || init.type !== 'CallExpression') return null;
  const callee = unwrap(init.callee);
  const name = callee?.type === 'Identifier' ? callee.name : callee?.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name : '';
  if (!/lazy/i.test(name) || !init.arguments[0]) return null;
  const found: { source: string | null; imported: string } = { source: null, imported: 'default' };
  walk(init.arguments[0], (n) => {
    const isImportCall = (n.type === 'CallExpression' && n.callee.type === 'Import') || n.type === 'ImportExpression';
    if (isImportCall && found.source === null) {
      const s = unwrap(n.type === 'ImportExpression' ? n.source : n.arguments[0]);
      if (s?.type === 'StringLiteral') found.source = s.value;
    }
    if (n.type === 'ObjectProperty' && keyName(n) === 'default') {
      const v = unwrap(n.value);
      if (v?.type === 'MemberExpression' && v.property.type === 'Identifier') found.imported = v.property.name;
    }
  });
  return found.source === null ? null : { source: found.source, imported: found.imported };
}

export function readModuleInfo(ast: N, file: string): ModuleInfo {
  const info: ModuleInfo = { file, imports: readImports(ast), exportsLocal: new Map(), reexports: [], starExports: [], lazy: new Map() };
  for (const stmt of ast.program.body) {
    if (stmt.type === 'ExportNamedDeclaration') {
      if (stmt.exportKind === 'type') continue;
      if (stmt.source) {
        for (const s of stmt.specifiers) {
          if (s.exportKind === 'type') continue;
          if (s.type === 'ExportSpecifier') info.reexports.push({ exported: nameOf(s.exported), imported: nameOf(s.local), source: stmt.source.value });
          else if (s.type === 'ExportNamespaceSpecifier') info.reexports.push({ exported: nameOf(s.exported), imported: '*', source: stmt.source.value });
          else if (s.type === 'ExportDefaultSpecifier') info.reexports.push({ exported: s.exported.name, imported: 'default', source: stmt.source.value });
        }
        continue;
      }
      const d = stmt.declaration;
      if ((d?.type === 'FunctionDeclaration' || d?.type === 'ClassDeclaration') && d.id) info.exportsLocal.set(d.id.name, d.id.name);
      else if (d?.type === 'VariableDeclaration') {
        for (const v of d.declarations) {
          if (v.id.type !== 'Identifier') continue;
          info.exportsLocal.set(v.id.name, v.id.name);
          const lz = lazyTarget(v.init);
          if (lz) info.lazy.set(v.id.name, lz);
        }
      }
      for (const s of stmt.specifiers) if (s.type === 'ExportSpecifier' && s.exportKind !== 'type') info.exportsLocal.set(nameOf(s.exported), nameOf(s.local));
    } else if (stmt.type === 'ExportDefaultDeclaration') {
      const d = unwrap(stmt.declaration);
      if ((d?.type === 'FunctionDeclaration' || d?.type === 'ClassDeclaration') && d.id) info.exportsLocal.set('default', d.id.name);
      else if (d?.type === 'Identifier') info.exportsLocal.set('default', d.name);
      else if (d?.type === 'CallExpression') info.exportsLocal.set('default', firstIdentArg(d) ?? 'default');
      else info.exportsLocal.set('default', 'default');
      const lz = lazyTarget(stmt.declaration);
      if (lz) info.lazy.set('default', lz);
    } else if (stmt.type === 'ExportAllDeclaration') {
      if (stmt.exportKind === 'type') continue;
      if (stmt.exported) info.reexports.push({ exported: nameOf(stmt.exported), imported: '*', source: stmt.source.value });
      else info.starExports.push(stmt.source.value);
    } else if (stmt.type === 'VariableDeclaration') {
      for (const v of stmt.declarations) {
        if (v.id.type !== 'Identifier') continue;
        const lz = lazyTarget(v.init);
        if (lz) info.lazy.set(v.id.name, lz);
      }
    }
  }
  return info;
}

export function resolveExport(
  modules: ReadonlyMap<string, ModuleInfo>,
  resolver: Resolver,
  file: string,
  name: string,
  seen: Set<string> = new Set(),
): { file: string; local: string } | null {
  const key = `${file}#${name}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const info = modules.get(file);
  if (!info) return null;
  const local = info.exportsLocal.get(name);
  if (local !== undefined) {
    const lz = info.lazy.get(local);
    if (lz) {
      const target = resolver.resolve(file, lz.source);
      if (target) return resolveExport(modules, resolver, target, lz.imported, seen) ?? { file, local };
    }
    const imp = info.imports.find((i) => i.local === local && !i.typeOnly);
    if (imp && imp.imported !== '*') {
      const target = resolver.resolve(file, imp.source);
      if (target) return resolveExport(modules, resolver, target, imp.imported, seen) ?? { file, local };
    }
    return { file, local };
  }
  for (const r of info.reexports) {
    if (r.exported !== name || r.imported === '*') continue;
    const target = resolver.resolve(file, r.source);
    if (!target) continue;
    const res = resolveExport(modules, resolver, target, r.imported, seen);
    if (res) return res;
  }
  if (name !== 'default') {
    for (const s of info.starExports) {
      const target = resolver.resolve(file, s);
      if (!target) continue;
      const res = resolveExport(modules, resolver, target, name, seen);
      if (res) return res;
    }
  }
  return null;
}
