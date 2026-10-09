/**
 * `npm run report:summarize` — Playwright's results.json → reports/summary.json.
 *
 * One small, stable shape that the notifier (and any dashboard you bolt on later)
 * consumes, so nobody has to parse Playwright's reporter format twice.
 */
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';

export interface LevelStats {
  total: number;
  passed: number;
  failed: number;
}

export interface RunSummary {
  profile: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
  failures: Array<{ title: string; error: string }>;
  /** Per-project breakdown (contracts / endpoints / workflows / ui-*). */
  levels: Record<string, LevelStats>;
}

interface PwSpec {
  title: string;
  ok: boolean;
  tests?: Array<{ results?: Array<{ error?: { message?: string } }> }>;
}
interface PwSuite {
  title?: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}
interface PwJson {
  stats?: { expected?: number; unexpected?: number; skipped?: number; flaky?: number; duration?: number };
  suites?: PwSuite[];
}

const reportsDir = path.resolve(__dirname, '..', 'reports');

function countSpecs(suites: PwSuite[]): LevelStats {
  let total = 0;
  let failed = 0;
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      total++;
      if (!spec.ok) failed++;
    }
    const child = countSpecs(suite.suites ?? []);
    total += child.total;
    failed += child.failed;
  }
  return { total, failed, passed: total - failed };
}

function collectFailures(suites: PwSuite[] = [], trail: string[] = []): RunSummary['failures'] {
  const out: RunSummary['failures'] = [];
  for (const suite of suites) {
    const here = suite.title ? [...trail, suite.title] : trail;
    for (const spec of suite.specs ?? []) {
      if (spec.ok === false) {
        const message =
          spec.tests?.[0]?.results?.find((r) => r.error?.message)?.error?.message ?? 'failed';
        out.push({
          title: [...here, spec.title].join(' › '),
          error: message.split('\n')[0].slice(0, 300),
        });
      }
    }
    out.push(...collectFailures(suite.suites ?? [], here));
  }
  return out;
}

function main(): void {
  const resultsPath = path.join(reportsDir, 'results.json');
  const outPath = path.join(reportsDir, 'summary.json');
  fs.mkdirSync(reportsDir, { recursive: true });

  if (!fs.existsSync(resultsPath)) {
    console.warn('reports/results.json not found — run `npm test` first. Writing an empty summary.');
    const empty: RunSummary = {
      profile: env.profile,
      total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0,
      durationMs: 0, failures: [], levels: {},
    };
    fs.writeFileSync(outPath, `${JSON.stringify(empty, null, 2)}\n`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8')) as PwJson;
  const stats = data.stats ?? {};

  // Top-level suites in Playwright's JSON correspond to projects.
  const levels: Record<string, LevelStats> = {};
  for (const projectSuite of data.suites ?? []) {
    if (projectSuite.title) levels[projectSuite.title] = countSpecs(projectSuite.suites ?? []);
  }

  const summary: RunSummary = {
    profile: env.profile,
    passed: stats.expected ?? 0,
    failed: stats.unexpected ?? 0,
    skipped: stats.skipped ?? 0,
    flaky: stats.flaky ?? 0,
    durationMs: Math.round(stats.duration ?? 0),
    total:
      (stats.expected ?? 0) + (stats.unexpected ?? 0) + (stats.skipped ?? 0) + (stats.flaky ?? 0),
    failures: collectFailures(data.suites),
    levels,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(
    `Summary: ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ` +
      `${summary.skipped} skipped, ${summary.flaky} flaky → reports/summary.json`,
  );
}

main();
