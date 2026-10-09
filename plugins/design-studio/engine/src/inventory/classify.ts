import type { AppConfig } from '../config/config.ts';
import { libLevel } from '../adapters/react-mui/primitives.ts';
import { LEVELS, RANK, type Level } from './levels.ts';
import type { ComponentDef } from './components.ts';
import type { Graph } from './graph.ts';
import { moduleOf, sharedRootOf } from './modules.ts';

export interface Classification { level: Level; reason: string; confidence: 'high' | 'medium' | 'low'; smells: string[] }
export interface Ecosystem { layer: 'core' | 'recipe' | 'snowflake'; logic: 'presentational' | 'smart'; importerFiles: number; importerModules: string[]; promotionCandidate: boolean }

const NAME_HINTS: Array<[RegExp, Level]> = [
  [/Page$/, 'page'],
  [/(Layout|Template|Shell)$/, 'template'],
  [/(Dialog|Drawer|Panel|Table)$/, 'organism'],
  [/(Chip|Badge|Tag|Icon|Button|Field)$/, 'atom'],
];
const NOTHING = 'renders no recognised primitives';

// `weak` marks a guess (nothing recognisable to classify from); it always yields low confidence.
interface Base { level: Level; reason: string; weak: boolean }
interface Step extends Base { raised: boolean }

const maxLevel = (a: Level, b: Level): Level => (RANK[b] > RANK[a] ? b : a);
const kidLevels = (c: ComponentDef, g: Graph, levels: ReadonlyMap<string, Level>): Level[] => [...(g.renders.get(c.id) ?? [])].map((id) => levels.get(id) ?? 'atom');

function baseLevel(c: ComponentDef, g: Graph, kids: readonly Level[]): Base {
  const libs = [...(g.library.get(c.id) ?? [])].map(libLevel);
  const count = (lv: Level): number => libs.filter((x) => x === lv).length;
  const libAtoms = count('atom');
  const libMolecules = count('molecule');
  const libOrganisms = count('organism');
  const kidAtoms = kids.filter((k) => k === 'atom').length;
  const kidHigher = kids.filter((k) => RANK[k] >= RANK.molecule).length;
  const kidMeaningful = kids.filter((k) => k !== 'layout').length;
  const s = c.signals;
  if (s.styledTarget) {
    const reason = `styled wrapper of ${s.styledTarget}`;
    const target = libs.find((x): x is Level => x !== null && x !== 'icon');
    if (target) return { level: target, reason, weak: false };
    if (kids.length > 0) return { level: kids[0], reason, weak: false };
    return { level: 'atom', reason, weak: !libs.includes('icon') };
  }
  if (g.routes.has(c.id)) return { level: 'page', reason: 'referenced as a route element', weak: false };
  if (s.pageArea && s.slots >= 2) return { level: 'template', reason: 'page-level area with 2+ slots', weak: false };
  if (libAtoms + libMolecules + libOrganisms + kidMeaningful === 0 && !s.data) {
    if (libs.includes('layout') || kids.includes('layout')) return { level: 'layout', reason: 'renders only layout primitives', weak: false };
    if (libs.includes('icon')) return { level: 'atom', reason: 'renders an icon', weak: false };
    return { level: 'atom', reason: NOTHING, weak: true };
  }
  if (s.data) return { level: 'organism', reason: `binds data (${s.dataHooks.join(', ')})`, weak: false };
  if (s.region || libOrganisms > 0) return { level: 'organism', reason: 'renders a region (dialog, drawer, table, nav…)', weak: false };
  // Monotone in kid levels, which makes the fixed point below well defined: every count here only grows as a kid
  // rises (`parts` counts a kid the same whether it is an atom or higher) and each rule yields no less than the ones after it.
  const parts = libAtoms + kidAtoms + libMolecules + kidHigher;
  if (kidHigher >= 1 && kidMeaningful >= 2) return { level: 'organism', reason: 'composes 2+ in-house components including a molecule or higher', weak: false };
  if (parts >= 4) return { level: 'organism', reason: '4+ parts form a section', weak: false };
  if (parts >= 2 && s.primaryActions <= 1) return { level: 'molecule', reason: '2+ atoms combined for one job', weak: false };
  if (parts >= 2) return { level: 'organism', reason: 'more than one primary action', weak: false };
  if (libMolecules + kidHigher >= 1) return { level: 'molecule', reason: 'wraps a molecule-level component', weak: false };
  return { level: 'atom', reason: 'wraps a single primitive', weak: false };
}

// The base level, lifted to its highest child (a template or page child lifts only to organism, as does a molecule
// child under several primary actions). Monotone in the kid levels because baseLevel is.
function stepOf(c: ComponentDef, g: Graph, levels: ReadonlyMap<string, Level>): Step {
  const kids = kidLevels(c, g, levels);
  const b = baseLevel(c, g, kids);
  let { level, reason } = b;
  const top = kids.reduce<Level>(maxLevel, 'layout');
  if (level !== 'page' && level !== 'template' && RANK[top] > RANK[level]) {
    level = RANK[top] >= RANK.template ? 'organism' : top;
    reason = `${reason}; raised to ${level} by its children`;
  }
  if (level === 'molecule' && kids.includes('molecule') && c.signals.primaryActions > 1) {
    level = 'organism';
    reason = `${reason}; raised to organism by more than one primary action`;
  }
  return { level, reason, weak: b.weak, raised: level !== b.level };
}

// A molecule may be named for its main atom (FooButton), and a layout may be called a Layout.
const hintFits = (hint: Level, level: Level): boolean => hint === level || (hint === 'atom' && level === 'molecule') || (hint === 'template' && level === 'layout');

function smellsOf(c: ComponentDef, level: Level): string[] {
  const smells: string[] = [];
  if (level === 'template' && c.signals.data) smells.push('template-with-logic');
  const hint = NAME_HINTS.find(([re]) => re.test(c.name));
  if (hint && !hintFits(hint[1], level)) smells.push(`name-suggests-${hint[1]}`);
  return smells;
}

export function classifyAll(components: readonly ComponentDef[], g: Graph): Map<string, Classification> {
  // Kleene iteration from the bottom: every level only rises, so it stops after at most 5 rises per component.
  let levels = new Map<string, Level>(components.map((c): [string, Level] => [c.id, 'layout']));
  const bound = (LEVELS.length - 1) * components.length + 1;
  let converged = false;
  for (let pass = 0; pass < bound && !converged; pass++) {
    const next = new Map<string, Level>();
    converged = true;
    for (const c of components) {
      const held = next.get(c.id) ?? levels.get(c.id) ?? 'layout';
      const level = maxLevel(held, stepOf(c, g, levels).level);
      next.set(c.id, level);
      if (level !== levels.get(c.id)) converged = false;
    }
    levels = next;
  }
  if (!converged) throw new Error('classifier did not converge');

  const result = new Map<string, Classification>();
  for (const c of components) {
    const step = stepOf(c, g, levels);
    const smells = smellsOf(c, step.level);
    const confidence = step.weak ? 'low' : step.raised || smells.length > 0 ? 'medium' : 'high';
    result.set(c.id, { level: step.level, reason: step.reason, confidence, smells });
  }
  return result;
}

export function ecosystemOf(c: ComponentDef, g: Graph, cfg: AppConfig): Ecosystem {
  const importers = [...(g.importers.get(c.id) ?? [])];
  const modules = [...new Set(importers.map((f) => moduleOf(f, cfg)).filter((m): m is string => m !== null))].sort();
  const shared = sharedRootOf(c.file, cfg) !== null;
  return {
    layer: shared ? 'core' : importers.length >= 2 ? 'recipe' : 'snowflake',
    logic: c.signals.data ? 'smart' : 'presentational',
    importerFiles: importers.length,
    importerModules: modules,
    promotionCandidate: !shared && modules.length >= 2,
  };
}
