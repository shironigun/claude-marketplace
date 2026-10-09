import { execFileSync } from 'node:child_process';
import type { AppConfig } from '../config/config.ts';
import type { Sample } from '../adapters/react-mui/collector.ts';
import type { Kind } from '../adapters/react-mui/units.ts';
import type { ComponentDef } from './components.ts';
import { cmp } from '../util/compare.ts';
import { groupBy } from '../util/multimap.ts';
import { isThemeSource, moduleOf, norm } from './modules.ts';

export interface ModuleScore {
  module: string;
  files: number;
  loc: number;
  components: number;
  samples: number;
  /** Raw focus-kind samples per 1000 lines, over all of the module's source files. */
  rawPerKloc: number;
  /** theme / (raw + theme) over the focus kinds; null when the module has neither. */
  tokenDiscipline: number | null;
  /** Share of the module's .tsx/.jsx files that use a translation API; null when it has none. */
  i18nCoverage: number | null;
  /** Test files / all source files in the module. The denominator is every source file (not just components) and the ratio is not capped at 1. */
  testRatio: number;
  /** Committer date (YYYY-MM-DD) of the newest commit touching the module's directories. Null when git is off or unavailable, and always null for `(other)`. */
  lastCommit: string | null;
}
export interface ScoreInput {
  files: ReadonlyArray<{ file: string; src: string }>;
  samples: readonly Sample[];
  components: readonly ComponentDef[];
  testFiles: readonly string[];
  cfg: AppConfig;
  appRootAbs: string;
  git: boolean;
}

const FOCUS = new Set<Kind>(['spacing', 'radius', 'fontSize', 'fontWeight', 'color', 'shadow']);
const RAW = new Set(['raw-color', 'px', 'rem', 'em', 'literal']);
// i18next (useTranslation, t('…'), <Trans>, withTranslation), next-intl (useTranslations), react-intl (useIntl, <FormattedMessage>).
const I18N_RE = /\buseTranslations?\b|\buseIntl\b|<FormattedMessage\b|\bi18n\.t\(|\bt\(\s*['"`]|<Trans\b|\bwithTranslation\b/;
const round = (n: number, d: number): number => Math.round(n * 10 ** d) / 10 ** d;

export function isRawSample(s: Sample): boolean {
  return FOCUS.has(s.kind) && (RAW.has(s.cls) || (s.kind === 'fontWeight' && s.cls === 'unitless'));
}

export function isThemeSample(s: Sample): boolean {
  return FOCUS.has(s.kind) && (s.cls === 'theme' || s.cls === 'theme-ref');
}

// Number of lines, not of '\n'-separated segments: a trailing newline does not start another line.
function countLines(src: string): number {
  if (src.length === 0) return 0;
  const segments = src.split('\n').length;
  return src.endsWith('\n') ? segments - 1 : segments;
}

function lastCommit(appRootAbs: string, dirs: string[]): string | null {
  if (dirs.length === 0) return null;
  try {
    const out = execFileSync('git', ['-C', appRootAbs, 'log', '-1', '--format=%cs', '--', ...dirs], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000 }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function scoreModules(inp: ScoreInput): ModuleScore[] {
  const mod = (f: string): string => moduleOf(f, inp.cfg) ?? '(other)';
  const testSet = new Set(inp.testFiles);
  const groups = new Map<string, { files: string[]; loc: number; tsx: number; i18n: number }>();
  for (const { file, src } of inp.files) {
    if (testSet.has(file)) continue; // tests are not sources, even if cfg.exclude let them through
    const key = mod(file);
    const g = groups.get(key) ?? { files: [], loc: 0, tsx: 0, i18n: 0 };
    g.files.push(file);
    g.loc += countLines(src);
    if (/\.(tsx|jsx)$/.test(file)) { g.tsx++; if (I18N_RE.test(src)) g.i18n++; }
    groups.set(key, g);
  }
  // The theme source's literals are the tokens themselves, not debt, so they are left out of every score.
  const samplesBy = groupBy(inp.samples.filter((s) => !isThemeSource(s.file, inp.cfg)), (s) => mod(s.file));
  // Directories whose history dates a module. The root comes from the module's first file, so a module name
  // that exists under two roots is dated by the first one only. `(other)` has no directory and no date.
  const dirsOf = (module: string, files: string[]): string[] => {
    if (module === '(other)') return [];
    if (module === 'shared') return inp.cfg.modules.shared;
    const root = inp.cfg.modules.roots.map(norm).find((r) => files[0]?.startsWith(`${r}/`));
    return root ? [`${root}/${module}`] : [];
  };
  return [...groups.entries()]
    .sort(([a], [b]) => cmp(a, b))
    .map(([module, g]) => {
      const ss = samplesBy.get(module) ?? [];
      const raw = ss.filter(isRawSample).length;
      const themed = ss.filter(isThemeSample).length;
      return {
        module,
        files: g.files.length,
        loc: g.loc,
        components: inp.components.filter((c) => mod(c.file) === module).length,
        samples: ss.length,
        // A group exists only if it has a file, so files.length is never 0; loc can be 0, hence the floor.
        rawPerKloc: round(raw / Math.max(g.loc / 1000, 0.001), 1),
        tokenDiscipline: raw + themed > 0 ? round(themed / (raw + themed), 3) : null,
        i18nCoverage: g.tsx > 0 ? round(g.i18n / g.tsx, 3) : null,
        testRatio: round(inp.testFiles.filter((t) => mod(t) === module).length / g.files.length, 3),
        lastCommit: inp.git ? lastCommit(inp.appRootAbs, dirsOf(module, g.files)) : null,
      };
    });
}
