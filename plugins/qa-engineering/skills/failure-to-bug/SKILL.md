---
name: failure-to-bug
description: Native skill of the qa-engineering — when a test fails (API or UI), act as a senior SQA analyst: investigate the failure from its real evidence (the assertion/stack, logs, and for UI the Playwright trace, screenshot, video and error-context), classify it honestly (real product bug / flake / environment / test defect), and only for a real bug draft a review-ready defect in the team's house format and file it through a GATED write (draft → approve → dry-run → confirm) — never auto-filed. Product-neutral and tracker-agnostic (Azure DevOps $Bug is the implemented filing path); the defect format comes from the house-profile defectFormat slot. Use whenever a test (contract/endpoint/workflow or UI smoke/regression/e2e) fails and the user wants it investigated or a bug drafted/filed, when the user pastes a failed test's output, an assertion error, a schema-validation error, a non-2xx response, or a Playwright trace/screenshot, or says "draft a bug for this failure", "investigate this red run", "the UI test failed, write it up", "turn this failure into a bug and file it". Reads the qa-context failures slice, writes the bugs slice. It investigates + drafts + files defects; it does not author test cases (author-api-cases / author-ui-cases) or publish them (ado-publish).
---

# Failure -> Investigation -> House-Style Bug (API + UI)

When a test goes red — API or UI — a senior SQA analyst does not paste the stack trace into the tracker. They **investigate** from the real evidence, decide whether it is a real product bug, and only then write a bug a developer can reproduce and a reviewer can approve. Take a failed test plus its evidence, **investigate + classify** it, **draft** a real bug in the house format below, and **file it through a gated write**.

This is a native skill of the `qa-engineering`. It follows the kit's framework standards (`framework-standards` / `knowledge/standards/`), so failures are read against how the kit structures and runs tests.

> **GATED filing by rule.** Drafting is free; **filing is a tracker write** and happens only after the QA approves the draft AND confirms a dry-run of exactly what will be written — the same discipline as `ado-publish` (see `skills/ado-publish/references/publish-gates.md`). The lifecycle is `Draft -> Approved -> Dry-run -> Confirmed -> Filed`. **Never auto-file.**

> **Product-neutral by rule.** Examples (orders, QA) are placeholders. The defect **type, title convention, required fields, severity scale and repro shape come from the house-profile `defectFormat` slot**, read at run time (neutral fallback, flagged) — never hard-coded. No real product, org, URL, account or credential belongs in this skill or in anything it files to a committed file. `references/bug-format.md` maps the draft fields to common trackers.

## Inputs to gather

- **The failing test** — its title/behavior (a `Verify that ...` case title if available), its **domain** (API or UI) and **level** (contract/endpoint/workflow or smoke/regression/e2e), and its `traces-case:` tag (so the bug can link back to the case).
- **The failure evidence** — read the *real* artifacts, not just the one-line error:
  - **API** — the failing assertion (expected status 201, received 500), the response status/body, and for a contract failure the schema-validation errors; any server log.
  - **UI** — the **Playwright trace** (`trace.zip`: actions, network, console, DOM snapshots), the **screenshot** at failure, the **video** if recorded, the **error-context** (the ARIA/DOM snapshot Playwright writes beside a failure), and the console/network from the trace. Read what the trace actually shows the app doing.
- **Context** — the route (method + path) or the screen/locator, the schema, the environment/account the run used, and (optional) the relevant code snippet for a suggested fix. Pull from the `failures` slice when present (`{ specPath, title, assertion, status }`); read it from `qa-context.json`, never a chat block a compaction may have dropped.

## Phase 1: Investigate, then classify (never skip to drafting)

Not every red test is a product bug. **Investigate from the evidence first** — reconstruct what the test did and what actually happened (for UI, step through the trace actions/network/console and the failure snapshot; for API, read the request and the real response), then classify. See `references/investigation-guide.md` for reading each domain's evidence and the classification rubric.

- **real_bug** — the product behaved incorrectly: wrong/missing validation, a broken action, wrong data, a 5xx, a contract violation (missing/wrong-typed documented field), or (UI) the app showed the wrong state or an error a real user would hit. The **product** is at fault. -> draft a bug.
- **flaky** — timing/non-determinism (a transient network blip, a race, an intermittent timeout, an animation or request not awaited), not a consistent defect. -> no bug; note it with the evidence.
- **environment** — infra/config/data, not the product under test (a down dependency, a bad seed, an expired token, the wrong base URL). -> no bug; name the env cause.
- **test_defect** — the test/route/schema/locator is wrong or stale-by-assumption (incl. a changed requirement the test still encodes); the product is fine. -> fix the test (hand back to `author-api-cases` / `author-ui-cases`), no bug.

State `classification`, `confidence` (high/medium/low), and a one-or-two-sentence `reason` **grounded in the evidence you read**. **Only `real_bug` produces a drafted bug**; record the verdict for the others. Classify **fail-safe**: when you cannot tell real-vs-flake/env with confidence, say so and do **not** draft or file — report it for the QA to judge. A wrongly-filed flake is worse than an unfiled real bug the QA can still file by hand.

## Phase 2: Draft the bug (house format)

Draft fields (the frozen shape): `title`, `severity`, `preconditions` (ALWAYS `""`), `reproSteps` (array of plain strings), `expected`, `observations` (array — the actual, one fact per bullet), `suggestedFix` (optional).

### Title — declarative negative-state statement (NOT `[Module] - [Feature]`)

State plainly what is broken, name the endpoint (API) or the screen/action (UI), and END with the environment. ALL-CAPS the domain keywords (states/entities like OPEN, CLOSED, EMPTY; environment names QA, STAGING, PRODUCTION). No "should", no question phrasing, no speculation, no `[Module] - [Feature]` prefix. Pick the frame that fits:

- `<thing> not working` / `<thing> is/are not <verb>ing`
- `Unable to <verb>`   -   `<thing> is not <correct>`
- `Error <doing X>`   -   `Able to <do invalid thing>` (for things that should be blocked but are not)

Examples (match this style):
- API — `POST orders returns 500 on QA environment`
- API — `orders response is missing the required id field on QA environment`
- API — `Able to CREATE an order without a required customer via POST orders on QA environment`
- UI — `Pipeline list does not refresh after creating a pipeline on QA environment`
- UI — `Able to SAVE a deal without a required customer on QA environment`

### Severity (exactly one)

- **Critical** — data loss, security exposure, a full endpoint/module blocked.
- **High** — core endpoint broken, no clean workaround.
- **Medium** — the operation works but the result is incorrect/partial (an API contract field wrong or missing; a UI showing stale or wrong data).
- **Low** — cosmetic/minor deviation (more common for UI than API).

(These map to the `defectFormat.severityScale` slot; if the profile defines a different scale, use it and say so.)

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
  "tracesCase": null,
  "tracesStory": null,
  "source": { "test": "Orders - Orders - Verify that POST orders creates an order successfully.", "domain": "api", "level": "endpoint", "failingAssertion": "expect(res.status()).toBe(201) // received 500" },
  "triage": { "classification": "real_bug", "confidence": "high", "reason": "A valid create payload returns 500 and persists nothing; the endpoint is at fault." }
}
```

`tracesCase` resolves to the failing test's case — its `adoCaseId` when known (from the `cases` slice /
`traces-case:` tag), else the case title; `tracesStory` is the story behind that case. They become the
`bugs` slice's link keys.

## Where the defect format comes from (read, never hard-code)

Read the defect shape from the house-profile **`defectFormat`** slot (`knowledge/orchestration/house-profile.md`):
`type` (work-item type, default `Bug`), `titleConvention`, `requiredFields`, `severityScale`, repro shape. A
blank slot → the neutral default in this skill + `references/bug-format.md`; say the default is in use. The
tracker project/area and identity come from the `tracker` / `identity` slots. Never hard-code a project,
area, field name or severity string.

## Gated filing — a draft never auto-becomes a work item

Filing a bug is a tracker **write**; it runs only through the same gate discipline as `ado-publish`
(`skills/ado-publish/references/publish-gates.md`). In order, stop at each gate:

### 1. Present the drafts for approval — GATE 1
Show each `real_bug` draft (title, severity, repro, expected, observations), and list the non-real_bug
failures as **classified-but-not-filed** (with their verdict + evidence). Let the QA edit, then ask a single
gate:
> **"Approve this bug to file it? Reply *approve*, or tell me what to change."**

Only an explicit *approve* proceeds; a change request re-drafts and re-asks. Never treat "ok"/silence as
approval. Record `status: "Approved"`.

### 2. Dry-run — exactly what will be written (NO write yet)
For each approved bug, show: the **work-item type** (`defectFormat.type`, default `Bug`); every **field** that
will be set (title, the repro HTML, the severity string, area/iteration, any `defectFormat.requiredFields`,
the acceptance line, the "how found" provenance — per `references/bug-format.md`); and the **links** to be
made — to the source **case** (`tracesCase` → its `adoCaseId` when known) and **story** (`tracesStory`).
State plainly: **nothing has been written yet.** If a required-field value is unknown (a picklist, a QA
owner), **ask here — do not guess** (picklists reject arbitrary values).

**Idempotency check (surface up front).** If the `bugs` slice already holds an entry for this `tracesCase`
(or a matching title) that carries an `id`, this failure was **already filed** — flag it and **offer to skip
or relink**, not re-file. Re-running a red test is the common case; a second file of the same failure must
not silently create a duplicate bug.

### 3. Confirm — GATE 2 (the only unlock)
> **"File these N bug(s) to `<project>` as `<type>`, and link them to their case/story? Nothing has been
> written yet."**

Only an explicit yes unlocks the writes below. One yes covers the previewed list; a changed set needs a
fresh dry-run and confirm.

*Everything below runs only after gate 2's yes. No yes → stop here.*

### 4. Create + link (WRITE)
For each approved bug:
- **`wit_create_work_item`** with `workItemType` = `defectFormat.type` (default `Bug`), setting the mapped
  fields per `references/bug-format.md` (title, `Microsoft.VSTS.TCM.ReproSteps` HTML, severity, area, the
  optional acceptance + provenance). **Honest outcome:** a bug counts as filed only when the API returns its
  id; a per-bug failure is reported, never glossed.
- **`wit_work_items_link`** from the new bug to its source **case** with `type: "related"` (a bug *relates
  to* the case it was found through — **not** `tests`), and to the **story** if `tracesStory` is set. If a
  relation is rejected, fall back to `related` and say which was used. Report only links the API confirmed.

### 5. Write the qa-context `bugs` slice + return
Per `knowledge/orchestration/qa-context.md`, write the `bugs` slice additively (never clobber another
engine's slice): each item `{ id: <filed id>, title, tracesCase, tracesStory, status: "Filed" }`. A
`real_bug` approved but not yet filed stays `status: "Approved"` (and a drafted-but-unapproved one
`"Draft"`, per the lifecycle); a non-real failure is recorded with its verdict, not as a bug. The thread stays linked: `cases.items[].adoCaseId ⇄ bugs.items[].tracesCase`. Return
the filed ids + a per-bug summary (filed ✓/✗, linked ✓/✗, relation used), reporting only what the API
returned. For authoring or fixing the cases themselves, use `author-api-cases` / `author-ui-cases`.

## Safety rules (load-bearing — state and obey)
1. **Never auto-file.** No `wit_create_work_item` or link runs before gate 2's explicit confirm. Drafting —
   and even approving the draft at gate 1 — is not permission to write; the dry-run + gate-2 confirm is.
2. **Only `real_bug` is filed.** A flake / environment / test_defect / uncertain verdict is reported, never
   filed as a bug.
3. **Idempotency / re-run.** Before creating, check the `bugs` slice: if a bug for this `tracesCase`/title
   already carries an `id`, **offer to skip or relink** rather than double-filing. A second file of the same
   failure must not silently produce a duplicate bug (the same rule `ado-publish` applies to cases).
4. **Honest outcomes.** Claim a create/link only from the API response; surface per-bug and partial failures.
5. **Profile-driven; nothing hard-coded.** Type, fields, severity scale, area and identity come from the
   profile; a blank slot is the neutral default, named for the QA to fill — never a remembered real value.
6. **Product-neutral + secret-free.** Generic examples only; secrets stay in `.env`, the tracker signs in
   interactively.

## Reference files

- `references/investigation-guide.md` — how to read a failure's evidence per domain (API response/log; UI trace/screenshot/video/error-context) and the classification rubric (real_bug / flake / environment / test_defect).
- `references/bug-format.md` — the rendered bug anatomy and field mapping per tracker (Azure DevOps, Jira, generic).
