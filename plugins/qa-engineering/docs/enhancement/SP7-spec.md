# SP7 — ADO publish: pick Test Plan + Suite, add-to-suite, link (spec)

Status: in progress (2026-10-08). Phase 2. Depends on SP5 (qa-context + house-profile) and on approved cases
(from SP6/the existing author-*-cases, via qa-context). **The first WRITE path — every write is gated.**

## 1. Goal
Take **QA-approved** test cases, let QA pick a **Test Plan + Suite**, preview exactly what will be written,
get an explicit confirm, then **create the Test Cases, add them to the suite, and link them to the story** —
returning the created ids. **Never push without QA approval.** This removes the "suite add is manual"
limitation (the shipped ADO MCP has `testplan_add_test_cases_to_suite`).

## 2. Deliverable — `skills/ado-publish/SKILL.md` (gated write engine)
Triggers: "push cases to ADO / publish these / file these test cases / add these to a suite". Reads the
tracker project, default plan/suite, and the test-case **field mapping** from the **house-profile**;
tracker-agnostic prose with ADO as the implemented path.

**The gated flow (in order — stop at each gate):**
1. **Load approved cases** from `qa-context` (the `cases` slice). If cases are missing or **not QA-approved**,
   stop and say so — SP7 publishes; it does not author.
2. **Confirm intent** — present the N cases; "publish these to ADO?" (gate 1).
3. **Pick the target** — `testplan_list_test_plans` + `testplan_list_test_suites` for the project; show them;
   QA picks plan + suite (house-profile defaults are *offered*, never assumed). Supports creating a new suite
   only if QA explicitly asks.
4. **Dry-run preview** — show EXACTLY what will be written: each case title, the plan/suite, the story it
   links to, the field mapping (e.g. ADO `Microsoft.VSTS.TCM.Steps` for steps/expected). No writes yet.
5. **Confirm the target** — explicit yes (gate 2). Only now does any write happen.
6. **Create** the Test Cases (`testplan_create_test_case` / `wit_create_work_item` with the mapped fields).
7. **Add to suite** — `testplan_add_test_cases_to_suite` (the unlock).
8. **Link to the story** — `wit_work_items_link` (TestedBy-Reverse / the house-profile's link kind).
9. **Write `qa-context`** `ado` slice (plan, suite, created ids) and **return** the created ids + a summary.

**Safety rules (stated in the skill):**
- **Never auto-run** — no write before gate 2's explicit confirm. No "I'll just create them".
- **Idempotency / re-run** — if the context already holds created ids for these cases, offer to skip/relink
  rather than double-create.
- **Honest outcomes** — report what the API actually returned; never claim a create/link/add succeeded
  without the response. Surface partial failures per case.
- Reads house-profile; **no hard-coded** project/plan/suite/org.

**References** (`skills/ado-publish/references/`): `test-case-field-mapping.md` (cases → ADO Test Case
fields, incl. the TCM steps XML shape, product-neutral) and `publish-gates.md` (the gate + dry-run protocol).

## 3. Out of scope
Authoring cases (SP6/author-*-cases/SP8) · automation (SP9) · failure→bug (SP10). SP7 publishes approved
cases only. Retire the "suite add is manual" wording in `file-to-tracker` if it blocks a clean story (a
one-line note is fine; the full authoring merge is SP8).

## 4. Acceptance criteria
1. `ado-publish` skill exists, product-neutral (project/plan/suite/field-map from the house-profile), and
   publishes **only QA-approved** cases from qa-context.
2. The gated flow is explicit: **no write op appears before the dry-run + confirm gate**; the skill states
   "never auto-run" and the idempotency + honest-outcome rules.
3. Uses `testplan_add_test_cases_to_suite` (the unlock) + `testplan_create_test_case`/`wit_create_work_item`
   + the link op; reads `testplan_list_test_plans/suites`. Writes the qa-context `ado` slice; returns ids.
4. Product-neutral + secret-free (scan); committed + pushed to `dev`.
5. **Independent adversarial review passes** — verifying the gates can't be bypassed, writes are minimal +
   correct, no auto-run, house-profile-driven, honest-outcome, neutral.

## 5. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per chunk; push; secret + product scan before every push. No PR.
Conventional commits scoped `qa-engineering`. **SP7 gets a full independent review (first write path).**
