# Fixtures

> `test.extend` hands a test ready services/clients (test-scoped) and shared seeds (worker-scoped); `mergeTests` composes per-module fixtures. Prefer fixtures over before/after hooks.

## Purpose
Fixtures are how the building blocks reach a test. A test names what it needs in its argument list
(`{ api, profile, cleanup }`) and the runner provisions exactly those, sets them up before the body, and
tears them down after — on demand, composable, and type-safe. Worker-scoped fixtures build expensive,
shareable things (a token, a request context, read-only seed data) once per worker; test-scoped fixtures
build per-test things (a cleanup registry). `mergeTests` lets one module's fixtures inject another
module's service, which is the backbone of cross-module reuse.

## When to use it (and when NOT)
- **Use a fixture** to provide anything a test needs ready-made: a client, a service, a profile, a
  cleanup registry, a seed.
- **Worker-scope** (`{ scope: 'worker' }`) the slow, shareable, read-only things (token, context, seed);
  **test-scope** the per-test things (cleanup, a mutable resource).
- **Use `mergeTests`** to compose per-module fixtures so one module can use another's service/page object.
- **Prefer fixtures over `beforeEach`/`afterEach`** — especially when a teardown undoes a setup (turn the
  pair into one fixture). The tension is live: Best Practices still shows `beforeEach` as acceptable.
- **Do NOT** put mutable, shared state in a worker fixture — a seed must be read-only; mutating tests make
  their own data.

## Official guidance
- "Fixtures have a number of advantages over before/after hooks": they encapsulate setup *and* teardown
  together, are reusable across files, set up on demand, compose, stay flexible per test, and remove the
  describe-just-to-set-up wrapper — https://playwright.dev/docs/test-fixtures
- Worker-scoped fixtures (`{ scope: 'worker' }`), automatic fixtures (`{ auto: true }`), and `mergeTests`
  for composition are all official — https://playwright.dev/docs/test-fixtures
- Tension to keep visible: Best Practices shows `beforeEach` (e.g. for login) as an acceptable way to
  avoid repetition, so hooks are not "wrong" — the fixtures page simply lists six reasons to prefer
  fixtures — https://playwright.dev/docs/best-practices

## Code shape (product-neutral)
```ts
import { test as base } from '@playwright/test';

// test-scoped: a fresh cleanup registry per test; worker-scoped: a shared read-only seed.
export const test = base.extend<{ cleanup: CleanupRegistry }, { seed: WidgetSeed }>({
  cleanup: async ({}, use, testInfo) => {
    const registry = new CleanupRegistry();
    await use(registry);                       // test body runs here
    await registry.runAll();                   // teardown AFTER use() — same place as setup
  },
  seed: [
    async ({ api }, use) => {
      const created = await api.post('widgets', { data: { name: seedName('WIDGET') } });
      await use({ widgetId: created.ok() ? (await created.json()).id : null });
      // worker-end teardown of the shared seed
    },
    { scope: 'worker' },
  ],
});
export { expect } from './matchers';
```
```ts
// mergeTests composes per-module fixtures so a deal test can use the widget service.
import { mergeTests } from '@playwright/test';
export const test = mergeTests(widgetsTest, ordersTest);
```

## Anti-patterns
- A `beforeEach` that creates something and an `afterEach` that tears it down — the docs' canonical case
  for converting a hook pair into one fixture.
- Mutable shared state in a worker fixture — it breaks isolation the moment tests run in parallel.
- Setting up a fixture a test never names — fixtures are on-demand; provision only what is used.
- Duplicating the same helper setup across files instead of defining one reusable fixture.

## Related standards
- `worker-seeds.md` — the worker-scoped read-only seed pattern in full.
- `services.md` · `api-client.md` — the ready objects fixtures provide.
- `cleanup-and-sweepers.md` — the test-scoped cleanup registry a fixture wires in.
- `cross-module-reuse.md` — `mergeTests` as the mechanism for injecting another module's service.
- `defaults-and-deviation.md` — the fixtures-vs-hooks default and its documented tension.
