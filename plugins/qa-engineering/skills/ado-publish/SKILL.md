---
name: ado-publish
description: Native WRITE engine of the qa-engineering — take QA-approved test cases from qa-context and publish them to a chosen Test Plan + Suite in the tracker, then link each back to its story and return the created ids. Every write is GATED: nothing is created, added, or linked until QA sees a dry-run preview of exactly what will be written and gives an explicit confirm. Product-neutral and tracker-agnostic (Azure DevOps is the implemented path); the project, default plan/suite, link kind and field mapping all come from the house-profile, never hard-coded. It publishes approved cases — it does not author them. Use whenever the user wants to "push cases to ADO", "publish these test cases", "file these in a suite", "add these to a test plan", "add my cases to the test suite", or names a Test Plan/Suite together with approved cases to push. It reads the qa-context cases slice and writes the qa-context ado slice (plan, suite, created ids). Do NOT use it to write or approve cases (that is author-api-cases / author-ui-cases) or to turn a failure into a bug (failure-to-bug).
---

# ADO Publish — gated Test Plan/Suite publishing + add-to-suite + link

Take test cases **QA has already approved**, let QA pick a **Test Plan + Suite**, show them a
dry-run of exactly what will be written, get an explicit yes, and only then **create the Test Cases,
add them to the suite, and link them to the story** — returning the created ids. This is the
`qa-engineering`'s **first write path**, so its whole design is a gate: a QA is in control of every
write, and no work item appears in the tracker that the QA has not previewed and confirmed.

This engine **publishes**; it does not author. It consumes approved cases from `qa-context` regardless
of which authoring engine produced them (`author-api-cases` / `author-ui-cases`). If the cases are not
there or not approved, it stops and says so.

> **GATED WRITE by rule.** Every tracker call in steps 1–5 is a **read** or a presentation. The first
> write — a create, an add-to-suite, or a link — happens **only after** the dry-run preview (step 4)
> and the QA's explicit confirm (gate 2, step 5). There is no path in this skill where a write runs
> before that confirm. No "I'll just create them". See `references/publish-gates.md`.

> **Product-neutral by rule.** The examples below (Orders, widgets, `Plan Name`, `Suite Name`,
> `YOUR_ORG`) are generic placeholders. The real tracker, project, plan, suite, link kind, field
> mapping and identity come from the QA's git-ignored **house-profile**
> (`knowledge/orchestration/house-profile.md`), read at run time — never hard-coded here. No real
> company, product, board, URL, account or credential belongs in this skill or in anything it writes
> to a committed file.

## Where the specifics come from (read, never hard-code)

Read every product/tracker specific from the house-profile slots; if a slot is blank, **offer** the
neutral default and name the slot the QA should fill — never reach for a remembered real value, and
never hard-code a project, plan, suite, org, link kind or field name.

| What you need | House-profile slot | If blank |
|---|---|---|
| Tracker kind (`azure-devops` / …), org, project | `tracker.kind`, `tracker.org`, `tracker.project` | Ask which tracker/project; name the `tracker` slot. No publish without it |
| Area / iteration the cases land on | `tracker.areaPath`, `tracker.iterationPath` | Degrade to the source story's area; say so |
| **Default** test plan + suite (names, ids if known) | `testPlan.planName/planId`, `testPlan.suiteName/suiteId` | Offer nothing as default; QA must pick from the listed plans/suites |
| Test-case field mapping (title convention, step/expected shape, tags) | `caseAuthoring.titleConvention`, `caseAuthoring.stepFormat`, `caseAuthoring.tags` | Use the neutral mapping in `references/test-case-field-mapping.md`; flag the assumption |
| Link kind (case → story relation) | the profile's tracker link convention | Default = the case *tests* the story — `wit_work_items_link type: "tests"`, or `testplan_create_test_case testsWorkItemId` at create; say which was used |
| Author / assignee handles | `identity.author`, `identity.assignTo` | Leave unset; say the field was left to the tracker default |

The tracker is "whatever the house-profile points at". The ops below are the ones the plugin's ADO MCP
exposes; for a different tracker the orchestrator supplies the equivalent connector — the **flow**
(load approved cases → confirm → list + pick plan/suite → dry-run → confirm → create → add-to-suite →
link → write context) is identical.

## The gated flow — in order, stop at each gate

### 1. Load the approved cases (READ qa-context)
Read the `cases` slice from `qa-context.json` at the framework root (**from the file**, never from a
chat block a compaction may have dropped), per `knowledge/orchestration/qa-context.md`. The slice is
`{ approved, items[], mdPath, coverage }`, each item `{ title, level, tags[], tracesStory, adoCaseId? }`.

- If the `cases` slice is **absent**, or holds no items, **STOP**:
  > "I publish approved cases — there are none in the context yet. Author them first
  > (`author-api-cases` / `author-ui-cases`), then come back to publish."
- If the cases are present but **not approved** — the slice's **`approved`** flag is anything other than
  `true` (missing, `false`, or `null`) — **STOP**:
  > "I publish *approved* cases — these aren't approved yet (`cases.approved` isn't set). Approve them
  > first, then I'll publish."

`approved` is the one field that unlocks loading; it is set upstream by the authoring/approval step, never
here. Treat an absent `approved` as not-approved — fail closed, never assume consent.

**SP7 does not author and does not approve.** It never writes a title, a step, or an expected result;
it never marks a case approved. Authoring and approval are upstream. If the cases look thin, say so and
send the QA back to the authoring engine — do not fill the gap.

### 2. Confirm intent — GATE 1 (READ / present)
Present the N cases to publish — for each: the title, its level, its tags, and the story it traces
(`tracesStory`). Then ask:

> **"Publish these N cases to ADO?"**

Wait for a yes. A non-answer, "ok", or silence is not a yes — re-ask. This gate confirms *which cases*;
it is not yet permission to write (that is gate 2, after the dry-run).

### 3. Pick the target plan + suite (READ the tracker)
Read-only, list what exists so the QA chooses against real options — do not assume:

- `testplan_list_test_plans` for the house-profile project → show the plans.
- `testplan_list_test_suites` for the chosen plan → show the suites.

Present them. **Offer** the house-profile `testPlan` default (plan + suite) as the recommended pick
*with the reason* — but it is an offer, never an assumption; the QA picks the plan **and** the suite.
Creating a **new** suite is supported **only if the QA explicitly asks** — then (and only inside the
confirmed write phase, after gate 2) `testplan_create_test_suite` is used; never create a suite
unasked.

### 4. Dry-run preview — show EXACTLY what will be written (NO writes yet)
Before any write, show the QA the full plan of record. For **each** case, list:

- the **title** (rendered per the house-profile title convention),
- the **target** plan + suite it will be added to,
- the **story** it will link to (`tracesStory`) and the **link kind** that will be used,
- the **field mapping** — which case content lands in which tracker field, e.g. the Action/Expected
  pairs rendered into ADO `Microsoft.VSTS.TCM.Steps`, plus area/iteration, tags and assignee
  (per `references/test-case-field-mapping.md`).

Also surface, up front:
- **A new suite, if one will be created** — if the QA asked for a new suite in step 3, name it
  explicitly here as one of the writes to be performed (`testplan_create_test_suite`), so it appears in
  the preview and is covered by the single gate-2 confirm; never create a suite that wasn't in the
  dry-run.
- **Idempotency check** — if any case already carries an **`adoCaseId`** (or matches a `published[]`
  entry in the `ado` slice by `caseTitle`), it was created on a prior run: flag each such case and
  **offer to skip or relink it**, not re-create it (see the idempotency rule). This per-case id is the
  key that makes a re-run safe.
- **Nothing has been written yet.** State that explicitly.

### 5. Confirm the target — GATE 2 (the only unlock)
Present the dry-run and ask for an explicit yes:

> **"Create these N Test Cases in `<plan>` / `<suite>`, link them to their stories, and add them to the
> suite? Nothing has been written yet."**

**Only an explicit yes here unlocks the writes below.** Until this yes, no `create`, no
`add_test_cases_to_suite`, no `link` has run or may run. One yes covers the previewed list only — a
changed selection needs a fresh dry-run and a fresh confirm.

---

*Everything below runs **only after** gate 2's explicit yes. If there is no yes, stop here.*

### 6. Create the Test Cases (WRITE)
For each previewed case, create a Test Case work item with the mapped fields. The two create tools are
**not interchangeable** — pick by whether you need the native Steps XML, tags and assignee:

- **To carry `Microsoft.VSTS.TCM.Steps` XML, `System.Tags`, or `System.AssignedTo`, use
  `wit_create_work_item`** with `workItemType: "Test Case"`, passing those as `fields` alongside
  `System.Title`, `System.AreaPath`, `System.IterationPath`. Only `wit_create_work_item` accepts raw
  TCM Steps XML and arbitrary fields — build the Steps XML per
  `references/test-case-field-mapping.md`.
- **`testplan_create_test_case` takes `steps` only as a pipe-delimited string** (`"1. action|expected"`,
  one step per line) — **not** raw TCM XML — and exposes no Tags/AssignedTo param, but it can set the
  case→story link at create via `testsWorkItemId` (see step 8). Use it when pipe-delimited steps are
  enough and you want the link set in the same call; do **not** hand it the XML.
- If the Steps field is rejected either way, fall back to the case body in `System.Description` and
  **say so** per the mapping reference — do not drop the case.
- Record each returned id. **Honest outcome:** a case counts as created only when the API returns its
  id; a per-case failure is reported as a failure, never glossed.

### 7. Add the created cases to the suite (WRITE — the unlock)
`testplan_add_test_cases_to_suite` with the chosen plan + suite and the ids from step 6. This is the
step the old `file-to-tracker` had to leave as a manual UI task; the shipped ADO MCP exposes it, so
SP7 does it. Report the suite-add result per case from the API response — do not assume it succeeded.

### 8. Link each case to its story (WRITE — may already be done)
If step 6 created the case with `testplan_create_test_case` and passed `testsWorkItemId`, the case→story
(Tested By) link was already set at create — this step is then a **no-op**; just confirm it from the
response. Otherwise (the `wit_create_work_item` path) link it now:

- `wit_work_items_link` from the created case to its `tracesStory`, with **`type: "tests"`** — the
  friendly relation enum this tool expects (the case *tests* the story). Do **not** pass
  `Microsoft.VSTS.Common.TestedBy-Reverse` here; that reference name is what
  `testplan_create_test_case.testsWorkItemId` uses, not `wit_work_items_link`. If the house-profile
  overrides the link kind, use its value.
- If the relation is rejected, fall back to `type: "related"` and **tell the QA** which relation was
  actually used. Report only links the API confirmed.

### 9. Write the qa-context `ado` slice + return (context write)
Per `knowledge/orchestration/qa-context.md`, write the `ado` slice back into `qa-context.json` at the
framework root, additively (never clobber another engine's slice), **and** stamp each created case's id
back onto its `cases.items[]` entry:

- **`ado`** = `{ plan, suite, published[] }` — the chosen plan + suite and, per published case,
  `{ caseTitle, adoCaseId }` (the case→id key).
- **`cases.items[].adoCaseId`** — write each returned id back onto the matching case item (match on the
  item the create came from, not on title alone). This is the key a re-run's idempotency check (step 4)
  and the automation engine read to find a case's ADO id.

Keep the traceability thread intact — each created case already carries its `tracesStory`, so the chain
`story.id ⇄ cases.items[].tracesStory ⇄ cases.items[].adoCaseId / ado.published[]` stays linked for the
automation engine and the traceability thread. Writing these is a **context-state write at the framework
root — not a tracker write**; it is still only reached after the writes it records.

Then **return** to the QA: the created ids and a **per-case summary** — created ✓/✗, added-to-suite
✓/✗, linked ✓/✗ (and the relation used) — reporting only what each API call actually returned, with any
partial or per-case failure called out plainly.

## Safety rules (load-bearing — state and obey)

1. **Never auto-run.** No write op (`create`, `add_test_cases_to_suite`, `create_test_suite`, `link`)
   runs before gate 2's explicit confirm. There is no "I'll just create them", no silent publish, no
   skipping the dry-run. Steps 1–5 are reads and presentation only.
2. **Idempotency / re-run.** Before creating, check for an existing id: if a case already carries an
   `adoCaseId` (or matches an `ado.published[]` entry by `caseTitle`), **offer to skip or relink** it
   rather than double-creating. A second publish of the same cases must not silently produce duplicate
   Test Cases.
3. **Honest outcomes.** Report only what the API actually returned. Never claim a create, add-to-suite,
   or link succeeded without the response that proves it. Surface partial and per-case failures
   explicitly; a case that failed to create is reported failed, and its suite-add/link are not claimed.
4. **House-profile-driven; nothing hard-coded.** Project, default plan/suite, link kind, field mapping,
   identity all come from the profile. A blank slot is offered as a neutral default and named for the
   QA to fill — never replaced with a remembered real value, and never hard-coded.
5. **Publish only; never author or approve.** If the cases are missing or unapproved, stop. SP7 writes
   no case content and sets no approval.
6. **Product-neutral and secret-free.** Generic examples only; no real company/product/board/plan/
   suite/org/URL/account/credential. Tokens/passwords stay in `.env`; the tracker signs in
   interactively.

## Reference files

- `references/test-case-field-mapping.md` — cases → ADO Test Case fields, including the
  `Microsoft.VSTS.TCM.Steps` XML shape, the link kind, and the field fallbacks (product-neutral).
- `references/publish-gates.md` — the gate + dry-run protocol, and the never-auto-run / idempotency /
  honest-outcome rules spelled out.

## Done when

- [ ] Approved cases were loaded from the `qa-context` **`cases`** slice (from the file); if absent or
      unapproved, the skill **stopped** and said to author/approve first — it authored nothing
- [ ] Intent was confirmed (gate 1), the plan/suite was **picked from listed options**
      (`testplan_list_test_plans` / `testplan_list_test_suites`), and the house-profile default was
      **offered, not assumed**
- [ ] A **dry-run preview** showed every case's title, target plan/suite, linked story, link kind and
      field mapping — with **no write performed** — before gate 2
- [ ] **No write op ran before gate 2's explicit confirm**; only after it did create
      (`testplan_create_test_case` / `wit_create_work_item`), add-to-suite
      (`testplan_add_test_cases_to_suite`) and link (`wit_work_items_link`) run
- [ ] Outcomes were reported **honestly** per case from the API responses; idempotency was handled
      (skip/relink, not double-create)
- [ ] The `qa-context` **`ado`** slice (plan, suite, `published[]` of `{ caseTitle, adoCaseId }`) was
      written **from the file**, additively, each created id was stamped back onto its
      `cases.items[].adoCaseId`, and the created ids + per-case summary were returned
- [ ] Specifics came from the **house-profile** (nothing hard-coded); nothing product-specific, secret
      or real-URL appears in the skill or in what it committed
