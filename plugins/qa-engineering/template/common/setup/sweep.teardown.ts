/**
 * Run-level safety net (playwright.dev/docs/test-global-setup-teardown). Worker/test
 * fixtures tear their seeds down, but a crash, kill or timeout can skip that. This finds
 * anything named `AUTOMATION_SEED_<runId>_*` and removes it. It never fails the run:
 * problems become `sweep-failed` annotations and console warnings.
 *
 * Wired as the `teardown` of the `auth-check` project in playwright.config.ts, so it runs
 * after everything that depended on auth-check has finished.
 */
import { test as teardown } from '../fixtures/base';
import { SWEEPERS } from './sweepers';
import { seedPrefix } from '../helpers/unique';

teardown('sweep leftover seed resources from this run', async ({ apis, profile }) => {
  const prefix = seedPrefix();
  for (const sweep of SWEEPERS) {
    try {
      for (const line of await sweep({ apis, profile, prefix })) console.log(`[sweep] ${line}`);
    } catch (err) {
      teardown.info().annotations.push({ type: 'sweep-failed', description: (err as Error).message });
      console.warn(`[sweep] ${(err as Error).message}`);
    }
  }
});
