# Matchers

> Custom `expect` matchers: `toHaveStatus(n)` for one exact code (no OR-lists) and `toMatchContract(schema)` for zod body validation.

## Purpose
Two custom matchers make API assertions exact and readable. `toHaveStatus(n)` asserts one specific status
and prints the URL and body on failure. `toMatchContract(schema)` asserts 200 *and* the zod shape in one
step, listing every contract violation by path. They are registered with Playwright's `expect.extend`
and accept either an `APIResponse` or the `{ res }` the client returns, so a spec reads
`await expect(res).toHaveStatus(400)` and nothing more.

## When to use it (and when NOT)
- **`toHaveStatus(n)`** when a specific status is the assertion (a 400 for a bad field, a 404 for an
  unknown id, a 403 for a cross-tenant read).
- **`toMatchContract(schema)`** when you assert a 200 together with the response shape.
- **Built-in `toBeOK()`** only when *any* 2xx is genuinely correct (rare).
- **Always `await`** — both custom matchers are async.
- **Do NOT** assert a set of acceptable statuses (`[400, 403]`) — a test that passes either way has
  stopped testing. If you have not confirmed the exact code against the handler, skip with a marker rather
  than guess.

## Official guidance
- Add project-specific matchers with `expect.extend()`; combine matcher sets with `mergeExpects()` —
  https://playwright.dev/docs/test-assertions
- Prefer web-first / auto-retrying assertions and avoid manual non-waiting checks for UI state; a custom
  API matcher wraps a direct response check, not a UI wait — https://playwright.dev/docs/test-assertions
- (Kit convention) the one-exact-status rule (no OR-lists) and the 200-plus-contract pairing are the
  kit's own assertion discipline, not a Playwright rule.

## Code shape (product-neutral)
```ts
import { expect as baseExpect, type APIResponse } from '@playwright/test';
import type { ZodTypeAny } from 'zod';

type ResponseLike = APIResponse | { res: APIResponse };
const unwrap = (r: ResponseLike): APIResponse => ('res' in r ? r.res : r);

export const expect = baseExpect.extend({
  async toHaveStatus(received: ResponseLike, expected: number) {
    const res = unwrap(received);
    const actual = res.status();
    const pass = actual === expected;                        // ONE exact code, never a list
    const body = pass === this.isNot ? (await res.text()).slice(0, 500) : '';
    return { pass, name: 'toHaveStatus', expected, actual,
      message: () => `${res.url()}\nExpected: ${expected}\nReceived: ${actual}\n${body}` };
  },

  async toMatchContract(received: ResponseLike, schema: ZodTypeAny) {
    const res = unwrap(received);
    if (res.status() !== 200) return { pass: false, name: 'toMatchContract',
      message: () => `Expected 200, got ${res.status()}\n${res.url()}` };
    const parsed = schema.safeParse(await res.json());        // 200 AND the shape, together
    return { pass: parsed.success, name: 'toMatchContract',
      message: () => parsed.success ? 'matched'
        : parsed.error.issues.map((i) => `  [${i.path.join('.')}] ${i.message}`).join('\n') };
  },
});
```
```ts
// usage — one exact status per assertion
await expect(res).toHaveStatus(400);
await expect(res).toMatchContract(widgetListSchema);
```

## Anti-patterns
- `expect([400, 403]).toContain(res.status())` — passes under two different behaviours, so it verifies
  nothing; assert the one code the handler actually returns.
- A missing `await` on an async matcher — the assertion silently never runs.
- Guessing a status you did not confirm against the handler — skip with a marker (`[status: confirm]`)
  instead of encoding a plausible-but-unverified code.
- Reading the response body on the pass path just to build a message — read it only when the assertion is
  going to fail.

## Related standards
- `schemas.md` — the zod schema `toMatchContract` validates against.
- `api-client.md` — returns the `{ res }` these matchers unwrap.
- `services.md` — a transition returns the raw response the spec asserts with these matchers.
- `helpers.md` — `knownBug` sits immediately before the matcher call it explains.
