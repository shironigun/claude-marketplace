import { VERSION } from '../version.ts';
import { sha1 } from '../util/hash.ts';
import { cmp } from '../util/compare.ts';
import { addTo, bucketOf, groupBy } from '../util/multimap.ts';
import { stableStringify } from '../util/write.ts';
import type { AppConfig } from '../config/config.ts';
import type { ThemeFacts } from '../adapters/react-mui/units.ts';
import type { Sample } from '../adapters/react-mui/collector.ts';
import type { PrimitiveUse } from '../adapters/react-mui/extract.ts';
import { LEVELS, type Level } from './levels.ts';
import type { ComponentDef, ComponentSignals } from './components.ts';
import type { Graph } from './graph.ts';
import { ecosystemOf, type Classification } from './classify.ts';
import type { Family, FamilyKind } from './families.ts';
import { isRawSample, isThemeSample, type ModuleScore } from './scorecard.ts';
import { isThemeSource, moduleOf, sharedRootOf } from './modules.ts';

export interface ComponentEntry {
  id: string; name: string; file: string; line: number; loc: number; exportNames: string[];
  module: string | null; shared: boolean;
  level: Level; levelReason: string; confidence: 'high' | 'medium' | 'low'; evidence: 'CONFIRMED' | 'INFERRED'; smells: string[];
  layer: 'core' | 'recipe' | 'snowflake'; logic: 'presentational' | 'smart';
  wraps: string[]; uses: string[]; importers: { files: number; modules: string[] }; promotionCandidate: boolean;
  families: string[]; quality: { rawValues: number; themeValues: number };
  signals: ComponentSignals;
}
export interface PrimitiveStat { count: number; props: Record<string, Record<string, number>> }
export interface Metrics {
  files: number; components: number; byLevel: Record<Level, number>; samples: number; tokenCoverage: number | null;
  distinct: { colors: number; fontSizes: number; radii: number; spacing: number; shadows: number }; families: number;
}
export interface Registry {
  schemaVersion: 1; engine: string;
  app: { product: string; appRoot: string; adapter: string };
  inputs: { files: number; hash: string };
  theme: ThemeFacts; metrics: Metrics; components: ComponentEntry[]; families: Family[]; modules: ModuleScore[];
  primitives: Record<string, PrimitiveStat>; parseErrors: Array<{ file: string; message: string }>;
}
export interface BuildInput {
  cfg: AppConfig; files: string[]; sources: ReadonlyMap<string, string>;
  /** Files read besides the sources (tsconfig/jsconfig files, a theme entry outside the sources), for inputs.hash. */
  extraInputs: ReadonlyArray<{ file: string; text: string }>;
  theme: ThemeFacts; components: ComponentDef[];
  levels: Map<string, Classification>; graph: Graph; families: Family[]; modules: ModuleScore[]; primitives: PrimitiveUse[];
  samples: Sample[];
  /** The module-level const a sample belongs to, for samples that have one (see Collector.owners). */
  sampleOwners: ReadonlyMap<Sample, string>;
  parseErrors: Array<{ file: string; message: string }>;
}

const within = (c: ComponentDef, line: number): boolean => line >= c.line && line < c.line + c.loc;
// Family kinds whose line-bearing members are named after the module-level const that holds them.
const NAMED_MEMBER_KINDS: ReadonlySet<FamilyKind> = new Set(['status-color-map', 'repeated-style-block']);

/**
 * The components each family belongs to. A member without a line is the whole file (near-duplicate-files,
 * identical-files, cross-feature-import): every component in it. A member with a line belongs to the component
 * whose range contains the line; failing that (a module-level status map or style object), to the components in
 * its file that reference it by name; failing that (a copy comment above a component, a map nothing uses), to
 * every component in the file.
 */
function familiesByComponent(families: readonly Family[], byFile: ReadonlyMap<string, readonly ComponentDef[]>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const f of families) {
    for (const m of f.members) {
      const inFile = byFile.get(m.file) ?? [];
      const line = m.line;
      const name = m.name;
      let holders = inFile;
      if (line !== null) {
        const around = inFile.filter((c) => within(c, line));
        const users = around.length === 0 && name !== null && NAMED_MEMBER_KINDS.has(f.kind) ? inFile.filter((c) => c.refs.includes(name)) : [];
        holders = around.length > 0 ? around : users.length > 0 ? users : inFile;
      }
      for (const c of holders) addTo(out, c.id, f.key);
    }
  }
  return out;
}

// One hash over everything the run read: the effective config, every source file and every other file it consulted.
// Texts were read with readText, so line endings are already normalised.
function inputsHash(i: BuildInput): string {
  const entry = (file: string, text: string): string => `${file}\n${sha1(text)}`;
  return sha1([
    entry('(config)', stableStringify(i.cfg)),
    ...i.files.map((f) => entry(f, i.sources.get(f) ?? '')),
    ...[...i.extraInputs].sort((a, b) => cmp(a.file, b.file)).map((x) => entry(x.file, x.text)),
  ].join('\n'));
}

export function buildRegistry(i: BuildInput): Registry {
  const componentsByFile = groupBy(i.components, (c) => c.file);
  const familiesOf = familiesByComponent(i.families, componentsByFile);
  // The theme source's literals are the tokens themselves: kept in samples.jsonl, never counted as debt.
  const counted = i.samples.filter((s) => !isThemeSource(s.file, i.cfg));
  const samplesByFile = groupBy(counted, (s) => s.file);
  // A sample counts for the component whose range holds it or, when no component's does (a module-level style
  // object, makeStyles hook or styled block), for each component that references the const that owns it.
  const qualityOf = (c: ComponentDef): Sample[] => {
    const inFile = componentsByFile.get(c.file) ?? [];
    return (samplesByFile.get(c.file) ?? []).filter((s) => {
      if (within(c, s.line)) return true;
      const owner = i.sampleOwners.get(s);
      return owner !== undefined && c.refs.includes(owner) && !inFile.some((o) => within(o, s.line));
    });
  };
  const components = i.components
    .map((c): ComponentEntry => {
      const fallback: Classification = { level: 'atom', reason: 'unclassified', confidence: 'low', smells: [] };
      const cl: Classification = i.levels.get(c.id) ?? fallback;
      const eco = ecosystemOf(c, i.graph, i.cfg);
      const inside = qualityOf(c);
      const families = [...(familiesOf.get(c.id) ?? [])].sort(cmp);
      return {
        id: c.id, name: c.name, file: c.file, line: c.line, loc: c.loc, exportNames: c.exportNames,
        module: moduleOf(c.file, i.cfg), shared: sharedRootOf(c.file, i.cfg) !== null,
        level: cl.level, levelReason: cl.reason, confidence: cl.confidence, evidence: cl.confidence === 'high' ? 'CONFIRMED' : 'INFERRED', smells: cl.smells,
        layer: eco.layer, logic: eco.logic,
        wraps: [...(i.graph.library.get(c.id) ?? [])].sort(), uses: [...(i.graph.renders.get(c.id) ?? [])].sort(),
        importers: { files: eco.importerFiles, modules: eco.importerModules }, promotionCandidate: eco.promotionCandidate,
        families,
        quality: { rawValues: inside.filter(isRawSample).length, themeValues: inside.filter(isThemeSample).length },
        signals: c.signals,
      };
    })
    .sort((a, b) => cmp(a.id, b.id));
  const byLevel = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
  for (const c of components) byLevel[c.level]++;
  // Counted in Maps, so a value such as `variant="constructor"` is a key like any other, never an inherited member.
  const census = new Map<string, { count: number; props: Map<string, Map<string, number>> }>();
  for (const p of i.primitives) {
    const stat = bucketOf(census, p.name, () => ({ count: 0, props: new Map<string, Map<string, number>>() }));
    stat.count++;
    for (const [k, v] of Object.entries(p.props)) { const values = bucketOf(stat.props, k, () => new Map<string, number>()); values.set(v, (values.get(v) ?? 0) + 1); }
  }
  const primitives: Record<string, PrimitiveStat> = Object.fromEntries([...census].map(([name, s]): [string, PrimitiveStat] => [
    name, { count: s.count, props: Object.fromEntries([...s.props].map(([k, values]) => [k, Object.fromEntries(values)])) },
  ]));
  const raw = counted.filter(isRawSample);
  const themed = counted.filter(isThemeSample);
  const distinct = (kind: string, val: (s: Sample) => string | number | null): number => new Set(raw.filter((s) => s.kind === kind).map(val).filter((v) => v !== null)).size;
  return {
    schemaVersion: 1,
    engine: VERSION,
    app: { product: i.cfg.product, appRoot: i.cfg.appRoot, adapter: i.cfg.adapter },
    inputs: { files: i.files.length, hash: inputsHash(i) },
    theme: i.theme,
    metrics: {
      files: i.files.length,
      components: components.length,
      byLevel,
      samples: i.samples.length,
      tokenCoverage: raw.length + themed.length > 0 ? Math.round((themed.length / (raw.length + themed.length)) * 1000) / 1000 : null,
      distinct: {
        colors: distinct('color', (s) => s.raw),
        fontSizes: distinct('fontSize', (s) => s.px),
        radii: distinct('radius', (s) => s.px),
        spacing: distinct('spacing', (s) => s.px),
        shadows: distinct('shadow', (s) => s.raw),
      },
      families: i.families.length,
    },
    components,
    families: i.families,
    modules: i.modules,
    primitives,
    parseErrors: [...i.parseErrors].sort((a, b) => cmp(a.file, b.file)),
  };
}
