---
name: api-failure-to-bug
description: When an API test fails, act as a senior SQA analyst — triage whether it is a real product bug, and if so draft a review-ready bug in a rigorous house format for the user's tracker. Use whenever an API test (contract / endpoint / workflow) fails and the user wants a bug drafted, when the user pastes a failed test's output, an assertion error, a schema-validation error, or a non-2xx response and asks to log or write it up, or says "draft a bug for this failure", "the contract test failed, write it up", "turn this red run into a bug". Draft-and-review only — it classifies and drafts, it never auto-files. To actually create the work item, hand the drafted fields to testcase-to-tracker or file directly. Failure-side sibling of api-test-cases (which authors the cases).
---

# API Failure -> House-Style Bug Draft

When an API test goes red, a senior SQA analyst does not paste the stack trace into the tracker. They decide whether it is a real product bug, and if so write a bug a developer can reproduce and a reviewer can approve. Take a failed API test (contract / endpoint / workflow) plus its failure output, **triage** it, and **draft** a bug in the exact house format below.

**Draft-and-review only.** The lifecycle is `Draft -> Approved/Rejected -> Filed`; this skill produces the Draft and stops. Filing to a tracker is a separate, deliberate step — hand the fields to `testcase-to-tracker`, or file directly. Never auto-file.

`~~tracker` below means whatever issue system the user files bugs in. `references/bug-format.md` maps the draft fields to common trackers.

## Inputs to gather

- **The failing test** — its title/behavior (a `Verify that ...` case title if available) and level (contract / endpoint / workflow).
- **The failure output** — the failing assertion (e.g. expected status 201, received 500), the response status/body, and for a contract failure the schema-validation errors.
- **Context** — the route (method + path), the schema, the environment/account the run used, and (optional) the relevant code snippet for a suggested fix.

## Phase 1: Triage (classify before drafting)

Not every red test is a product bug. Classify first:

- **real_bug** — the API behaved incorrectly: wrong/missing validation, a broken action, wrong data, a 5xx, a contract violation (response missing a documented field / wrong type). The product is at fault. -> draft a bug.
- **flaky** — timing/environment (transient network, a race, an intermittent timeout), not a consistent defect. -> no bug; note it.
- **test_issue** — the test/route/schema is wrong or stale-by-assumption; the product is fine. -> fix the test (hand back to `api-test-cases`), no bug.
- **stale_test** — the requirement changed and the test encodes outdated expected behavior. -> update the case, no bug.

State `classification`, `confidence` (high/medium/low), and a one-or-two-sentence `reason`. Only **real_bug** produces a drafted bug; still record the verdict for the others.

## Phase 2: Draft the bug (house format)

Draft fields (the frozen shape): `title`, `severity`, `preconditions` (ALWAYS `""`), `reproSteps` (array of plain strings), `expected`, `observations` (array — the actual, one fact per bullet), `suggestedFix` (optional).

### Title — declarative negative-state statement (NOT `[Module] - [Feature]`)

State plainly what is broken, name the endpoint, and END with the environment. ALL-CAPS the domain keywords (states/entities like OPEN, CLOSED, EMPTY; environment names QA, STAGING, PRODUCTION). No "should", no question phrasing, no speculation, no `[Module] - [Feature]` prefix. Pick the frame that fits:

- `<thing> not working` / `<thing> is/are not <verb>ing`
- `Unable to <verb>`   -   `<thing> is not <correct>`
- `Error <doing X>`   -   `Able to <do invalid thing>` (for things that should be blocked but are not)

Examples (match this style):
- `POST orders returns 500 on QA environment`
- `Unable to CREATE order via POST orders on QA environment`
- `orders response is missing the required id field on QA environment`
- `Able to CREATE an order without a required customer via POST orders on QA environment`
- `GET orders returns 401 for a valid bearer token on QA environment`

### Severity (exactly one)

- **Critical** — data loss, security exposure, a full endpoint/module blocked.
- **High** — core endpoint broken, no clean workaround.
- **Medium** — endpoint works but the response is incorrect/partial (e.g. a contract field wrong or missing).
- **Low** — cosmetic/minor deviation (rare for API).

### Repro steps — everything goes here, environment-first

`preconditions` is ALWAYS `""`; all setup goes into `reproSteps` as the first steps. Rules:

- Imperative, third-person, atomic — ONE action per item. "Send a POST request to /orders with a valid payload." not "POST and check the response".
- Childlike granularity — each request and each setup action is its own step.
- **Step 1 names the environment (and account/tenant when known):** "Authenticate to the API as <role> on the QA environment.", then one step per setup action (seed the required record, capture ids), then the request that triggers the failure as the last step.
- Reference exact routes, methods, params, headers, and field names verbatim. Leave the broken result out of the steps — it belongs in `observations`.

### Expected vs Observations

- **expected** — the correct resolved state, pulled from the case/contract. Definitive ("POST orders returns 201 with the created order."), never "should". Renders as the acceptance line: *"I know this bug is resolved when: <expected>"*.
- **observations** — the actual, as an ARRAY of DISTINCT facts, each ONE bullet, definitive. Put each technical signal in its own bullet: e.g. `["Response status is 500 Internal Server Error", "Response body is empty", "A subsequent GET orders does not include the new record"]`. For a contract failure, one bullet per validation error (`"items[0].id is missing (required)"`).

### Suggested fix (optional)

Concrete and code-aware if a snippet was provided ("Return `id` from the create handler before serializing the response."). Leave `""` if no high-confidence suggestion.

### Voice

Definitive, neutral. No emoji, no greetings, no "Note:", no hedging, no em/en dashes. Exact identifiers verbatim. **One bug = one issue** — if the failure surfaces multiple distinct deviations, output multiple bugs.

## Draft record (portable JSON)

Present the draft as readable text AND, when the user wants to save/queue it, as this JSON shape (`status` starts `Draft`):

```json
{
  "title": "POST orders returns 500 on QA environment",
  "severity": "High",
  "preconditions": "",
  "reproSteps": ["Authenticate to the API as an ADMIN on the QA environment.", "Send a POST request to /orders with a valid payload.", "Read the response status."],
  "expected": "POST orders returns 201 with the created order.",
  "observations": ["Response status is 500 Internal Server Error", "Response body is empty", "No order is created"],
  "suggestedFix": "",
  "status": "Draft",
  "source": { "test": "Orders - Orders - Verify that POST orders creates an order successfully.", "level": "endpoint", "failingAssertion": "expect(res.status()).toBe(201) // received 500" },
  "triage": { "classification": "real_bug", "confidence": "high", "reason": "A valid create payload returns 500 and persists nothing; the endpoint is at fault." }
}
```

## Filing later (do not auto-file)

Present the draft(s) for review; let the user edit and Approve/Reject. When they choose to file, hand off to `testcase-to-tracker` (or file directly) using the field map in `references/bug-format.md`, which maps title/severity/repro/expected/observations to Azure DevOps ($Bug fields), Jira, and a generic tracker. Link the new bug to the source test case if one exists.

## After drafting

Show each drafted bug (title, severity, repro, expected, observations) grouped by triage verdict, with the non-real_bug failures listed as classified-but-not-filed. Ask: "File any of these?" For authoring or fixing the API cases themselves, use `api-test-cases`.

## Reference files

- `references/bug-format.md` — the rendered bug anatomy and field mapping per tracker (Azure DevOps, Jira, generic)
