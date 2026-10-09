/**
 * Base fixture — the plumbing written once; every other fixture extends this.
 *
 *   worker:  profile   the active environment/tenant config (config/profiles.index.ts),
 *                      resolved from the login response so identity ids (testTenantId,
 *                      userId) come from WHO logged in, not only from what was typed
 *            apis      one ApiClient per configured host (apis.api, apis.orders, …)
 *            api       = apis[the primary host] — the client most specs use
 *   test:    cleanup   undo steps that run after the test, even when it fails
 *            (auto)    Allure labels, derived from the file path + title
 *
 * Worker-scoped values (profile, token, clients) are created once per worker and shared
 * across the tests that worker runs — minting a token and opening a request context are
 * the two slowest things in an API suite, and both are safe to share.
 *
 * A MODULE extends this with its own worker-scoped seed and sweeper
 * (see modules/README.md). Specs import the thin `api.fixture` / `ui.fixture` wrappers,
 * or the module's own `fixtures.ts`, never `@playwright/test` directly.
 */
import { type APIRequestContext, request as pwRequest, test as pwTest } from '@playwright/test';
import { ApiClient } from '../api/client';
import { getProfile } from '../../config/profiles.index';
import { SERVICES, serviceKeys, primaryServiceKey, type ServiceKey } from '../../config/services';
import { mintToken, resolveProfile } from '../auth/token';
import { CleanupRegistry } from '../helpers/cleanup';
import { labelTest } from './allure.fixture';
import type { Profile } from '../profiles/profile.types';

type WorkerFixtures = {
  profile: Profile;
  accessToken: string;
  serviceContexts: Record<ServiceKey, APIRequestContext | null>;
  apis: Record<ServiceKey, ApiClient>;
  api: ApiClient;
};
type TestFixtures = {
  cleanup: CleanupRegistry;
  _labels: void;
};

/** Playwright resolves relative paths against the base URL — it needs the trailing slash. */
function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export const test = pwTest.extend<TestFixtures, WorkerFixtures>({
  profile: [
    async ({}, use) => {
      // resolveProfile logs in once (cached) and enriches identity from the response.
      await use(await resolveProfile(getProfile()));
    },
    { scope: 'worker' },
  ],

  accessToken: [
    async ({ profile }, use) => {
      await use(await mintToken(profile));
    },
    { scope: 'worker' },
  ],

  serviceContexts: [
    async ({ profile }, use) => {
      const contexts = {} as Record<ServiceKey, APIRequestContext | null>;
      for (const key of serviceKeys()) {
        const baseUrl = profile.services[key];
        contexts[key] = baseUrl
          ? await pwRequest.newContext({ baseURL: withTrailingSlash(baseUrl) })
          : null;
      }
      await use(contexts);
      for (const key of serviceKeys()) await contexts[key]?.dispose();
    },
    { scope: 'worker' },
  ],

  apis: [
    async ({ serviceContexts, profile, accessToken }, use) => {
      const clients = {} as Record<ServiceKey, ApiClient>;
      for (const key of serviceKeys()) {
        const ctx = serviceContexts[key];
        if (ctx) {
          clients[key] = new ApiClient(ctx, profile, accessToken);
        } else {
          // Unconfigured host: fail on first use with the fix, not with `undefined.get`.
          const envKey = (SERVICES[key] as { envKey: string }).envKey;
          Object.defineProperty(clients, key, {
            enumerable: true,
            get() {
              throw new Error(
                `Service '${String(key)}' has no base URL for profile '${profile.name}'. ` +
                  `Set ${envKey} in .env (see .env.example).`,
              );
            },
          });
        }
      }
      await use(clients);
    },
    { scope: 'worker' },
  ],

  api: [
    async ({ apis }, use) => {
      await use(apis[primaryServiceKey()]);
    },
    { scope: 'worker' },
  ],

  cleanup: async ({}, use, testInfo) => {
    const registry = new CleanupRegistry();
    await use(registry);
    for (const failure of await registry.runAll()) {
      testInfo.annotations.push({ type: 'cleanup-failed', description: `${failure.label}: ${failure.message}` });
    }
  },

  _labels: [
    async ({}, use, testInfo) => {
      await labelTest(testInfo.titlePath, testInfo.title);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from './matchers';
export { ApiClient } from '../api/client';
export type { RequestOpts, TimedResponse } from '../api/client';
export type { Profile, ServiceKey };
