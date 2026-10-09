/**
 * API fixture — the entry point every API spec imports.
 *
 *   import { test, expect } from '<...>/common/fixtures/api.fixture';
 *
 *   test('...', async ({ api, profile }) => {        // the primary service
 *     const { res, ms } = await api.get('orders/1');
 *   });
 *
 *   test('...', async ({ apis }) => {                 // any registered service
 *     const { res } = await apis.orders.get('orders/1');
 *   });
 *
 * It is a thin re-export of the base fixture (common/fixtures/base.ts), so that the
 * import path a spec uses is stable even as the plumbing underneath evolves. A module
 * that needs its own seed or page objects extends `base` in its own `fixtures.ts`.
 */
export { test, expect, ApiClient } from './base';
export type { RequestOpts, TimedResponse, Profile, ServiceKey } from './base';
