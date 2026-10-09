# Schemas

> Zod schemas describe the expected response shape: `.strict()` for closed/sensitive responses, `.passthrough()` otherwise; every exported schema asserted against a real body at least once.

## Purpose
A schema is the contract for a response shape, written in zod. It makes a contract test catch the thing
that matters — a missing or wrong-typed KNOWN field — while ignoring the thing that is not a break — an
extra field the backend added. Fields present in every valid state are required; legitimately-absent
fields are `.optional()`; present-but-null fields are `.nullable()`. The shape is built from a *real*
response body, never from documentation, and every exported schema is asserted against a live response at
least once so the schema itself is proven to constrain something.

## When to use it (and when NOT)
- **Use a schema** for every contract-level assertion and wherever a 200 body's shape matters.
- **`.passthrough()`** (the default) when extra fields are acceptable — an unknown field is the backend
  adding something, not a contract break.
- **`.strict()`** when the response is closed or sensitive and an unexpected field *is* a finding (e.g. a
  response that must not leak extra data).
- **Build from a real body.** Capture an actual response and model it; do not transcribe a doc.
- **Do NOT** make every field `.optional()` — such a schema parses `{}` and catches nothing.
- **Do NOT** export a schema no test ever asserts against — an unexercised schema can drift unnoticed.

## Official guidance
- Response-shape validation is a team choice, not Playwright guidance — the API-testing docs cover making
  the request, not validating its JSON shape; zod is the kit's layer on top —
  https://playwright.dev/docs/api-testing
- Contract testing checks an integration point by verifying each side against an agreed shape in
  isolation — the methodology behind this block — https://docs.pact.io/
- (Kit convention) the required-by-default rule, the `.strict()`/`.passthrough()` split, and the
  `@composed` convention below are the kit's own schema discipline.

## Code shape (product-neutral)
```ts
import { z } from 'zod';
import { auditFields } from '../../../../common/schemas/shared.schemas';

export const widgetSchema = z.object({
  id:         z.number(),                            // required: present in every valid state
  name:       z.string(),
  status:     z.enum(['Draft', 'Active', 'Retired']),
  quantity:   z.number(),
  categoryId: z.number().nullable(),                 // present, may be null
  tags:       z.array(z.string()).optional(),        // legitimately absent in some states
}).merge(auditFields).passthrough();                 // extra fields are NOT a break

export const widgetListSchema = z.array(widgetSchema);

// Closed/sensitive response — an unexpected field is a finding, so lock it down:
export const tokenResponseSchema = z.object({ token: z.string(), expiresIn: z.number() }).strict();
```
```ts
// Kit convention: @composed — an item schema that is only ever validated through a covered
// parent (e.g. a list or envelope) is tagged @composed in a comment, so the "assert every
// exported schema at least once" rule is satisfied by the parent's assertion, not a separate one.
/** @composed — exercised via widgetListSchema in the list contract test. */
export const widgetItemSchema = widgetSchema;
```

## Anti-patterns
- An all-`.optional()` schema — it parses an empty object and proves nothing; keep genuinely-present
  fields required.
- Modeling the shape from documentation instead of a real response body — docs and reality drift.
- `.passthrough()` on a response that must not leak extra fields — use `.strict()` there so an extra
  field fails.
- Exporting a schema no test asserts against — it is unverified and will rot.
- Confusing `.optional()` (may be absent) with `.nullable()` (present but null) — they catch different
  regressions.

## Related standards
- `matchers.md` — `toMatchContract` runs the schema against a 200 body.
- `test-levels.md` — schemas are the backbone of the contract level.
- `builders.md` — the request payload whose created entity is validated by the schema.
- `services.md` — reads return bodies the schema validates.
