# Builders

> Factory functions that return a valid default payload with a unique, traceable, sweepable name — a test overrides only the field it cares about.

## Purpose
A builder is a function that returns a *valid* default payload for an entity. Tests spread it and change
exactly one field, so a negative test's intent is visible in that single override instead of buried in a
40-line JSON literal. Every created resource gets a unique, greppable name via a shared helper, so
parallel workers never collide and orphaned data is identifiable afterward.

## When to use it (and when NOT)
- **Use a builder** for every entity a test creates. The happy path calls it with no overrides; a
  negative test overrides the one field under test.
- **Use the unique-name helper** for every created resource's name — never a bare `Date.now()`.
- **Keep the default valid.** A builder's zero-argument result must be a payload the API accepts; that is
  what makes "break exactly one field" meaningful.
- **Do NOT** inline a full JSON payload in a spec, or copy-paste a near-duplicate for each case.
- **Do NOT** encode environment- or tenant-specific values in the builder — pass them in (e.g. the
  tenant id) so the same builder works under every profile.

## Official guidance
- Derive unique per-test data so parallel tests never clash — the docs key uniqueness off test/worker
  identity for exactly this reason — https://playwright.dev/docs/test-parallel
- (Kit convention) the builder pattern itself — a valid default plus single-field overrides — is the
  kit's own test-data convention, not a Playwright API.

## Code shape (product-neutral)
```ts
import { uniqueName } from '../helpers/unique';

export interface WidgetPayload {
  name: string;
  tenantId: number;
  quantity: number;
  status: string;
  tags: string[];
}

/** A VALID default payload. Tests spread it and break exactly one field. */
export function buildWidget(tenantId: number, overrides: Partial<WidgetPayload> = {}): WidgetPayload {
  return {
    name: uniqueName('WIDGET'),   // AUTOMATION_WIDGET_<ts>_<rand> — parallel-safe and greppable
    tenantId,
    quantity: 1,
    status: 'Draft',
    tags: [],
    ...overrides,                 // the test changes ONE thing, visibly
  };
}
```
```ts
// A negative test's intent is the single override:
const { name: _omitted, ...withoutName } = buildWidget(tenantId);          // missing required field
const payload = buildWidget(tenantId, { quantity: -1 });                   // one invalid field
```

## Anti-patterns
- A full inline JSON payload in a spec — it hides what the test actually varies and drifts from the real
  shape over time.
- A builder whose default is already invalid — then no test can "break one field" meaningfully.
- `Date.now()` as a name — two parallel workers can emit the same millisecond and collide; always add
  the random suffix via the helper.
- Baking a tenant id, URL, or environment value into the builder instead of taking it as an argument.
- A builder that silently also sends the resource to the API — building and creating are different jobs
  (see `services.md`).

## Related standards
- `services.md` — calls the builder and sends the payload; returns a ref carrying its own cleanup.
- `cleanup-and-sweepers.md` — the `AUTOMATION_`/unique naming is what makes orphans sweepable.
- `schemas.md` — the response shape the created entity is validated against.
- `isolation-and-parallelism.md` — why unique names are required under parallel workers.
