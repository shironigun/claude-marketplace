/**
 * Allure labelling — makes the report filterable by profile, level and module
 * without a single line of per-spec ceremony.
 *
 * Every label is derived from the file path and the test title, so a spec placed in
 * the right folder with the right tags is categorised automatically. Called by the
 * base fixture's automatic `_labels` fixture — specs never call it directly.
 *
 * Reporting must never break a test: if the Allure runtime is absent or a version
 * mismatch changes its exports, every call here degrades to a no-op.
 */

// Optional dependency — resolved defensively so removing Allure needs no code change.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let allure: any;
try {
  allure = require('allure-js-commons').allure;
} catch {
  /* Allure not installed — labels are skipped. */
}

/** Attach labels for one test. */
export async function labelTest(titlePath: readonly string[], title: string): Promise<void> {
  if (!allure) return;

  try {
    const filePath = (titlePath[0] ?? '').replace(/\\/g, '/');

    // ── Profile ────────────────────────────────────────────────────────────
    const profile = process.env.AUTOMATION_PROFILE ?? 'default';
    await allure.epic(`Profile: ${profile}`);
    await allure.label('profile', profile);

    // ── Level (from the folder — the folder IS the level) ──────────────────
    const level =
      filePath.includes('/contracts/') ? 'contracts'
      : filePath.includes('/endpoints/') ? 'endpoints'
      : filePath.includes('/workflows/') ? 'workflows'
      : filePath.includes('/smoke/') ? 'ui-smoke'
      : filePath.includes('/regression/') ? 'ui-regression'
      : filePath.includes('/e2e/') ? 'ui-e2e'
      : 'other';
    await allure.layer(level);
    await allure.label('level', level);

    // ── Module (from modules/<module>/…) ───────────────────────────────────
    const module = /modules\/([^/]+)\//.exec(filePath)?.[1] ?? 'shared';
    await allure.feature(module);
    await allure.label('module', module);

    // ── Inline @tags from the test title ───────────────────────────────────
    for (const tag of title.match(/@[\w-]+/g) ?? []) await allure.tag(tag.slice(1));

    // ── CI provenance ──────────────────────────────────────────────────────
    const buildId = process.env.BUILD_BUILDID ?? process.env.GITHUB_RUN_ID;
    if (buildId) await allure.label('build_id', buildId);
  } catch {
    /* Never fail a test for a reporting detail. */
  }
}
