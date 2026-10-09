import { join } from 'node:path';
import { readText } from '../util/read.ts';
import { walkFiles } from '../util/fs-walk.ts';
import { writeJson, writeJsonl, writeText } from '../util/write.ts';
import { cmp } from '../util/compare.ts';
import { appRelative, firstLine } from '../util/messages.ts';
import { parseSource, type N } from '../parse/parse.ts';
import type { AppConfig } from '../config/config.ts';
import { readThemeFactsChecked } from '../adapters/react-mui/theme-static.ts';
import type { ThemeFacts } from '../adapters/react-mui/units.ts';
import { extractStyles, type PrimitiveUse } from '../adapters/react-mui/extract.ts';
import { extractCssFile } from '../adapters/react-mui/extract-nonjsx.ts';
import type { Sample, StyleBlock } from '../adapters/react-mui/collector.ts';
import { readPackageJson } from '../detect/detect.ts';
import { createResolver } from './resolve.ts';
import { findUnresolved } from './unresolved.ts';
import { readModuleInfo } from './module-info.ts';
import { findComponents } from './components.ts';
import { buildGraph, findRouteRefs, type FileUnit } from './graph.ts';
import { classifyAll } from './classify.ts';
import { collectFileFacts, type FileFacts } from './file-facts.ts';
import { detectFamilies } from './families.ts';
import { scoreModules } from './scorecard.ts';
import { buildRegistry, type Registry } from './registry.ts';
import { renderReport } from './report.ts';

export interface InventoryOptions { appRootAbs: string; cfg: AppConfig; git: boolean }
export interface InventoryResult { registry: Registry; samples: Sample[]; report: string }

const CSS_FILE = /\.(css|scss|less)$/i;

function sampleKey(s: Sample): string {
  return [s.file, String(s.line).padStart(7, '0'), s.property, s.ctx, s.raw].join('\u0000');
}

interface FileAnalysis { samples: Sample[]; owners: ReadonlyMap<Sample, string>; primitives: PrimitiveUse[]; blocks: StyleBlock[]; facts: FileFacts | null; unit: FileUnit | null }

// Everything one file contributes, built apart from the shared lists so that a failure part-way leaves none of it behind.
function analyseStyleSheet(file: string, src: string, theme: ThemeFacts): FileAnalysis {
  return { samples: extractCssFile(src, file, theme), owners: new Map(), primitives: [], blocks: [], facts: null, unit: null };
}

function analyseScript(file: string, src: string, ast: N, theme: ThemeFacts): FileAnalysis {
  const info = readModuleInfo(ast, file);
  const { components, aliases, valueRefs } = findComponents(ast, src, file, info);
  const ex = extractStyles(ast, src, file, info.imports, theme);
  return { samples: ex.samples, owners: ex.owners, primitives: ex.primitives, blocks: ex.blocks, facts: collectFileFacts(ast, src, file), unit: { file, info, components, aliases, routeRefs: findRouteRefs(ast), valueRefs } };
}

export function runInventory(opts: InventoryOptions): InventoryResult {
  const { appRootAbs, cfg } = opts;
  // Nothing stored may depend on where the app lives, and fs errors quote absolute paths.
  const failure = (phase: 'read' | 'parse' | 'analyse', e: unknown): string => appRelative(`${phase}: ${firstLine(e)}`, appRootAbs);
  const parseErrors: Array<{ file: string; message: string }> = [];
  // A folder that cannot be listed is skipped by both walks; it is reported once, as `<folder>/`.
  const unlisted = new Set<string>();
  const onError = (relDir: string, e: unknown): void => {
    if (unlisted.has(relDir)) return;
    unlisted.add(relDir);
    parseErrors.push({ file: `${relDir}/`, message: failure('read', e) });
  };
  const files = walkFiles(appRootAbs, { include: cfg.sources, exclude: [...cfg.exclude, ...cfg.legacy], onError });
  const testFiles = walkFiles(appRootAbs, { include: ['**/*.{test,spec}.{ts,tsx,js,jsx}'], onError });
  const { facts: theme, problem: themeProblem } = readThemeFactsChecked(appRootAbs, cfg.themeEntry);
  // A configured theme that cannot be used, wholly or in part, leaves library defaults in its place, which skews every px value: never silent.
  if (themeProblem !== null && cfg.themeEntry !== null) parseErrors.push({ file: cfg.themeEntry, message: appRelative(themeProblem, appRootAbs) });
  // The package's dependencies tell an import of a package from an alias the resolver does not know.
  const { pkg, problem: pkgProblem } = readPackageJson(appRootAbs);
  if (pkgProblem !== null) parseErrors.push({ file: 'package.json', message: pkgProblem });
  const resolver = createResolver(appRootAbs, new Set(files));
  // What the run read besides the sources, so that inputs.hash changes whenever any of it does.
  const extraInputs = [...resolver.configInputs];
  if (cfg.themeEntry !== null && !files.includes(cfg.themeEntry)) {
    try { extraInputs.push({ file: cfg.themeEntry, text: readText(join(appRootAbs, cfg.themeEntry)) }); } catch { /* already reported as a theme problem */ }
  }
  const units: FileUnit[] = [];
  const samples: Sample[] = [];
  const sampleOwners = new Map<Sample, string>();
  const primitives: PrimitiveUse[] = [];
  const facts: FileFacts[] = [];
  const sources = new Map<string, string>();
  const blocks = new Map<string, StyleBlock[]>();
  // No single file stops the run: one that cannot be read, parsed or analysed is listed under parseErrors and reported UNVERIFIED.
  for (const file of files) {
    let src: string;
    try {
      src = readText(join(appRootAbs, file));
    } catch (e) {
      parseErrors.push({ file, message: failure('read', e) });
      continue;
    }
    sources.set(file, src);
    const isStyleSheet = CSS_FILE.test(file);
    let ast: N | null = null;
    if (!isStyleSheet) {
      try {
        ast = parseSource(src, file);
      } catch (e) {
        parseErrors.push({ file, message: failure('parse', e) });
        facts.push(collectFileFacts(null, src, file));
        continue;
      }
    }
    try {
      const a = ast ? analyseScript(file, src, ast, theme) : analyseStyleSheet(file, src, theme);
      samples.push(...a.samples);
      for (const [s, owner] of a.owners) sampleOwners.set(s, owner);
      primitives.push(...a.primitives);
      if (a.blocks.length) blocks.set(file, a.blocks);
      if (a.facts) facts.push(a.facts);
      if (a.unit) units.push(a.unit);
    } catch (e) {
      parseErrors.push({ file, message: failure('analyse', e) });
      if (!isStyleSheet) facts.push(collectFileFacts(null, src, file));
    }
  }
  const graph = buildGraph(units, resolver, cfg);
  const components = units.flatMap((u) => u.components);
  const levels = classifyAll(components, graph);
  const { families, skipped } = detectFamilies({ facts, sources, blocks, components, graph, cfg });
  const modules = scoreModules({ files: files.map((f) => ({ file: f, src: sources.get(f) ?? '' })), samples, components, testFiles, cfg, appRootAbs, git: opts.git });
  samples.sort((a, b) => cmp(sampleKey(a), sampleKey(b)));
  const registry = buildRegistry({ cfg, files, sources, extraInputs, theme, components, levels, graph, families, modules, primitives, samples, sampleOwners, parseErrors });
  const unresolved = findUnresolved(units, resolver, pkg);
  return { registry, samples, report: renderReport(registry, { sources: cfg.sources, exclude: cfg.exclude, legacy: cfg.legacy, themeEntry: cfg.themeEntry, themeProblem, unresolved, skipped }) };
}

export function writeInventory(result: InventoryResult, outDir: string): void {
  writeJson(join(outDir, 'registry.json'), result.registry);
  writeJsonl(join(outDir, 'samples.jsonl'), result.samples);
  writeText(join(outDir, 'report.md'), result.report);
}
