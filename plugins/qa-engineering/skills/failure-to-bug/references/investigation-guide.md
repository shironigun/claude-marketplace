# Investigation guide — read the evidence, then classify

How to investigate a failed test from its **real artifacts** before deciding whether it is a product bug.
The rule: never classify from the one-line assertion alone — reconstruct what the test did and what the
system actually did, then judge. Product-neutral; where it matters, it points at the Standards for how the
kit runs tests (it does not restate them).

## Read the evidence — API

- **The failing assertion** — what was expected vs received (status, a field, a schema parse). One exact
  expectation failed; name it precisely.
- **The real response** — status line, headers, body. A 5xx is the server; a 4xx on a valid request is
  often validation/auth; a 2xx with a wrong/absent field is a contract or data bug.
- **Schema-validation errors (contract level)** — each error is a concrete deviation (`items[0].id is
  missing (required)`, `status is number, expected string`). One bullet per error.
- **Server log / correlation id** — if available, the stack or error id behind a 5xx distinguishes a product
  exception from a gateway/timeout.
- **Isolation check** — did the test own and seed its data, or lean on shared state? A failure that only
  appears under parallelism points at the test, not the product (`knowledge/standards/isolation-and-parallelism.md`).

## Read the evidence — UI (Playwright artifacts)

Playwright writes rich artifacts on failure; **open them**, don't infer from the error line. (How the kit
configures these lives in `knowledge/standards/reporting-allure.md` and the template's Playwright config.)

- **Trace (`trace.zip`)** — the primary evidence. Step through it: each **action** (what the test clicked/
  typed), the **before/after DOM snapshots**, the **network** panel (the real requests the app made and
  their responses), and the **console**. This shows whether the app did the wrong thing, or the test looked
  in the wrong place.
- **Screenshot at failure** — the actual rendered state when the assertion failed (an error banner? a blank
  list? the expected element simply absent?).
- **Video** (if recorded) — the run leading up to the failure; useful for a timing/animation question.
- **Error-context / ARIA snapshot** — the accessibility/DOM snapshot Playwright writes beside the failure;
  shows what *was* on the page (so "element not found" = truly absent vs. present-but-mis-located).
- **Locator vs. reality** — if the element exists in the snapshot but the locator missed it, that is a
  **test_defect** (locator), not a product bug (`knowledge/standards/page-objects.md`).

## Classify — the rubric (fail-safe)

Decide from what the evidence *shows*, not what the test *claimed*. Give each a `confidence`
(high/medium/low) and an evidence-grounded `reason`.

| Verdict | Signals in the evidence | Action |
|---|---|---|
| **real_bug** | The product did the wrong thing a real user would hit: a 5xx, wrong/missing validation, wrong data, a contract violation, the UI showing a wrong/stale state or a user-facing error — and it **reproduces**. | Draft a bug. |
| **flaky** | Non-deterministic: passes on retry, a transient network blip in the trace, a race / un-awaited request or animation, an intermittent timeout. No consistent product fault. | No bug; note it + the evidence (and the un-awaited step if UI). |
| **environment** | Infra/config/data, not the product: a down dependency, an expired token, a bad/empty seed, the wrong base URL, a 401 because auth setup failed. | No bug; name the env cause. |
| **test_defect** | The test is wrong/stale: a wrong locator (element present in the snapshot), a stale schema/route, an assumption the requirement changed, a missing precondition the test should have built. | Fix the test (`author-api-cases` / `author-ui-cases`); no bug. |

**Fail-safe rule.** When the evidence does not let you tell real-vs-flake/env with confidence, classify as
*uncertain* and **do not draft or file** — report what you saw and let the QA judge. Re-running to confirm
reproducibility is legitimate investigation; filing on a guess is not. A wrongly-filed flake erodes trust in
the whole suite; an unfiled real bug can still be filed by hand.

## One failure, one issue
If the evidence shows **multiple distinct product deviations**, that is multiple bugs — one per issue — each
with its own title, repro and observations. Do not bundle unrelated deviations into one defect.
