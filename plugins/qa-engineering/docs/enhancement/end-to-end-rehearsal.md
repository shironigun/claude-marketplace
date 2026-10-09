# End-to-end rehearsal — the whole loop, slice by slice

A **documented trace** of the full QA loop through every engine, proving the hand-offs chain: each engine
reads the `qa-context` slice(s) it depends on and writes its own, and every human gate fires where it should.
This is a **rehearsal on paper**, not a live run — the committed plugin is product-neutral and does not touch
a real tracker or app. All names (Orders, `#0000`, `Plan/Suite Name`) are generic placeholders; the real
values come from the QA's git-ignored `house-profile.json` and `.env`.

> How to read it: each step shows **intent → engine → gate(s) → the `qa-context` slice after the step**.
> Slices are additive; a step only writes its own slice (and the traceability links). Follow one `tracesStory`
> (`"0000"`) from a story all the way to a filed bug.

---

## Step 1 — Analyze the story  (intent: "analyze #0000")
- **Engine:** `story-intelligence` (read-only; no tracker writes).
- **Reads:** nothing in qa-context yet; pulls the work-item graph from ADO ($expand relations, comments,
  revisions, children).
- **Gate:** ends at the **gaps gate** — surfaces open requirement gaps/ambiguities; never invents.
- **qa-context after:**
  ```json
  { "story":  { "id": "0000", "analysis": "Create/read/update an order…", "gaps": ["soft-delete status unconfirmed"] },
    "review": { "verdict": "testable", "risks": ["soft-delete semantics"], "coverageGaps": ["negative: duplicate order"] } }
  ```

## Step 2 — Author the cases  (intent: "create test cases for #0000")
- **Engine:** `author-api-cases` and/or `author-ui-cases` (consume the shared `knowledge/authoring/house-style.md`;
  read the `caseAuthoring` profile slot).
- **Reads:** `story`, `review`.
- **Gate — the approval seam:** drafts with `approved:false`; asks the **single approve gate**; sets
  `approved:true` only on an explicit *approve* (resets on any change).
- **qa-context after** (adds the `cases` slice):
  ```json
  { "cases": { "approved": true, "mdPath": "cases/orders.md", "coverage": "contract+endpoint+workflow",
      "items": [ { "title": "Orders - Orders - Verify that POST orders creates an order successfully.",
                   "level": "endpoint", "tags": ["@orders","@api"], "tracesStory": "0000", "adoCaseId": null } ] } }
  ```
  → `cases.items[].tracesStory` links each case back to the story.

## Step 3 — Publish the approved cases  (intent: "push these to ADO")
- **Engine:** `ado-publish` (the first gated **write** path).
- **Reads:** `cases` — **refuses unless `cases.approved === true`** (fail-closed).
- **Gates:** confirm intent (gate 1) → pick Plan/Suite from `testplan_list_test_plans/suites` → **dry-run** of
  exactly what will be written → **explicit confirm (gate 2)** — the only unlock. Then
  `wit_create_work_item` (TCM Steps XML + tags) → `testplan_add_test_cases_to_suite` →
  `wit_work_items_link type:"tests"` (case *tests* story).
- **qa-context after** (adds `ado`; stamps `adoCaseId` back onto the case):
  ```json
  { "cases": { "items": [ { "…": "…", "adoCaseId": "12345" } ] },
    "ado":   { "plan": "Plan Name", "suite": "Suite Name", "published": [ { "caseTitle": "Orders - Orders - …", "adoCaseId": "12345" } ] } }
  ```
  → idempotency + the thread now key on `adoCaseId`.

## Step 4 — Automate the cases  (intent: "automate these cases")
- **Engine:** `automation-engine` (reuses `docs/script-generation.md` + the Standards; does not re-generate
  the rules).
- **Reads:** `cases` (**fail-closed on `approved`**) and the `framework` slice (reusable building blocks); may
  instead pull an ADO suite read-only via `testplan_list_test_cases`.
- **Gate:** generation self-check → the independent `framework-reviewer` + `reuse-guardian` gate (Blocking
  stops generation) before verify.
- **qa-context after** (adds `automation`); each spec maps the case's `level` → folder + tag, and carries a
  `traces-case:` line:
  ```json
  { "automation": { "levels": ["endpoint"],
      "specs": [ { "path": "modules/orders/api/tests/endpoints/create.endpoint.spec.ts", "level": "endpoint", "tracesCase": "12345" } ] } }
  ```
  → `automation.specs[].tracesCase` = the case's `adoCaseId` (else title).

## Step 5 — A run goes red  (the test suite executes)
- The run captures the failure into the `failures` slice (each `{ specPath, title, assertion, status }`):
  ```json
  { "failures": { "runs": [ { "specPath": "modules/orders/api/tests/endpoints/create.endpoint.spec.ts",
      "title": "Orders - Orders - Verify that POST orders creates an order successfully.",
      "assertion": "expect(res.status()).toBe(201) // received 500", "status": "failed" } ] } }
  ```

## Step 6 — Investigate → bug  (intent: "turn this red run into a bug and file it")
- **Engine:** `failure-to-bug` (API **or** UI).
- **Reads:** `failures` (and the artifacts — API response/log; UI trace/screenshot/video/error-context).
- **Investigate → classify (fail-safe):** only a confirmed `real_bug` drafts; a flake/env/test_defect/
  uncertain verdict is reported, not filed.
- **Gates (second gated write path):** approve the draft (gate 1) → **dry-run** (type, fields, links,
  idempotency check) → **explicit confirm (gate 2)**. Then `wit_create_work_item` (`defectFormat.type`) →
  `wit_work_items_link type:"related"` to the case (a bug *relates to* its case) + story.
- **qa-context after** (adds `bugs`):
  ```json
  { "bugs": { "items": [ { "id": "67890", "title": "POST orders returns 500 on QA environment",
      "tracesCase": "12345", "tracesStory": "0000", "status": "Filed" } ] } }
  ```

---

## The thread, end to end
```
story #0000
  └─ story.id "0000"
       └─ cases.items[].tracesStory "0000"  ── approved ──▶  ado.published[].adoCaseId "12345"
             └─ cases.items[].adoCaseId "12345"
                   └─ automation.specs[].tracesCase "12345"
                         └─ failures.runs[] (same spec path)
                               └─ bugs.items[].tracesCase "12345" / tracesStory "0000"  (status: Filed)
```
Every arrow is an id/tag carried in `qa-context`, written by the engine that owns that slice and read by the
next — so "push *these*", "automate *these*", and "file a bug for *this* failure" always resolve to the right
work, across sub-agent hand-offs and context compactions.

## Where the gates fire (the QA is in control at every write)
| Gate | Step | What it guards |
|---|---|---|
| Gaps gate | 1 | story-intelligence surfaces gaps; never invents a requirement |
| Approval seam (single approve gate) | 2 | cases aren't publishable until explicitly approved (`cases.approved`) |
| Publish gate 1 + dry-run + gate 2 | 3 | no Test Case is created before the QA confirms the dry-run |
| Review/reuse gate | 4 | generated specs pass the independent reviewer (no duplication) before verify |
| Investigate fail-safe | 6 | only a confirmed real_bug proceeds; flake/env/uncertain is never filed |
| Bug gate 1 + dry-run + gate 2 (+ idempotency) | 6 | no bug is filed before the QA confirms; a re-run never double-files |

## The build path (one workflow, same thread)
The brick-by-brick **build** (`scan-and-confirm` → `kit-builder`, phases 0–5) is one routed workflow, not a
separate loop: phase 0 writes `flow-map.json` (referenced by `qa-context.module.mapRef`), phases 2–3 author
cases and generate specs **to the same Standards** the `automation-engine` uses, and phase 4 publishes +
links through the same gated `ado-publish` / `failure-to-bug`. Build-seeded or case-seeded, the specs, the
levels, the Standards, and the traceability thread are identical.

## Honesty note
This rehearsal demonstrates the **contracts and gates**, not a live execution. On a real engagement the ids,
plan/suite, fields and environment come from the QA's `house-profile.json` + `.env`, the ADO/Playwright MCPs
sign in interactively, and every tracker write still waits for the QA's explicit confirm.
