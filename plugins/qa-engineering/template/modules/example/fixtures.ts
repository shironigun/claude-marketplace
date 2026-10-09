/**
 * Example module fixture — the one-file pattern every module follows.
 *
 * Copy this to `modules/<your-module>/fixtures.ts` and replace the body. It shows the two
 * things a module adds on top of the base fixture:
 *   1. a worker-scoped `seed` — cheap, READ-ONLY data reused across the suite
 *   2. a `sweep*` function — removes this run's leftover seed data if a worker crashed
 *
 * Specs in this module then `import { test, expect } from '../../fixtures'` (adjust the
 * depth) instead of the shared `api.fixture`, so they get the seed too.
 */
import { test as base } from '../../common/fixtures/base';
import { json } from '../../common/helpers/http';
import { seedName } from '../../common/helpers/unique';
import type { Sweeper } from '../../common/setup/sweepers';

/** Ids created once per run, for READ-ONLY tests. Null when seeding was skipped/failed. */
export interface ExampleSeed {
  exampleId: number | null;
}

/**
 * Extends the base fixture with a worker-scoped `seed`. A test that MUTATES data still
 * creates its own; this exists only so read-only specs do not each create-and-delete.
 */
export const test = base.extend<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  { seed: ExampleSeed }
>({
  seed: [
    async ({ api }, use) => {
      let exampleId: number | null = null;
      try {
        // Create a shared, read-only resource — named with seedName() so `sweep` can find it.
        const { res } = await api.post('examples', { data: { name: seedName('EXAMPLE') } });
        if (res.ok()) exampleId = (await json<{ id: number }>(res)).id;
      } catch {
        // Best-effort: leave the id null so dependent tests skip rather than fail en masse.
      }
      await use({ exampleId });
      // Worker teardown: remove what this fixture created (idempotent — `sweep` is the net).
      if (exampleId !== null) {
        await api.delete(`examples/${exampleId}`).catch(() => {});
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '../../common/fixtures/base';

/**
 * Run-level sweeper — register in `common/setup/sweepers.ts`. Finds resources whose name
 * starts with `prefix` (= `AUTOMATION_SEED_<runId>_`) and removes them.
 */
export const sweepExample: Sweeper = async ({ apis, prefix }) => {
  const removed: string[] = [];
  try {
    const { res } = await apis.api.get('examples', { params: { nameStartsWith: prefix } });
    if (!res.ok()) return removed;
    const items = await json<Array<{ id: number; name?: string }>>(res);
    for (const item of items) {
      await apis.api.delete(`examples/${item.id}`).catch(() => {});
      removed.push(`example ${item.id}`);
    }
  } catch {
    /* best-effort — the sweep never fails the run */
  }
  return removed;
};
