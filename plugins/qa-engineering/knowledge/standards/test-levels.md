# Test levels

> API: contract / endpoint / workflow. UI: smoke / regression / e2e. Push each check to the cheapest level that still catches the bug.

## Purpose
Not every check belongs at every level. The kit runs six levels — three for API, three for UI — each with
its own cost, speed, and failure signal. The rule is the test pyramid's: push each check as far down as it
can go while still catching the bug it targets. A shape regression belongs in a fast contract test, not a
full UI journey; a cross-screen flow belongs in an e2e, not a contract test. Matching a check to its level
keeps the suite fast, the failures legible, and the maintenance low.

## When to use it (and when NOT)
- **Contract** — response/request shape against a schema; the cheapest, run most often. Read-only; uses
  the worker seed.
- **Endpoint** — one operation, one condition: the happy path plus the full negative matrix per endpoint.
- **Workflow** — a chained, multi-step flow (≥5 meaningful steps) with at least one transition verified by
  a follow-up read and at least one blocked operation asserted.
- **UI smoke** — the screen loads and its primary action is available; one or two per module.
- **UI regression** — per-feature behaviour, the bulk of the UI suite; preconditions built over the API.
- **UI e2e** — a full journey across real screens.
- **Do NOT** verify at a higher level what a lower level already catches — a shape bug caught in a UI e2e
  should have a contract test; write the missing lower-level test.
- **Do NOT** encode the level in the test title — the folder and the tag carry it.

## Official guidance
- The test pyramid favours many fast, low-level tests and few slow, flaky end-to-end tests; push each
  check as far down the pyramid as it can go and reserve end-to-end tests for critical journeys —
  https://martinfowler.com/articles/practical-test-pyramid.html
- When a higher-level test finds a bug that no lower-level test caught, add the missing lower-level test —
  https://martinfowler.com/articles/practical-test-pyramid.html
- Contract testing verifies an integration point by checking each side against an agreed shape in
  isolation — the basis of the contract level — https://docs.pact.io/
- Automated suites are machine *checking*, valuable but not the whole of testing — keep exploratory
  testing beside them (this framing is an inference from the source, not a quote) —
  https://www.satisfice.com/blog/archives/856

## Code shape (product-neutral)
```text
Level map — the folder IS the level (each folder is a Playwright project with its own budget)

  API                                   UI
  ───────────────────────────────────  ──────────────────────────────────────
  contracts/  shape vs schema (read)    ui-smoke/       screen loads, action present
  endpoints/  one op, one condition     ui-regression/  per-feature behaviour (bulk)
  workflows/  chained ≥5 steps          ui-e2e/         full cross-screen journey

Tag, never title:  { tag: ['@widgets', '@contract'] }   // module tag + exactly one level tag
```
```text
Choosing the cheapest level that still catches the bug

  "Does the list response have the right fields?"        → contract
  "Does POST reject a negative quantity with 400?"       → endpoint
  "Create → activate → blocked edit → history?"          → workflow
  "Does the Widgets screen open with a New button?"      → ui-smoke
  "Does a created widget show up in the list UI?"        → ui-regression
  "Create, activate, and delete a widget through the UI?"→ ui-e2e
```

## Anti-patterns
- Testing a shape regression through a UI journey — slow, flaky, and it should be a contract test.
- A "workflow" that is really one call — a workflow earns the name at several meaningful, chained steps.
- Duplicating the same assertion at three levels — verify it once at the cheapest level, reference it
  higher only when the higher level adds something.
- Encoding the level in the title string instead of the folder + tag.

## Related standards
- `schemas.md` · `matchers.md` — the contract level's tools.
- `isolation-and-parallelism.md` — every level's tests are independent and parallel-safe.
- `page-objects.md` · `components.md` — the UI levels' building blocks.
- `cross-module-reuse.md` — workflows and e2e that span modules reuse the other module's blocks.
