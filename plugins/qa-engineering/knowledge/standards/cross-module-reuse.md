# Cross-module reuse

> When a flow depends on another module, reuse that module's service/POM/builder through merged fixtures — never duplicate. A business dependency is not a test dependency.

## Purpose
This is the flagship rule that ties the framework together. When testing one module requires a resource
owned by another module, the test reuses the owning module's reusable method to create that resource —
never a second, slightly-wrong creation path. The test under test still owns its setup end to end (it
creates the prerequisite, uses it, and cleans it up), so a business dependency between modules never
becomes an ordering dependency between tests. Framework functionality is always reused, not duplicated.

## When to use it (and when NOT)
- **Use it** whenever a test needs a resource another module creates — build that prerequisite by calling
  the owning module's service (API) or page object (UI), get its id, then proceed.
- **Compose fixtures with `mergeTests`** so one module's test can inject another module's service/POM.
- **Register each prerequisite's cleanup** so teardown runs in reverse across modules.
- **Do NOT** re-implement the other module's creation in a local helper — that second path drifts from the
  real one and tests the wrong thing.
- **Do NOT** turn a business dependency into a test dependency: the dependent test must still create its
  own prerequisite, not rely on another test having created one.

## Official guidance
- Fixtures are reusable across files and compose with `mergeTests`, which is the mechanism for one
  module's test to use another's service/POM — https://playwright.dev/docs/test-fixtures
- Keep each test isolated and independent — a dependent flow still creates and tears down its own data —
  https://playwright.dev/docs/best-practices · https://playwright.dev/docs/test-parallel
- (Kit convention) "reuse the owning module's method, never duplicate it" is the kit's own DRY rule,
  resting on the official fixture-composition and isolation guidance above.

## Code shape (product-neutral)
```ts
// Generic illustration ONLY — "Customer" and "Deal" are placeholder modules standing in for
// any pair where one resource depends on another. A Deal needs a Customer to exist first.

import { mergeTests } from '@playwright/test';
import { test as customerTest } from '../../customer/fixtures';
import { test as dealTest } from '../fixtures';
export const test = mergeTests(customerTest, dealTest);   // inject the Customer service into Deal tests
```
```ts
// API: the Deal test creates its OWN Customer by calling the Customer module's reusable method,
// gets the id, creates the Deal against it, asserts, and cleans up in reverse.
test('Deal - Create - Verify that a deal can be created for a customer.', async ({ api, profile, cleanup }) => {
  const customers = new CustomerService(api, profile.testTenantId);
  const deals     = new DealService(api, profile.testTenantId);

  const customer = await customers.createCustomer();     // REUSE — not a second creation path
  cleanup.add('customer', customer.cleanup);

  const deal = await deals.create({ customerId: customer.customerId });
  cleanup.add('deal', deal.cleanup);                     // teardown runs reverse: deal, then customer

  expect(deal.dealId).toBeGreaterThan(0);
});
```
```ts
// UI: same principle — the Deal journey creates its Customer through the Customer page object's
// reusable method (or, better, over the Customer API service for speed), then drives the Deal UI.
const customerId = await customerPage.createCustomer();  // reuse the owning screen's method
await dealPage.createForCustomer(customerId);
```

## Anti-patterns
- Re-implementing Customer creation inside the Deal test (a local `makeCustomer()` that posts its own
  payload) — it drifts from the real Customer service and silently tests a different thing.
- Relying on a Customer that "some earlier test" created — that is a test ordering dependency; create your
  own.
- Copying the other module's route constants, builder, or page-object methods instead of importing them.
- Building a cross-module UI precondition by clicking through the other module's screens when its API
  service could create it in under a second.

## Related standards
- `fixtures.md` — `mergeTests` composition that injects the other module's service/POM.
- `services.md` · `builders.md` — the reusable creation methods a dependent test calls.
- `page-objects.md` — the owning screen's reusable method for the UI path.
- `cleanup-and-sweepers.md` — reverse-order teardown across the modules involved.
- `isolation-and-parallelism.md` — why a business dependency must not become a test dependency.
