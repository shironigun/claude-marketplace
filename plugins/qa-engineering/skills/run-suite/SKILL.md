---
name: run-suite
description: Native skill of the qa-engineering — run the automation suite (or a scoped subset) on demand, capture the REAL pass/fail result, and hand failures to the gated failure-to-bug. It drives the framework's own scripts (test:api / test:ui / test:contracts|endpoints|workflows / test:smoke / test:impacted, or `playwright test --grep @<module>` / --project / a spec path) — it never reinvents a runner. Use whenever the user wants to "run the suite", "run these tests", "run the Orders tests", "run the contract/smoke tests", "run impacted / the changed tests", "run everything", "re-run the failures", or asks "did it pass?". It resolves the scope, confirms a broad/slow run first, executes, parses the result honestly (never claims green without a green run), writes the qa-context failures slice (red runs), and offers to send each real failure to failure-to-bug. It does NOT generate specs (automation-engine), author cases (author-*-cases), file bugs itself (failure-to-bug, gated), or run the brick-by-brick build (kit-builder). Product-neutral; reads scope from tags/levels/paths, never product names.
---

# Run suite — execute the tests, report the truth, hand failures off

Run the framework's existing tests for a requested scope, report **exactly** what the run returned, and route
real failures into the gated `failure-to-bug`. This is the **"→ run →"** step of the loop: it executes a
suite that `automation-engine` / `kit-builder` generated; it does not author, generate, or file.

> **Honest-outcome by rule.** Report only what the run actually produced. Never claim a pass without a green
> run; a flaky/retried pass is reported as flaky; a run that failed to *start* (missing deps, bad `.env`, host
> down) is an environment problem, not a pass. No fabricated results, ever.

> **Product-neutral by rule.** Scope comes from **levels, tags and paths** (`@orders`, `contracts`,
> `modules/orders/...`) — never a hard-coded product, org, URL or credential. The target system is "whatever
> the QA's `.env` points at". Examples (Orders, widgets) are generic placeholders.

## Where this runs
The QA's **framework root** (holds `package.json`, `playwright.config.ts`, `modules/`, `.env`). If there is
**no framework** — no `package.json` and no `modules/**/tests/**` specs — **STOP**:
> "There's no test framework here yet to run. Build one first (`kit-builder`) or generate specs from approved
> cases (`automation-engine`), then I can run them."

## The scope → command map (drive the kit's own scripts)
Resolve the scope from the QA's intent + context, then run the matching command. Prefer a machine-readable
reporter so results parse reliably (e.g. append `--reporter=line,json` / set `PLAYWRIGHT_JSON_OUTPUT_NAME`),
falling back to the line reporter.

| Intent / context | Command |
|---|---|
| "run everything" / all | `npm test` |
| API suite (3 levels) | `npm run test:api` |
| UI suite (3 levels) | `npm run test:ui` |
| An API level — contract / endpoint / workflow | `npm run test:contracts` / `test:endpoints` / `test:workflows` |
| A fast `@smoke` signal (tag filter, **across** levels) | `npm run test:smoke` (wraps `--grep @smoke`) |
| A UI level — the smoke / regression / e2e **project** | `npm test -- --project=ui-<level>` |
| A module | `npm test -- --grep @<module>` (the module tag) |
| A level **in** a module | `npm test -- --grep "@<module>.*@<level>"` (both tags, **module-first** per `test-levels.md`) |
| Impacted / changed only | `npm run test:impacted` |
| A specific spec | `npm test -- <path/to.spec.ts>` |
| Re-run the failures | the `specPath`s from the `failures` slice (`qa-context`), passed to `npm test --` |

Prefer the kit's **named scripts** and, where none exists (a module/level grep, a single project or spec),
the `npm test -- …` passthrough — not a raw `npx playwright test …` incantation (per
`knowledge/standards/tooling-and-commands.md`). Note that `test:smoke` is a **tag filter** (`@smoke`,
whatever is tagged, across API+UI) and `--project=ui-smoke` is the **UI smoke project** specifically — they
are different scopes, so pick by what the QA means.

If the QA's scope is ambiguous ("run the tests") offer a recommended scope with the reason (e.g. "smoke first
— fastest signal; then the module's full level") rather than guessing a long run.

## The flow — in order
### 1. Resolve scope + command (no run yet)
Pick the command from the map. Read `qa-context.json` for the `automation`/`failures` slices when the intent
references "these specs" or "the failures". Never invent a module/level the framework doesn't have — if the
tag/project doesn't exist, say so.

### 2. Confirm a broad or slow run — ask with a recommendation
Before a potentially long run (`npm test`, a full UI/e2e run), state the exact command and the rough cost and
ask:
> **"Run `<command>` now? (≈ <scope> — this can take a while.) Or start with smoke for a fast signal?"**

A **targeted** run (one level, one module, one spec, impacted) may proceed without a gate — say what you're
running. Never silently kick off `npm test`.

### 3. Run it
Execute the command from the framework root. Say the command and that it's running. One run; do not loop-retry
a failing run (Playwright's own retries handle flakiness). If the run **errors before tests execute** (install
missing, `.env` unset, auth/host down), report that as an **environment** failure with the cause and the fix —
it is not a test result.

### 4. Parse the real result
From the run output capture: **total / passed / failed / flaky(retried) / skipped**, the **duration**, and for
**each failure**: the spec path, the test title, the failing assertion/error (first meaningful line), and its
level/tag. Use the JSON reporter output when present; otherwise parse the line/list reporter. Attribute nothing
you didn't see in the output.

### 5. Write the `failures` slice (qa-context)
Per `knowledge/orchestration/qa-context.md`, write the `failures` slice additively (never clobber another
engine's slice):
- **`failures`** = `{ runs[] }`, each failed run `{ specPath, title, assertion, status }`. An all-green run
  writes an **empty** `runs[]` (and you say "all green").

Report the full summary to the QA: `N passed / M failed / K flaky / S skipped in <duration>`, then one line
per failure (`<level> <spec> — <title>: <assertion>`). Report green as green, red as red — no smoothing.

### 6. Hand failures off (gated, never auto-file)
If there are real failures, **offer** to send them to **`failure-to-bug`** (which investigates → classifies →
drafts → files behind its own gates). Do not file anything here, and do not treat a flaky/retried pass or an
environment error as a product bug — `failure-to-bug` makes that call. A green run hands off nothing.

## Safety rules (load-bearing — state and obey)
1. **Honest outcomes.** Only the real run's result. No green claimed without a green run; flaky reported as
   flaky; a start-up/env error is not a pass and not a product bug.
2. **Confirm before a broad/slow run**; a targeted run may proceed, announced.
3. **No tracker writes, no auto-file.** The run is local; filing stays gated inside `failure-to-bug`.
4. **Reinvent nothing.** Drive the kit's npm scripts + Playwright projects/tags; scope from levels/tags/paths.
5. **Product-neutral + secret-free.** No product/org/URL/credential; secrets stay in `.env`.

## Reference files
- `references/run-scopes.md` — the intent → command map in full, and how to turn Playwright output into the
  `failures` slice. It points at `knowledge/standards/tooling-and-commands.md` (the scripts), `ci.md` (the
  machine-readable **results file** — the real pass/fail gate), and `reporting-allure.md` (the human report,
  which is explicitly *not* the gate).

## Done when
- [ ] The scope resolved to one of the kit's **own** commands; a broad/slow run was **confirmed**; a missing
      framework stopped cleanly
- [ ] The run executed and the **real** pass/fail/flaky/skipped result was reported — never fabricated; a
      start-up/env error was reported as such, not as a pass
- [ ] The `failures` slice was written from the actual failures (empty when green), additively, from the file
- [ ] Real failures were **offered** to `failure-to-bug` (gated); nothing was auto-filed; a flaky/env result
      was not filed as a product bug
- [ ] Nothing product-specific, secret or reinvented appears in the skill or its run
