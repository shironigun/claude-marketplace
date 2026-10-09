# Helpers

> Small test-body utilities: `knownBug` (flag a defect, still assert the correct behaviour), `onlyFor`/`skipFor` (real product preconditions), and `authGuardTests` (401-without-token).

## Purpose
Helpers are the few narrow utilities a test body reaches for. `knownBug(id, summary)` flags a known
defect while the test still asserts the *correct* behaviour, so it stays green while the bug is open and
turns red the day it is fixed — a visible marker, not a hidden skip. `onlyFor`/`skipFor` express real
product-variant preconditions. `authGuardTests` registers one "401 without a token" test per route. Each
exists to keep a legitimate situation honest without silencing the suite.

## When to use it (and when NOT)
- **`knownBug`** when a defect is known but you still want the correct-behaviour assertion in the suite.
  Place it on the line **immediately before** the assertion it explains — never as the first line of the
  test.
- **`onlyFor`/`skipFor`** for genuine product-variant preconditions (a feature that exists for one
  variant and not another), documented in the reason string.
- **`authGuardTests`** to prove every data route rejects an unauthenticated call.
- **A narrow signature-specific env skip** (e.g. a cross-tenant id not set) for a real environment gap.
- **Do NOT** use a skip to hide a failed setup call, a stopped host, or an assertion you could not get to
  pass — those must stay red.

## Official guidance
- Keep tests isolated and reproducible — a guard that hides a real failure breaks the "prevents cascading
  test failures" benefit the suite depends on — https://playwright.dev/docs/best-practices
- Assert the unauthenticated path by sending no credentials — the auth-guard tests exercise the 401 case
  the auth docs describe for unauthenticated contexts — https://playwright.dev/docs/auth
- (Kit convention) `knownBug`, `onlyFor`/`skipFor`, and `authGuardTests` are the kit's own helpers, built
  on Playwright's test runner (`test.fail`, `test.skip`); the placement rule is the kit's discipline.

## Code shape (product-neutral)
```ts
import { test as pwTest } from '@playwright/test';

/** Flag a known defect; the test still asserts the CORRECT behaviour and flips red when fixed. */
export function knownBug(id: string, summary: string): void {
  pwTest.info().annotations.push({ type: 'known-bug', description: `${id}: ${summary}` });
  pwTest.fail(true, `${id}: ${summary}`);   // turns LATER failures into expected ones — place it late
}

/** Real product-variant precondition — keys off the profile's variant, documented in `reason`. */
export function onlyFor(profile: Profile, variants: number[], reason: string): void {
  pwTest.skip(profile.variant === undefined || !variants.includes(profile.variant), reason);
}

/** One "401 without a token" test per route, tagged @security. */
export function authGuardTests(host: ServiceKey, routes: GuardedRoute[], tags: string[]): void {
  for (const r of routes) {
    pwTest(r.title, { tag: ['@security', ...tags] }, async ({ apis }) => {
      const { res } = await apis[host][r.method](r.route, { omitAuth: true });
      await expect(res).toHaveStatus(401);
    });
  }
}
```
```ts
// PLACEMENT: knownBug on the line immediately before the assertion it explains.
const { res } = await api.post(WidgetRoutes.Create, { data: buildWidget(tenantId, { quantity: -1 }) });
knownBug('BUG-API-07', 'POST widgets returns 500 instead of 400 for a negative quantity');
await expect(res).toHaveStatus(400);        // the CORRECT behaviour — this flips red when fixed
```

## Anti-patterns
- `knownBug` as the first line of a test — `test.fail` then turns *every* later failure (a stopped host,
  an auth error, a failed setup) into an "expected" pass, hiding real breakage.
- Asserting the *buggy* behaviour under a `knownBug` — then the test never flips when the fix lands;
  always assert the correct behaviour.
- A `skip` used to bury a failed setup call or an assertion you could not make pass.
- `onlyFor`/`skipFor` used for a configuration difference instead of a genuine product-variant contract
  difference.

## Related standards
- `matchers.md` — the assertion `knownBug` sits directly before.
- `isolation-and-parallelism.md` — why a guard must never hide a real failure.
- `config-and-profiles.md` — the `variant` and cross-tenant values guards key off.
- `cleanup-and-sweepers.md` — guards never replace proper teardown of created data.
