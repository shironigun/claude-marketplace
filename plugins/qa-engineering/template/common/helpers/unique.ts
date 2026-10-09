/**
 * Unique, greppable test-data names.
 *
 * `Date.now()` alone is NOT unique under parallel workers — two workers can emit the
 * same millisecond, and the collision shows up as a mysterious duplicate-name failure
 * once a month. Always append the random suffix.
 *
 * Every name a test creates is prefixed with `AUTOMATION_` so orphans left behind by a
 * crashed run are identifiable (and deletable) later. Seed resources carry the run id
 * too, so the `sweep` teardown can find exactly this run's leftovers.
 */
export const AUTOMATION_PREFIX = 'AUTOMATION';

/** Short, collision-resistant suffix: `1754922000123_k3f9a`. */
export function uniqueSuffix(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7).padEnd(5, '0')}`;
}

/** `AUTOMATION_ORDER_1754922000123_k3f9a` — use for every created resource name. */
export function uniqueName(label: string): string {
  return `${AUTOMATION_PREFIX}_${label.toUpperCase()}_${uniqueSuffix()}`;
}

/** `automation+1754922000123_k3f9a@example.test` — unique, obviously synthetic. */
export function uniqueEmail(domain = 'example.test'): string {
  return `automation+${uniqueSuffix()}@${domain}`;
}

/** One id per run, set by playwright.config.ts (CI: the build id). */
export function runId(): string {
  return process.env.AUTOMATION_RUN_ID ?? 'local';
}

/** Every seed resource of this run starts with this — the `sweep` teardown searches for it. */
export function seedPrefix(): string {
  return `${AUTOMATION_PREFIX}_SEED_${runId()}_`;
}

/** `AUTOMATION_SEED_<runId>_ORDER_1754922000123_k3f9a` — for shared, run-scoped seed resources. */
export function seedName(label: string): string {
  return `${seedPrefix()}${label.toUpperCase()}_${uniqueSuffix()}`;
}

/** ISO timestamp `days` from now — for due dates, expiries, scheduling. Relative, never literal. */
export function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
