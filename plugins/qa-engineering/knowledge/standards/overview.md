# Overview — what a framework is and how one test flows

> The map of the building blocks and how a single test's data moves from config to cleanup.

## Purpose
A test-automation framework is not a pile of test files — it is a set of small, single-responsibility
layers that each know only the one below them, so a test reads as a short statement of intent and all
the plumbing lives in one predictable place. This standard is the orientation map: it names the blocks,
says what each owns, and traces how one test's data flows end to end. Read it first; each block then has
its own standard with the detail.

## When to use it (and when NOT)
- **Use it** when you are new to the kit, deciding where a new piece of code belongs, or explaining the
  shape of the suite to someone. It answers "which file does this go in?" at a glance.
- **Not** a substitute for the per-block standards — it deliberately stays shallow. For the rules of a
  block (e.g. exact-status matchers, builder defaults, schema strictness), open that block's file.
- **Not** a place to put product detail. Everything here is structural and product-neutral.

## Official guidance
- Test user-visible behavior and keep each test isolated — the two foundations the whole layout serves.
  "Each test should be completely isolated from another test and should run independently" —
  https://playwright.dev/docs/best-practices
- A test reads state and asserts against it; Playwright auto-waits for actionability, so the layers
  below never hand-roll waits into assertions — https://playwright.dev/docs/writing-tests

## Code shape (product-neutral)
```text
The building blocks (each has its own standard):

  config-and-profiles ─ which environment/tenant/creds a run uses
  routes ─────────────── path constants with {placeholders}, no raw URL strings
  api-client ─────────── one wrapper over APIRequestContext (auth, re-mint, errors)
  auth-and-storage-state ─ log in once; token for API, storageState for UI
  builders ───────────── a valid default payload; a test overrides one field
  services ───────────── domain verbs (createX / archive / ensureY) over the client
  fixtures ───────────── test.extend provides ready services/clients + seeds
  worker-seeds ───────── read-only data made once per worker
  matchers / schemas ── exact-status + zod contract assertions
  helpers / cleanup ─── knownBug, guards, a cleanup registry + run-level sweeper
  page-objects / components ─ one class per screen; reusable widgets
  test-levels / isolation ─ which level a check belongs to; independence + parallelism
  reporting / ci / tooling / vscode ─ operate and observe the suite

How ONE api test's data flows end to end:

  profile (config)                 ← which host, which tenant, which credentials
     │
     ▼
  api-client  ──uses──▶ auth       ← attaches the token, re-mints on 401
     │
     ▼
  service.create(…)  ──uses──▶ builder   ← a valid default payload, one field overridden
     │                         └─ route constant + fillRoute({id})
     ▼
  APIResponse
     │
     ▼
  expect(res).toHaveStatus(n) / .toMatchContract(schema)   ← matcher + zod schema
     │
     ▼
  cleanup()   ← the ref the service returned undoes what the test created

A fixture wires all of this in BEFORE the test body, so the test names what it needs
(`{ api, profile, cleanup }`) and the runner provisions it.
```

## Anti-patterns
- A spec that builds a URL, sets an auth header, or hand-crafts a payload inline — each of those is a
  block's job; doing it in the test couples the test to detail that should live in one place.
- Treating the layers as optional "nice to have" structure. The isolation, reuse, and honest-reporting
  properties the rest of the standards depend on come from keeping the layers intact.
- Learning the blocks in isolation without the flow. The value is in how they compose; a builder with
  no service, or a service with no cleanup, is half a pattern.

## Related standards
- `defaults-and-deviation.md` — the opinionated default stack these blocks assume, and when to deviate.
- `fixtures.md` — how the blocks are wired into a test before its body runs.
- `cross-module-reuse.md` — how a test that spans two modules composes their blocks instead of copying.
