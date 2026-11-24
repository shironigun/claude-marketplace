---
name: api-bugger
description: >-
  Acts as a senior SQA analyst when an API script fails in the automation project: triages the failure
  and drafts a house-style Azure DevOps Bug to review now and push later. Use whenever a Playwright API
  spec (contract / endpoint / workflow) fails and the user wants a bug drafted, when the user pastes a
  failed API test's output, assertion error, zod safeParse issues or non-2xx response and asks to log or
  write it up, or says "draft a bug for this failure", "the contract test failed, write it up", "turn
  this red run into a bug". Drafts live in the automation project's find-bugs module; the skill drafts
  and reviews only and never auto-files. Failure-side sibling of api-tester, which authors the API cases
  and scripts.
---

# API Bugger — Failed API Script → House-Style Bug Draft

When an API script goes red, a senior SQA analyst does not paste the stack trace into ADO. They decide whether it is a real product bug, and if so write a bug a developer can reproduce and a reviewer can approve. This skill does exactly that for the `automation/` project: take a failed Playwright API spec (contract / endpoint / workflow) plus its failure output, **triage** it, and **draft** a bug in the exact house format — saved to the `find-bugs` module to view and push to ADO later. It is the failure-side sibling of `api-tester` (which authors the cases/scripts).

**Scope:** this skill runs against the **`automation/`** project and drafts into `automation/find-bugs/`.

**Draft-and-review only.** The lifecycle is `Draft → Approved/Rejected → Pushed`; this skill produces the Draft and stops. Pushing to ADO is a separate, deliberate step (hand the drafted fields to the user's tracker-filing tool, or file via ADO tooling using the field map below). Never auto-file.

## Step 0 — Workspace profile

Read `references/workspace-profile.md`, then load `.claude/workspace-profile.json` from the user's project. This skill needs:
`tracker.*`, `boards.delivery`, `boards.support`, `workItemTypes.bug`, `fields.bug`, `identity`, `environments`, `variants`, `variantIdParam`, and `clientIdFormat`.
If any are missing, run discovery for those keys only, confirm with the user, save, then continue. Every org fact below comes from the profile; nothing is assumed. Routes, partner names, ids and field values in the examples below are illustrative placeholders.

## Inputs to gather

- **The failing spec** and its `traces-case:` header (from `api-tester`) — the case title and, if present, the `adoTestCaseId` and level (`@contract|@endpoint|@workflow`).
- **The Playwright failure output** — the failing assertion (`expect(res.status()).toBe(201)` → received 500), the response status/body, and for contract failures the `zod` `safeParse` `error.issues`.
- **Context** — the route (`routes.<unit>.ts`), the schema, the variant profile (a `variants.values` item) + environment + client id the run used, and (optional) the relevant code snippet for a suggested fix.

## Phase 1: Triage (classify before drafting)

Not every red test is a product bug. Classify first:

- **real_bug** — the API behaved incorrectly: wrong/missing validation, a broken action, wrong data, a 5xx, a contract violation (response missing a documented field / wrong type). The product is at fault. → draft a bug.
- **flaky** — timing/environment (transient network, a race, an intermittent timeout), not a consistent defect. → no bug; note it.
- **test_issue** — the spec/selector/route/schema is wrong or stale-by-assumption; the product is fine. → fix the script (hand back to `api-tester`), no bug.
- **stale_test** — the requirement changed and the spec encodes outdated expected behavior. → update the case/script, no bug.

State `classification`, `confidence` (high/medium/low), and a one-or-two-sentence `reason`. Only **real_bug** produces a drafted bug; still record the verdict for the others.

## Phase 2: Draft the bug (house format)

Draft fields (this is the frozen shape — camelCase): `title`, `severity`, `preconditions` (ALWAYS `""`), `reproSteps` (array of plain strings), `expected`, `observations` (array — the actual, one fact per bullet), `suggestedFix` (optional).

### Title — declarative negative-state statement (NOT `[Module] - [Feature]`)

State plainly what is broken, name the endpoint/module, and END with the environment. ALL-CAPS the domain keywords (states/entities like OPEN, CLOSED, EMAIL, PDF, CSV; integration-partner names from `variants.values`, e.g. PARTNER-A, PARTNER-B; environments QA, STAGING, PRODUCTION), matching the house title habits recorded during discovery. Bracket a client id when client-specific (`clientIdFormat`, e.g. `Contoso Outdoor [10001]`). No "should", no question phrasing, no speculation, no `[Module] - [Feature]` prefix. Pick the frame that fits:

- `<thing> not working` / `<thing> is/are not <verb>ing`
- `Unable to <verb>`   ·   `<thing> is not <correct>`
- `Error <doing X>`   ·   `Able to <do invalid thing>` (for things that should be blocked but aren't)

API-molded examples (match this style):
- `POST orders returns 500 on QA environment`
- `Unable to CREATE order via POST orders on PARTNER-B QA environment`
- `orders response is missing the required id field on QA environment`
- `Able to CREATE an order without a required contact via POST orders on QA environment`
- `GET orders returns 401 for a valid bearer token on QA environment`
- `CLOSED invoices are syncing as OPEN from PARTNER-B on STAGING environment`

### Severity (exactly one)

- **Critical** — data loss, security exposure, a full endpoint/module blocked.
- **High** — core endpoint broken, no clean workaround.
- **Medium** — endpoint works but the response is incorrect/partial (e.g. a contract field wrong or missing).
- **Low** — cosmetic/minor deviation (rare for API).

### Repro steps — everything goes here, environment-first

`preconditions` is ALWAYS `""`; all setup goes into `reproSteps` as the first steps. Rules:

- Imperative, third-person, atomic — ONE action per item. "Send a POST request to /api/orders/tenants/{id}/orders with a valid payload." not "POST and check the response".
- Childlike granularity — each request and each setup action is its own step.
- **Step 1 names the variant + environment (and client id when known):** "Authenticate to the API as <role> on Client <id> on the QA environment." or "Go to PARTNER-B QA environment.", then one step per setup action (mint/seed the required record, capture ids), then the request that triggers the failure as the last step.
- Reference exact routes, methods, params, headers, and field names verbatim (`POST /api/orders/.../orders`, `Authorization` header, `tenantId`, `status`). Leave the broken result out of the steps — it belongs in `observations`.

### Expected vs Observations

- **expected** — the correct resolved state, pulled from the case/contract. Definitive ("POST orders returns 201 with the created order."), never "should". This renders as the bug's acceptance line: *"I know this bug is resolved when: <expected>"*.
- **observations** — the actual, as an ARRAY of DISTINCT facts, each ONE bullet, definitive. Put each technical signal in its own bullet: e.g. `["Response status is 500 Internal Server Error", "Response body is empty", "A subsequent GET orders does not include the new record"]`. For a contract failure, one bullet per `safeParse` issue (`"items[0].id is missing (zod: Required)"`). This renders under a bold **OBSERVATION:** header.

### Suggested fix (optional)

Concrete and code-aware if a code snippet was provided ("Return `id` from the create handler before serializing `OrderResponse`."). Leave `""` if no high-confidence suggestion.

### Voice

Definitive, neutral. No emoji, no greetings, no "Note:", no hedging, no em/en dashes. Exact identifiers verbatim. **One bug = one issue** — if the failure surfaces multiple distinct deviations, output multiple bugs.

## The find-bugs module (where drafts live)

Save drafts under a `find-bugs/` module in the `automation/` repo (create it if absent; everything stays under `automation/` — the isolation boundary). Confirm the path with the user before writing.

```
find-bugs/
  README.md                       # the flow: red run → triage → draft → review → push
  drafts/<slug>.json              # the machine record (BugDraft shape + triage + source)
  drafts/<slug>.md                # a rendered preview of exactly what ADO will show (for review)
```

Draft JSON (mirrors the framework's BugDraft; `status` starts `Draft`, `adoBugId` null):

```json
{
  "title": "POST orders returns 500 on QA environment",
  "severity": "High",
  "preconditions": "",
  "reproSteps": ["Authenticate to the API as an ADMIN on Client 10001 on the QA environment.", "Send a POST request to /api/orders/tenants/10001/orders with a valid payload.", "Read the response status."],
  "expected": "POST orders returns 201 with the created order.",
  "observations": ["Response status is 500 Internal Server Error", "Response body is empty", "No order is created"],
  "suggestedFix": "",
  "status": "Draft",
  "adoBugId": null,
  "source": { "spec": "modules/orders/api/tests/endpoints/orders-create.spec.ts", "tracesCase": "Sales - Orders - Verify that POST orders creates an order successfully.", "adoTestCaseId": null, "level": "endpoint" },
  "triage": { "classification": "real_bug", "confidence": "high", "reason": "A valid create payload returns 500 and persists nothing; the endpoint is at fault." }
}
```

## Rendered ADO anatomy (what the reviewer sees, and what push will file)

When pushed, the draft maps to an ADO **Bug** ($Bug) with this frozen field order — render the `.md` preview to match so review == the real thing:

1. `System.Title` = title
2. `Microsoft.VSTS.TCM.ReproSteps` = repro HTML — env-first steps as `<ul><li>…</li></ul>`, then `<div><b>OBSERVATION:</b></div><ul><li>…</li></ul>` (one `<li>` per observation), then `<div><i>[Attach screenshot/GIF here]</i></div>`. (`preconditions` is empty, so no preconditions line.)
3. `Microsoft.VSTS.Common.Severity` = `1 - Critical` | `2 - High` | `3 - Medium` | `4 - Low`
4. `System.AreaPath` = the delivery board (`boards.delivery.areaPath`) for QA/Staging failures, or the support board (`boards.support.areaPath`) when the failure is on PRODUCTION / live clients
5. `Microsoft.VSTS.Common.Priority` = `2`
6. `Microsoft.VSTS.Common.ValueArea` = `Business`
7. Every other field the org populates on Bugs (`fields.bug`), each set to its typical value from the profile; an owner/QA field takes `identity`
8. For a picklist field that records how the bug was found (if `fields.bug` has one), use its typical manual value from the observed `values` (picklists reject arbitrary values like "Automated Test"; the automation provenance goes in System Info)
9. *(optional)* `Microsoft.VSTS.Common.AcceptanceCriteria` = `I know this bug is resolved when:` + `<ul><li>expected</li></ul>`
10. *(optional)* `Microsoft.VSTS.TCM.SystemInfo` = `Suggested fix:` (if any) + a **"How this bug was found"** block: filed from a failed Playwright API test, the spec/test name, the `traces-case`/ADO Test Case #, the triage verdict + confidence + reason, and the exact failing assertion message.

Severity string mapping is exact: `Critical→"1 - Critical"`, `High→"2 - High"`, `Medium→"3 - Medium"`, `Low→"4 - Low"`.

## Push later (do not auto-push)

Present the draft(s) for review; let the user edit and Approve/Reject. When they choose to file, hand off:

- Give the drafted fields to the user's tracker-filing tool, targeting the delivery board for QA/Staging regressions and the support board when the failure is on PRODUCTION / live clients.
- Or file directly via ADO tooling using the field map above (create `$Bug` in `tracker.project`, then link **Related** to the source `adoTestCaseId` if known). On success, set the draft `status` to `Pushed` and record `adoBugId`.

## After drafting

Show each drafted bug (title, severity, repro, expected, observations) grouped by triage verdict, with the non-real_bug failures listed as classified-but-not-filed. Ask: "Push any of these to ADO?" Only write the `find-bugs/` files (and only under `automation/`) after confirming the path. For authoring or fixing the API cases/scripts themselves, use the `api-tester` sibling.
