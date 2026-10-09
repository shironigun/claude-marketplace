# ADO integration — Test Cases, script linkage, bug filing (phase 4)

How `kit-builder` runs **phase 4** (`docs/phases.md`): turn the authored, **approved** cases into **Test
Case work items**, **link every generated script to its Test Case**, and **file the bugs** that failing
tests turn up. Phase 4 **composes two gated native engines** — **`ado-publish`** (approved cases → a Test
Plan/Suite: create + add-to-suite + link, behind a dry-run + explicit confirm) and **`failure-to-bug`** (a
red run → investigate → a gated bug file) — with the ADO MCP the kit ships in `.mcp.json`. Those engines own
every tracker **write**; this doc owns only the **`traces-case:` script↔case header convention** (decision
D11) and the phase-4 orchestration around them. No tracker write described here runs before the owning
engine's confirm gate.

> **Product-agnostic and tracker-agnostic by rule.** No product, org, project, URL, token, or account
> appears here or in any file this doc tells `kit-builder` to write. The examples use the generic
> `widgets` resource from `docs/script-generation.md`. The ADO organization comes from the `ADO_ORG`
> environment variable in the shell that launches Claude Code, never from source. "ADO" is the default
> tracker because that is the MCP the kit ships; the same flow works for Jira or any tracker the QA
> connects (section 6).

**Producer → consumer.** Consumes the authored cases and generated scripts from phases 2-3 (every
script carries a `traces-case:` header — `docs/script-generation.md` section 2, rule 8) and the
`failure-to-bug` drafts from phase 2. Produces Test Case work items, a script ↔ Test
Case link on both sides, and filed bugs — or, when the MCP is not authenticated, the same content as
local drafts that file later without rework.

---

## 1. The flow at a glance

```
 phases 2-3                         phase 4
 ───────────                        ──────────────────────────────────────────────────────────
 authored cases        ┌─ step 0 ─▶ probe the ADO MCP (read-only) ─────────────┐
 generated scripts     │                                                        │
   + traces-case:      │          authenticated                  not authenticated
 bug drafts            │               │                                │
                       │               ▼                                ▼
                       │   PATH A  publish approved cases      PATH B  write local drafts
                       │           (ado-publish, gated)               docs/tracker-drafts/
                       │              │                                  test-cases/ + bugs/
                       │              ▼                                │
                       │           link each script:                   ▼
                       │           header  -> ado:<id>          tell the QA how to
                       │           case -> story (at create)    authenticate; headers stay
                       │           Test Case -> script note     unlinked (no fake ids)
                       │              │                                │
                       │              ▼                                │
                       │           file approved bugs                  │
                       │           (failure-to-bug, gated:             │
                       │            investigate -> dry-run -> file)     │
                       │              │                                │
                       └──────────────┴──────── report ◀───────────────┘
                                   traceability table; build continues either way
```

Phase 4 never blocks the build. The authenticated path leaves scripts traceable to work items; the
degraded path leaves drafts the QA can file in one pass once signed in. Both end with a report.

---

## 2. The linking convention — the `traces-case:` header

Every `test()` block in a generated script already carries a header that names the authored case it
verifies — one line per case, in a JSDoc directly above the block (`docs/script-generation.md`, rule 8
and the worked examples in sections 4-7):

```ts
/**
 * traces-case: "Widgets - List - Verify that GET widgets conforms to widgetListSchema."
 */
```

Phase 4 reuses that exact line and **appends the tracker work-item id to the same line**. The quoted
case title is left byte-for-byte as phases 2-3 wrote it; only a link suffix is added:

```ts
 * traces-case: "Widgets - List - Verify that GET widgets conforms to widgetListSchema." -> ado:4821
```

### 2.1 Grammar

```
traces-case: "<authored case title>"                         <- unlinked (as emitted in phases 2-3)
traces-case: "<authored case title>" -> <tracker>:<id>       <- linked (phase 4)
```

| Part | Rule |
|---|---|
| `"<authored case title>"` | The Test Case title, exactly as authored: `[Module] - [Feature] - Verify that ...`. Never edited by phase 4. The Test Case is **created with this exact title**, so the title is the join key. |
| `->` | Literal ASCII arrow, one space either side. Absent until the case has a real work item. |
| `<tracker>` | Lowercase tracker tag: `ado` by default, `jira` or any other tag the QA's tracker uses. |
| `<id>` | The tracker's work-item id or key — `4821` for ADO, `PROJ-123` for Jira. Letters, digits, `_`, `-` only. |

Parseable with one pattern (verified against the samples above, including a title containing quotes):

```
^\s*\*\s*traces-case:\s*"(.+)"(\s*->\s*([a-z]+):([A-Za-z0-9_-]+))?\s*$
```

### 2.2 Rules

1. **One line per authored case, one case per line.** A line means "this file verifies this case".
   A file that verifies several cases lists several lines (repeat the key). `docs/script-generation.md`
   (rule 8) emits one line per authored case / `test()` block, so most linking needs no judgement;
   phase 4's inventory (section 4.1) still finds any `test()` block no line covers (a hand-written or
   older spec) and asks the QA whether it is its own case (add a line, create a Test Case) or a supporting
   check such as the pure schema unit test (leave it, say so in the report).
2. **The id, not a URL.** Write the id. A URL embeds the organization and project names in committed
   source, which breaks the agnostic rule and the phase-4 check that "the ADO org comes from an env
   var, not source". The clickable link is derived on demand from `ADO_ORG`, the project, and the id
   using ADO's standard `_workitems/edit/<id>` path — and the create response from the MCP already
   carries it, so never hand-build it.
3. **Never write a placeholder id.** No `-> ado:TBD`, no `-> local:...`. An unlinked line is the
   honest "no work item yet" state and is exactly what a later authenticated run looks for. A fake
   id is a false link that nothing would ever correct.
4. **Idempotent.** If a line already has `-> <tracker>:<id>`, phase 4 verifies the id still resolves
   and leaves it. A different id than the one it just created is a conflict: stop and ask the QA, never
   overwrite silently.
5. **Many scripts, one Test Case is allowed, not recommended.** The default is one Test Case per
   authored case (`docs/phases.md`, phase 4, Q2) so the script ↔ case link stays one-to-one. A QA who
   wants one Test Case for a family (for example the generated per-route 401 guards) may roll them up;
   each of those lines then carries the same id.

### 2.3 The other side of the link — a back-pointer on the Test Case

A header pointing at the work item is only half a link. Give the Test Case a one-line pointer back to
its script — a comment (or a description line if the tracker has no comments):

```
Automated by: modules/widgets/api/tests/contracts/widgets.contract.spec.ts :: Widgets - List - Verify that GET widgets conforms to widgetListSchema.
```

Path relative to the framework root, then `::`, then the case title. No host, no org. If the Test
Case work-item type has native "automated test name / storage" fields, set them to the same two
values as well; they are optional and process-template dependent, so never fail the phase on them.

### 2.4 Checking the links (both paths)

From the framework root:

```
# every header line (the full trace list)
grep -rhE 'traces-case:' modules

# cases with NO work item yet (unlinked)
grep -rnE 'traces-case:' modules | grep -v -e '->'

# lines that look like a header but break the grammar (should print nothing)
grep -rnE '^\s*\*\s*traces-case:' modules | grep -vE '^[^:]+:[0-9]+:\s*\*\s*traces-case:\s*".+"(\s*->\s*[a-z]+:[A-Za-z0-9_-]+)?\s*$'
```

---

## 3. Step 0 — check the tracker MCP before anything else

Phase 4 starts with **one read-only probe** of the ADO MCP and lets the result choose the path. It
creates nothing. Use the cheapest call that needs a signed-in session — list the organization's
projects (`core_list_projects` in the `@azure-devops/mcp` server; tool names differ by server
version, so match by capability) — and confirm the QA's target project is in the result.

| Probe result | Meaning | Path |
|---|---|---|
| Call succeeds and the target project is listed | Signed in; org and access are right | **A** |
| ADO MCP tools are absent from the session, or the server failed to start | `ADO_ORG` is unset (so the `${ADO_ORG}` placeholder in `.mcp.json` did not expand) or the server was never approved or connected | **B** + auth guidance |
| Call errors (401/403, "not authenticated"), or the browser sign-in was dismissed or timed out | Not signed in, or the account lacks access | **B** + auth guidance |
| Call succeeds but the target project is missing | Wrong organization, or no access to that project | Ask the QA to correct org/project; if it cannot be fixed now, **B** |

One probe, then one re-probe after the QA says they have signed in. Never loop on retries and never
ask the QA for a token: the interactive sign-in needs none.

### 3.1 What to tell the QA when the probe fails

Say it plainly, in the phase report, with the path chosen:

> The ADO MCP is not authenticated, so phase 4 ran in **draft mode**: nothing was created in ADO and no
> script was linked. To authenticate:
> 1. Set `ADO_ORG` to your Azure DevOps organization **name** (the name only) by exporting it in the
>    shell that launches Claude Code (or set it in Claude Code settings `env`). A `.env` file does not
>    work for this: Claude Code does not read `.env` when it expands `${ADO_ORG}` in `.mcp.json`. Do
>    not commit it or put it in source.
> 2. Restart the Claude Code session in this folder so the plugin's `.mcp.json` re-reads the variable,
>    then run `/mcp` and confirm `ado` shows as connected (approve it if prompted). On macOS/Linux,
>    first swap the shipped Windows `command`/`args` for `npx -y @azure-devops/mcp ${ADO_ORG}
>    --authentication interactive`, as the plugin `README.md` shows.
> 3. The server signs in interactively: the first ADO call opens a browser sign-in. Complete it with an
>    account that can access the organization and the target project.
> 4. Make sure that account can create work items in the project and, if you want cases added to a Test
>    Plan/Suite, has Test Plans access. Ask the project admin if not.
> 5. Say "authenticated" and phase 4 re-runs the probe and files the drafts. Never paste a token or PAT
>    into chat or a file.

---

## 4. Path A — authenticated

### 4.1 Inventory (read-only)

1. **Collect the authored cases** from phases 2-3 — title, preconditions, steps with expected results,
   tags. If the case text is no longer in the session, derive it from the script: the header title is
   the case title, the setup lines are the preconditions, each `test.step()` or assertion is a step with
   the result that assertion states. Show derived cases to the QA for approval like any other draft.
2. **Scan the scripts** for every `traces-case:` line (section 2.4) and list: case title · script path ·
   level tag · already linked? Flag each `test()` block no line covers (section 2.2, rule 1).
3. **Look for existing Test Cases** with the same titles in the target project (a work-item search by
   title). Re-runs and partial earlier runs make duplicates the commonest mistake. On a hit, ask: link
   the script to the existing Test Case, skip it, or create a new one. Linking to the existing one is
   the recommended default.

### 4.2 Publish the Test Cases — `ado-publish` (gated)

Invoke **`ado-publish`** with the **Skill tool** and hand it the **approved** cases (the qa-context `cases`
slice — it refuses unless `cases.approved` is `true`) plus whatever the QA already told the build (module,
source story id, project / area / default Test Plan+Suite / assignee if known). Then let it run its gated
flow; this doc does not restate it:

- It confirms the cases, lists the project's **Test Plans + Suites** (`testplan_list_test_plans/suites`), the
  QA **picks** plan + suite, it shows a **dry-run** of exactly what will be written, and only on an
  **explicit confirm** creates each Test Case, **adds it to the suite** (`testplan_add_test_cases_to_suite` —
  native, not a manual UI step), and **links it to the story** (the case *tests* the story).
- It carries the house step table into the native Steps field and stamps each new id back onto the case's
  **`adoCaseId`** in the `cases` slice (the field map + the exact create/add/link ops live in
  `skills/ado-publish/references/test-case-field-mapping.md`).
- It reports the created ids and the per-case outcome from the API response (honest-outcome).

Do not re-ask what the engine asks (project, area, plan, suite, assignee). Pass what is known; answer once.

**Granularity: one Test Case per authored case**, one-to-one with a `traces-case:` line. **Recommended
tags:** carry the script's module tag and level tag onto the Test Case (for example `widgets; contract`) so
a tracker query mirrors the Playwright `--grep`. **No source story?** The cases are still created; the link
is skipped and said so.

The result is the **`adoCaseId` per case** (in the `cases` slice) — the case → work-item-id map the next
steps use.

### 4.3 Link each script to its Test Case

For **each** created (or matched) Test Case, in this order, **as you go** (do not batch the writes to
the end — a failure halfway must leave the finished links on disk):

| # | Link | How | Owner |
|---|---|---|---|
| 1 | **script → Test Case** | Edit the matching `traces-case:` line, appending ` -> ado:<id>` (section 2). | this doc |
| 2 | **Test Case → story** | the case *tests* the story — set by `ado-publish` at create (`testsWorkItemId` / `wit_work_items_link type: "tests"`). Confirm in the report which relation was used. | `ado-publish` |
| 3 | **Test Case → script** | Add the back-pointer comment (section 2.3). | this doc |

Use the ADO MCP directly only for the small pieces this doc owns — the comment in row 3 and the
read-backs in 4.5. Creation, add-to-suite and the case → story link stay with `ado-publish`.

```
 capability                         used for                              typical ADO MCP tool*
 ─────────────────────────────────  ────────────────────────────────────  ───────────────────────
 list projects                      step 0 auth probe                     core_list_projects
 search work items / WIQL           duplicate check (4.1, 4.4)            search_workitem, wit_query_by_wiql
 add a work-item comment            Test Case -> script back-pointer      wit_add_work_item_comment
 get work item(s) by id             verify links resolve (4.5)            wit_get_work_item
 create Test Case + add to suite    owned by ado-publish (gated)          wit_create_work_item,
 + link case -> story                                                     testplan_add_test_cases_to_suite,
                                                                          wit_work_items_link
 file a bug (gated) + link          owned by failure-to-bug (gated)       wit_create_work_item, wit_work_items_link
 * names vary by MCP server version; match by capability, never by exact name.
```

### 4.4 File bugs for failing tests — `failure-to-bug` (gated)

Sources: any test still red now. Invoke **`failure-to-bug`** with the failing test and its evidence; it
**investigates then classifies** (`real_bug` / `flaky` / `environment` / `test_defect`, fail-safe) and only a
`real_bug` is drafted. The verdict stays authoritative: the others are listed classified-but-not-filed, and a
`test_defect` goes back to `author-api-cases` / `author-ui-cases`.

The engine owns its own **gated filing** — this doc does not restate it. Per bug it: presents the draft
(**gate 1 — approve**) → shows a **dry-run** (type, fields, links, and an idempotency check so a re-run never
double-files) → takes an **explicit confirm (gate 2)** → `wit_create_work_item` (`defectFormat.type`, default
`Bug`) → `wit_work_items_link type: "related"` to the **case** (a bug *relates to* its case — the `adoCaseId`
from §4.2) and to the story. It reads the defect shape from the `defectFormat` profile slot and reports each
outcome from the API response.

Before invoking, make sure the bug can resolve its source case: it links via the failing spec's
`traces-case:` line → the case's `adoCaseId` (§4.2). Provenance (the script path, the test title, the exact
failing assertion, the environment label — never a credential, token, or base URL) goes in the bug's
system-info block. Capture the bug id.

**Close the loop in the script (recommended, with QA approval).** Put the bug's tracker id in a
`knownBug(id, summary)` marker on the line **immediately before** the assertion it explains
(`docs/script-generation.md`, section 2, rule 4) — for example `knownBug('5120', 'POST widgets returns
500 instead of 400 for a negative quantity')`. The suite then stays green while the bug is open and
turns red on the day it is fixed, which is the cue to delete the marker and close the bug. One marker
per bug; never as the first line of the test.

### 4.5 Verify and report

- `grep -rnE 'traces-case:' modules | grep -v -e '->'` prints only the lines the QA deliberately left
  unlinked (supporting checks), each named in the report.
- **Each id resolves:** read the work item back by id — type is Test Case, title equals the quoted title
  in the header. A mismatch is a broken link: fix or ask.
- **Each filed bug** has a Related link to its Test Case and names its script and failing test.
- No organization name, host, token, or id other than the work-item ids was written into a committed
  file. Run the kit's secret scan on the staged diff before any commit (the same gate as
  `docs/script-generation.md` section 12); it must report zero matches.

Report as a traceability table, then the exceptions:

```
 Case                                                    Script                                       Test Case   Bug
 ------------------------------------------------------  -------------------------------------------  ----------  ------
 Widgets - List - Verify that GET widgets conforms ...   modules/widgets/api/tests/contracts/...      4821        -
 Widgets - Create - Verify that POST widgets returns ... modules/widgets/api/tests/endpoints/...      4822        5120
 ...
 N cases linked | M bugs filed | K left unlinked (supporting checks: <names>) | suite follow-up: <done / do in UI>
```

---

## 5. Path B — degraded (the MCP is not authenticated)

The build still completes. Phase 4 produces everything it would have created, as local drafts, and
creates **nothing** in the tracker and **writes no id** into any header.

### 5.1 What to write

Under the framework root, in the QA's own workspace:

```
docs/tracker-drafts/
  test-cases/<NN>-<slug>.md      one per authored case
  bugs/<NN>-<slug>.json          one per approved real_bug draft
```

**Test Case drafts** — the house format from `author-api-cases` / `author-ui-cases` (author and show, stop
before publishing; `ado-publish` is not invoked while the MCP is down), one file per case, with the pointers
a later filing needs on top:

```
Title: Widgets - List - Verify that GET widgets conforms to widgetListSchema.
Source ticket: <id or "none">
Tags: widgets; contract
Script: modules/widgets/api/tests/contracts/widgets.contract.spec.ts

Preconditions: Environment: <QA> | Role: <role> | <setup state>

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | ... | ... |

Actual Result:
```

**Bug drafts** — the portable JSON record from `failure-to-bug`, unchanged, with
`"status": "Draft"` (its `source.test` is the case title, the same join key as the header). Keep the
frozen field shape; add nothing to it.

The scripts' `traces-case:` lines stay **unlinked** (title only). The title is the join key between a
draft and a header, so nothing is lost by waiting. The drafts contain no credential, token, host, or
organization name (repro steps name a role and an environment label only) — run the secret scan before
committing them like any other file.

### 5.2 What to say

Lead the phase report with the degrade, not bury it: **"ADO MCP not authenticated — N Test Case drafts
and M bug drafts written to `docs/tracker-drafts/`; no work items created; no scripts linked."** Then give
the authentication steps from section 3.1 verbatim. The build moves on to phase 5.

### 5.3 Resuming once authenticated

Re-run phase 4. Step 0 passes, and Path A starts from the drafts instead of re-authoring: 4.1 reads
`docs/tracker-drafts/test-cases/` as the case list, 4.2 publishes them through the gated `ado-publish`, and
4.3 links the scripts. As each draft is filed, add a `Filed: <tracker>:<id>` line to it (the id is not
a secret) so a second resume skips it. Bug drafts go through 4.4 unchanged, including the review gate.

### 5.4 If authentication drops mid-run

A token that expires or a create that is rejected partway is a degrade for the **remainder**, not a
failure of the phase. Stop creating, keep every link already written (that is why 4.3 links as it
goes), write drafts for the cases not yet filed, and report the split exactly: "K filed and linked,
N-K drafted locally". Never retry in a loop.

---

## 6. Tracker-agnostic notes

- **Not ADO?** The kit ships only the ADO MCP (decision D10), but nothing in this flow is ADO-shaped
  except the tool names. A QA on Jira or another tracker connects that tracker's connector; step 0
  becomes the same read-only probe on that connector; the header tag becomes `jira:PROJ-123` (section
  2.1); `author-api-cases` / `author-ui-cases` render the cases, `ado-publish` publishes them, and
  `failure-to-bug` renders + files the bugs for it. An unrecognised tracker falls back to the generic mode —
  the step table in the description, a Related link — and the report says which.
- **ADO field names, step XML, relation names, severity strings** live in the two skills' reference
  files. This doc names them only to point at them; never copy them here or into `kit-builder`.
- **No tracker at all?** Path B is the whole of phase 4: drafts on disk, headers unlinked, a clear
  report. That is a valid end state, not a failure.

---

## 7. Definition of done (phase 4)

**Authenticated path**

- Step 0 probe succeeded and the target project was confirmed.
- One Test Case per authored case (or an existing one matched), created through the gated
  `ado-publish` after the QA's dry-run confirm, each linked to its story and added to the suite.
- Every non-supporting `traces-case:` line ends in `-> ado:<id>`; each id resolves to a Test Case whose
  title equals the quoted title; each Test Case carries the back-pointer to its script.
- Each approved `real_bug` is filed through `failure-to-bug`'s gated path, linked `related` to its
  Test Case, with provenance; non-bugs are listed as not filed.
- The traceability table is in the report; the secret scan is clean; no org, URL, or token in source.

**Degraded path**

- The probe's failure was reported with the authentication steps (section 3.1).
- A draft exists for every authored case and every approved bug; nothing was created in the tracker;
  no header carries an id.
- The report leads with the degrade and states how to resume (section 5.3).

---

## Inspiration (not required)

The bug-filing house format and the work-item filing flow were inspired by a product-specific
bug/defect-filing plugin in the marketplace. It is **never a dependency** of this kit and
nothing here requires it; the committed kit runs entirely on its own native skills
(`author-api-cases` / `author-ui-cases`, `ado-publish`, `failure-to-bug`), the ADO MCP from `.mcp.json`, and this doc. A QA who
already has that plugin installed may lean on it, but phase 4 does not.
