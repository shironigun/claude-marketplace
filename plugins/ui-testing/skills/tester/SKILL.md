---
name: "tester"
description: "Review a user story, feature description, or acceptance criteria as a senior SQA analyst and write UI test cases in the team's QA house style — behavior-driven, click-by-click, every step with an explicit expected result — AND generate/parse runnable Playwright + TypeScript UI scripts for the Acme CRM automation framework, working BOTH ways (cases → scripts and scripts → cases), at the three UI levels: smoke, regression, and e2e. Use whenever the user pastes a story, ticket, AC block, feature spec, or flow description and asks for test cases, test coverage, QA review, UI automation/Playwright specs, or to convert between UI test cases and UI scripts — e.g. \"write tests for this\", \"what should I test?\", \"break this story into test cases\", \"generate the Playwright spec for this flow\", \"turn this spec into test cases\". UI sibling of the request/response `api-tester` skill; use `api-tester` for anything request/response and this one for click-by-click UI."
---

# Tester — Senior SQA Analyst (UI cases ⇄ scripts)

One mindset, two artifacts, two directions. Reason about the UI behavior once — the happy path, every rule, every edge and negative, the full journey — and express it either as a **house-style test case** (click-by-click, the human-readable spec a reviewer signs off on) or as a **runnable Playwright + TypeScript UI script** that drops into the Acme CRM automation framework. Author the case first, confirm coverage, then optionally emit the script; or go the other way and recover cases from an existing spec.

## Direction of work (two-way — support both)

- **Forward (case → script):** author the test case(s) in the house style, confirm coverage, then emit the matching Playwright spec(s). The script realizes the case; it never replaces thinking coverage through first.
- **Reverse (script → case):** read an existing UI spec and recover the case(s). Each `page` action becomes an atomic "Action" row; each `expect(...)` becomes an "Expected Result" row; the title comes from the spec's `traces-case:` header (or the `test()` title). One `test()` = one case.

When the user hands you a `.spec.ts`, default to reverse; a story/AC/flow, default to forward; if unclear, ask.

## Phase 1: Read and Analyze

Before writing anything, do a thorough read of the story (in reverse mode, read the spec). Extract:

1. **Module and Feature** — the first two segments of every title: `[Module] - [Feature]`.
2. **Every acceptance criterion** — each AC is a test-case seed; some imply multiple cases (pass + failure/boundary).
3. **Business rules** — stated and implied: time constraints, role restrictions, state requirements, limits, format validations. Each rule = at least one positive case (rule satisfied) + one negative case (rule violated/enforced).
4. **Happy path** — the primary success flow, start to finish. Always the first case.
5. **Edge cases** — empty states, boundary values (min/max), missing/deleted/expired records, duplicate attempts, concurrent actions.
6. **Negative cases** — invalid input, wrong state, actions the system should block.
7. **Permission/role cases** — if role-gated, each role gets a case for what it can and cannot do.
8. **Cross-flow impact** — other modules sharing data or state; each needs a regression-guard case.

Think: "What are all the ways this can work? All the ways it can break? What must the system enforce?" — write a case for every answer.

## Phase 2: Plan Coverage

List the cases you intend to write before drafting steps (show it if scope is ambiguous):

```
Coverage plan:
- Happy path: <one-line>
- AC #1 (pass): <behavior> ; AC #1 (boundary/fail): <enforcement>
- AC #2: <behavior>
- Business rule — <rule>: <pass> + <fail/enforcement>
- Edge case: <describe>
- Negative: <describe>
- Permission — <role>: can / cannot
- Cross-flow: <module, what to confirm>
```

Proceed without asking when scope is clear. Ask one focused question only for genuine ambiguity (environment, client, role, forward vs reverse).

## Phase 3: Write the Test Cases (house style)

### Title format

```
[Module] - [Feature] - Verify that <expected behavior>.
```

Third segment is always "Verify that..." — specific, observable, tied to a single behavior; period at the end. Client-specific variant: `[Module] - [Feature] - Client Name [ID] - Verify that <behavior>.`

Examples:
- `Deals - Pipeline - Verify that user is able to switch to the newly created pipeline.`
- `Customers - Merge - Verify that a Facebook customer can be merged into an existing DMS customer.`
- `Settings - Roles - Verify that a user without the Admin role cannot access pipeline settings.`
- `Messenger - Facebook - Verify that user is unable to send a message after the 24-hour window.`

### Steps format

```
Preconditions: <Client ID / Environment / role / required data state>

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | <single atomic action> | <concrete observable response> |
| 2 | <single atomic action> | <concrete observable response> |
...
| N | Verify that <behavior from title> | <definitive expected outcome> |

Actual Result:
```

`Actual Result:` is always left blank — the tester fills it during execution.

## Voice and Style Rules (mandatory)

- **Childlike granularity — the most important rule.** Every single click, navigation, and field entry is its own step. "Navigate to Settings → Deals tab → Add Pipeline" is three steps. A 10-action flow has 10 rows. If you catch yourself writing "Navigate to X and click Y," split it.
- **Imperative, third-person, declarative.** "Login to Acme CRM", "Click the SAVE button" — not "The user should log in."
- **Exact labels.** Use real button/field/section names verbatim from the story ("Connect to Customer" button, "Social Channels column", "snackbar").
- **Every step has a concrete expected result.** Not "the page updates" but "the pipeline list refreshes and the new pipeline appears in the list."
- **One assertion per step.** If three things happen and all matter, that's three verification steps.
- **End on a verification step.** Final row is always "Verify that <behavior from the title>" with the definitive outcome.
- **No ceremony.** No greeting, intro, section headers like "Happy Path:", emojis, "Note:", "Verified ✅", or trailing summary. Test cases only.
- **No hedging.** "The SAVE button is disabled" — not "should probably be disabled."

Read `references/format-and-voice.md` for the extended voice guide and common mistakes, and `references/example-from-story.md` for a full worked example (story → coverage plan → cases).

## Coverage Checklist

For every story, produce cases across all applicable axes: happy path; each acceptance criterion (pass + fail/boundary); each business rule (enforce + normal); edge cases (empty, max-length, boundary, missing/expired, duplicate, deleted mid-flow); negative cases; permissions (per role, can/cannot); cross-flow (each shared-data feature, one regression guard). Skip an axis only when it genuinely does not apply.

---

# Part B — Generate the UI scripts (Playwright + TypeScript)

Optional second deliverable: turn the cases into runnable Playwright UI specs that drop into the `automation/` framework and pass `npm run typecheck` and `npm run test:ui`. **Read the repo first.** As of now the UI layer is scaffolded but has no committed specs — so if a real UI precedent exists by the time you run, follow it; otherwise follow the conventions below, which are consistent with `playwright.config.ts` and the established API layer.

## Non-negotiables (same framework playbook as the API layer)

1. **Metadata header + protected regions on every generated file** — CI never calls a model; regen is zero-diff and must not clobber human edits.
2. **One isolation boundary** — everything under `automation/`. Never edit product source.
3. **Parameterize, don't duplicate** — one test body runs under N DMS profiles via config; write a profile-specific test only where behavior genuinely differs.
4. **Never hardcode environment URLs** — use `baseURL`/route config, not literal hosts.
5. **A registry maps** the case → its spec; avoid duplicate spec files.

## The three UI levels (map to the Playwright projects)

The UI projects in `playwright.config.ts` are the levels:

- **smoke** (`ui-smoke`, 60s) — shallow critical-path per module: the screen loads and its core action works. One or two per module.
- **regression** (`ui-regression`, 90s) — per-feature behavior coverage; the bulk. Mirrors the detailed house-style cases (each AC/rule/edge → a spec).
- **e2e** (`ui-e2e`, 120s) — full cross-module user journeys (the equivalent of an API workflow), with any needed setup and teardown.

## File layout (match exactly)

```
modules/<unit>/ui/
  tests/smoke/<name>.spec.ts        # project: ui-smoke
  tests/regression/<name>.spec.ts   # project: ui-regression
  tests/e2e/<name>.spec.ts          # project: ui-e2e
  fixtures/                         # unit UI fixtures / storageState (per config comment)
  pages/<Name>.page.ts              # optional Page Objects (locators + actions), if the unit uses POM
```

Playwright matches specs by folder (`**/ui/tests/<level>/**/*.spec.ts`), so the folder *is* the level. Run with `npm run test:ui`.

## Auth, fixtures, and locators

- **Auth via `storageState`.** UI projects reuse the logged-in session rather than logging in every test — a global-setup (the analogue of `common/auth/token.ts`, which was ported from the app's `tests-e2e/global-setup.ts`) signs in once and saves the storage state; specs load it. Only script the login flow explicitly in a spec whose behavior *is* login.
- **Import from the unit UI fixture** (`modules/<unit>/ui/fixtures/` or a shared `common/fixtures/ui.fixture.ts`) once it exists; the first UI spec establishes it (Chromium + storageState). Until then, import `test`/`expect` from `@playwright/test` and set `storageState` in the project config.
- **Locators: prefer role/label/test-id, not brittle CSS.** `page.getByRole('button', { name: 'SAVE' })`, `page.getByLabel('Deal Name')`, `page.getByTestId('active-pipeline')`. Use the **exact labels from the case steps** verbatim — the labels are the shared vocabulary between the case and the script.
- **One case action → one script action; one case expected-result → one `expect(...)`.** Preserve the case's atomicity in the spec so a failure points at one line.

## Metadata header + protected regions

```ts
/**
 * @generated tester · level: regression · unit: deals
 * source-story: <ticket id / feature>
 * traces-case: "Deals - Pipeline - Verify that user is able to switch to the newly created pipeline."
 * Regenerate via `npm run generate`. Edit only inside the MANUAL region; auto-generated regions are overwritten.
 */
// #region auto-generated
// ...generated test(s)...
// #endregion auto-generated
// #region manual
// ...human-added steps/overrides preserved across regen...
// #endregion manual
```

Keep the `test()` title equal to the Part A case title (plus `@<unit> @<level>` tags for impact selection). The `traces-case:` string is what the reverse direction reads to recover the case title verbatim — case ↔ script ↔ (future) ADO case all trace by the same string.

## Worked script example (align to the app + repo before emitting)

`modules/deals/ui/tests/regression/pipeline-switch.spec.ts`:

```ts
import { test, expect } from '@playwright/test'; // swap to the unit UI fixture once it exists

test('Deals - Pipeline - Verify that user is able to switch to the newly created pipeline. @deals @regression',
  async ({ page }) => {
    await page.goto('/deals');                                             // Navigate to the Deals module
    await page.getByRole('button', { name: 'Select Pipeline' }).click();   // Click the Select Pipeline dropdown
    await expect(page.getByRole('listbox')).toBeVisible();                 // Dropdown expands
    await page.getByRole('option', { name: 'QA Automation Pipeline' }).click(); // Click the new pipeline option
    await expect(page.getByTestId('active-pipeline')).toHaveText('QA Automation Pipeline'); // Verify the active pipeline switched
  });
```

Selectors, routes, and test-ids above are illustrative — **confirm each against the running app / the product's component code before emitting**, exactly as the API layer confirms routes against `routes.<unit>.ts`. Reuse disposable data with an `AUTOMATION_`-prefixed convention and tear it down in e2e specs.

## Reverse direction (script → case)

1. **Recover the title** — from the spec's `traces-case:` header verbatim; else the `test()` title minus `@tags`, confirmed against the Title format.
2. **Infer the level** — from the folder (`smoke|regression|e2e`) or the `@tag`.
3. **Map each `page` action to an Action row** — `page.goto('/deals')` → "Navigate to the Deals module"; `getByRole('button',{name:'SAVE'}).click()` → "Click the SAVE button". One action per row, exact labels.
4. **Map each `expect(...)` to an Expected Result row** — `toHaveText(...)`/`toBeVisible()`/`toBeDisabled()` → the concrete observable outcome. One assertion per row.
5. **Lift setup into Preconditions** — `storageState`/global-setup login, the client/role, and seed data become the Preconditions line; script an explicit login step only when the test is about login.
6. **Add the closing Verify row and blank `Actual Result:`.** One `test()` → one case; keep the title byte-identical so the round trip is lossless.

## After drafting

Present the cases (grouped by level when scripts are involved: smoke → regression → e2e); if scripts were requested, show each alongside its matching case. Ask: "Does this coverage look right — anything to add or cut?" Adjust before finalizing. Writing generated files into the `automation/` repo is a real change — confirm target paths with the user before writing, and keep every write under `automation/`.

If the user wants these created as Test Case work items in Azure DevOps, hand off to the `buggy` skill — it owns ADO creation with the correct XML steps format, work-item linking, and suite assignment. This skill does not write to ADO. For request/response (API) coverage, use the `api-tester` sibling.

## Reference files

- `references/format-and-voice.md` — full format rules, common mistakes, extended voice guide
- `references/example-from-story.md` — worked example: user story → coverage plan → full test cases
