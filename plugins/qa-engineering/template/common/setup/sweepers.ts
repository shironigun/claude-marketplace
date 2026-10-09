/**
 * Run-level sweepers. Each module registers one (exported from modules/<m>/fixtures.ts)
 * that finds this run's seed resources by name prefix and removes them. Must be
 * idempotent: worker/test teardown normally removed them already, so "nothing found" is
 * the usual result — the sweep is the safety net for a crash, kill or timeout.
 *
 *   // modules/orders/fixtures.ts
 *   export const sweepOrders: Sweeper = async ({ apis, profile, prefix }) => {
 *     const removed: string[] = [];
 *     // find resources whose name starts with `prefix` and delete them…
 *     return removed;
 *   };
 *
 *   // then register it here:
 *   import { sweepOrders } from '../../modules/orders/fixtures';
 *   export const SWEEPERS: Sweeper[] = [sweepOrders];
 */
import type { ApiClient } from '../api/client';
import type { ServiceKey } from '../../config/services';
import type { Profile } from '../profiles/profile.types';

export type Sweeper = (ctx: {
  apis: Record<ServiceKey, ApiClient>;
  profile: Profile;
  /** `AUTOMATION_SEED_<runId>_` — seed resources created by this run start with it. */
  prefix: string;
}) => Promise<string[]>;

/** One entry per module, added as each module gets its fixtures file. Empty until then. */
export const SWEEPERS: Sweeper[] = [];
