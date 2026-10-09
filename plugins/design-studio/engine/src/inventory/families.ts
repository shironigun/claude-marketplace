import type { AppConfig } from '../config/config.ts';
import type { StyleBlock } from '../adapters/react-mui/collector.ts';
import type { ComponentDef } from './components.ts';
import type { Graph } from './graph.ts';
import { cmp } from '../util/compare.ts';
import { groupBy } from '../util/multimap.ts';
import { isThemeSource, moduleOf, sharedRootOf } from './modules.ts';
import { normalizeSource, type FileFacts } from './file-facts.ts';

export const FAMILY_KINDS = ['same-name', 'identical-files', 'near-duplicate-files', 'repeated-style-block', 'status-color-map', 'cross-feature-import', 'dead-shared', 'copy-comment'] as const;
export type FamilyKind = (typeof FAMILY_KINDS)[number];
export interface FamilyMember { file: string; line: number | null; name: string | null }
export interface Family { key: string; kind: FamilyKind; size: number; members: FamilyMember[]; note: string }
export interface FamilyInput {
  facts: FileFacts[];
  sources: ReadonlyMap<string, string>;
  blocks: ReadonlyMap<string, StyleBlock[]>;
  components: readonly ComponentDef[];
  graph: Graph;
  cfg: AppConfig;
}
/** A check that was not run on a group of files, said in the report rather than skipped silently. */
export interface SkippedCheck { check: 'near-duplicate-files'; name: string; count: number }
export interface FamilyResult { families: Family[]; skipped: SkippedCheck[] }

const MIN_DUP_LENGTH = 200;
// Pairwise comparison is quadratic, so a larger group of same-name files is not compared (and is reported as skipped).
const MAX_NEAR_GROUP = 25;

// The name files are grouped by for the near-duplicate check: the file name, or `<folder>/index.*` for an index file,
// so folder-per-component layouts (`Foo/index.tsx`) are compared with their own kind only.
function compareName(file: string): string {
  const parts = file.split('/');
  const base = parts[parts.length - 1];
  return /^index\./.test(base) && parts.length > 1 ? `${parts[parts.length - 2]}/${base}` : base;
}

export function shingles(src: string, size = 5): Set<string> {
  const toks = normalizeSource(src).match(/\w+|[^\s\w]/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + size <= toks.length; i++) out.add(toks.slice(i, i + size).join(' '));
  return out;
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function detectFamilies(inp: FamilyInput): FamilyResult {
  const fams: Family[] = [];
  const skipped: SkippedCheck[] = [];
  const push = (key: string, kind: FamilyKind, members: FamilyMember[], note: string): void => {
    const seen = new Set<string>();
    const list: FamilyMember[] = [];
    for (const m of members) {
      const k = `${m.file}|${m.line}|${m.name}`;
      if (!seen.has(k)) { seen.add(k); list.push(m); }
    }
    list.sort((a, b) => cmp(a.file, b.file) || (a.line ?? 0) - (b.line ?? 0) || cmp(a.name ?? '', b.name ?? ''));
    if (list.length) fams.push({ key, kind, size: list.length, members: list, note });
  };

  // The same component name exported from two or more modules (a file outside every module counts as its own).
  // File-private helpers are not part of a module's interface, so they never count.
  const exported = inp.components.filter((c) => c.exportNames.length > 0);
  for (const [name, defs] of groupBy(exported, (c) => c.name)) {
    const modules = new Set(defs.map((d) => moduleOf(d.file, inp.cfg) ?? d.file));
    if (modules.size >= 2) push(`same-name:${name}`, 'same-name', defs.map((d) => ({ file: d.file, line: d.line, name })), `${name} is exported from ${modules.size} modules`);
  }

  const big = inp.facts.filter((f) => f.normLength >= MIN_DUP_LENGTH);
  for (const [hash, fs] of groupBy(big, (f) => f.normHash)) {
    if (fs.length >= 2) push(`identical-files:${hash.slice(0, 12)}`, 'identical-files', fs.map((f) => ({ file: f.file, line: null, name: null })), `${fs.length} files are identical apart from whitespace and comments`);
  }

  const shingleCache = new Map<string, Set<string>>();
  const sh = (f: string): Set<string> => { let s = shingleCache.get(f); if (!s) { s = shingles(inp.sources.get(f) ?? ''); shingleCache.set(f, s); } return s; };
  for (const [name, fs] of groupBy(big, (f) => compareName(f.file))) {
    if (fs.length > MAX_NEAR_GROUP) skipped.push({ check: 'near-duplicate-files', name, count: fs.length });
    if (fs.length < 2 || fs.length > MAX_NEAR_GROUP) continue;
    for (let i = 0; i < fs.length; i++) {
      for (let j = i + 1; j < fs.length; j++) {
        // The pair is ordered by file so the key does not depend on the order the facts arrived in.
        const [a, b] = cmp(fs[i].file, fs[j].file) <= 0 ? [fs[i], fs[j]] : [fs[j], fs[i]];
        if (a.normHash === b.normHash) continue;
        const sa = sh(a.file);
        const sb = sh(b.file);
        if (sa.size === 0 || sb.size === 0) continue;
        const sim = jaccard(sa, sb);
        if (sim >= 0.85) push(`near-duplicate-files:${a.file}|${b.file}`, 'near-duplicate-files', [{ file: a.file, line: null, name: null }, { file: b.file, line: null, name: null }], `${Math.round(sim * 100)}% similar`);
      }
    }
  }

  // A member is named after the module-level const that holds the block, when one does.
  const blockUses = [...inp.blocks].flatMap(([file, bs]) => bs.map((b) => ({ hash: b.hash, file, line: b.line, name: b.owner })));
  for (const [hash, uses] of groupBy(blockUses, (u) => u.hash)) {
    const files = new Set(uses.map((u) => u.file)).size;
    if (files >= 3) push(`repeated-style-block:${hash}`, 'repeated-style-block', uses.map((u) => ({ file: u.file, line: u.line, name: u.name })), `The same style block appears in ${files} files`);
  }

  const maps = inp.facts
    .filter((f) => !isThemeSource(f.file, inp.cfg))
    .flatMap((f) => f.statusMaps.map((m) => ({ file: f.file, line: m.line, name: m.name })));
  if (maps.length >= 2) push('status-color-map:all', 'status-color-map', maps, `${maps.length} separate status-to-colour maps`);

  for (const [k, xs] of groupBy(inp.graph.crossFeature, (x) => `${x.fromModule}->${x.toModule}`)) {
    const { fromModule: from, toModule: to } = xs[0];
    push(`cross-feature-import:${k}`, 'cross-feature-import', xs.map((x) => ({ file: x.from, line: null, name: x.to })), `${xs.length} import(s) from ${from} reach into ${to}`);
  }

  // A shared component is used when something imports it, renders it, routes to it, or its own file uses it as a value.
  const consumedIds = new Set([...inp.graph.renders.values()].flatMap((s) => [...s]));
  for (const id of [...inp.graph.routes, ...inp.graph.valueRefs]) consumedIds.add(id);
  const dead = inp.components.filter((c) => sharedRootOf(c.file, inp.cfg) !== null && !(inp.graph.importers.get(c.id)?.size) && !consumedIds.has(c.id));
  if (dead.length) push('dead-shared:all', 'dead-shared', dead.map((c) => ({ file: c.file, line: c.line, name: c.name })), `${dead.length} shared component(s) have no consumers`);

  const copies = inp.facts.flatMap((f) => f.copyComments.map((c) => ({ file: f.file, line: c.line, name: c.text })));
  if (copies.length) push('copy-comment:all', 'copy-comment', copies, `${copies.length} comment(s) say the code was copied`);

  return { families: fams.sort((a, b) => cmp(a.key, b.key)), skipped: skipped.sort((a, b) => cmp(a.name, b.name)) };
}
