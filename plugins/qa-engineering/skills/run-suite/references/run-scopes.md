# Run scopes — intent → command, and output → `failures` slice

How `run-suite` maps a QA's run intent onto the framework's **own** scripts, and how it turns the run output
into the `failures` slice. This reference **points** at the Standards — `knowledge/standards/
tooling-and-commands.md` for the scripts, `ci.md` for the machine-readable **results file** (the real
pass/fail gate), and `reporting-allure.md` for the human report (which `ci.md` and that file both say is
*not* the gate) — it does not restate them.

> Product-neutral: `@orders`, `modules/orders/...` are placeholders. Scope is always a **level, tag or path**,
> never a product name.

## The scope → command map

| QA says… | Scope | Command |
|---|---|---|
| "run everything", "the whole suite" | all | `npm test` |
| "run the API tests" | API (3 levels) | `npm run test:api` |
| "run the UI tests" | UI (3 levels) | `npm run test:ui` |
| "run the contract tests" | contract | `npm run test:contracts` |
| "run the endpoint tests" | endpoint | `npm run test:endpoints` |
| "run the workflow tests" | workflow | `npm run test:workflows` |
| "run smoke", "a fast signal" | `@smoke` **tag**, across levels | `npm run test:smoke` (wraps `--grep @smoke`) |
| "run the UI smoke/regression/e2e project" | ui-smoke / ui-regression / ui-e2e | `npm test -- --project=ui-<level>` |
| "run the Orders tests" | a module | `npm test -- --grep @orders` |
| "run the Orders contract tests" | module + level | `npm test -- --grep "@orders.*@contract"` (module-first) |
| "run impacted / what I changed" | changed | `npm run test:impacted` |
| "run this spec" | a path | `npm test -- modules/orders/api/tests/endpoints/create.endpoint.spec.ts` |
| "re-run the failures" | last red | the `specPath`s from `qa-context` `failures.runs[]`, passed to `npm test --` |

- The **folder is the level** and a **tag** carries it (`@contract`…/`@smoke`…), per
  `knowledge/standards/test-levels.md` — so a module+level scope is two tags ANDed in **one** `--grep` regex.
  Tag order is fixed **module-first** (`@<module>` then `@<level>`) by `test-levels.md`, so write the regex in
  that order or it matches nothing (Playwright's `--grep` is a single regex; repeated `--grep` flags do *not*
  AND).
- `test:smoke` is a **tag filter** (`@smoke`, whatever is tagged, across API+UI); `--project=ui-smoke` is the
  **UI smoke project** specifically. They are different scopes — pick by what the QA means, don't treat them
  as interchangeable.
- Prefer the kit's **named scripts**; where none exists (a module/level grep, a single project or spec), use
  the `npm test -- …` passthrough rather than a raw `npx playwright test …` incantation (per
  `tooling-and-commands.md`).
- Only use a `--project` / tag / path the framework actually defines. If the QA names a module/level the suite
  doesn't have, say so rather than running nothing silently.
- For a reliable parse, prefer a machine-readable reporter alongside the human one, e.g.
  `npm test -- <scope> --reporter=line,json` (or set `PLAYWRIGHT_JSON_OUTPUT_NAME=results.json`), then read the
  JSON; fall back to parsing the line/list reporter when JSON isn't configured. The results file is the gate
  (`ci.md`), not the Allure report.

## Output → the `failures` slice

After the run, extract from the result:

- **Totals:** passed, failed, flaky (passed-on-retry), skipped, and the wall-clock duration.
- **Per failure:** the spec file path, the test title, and the **first meaningful** assertion/error line (the
  expect diff or thrown error — not the whole stack), plus the level/tag.

Write the `failures` slice (`qa-context`), each failed run:

```json
{ "failures": { "runs": [
  { "specPath": "modules/orders/api/tests/endpoints/create.endpoint.spec.ts",
    "title": "Orders - Orders - Verify that POST orders creates an order successfully.",
    "assertion": "expect(res.status()).toBe(201) // received 500",
    "status": "failed" }
] } }
```

- An **all-green** run writes `{ "runs": [] }` and is reported "all green".
- A **flaky** test (failed then passed on retry) is reported as flaky in the summary; it is *not* a `failed`
  run in the slice unless it ended red. Say which tests were flaky so the QA can judge.
- A **start-up / environment** error (deps not installed, `.env` missing a key, auth/host down, no project
  matched) is **not** a test result — report the cause + fix (install, set the key, sign in, correct the
  scope) and write **no** `failed` runs for it.

## Honesty
Every number and every failure line comes from the **actual run output**. Never infer a pass, never carry a
previous run's numbers, never downgrade a red run. A run that didn't execute is reported as "didn't run",
with why.
