# Publish gates — the dry-run + confirm protocol

`ado-publish` is the `qa-engineering`'s **first write path**. Everything in it is built so a QA controls
every write: nothing lands in the tracker that the QA has not previewed and explicitly confirmed. This
reference spells out the gate protocol and the three safety rules. The SKILL body is the ordered flow;
this is the contract a reviewer checks it against.

## The two gates and the single unlock

| Step | What happens | Reads or writes? |
|---|---|---|
| 1 | Load approved cases from `qa-context.cases` | **read** (qa-context) |
| 2 | **Gate 1** — present the N cases; "Publish these to ADO?" | **read / present** |
| 3 | List plans + suites; QA picks plan + suite | **read** (`testplan_list_test_plans`, `testplan_list_test_suites`) |
| 4 | **Dry-run** — show every case's title, target plan/suite, linked story, link kind, field mapping | **read / present — NO write** |
| 5 | **Gate 2** — explicit yes to "create + add-to-suite + link"; "nothing has been written yet" | **the unlock** |
| 6 | Create Test Cases | **write** — only after gate 2 |
| 7 | Add to suite (`testplan_add_test_cases_to_suite`) | **write** — only after gate 2 |
| 8 | Link to story (`wit_work_items_link`) | **write** — only after gate 2 |
| 9 | Write `qa-context.ado`; return ids + per-case summary | context write |

**The line is between step 5 and step 6.** No `create`, `add_test_cases_to_suite`,
`create_test_suite`, or `link` call exists anywhere above step 6. If the QA does not give the gate-2
yes, the flow stops at step 5 with nothing written. A reviewer reading the flow adversarially should
find no write op reachable before the gate-2 confirm — that is the acceptance bar.

## Why a dry-run, not just a confirm

Gate 1 confirms *which cases*. The **dry-run** (step 4) is what makes gate 2 meaningful: the QA sees the
*exact* writes — each title as it will render, the plan + suite, the story and link kind, and which case
content maps to which tracker field — **before** saying yes. A confirm without a preview is a blind
confirm; this skill does not do blind confirms. The dry-run performs **no write** and says so out loud.

## The three safety rules (stated in the skill, enforced here)

### 1. Never auto-run
No write op runs before gate 2's explicit confirm. There is no "I'll just create them", no "I went
ahead and published", no skipping the dry-run, no treating a non-answer / "ok" / silence as a yes. If
in doubt, the skill re-asks — it does not write. One gate-2 yes authorizes exactly the previewed list;
a changed selection needs a fresh dry-run and a fresh confirm.

### 2. Idempotency / re-run
Before creating, check for an existing id: a case that already carries an `adoCaseId` (written back onto
`cases.items[]` on a prior publish) or matches an `ado.published[]` entry by `caseTitle` was created
before. The skill **offers to skip or relink** those cases rather than re-creating them. A second
publish of the same cases must never silently produce duplicate Test Cases. Relink = add the existing id
to the suite / (re)link it to the story without a new create.

### 3. Honest outcomes
The skill reports only what the API actually returned:

- A **create** is claimed only when the response returns the new id; a case that failed to create is
  reported failed, and its add-to-suite and link are **not** claimed.
- An **add-to-suite** and a **link** are each claimed only from their own response; a `tests` relation
  that fell back to `related` is reported as `related`.
- **Partial failures are surfaced per case** — the summary says, for each case, created ✓/✗, added
  ✓/✗, linked ✓/✗ — never a blanket "all done" that the responses do not support.

## House-profile-driven (nothing hard-coded)

The project, default plan/suite, link kind, field mapping and identity all come from the house-profile
slots (`tracker`, `testPlan`, `caseAuthoring`, `identity`). A blank slot is **offered** as a neutral
default and named for the QA to fill — never replaced with a remembered real value, and never
hard-coded. The default plan/suite is an **offer** the QA can override by picking from the listed plans
and suites; it is never assumed.

## Product-neutral + secret-free

Generic placeholders only (`Orders`, `widgets`, `Plan Name`, `Suite Name`, `YOUR_ORG`). No real
company, product, board, plan, suite, org, URL, account or credential. Tokens/passwords live in `.env`,
never here or in the house-profile; the tracker signs in interactively.
