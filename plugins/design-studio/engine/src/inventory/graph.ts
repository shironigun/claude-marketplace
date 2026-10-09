import type { N } from '../parse/parse.ts';
import { walk, unwrap } from '../parse/walk.ts';
import { jsxName, jsxAttr, jsxAttrExpr } from '../parse/jsx.ts';
import { keyName } from '../parse/literal.ts';
import { libraryOf } from '../parse/imports.ts';
import type { AppConfig } from '../config/config.ts';
import type { Resolver } from './resolve.ts';
import { resolveExport, type ModuleInfo } from './module-info.ts';
import type { ComponentDef } from './components.ts';
import { cmp } from '../util/compare.ts';
import { addTo } from '../util/multimap.ts';
import { moduleOf } from './modules.ts';

export interface FileUnit { file: string; info: ModuleInfo; components: ComponentDef[]; aliases: Map<string, string>; routeRefs: string[]; valueRefs: string[] }
export interface CrossFeatureImport { from: string; to: string; fromModule: string; toModule: string }
export interface Graph {
  importers: Map<string, Set<string>>;
  renders: Map<string, Set<string>>;
  library: Map<string, Set<string>>;
  routes: Set<string>;
  valueRefs: Set<string>;
  crossFeature: CrossFeatureImport[];
}

export function findRouteRefs(ast: N): string[] {
  const refs = new Set<string>();
  const leavesOf = (node: N | null): void => {
    const el = unwrap(node);
    if (!el) return;
    if (el.type === 'ConditionalExpression') { leavesOf(el.consequent); leavesOf(el.alternate); return; }
    if (el.type === 'LogicalExpression') { leavesOf(el.left); leavesOf(el.right); return; }
    const into = (k: N): void => leavesOf(k.type === 'JSXExpressionContainer' ? k.expression : k);
    if (el.type === 'JSXFragment') { for (const k of el.children) into(k); return; }
    if (el.type !== 'JSXElement') return;
    const kids = el.children.filter((ch: N) => ch.type === 'JSXElement' || ch.type === 'JSXFragment' || (ch.type === 'JSXExpressionContainer' && ch.expression.type !== 'JSXEmptyExpression'));
    if (kids.length === 0) {
      // A member leaf (<Pages.Home />) keeps its dotted name so buildGraph can resolve it through the namespace import.
      const name = jsxName(el.openingElement.name);
      if (name.includes('.') || /^[A-Z]/.test(name)) refs.add(name);
      return;
    }
    for (const k of kids) into(k);
  };
  walk(ast, (n) => {
    if (n.type === 'JSXOpeningElement' && jsxName(n.name) === 'Route') {
      leavesOf(jsxAttrExpr(jsxAttr(n, 'element')));
      for (const a of ['component', 'Component']) { const e = jsxAttrExpr(jsxAttr(n, a)); if (e?.type === 'Identifier') refs.add(e.name); }
    } else if (n.type === 'ObjectExpression') {
      const props = new Map<string, N>();
      for (const p of n.properties) {
        if (p.type !== 'ObjectProperty') continue;
        const k = keyName(p);
        const v = unwrap(p.value);
        if (k && v) props.set(k, v);
      }
      // `path` may be a constant, so any value counts; `index` only marks a route when it is literally true.
      const index = props.get('index');
      if (!props.has('path') && !(index?.type === 'BooleanLiteral' && index.value === true)) return;
      leavesOf(props.get('element') ?? null);
      for (const k of ['component', 'Component']) { const v = props.get(k); if (v?.type === 'Identifier') refs.add(v.name); }
    }
  });
  return [...refs].sort();
}

export function buildGraph(units: readonly FileUnit[], resolver: Resolver, cfg: AppConfig): Graph {
  const modules = new Map(units.map((u) => [u.file, u.info]));
  const byLocal = new Map<string, ComponentDef>();
  const aliasOf = new Map<string, string>();
  for (const u of units) {
    for (const c of u.components) byLocal.set(`${u.file}#${c.local}`, c);
    for (const [a, t] of u.aliases) aliasOf.set(`${u.file}#${a}`, `${u.file}#${t}`);
  }
  const lookup = (file: string, local: string): ComponentDef | null => {
    const k = `${file}#${local}`;
    return byLocal.get(k) ?? byLocal.get(aliasOf.get(k) ?? '') ?? null;
  };
  const g: Graph = { importers: new Map(), renders: new Map(), library: new Map(), routes: new Set(), valueRefs: new Set(), crossFeature: [] };
  const seenCross = new Set<string>();
  const noteCross = (from: string, to: string): void => {
    const fm = moduleOf(from, cfg);
    const tm = moduleOf(to, cfg);
    if (!fm || !tm || fm === tm || fm === 'shared' || tm === 'shared') return;
    const k = `${from}>${to}`;
    if (seenCross.has(k)) return;
    seenCross.add(k);
    g.crossFeature.push({ from, to, fromModule: fm, toModule: tm });
  };

  for (const u of units) {
    const bindings = new Map<string, ComponentDef>();
    const nsTargets = new Map<string, string>();
    const libBindings = new Map<string, { lib: string; name: string }>();
    for (const imp of u.info.imports) {
      if (imp.typeOnly) continue;
      const target = resolver.resolve(u.file, imp.source);
      if (target) {
        noteCross(u.file, target);
        if (imp.imported === '*') { nsTargets.set(imp.local, target); continue; }
        const r = resolveExport(modules, resolver, target, imp.imported);
        const def = r ? lookup(r.file, r.local) : null;
        if (def) { bindings.set(imp.local, def); addTo(g.importers, def.id, u.file); }
      } else {
        const lib = libraryOf(imp.source);
        if (lib) libBindings.set(imp.local, { lib, name: imp.imported === 'default' ? (imp.source.split('/').pop() ?? imp.local) : imp.imported });
      }
    }
    for (const [local, lz] of u.info.lazy) {
      const target = resolver.resolve(u.file, lz.source);
      if (!target) continue;
      noteCross(u.file, target);
      const r = resolveExport(modules, resolver, target, lz.imported);
      const def = r ? lookup(r.file, r.local) : null;
      if (def) { bindings.set(local, def); addTo(g.importers, def.id, u.file); }
    }
    // Resolves a JSX/styled name to a component: a bare name through the file's bindings or its own components,
    // `NS.Member` through a namespace import (which also makes this file an importer of that component).
    const defOf = (name: string, selfLocal?: string): ComponentDef | null => {
      const [base, member] = name.split('.');
      if (member) {
        const ns = nsTargets.get(base);
        if (!ns) return null;
        const r = resolveExport(modules, resolver, ns, member);
        const def = r ? lookup(r.file, r.local) : null;
        if (def) addTo(g.importers, def.id, u.file);
        return def;
      }
      return bindings.get(base) ?? (base !== selfLocal ? lookup(u.file, base) : null);
    };
    for (const c of u.components) {
      for (const el of c.rendered) {
        const [base, member] = el.name.split('.');
        const def = defOf(el.name, c.local);
        if (def) { if (def.id !== c.id) addTo(g.renders, c.id, def.id); continue; }
        const lib = libBindings.get(base);
        if (lib) addTo(g.library, c.id, `${lib.lib}:${member ?? lib.name}`);
        else if (!member && /^[a-z]/.test(base)) addTo(g.library, c.id, `dom:${base}`);
      }
      const t = c.signals.styledTarget;
      if (t) {
        const def = defOf(t);
        if (def) addTo(g.renders, c.id, def.id);
        else {
          const [base, member] = t.split('.');
          const lib = libBindings.get(base);
          addTo(g.library, c.id, lib ? `${lib.lib}:${member ?? lib.name}` : !member && /^[a-z]/.test(t) ? `dom:${t}` : `unknown:${t}`);
        }
      }
    }
    for (const ref of u.routeRefs) {
      const def = defOf(ref);
      if (def) g.routes.add(def.id);
    }
    for (const ref of u.valueRefs) {
      const def = lookup(u.file, ref);
      if (def) g.valueRefs.add(def.id);
    }
  }
  g.crossFeature.sort((a, b) => cmp(`${a.from}>${a.to}`, `${b.from}>${b.to}`));
  return g;
}
