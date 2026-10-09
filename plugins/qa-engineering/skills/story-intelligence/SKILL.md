---
name: story-intelligence
description: Native read-only engine of the qa-engineering — given a tracker story (a work-item id), retrieve its FULL context (fields, acceptance criteria, comments/discussion, history, parent/children/related/bugs/links, design & implementation notes) and produce a requirement understanding, a gaps/concerns list, and a QA review brief + test strategy — every claim labeled Confirmed / Inferred / Assumption / Gap-or-Question, and never inventing a requirement. Product-neutral and tracker-agnostic; the project, board and field names come from the house-profile, never hard-coded. Reads the tracker only — contains no write operation. Use whenever the user wants to "analyze this story", "understand this story", "get me ready to test", "what should I clarify", "review story", "raise gaps on this story", "review this story before I test it", or gives a bare "story <id>" / a work-item id with intent to test. It writes the story slice of qa-context and ends at the gaps gate — it does NOT author test cases (hand off to author-api-cases / author-ui-cases) and does NOT write anything to the tracker.
---

# Story Intelligence — understand the requirement, surface the gaps, brief the QA

Before a single test case is written, read the *story* the way a senior QA reads it: pull its whole
context from the tracker, work out what is really changing and why, find the holes a tester would fall
into, and hand the QA a review brief they can act on. This engine's job is to help QA **understand the
requirement**, not just mechanically turn acceptance criteria into cases. It reads and reasons; it
authors nothing and files nothing.

This is a native engine of the `qa-engineering` plugin, routed to by the `qa-orchestrator` on an
"analyze this story" intent. One skill covers both the analysis and the QA review. It stops at the
gaps gate and hands a clean `qa-context` forward — the authoring engines build on it.

> **READ-ONLY against the tracker.** This engine performs **no write operation** — it never creates,
> updates, comments on, links, or files anything. Every tracker call it makes is a read. If a task
> here feels like it needs a write, it is out of scope: surface it to the QA instead.

> **Product-neutral by rule.** The examples below (Orders, widgets, an epic, a child task, a User
> role) are generic placeholders. The real tracker, project, board, area/iteration and field names
> come from the QA's git-ignored **house-profile** (`knowledge/orchestration/house-profile.md`), read
> at run time — never hard-coded here. No real company, product, board, URL, account or credential
> belongs in this skill or in anything it writes to a committed file.

## Where the specifics come from (read, never hard-code)

Read product/tracker specifics from the house-profile slots before you query; if the profile is
absent, fall back to the tracker's standard fields and **name the slot the QA must fill** — do not
reach for a remembered real value.

| What you need | House-profile slot | If blank |
|---|---|---|
| Tracker kind (`azure-devops` / `jira` / …), org, project | `tracker.kind`, `tracker.org`, `tracker.project` | Ask which tracker/project; name the `tracker` slot |
| Team, board, area path, iteration path | `tracker.team`, `tracker.boards`, `tracker.areaPath`, `tracker.iterationPath` | Degrade to "whatever the item lives on"; say so |
| Which field carries the description / acceptance criteria / repro | the profile's field conventions (tracker-specific) | Use the tracker's standard fields; flag the assumption |
| Product domain nouns (for reading the story in the team's language) | `product.name`, `product.domainNouns` | Use generic nouns (order, widget, user); say so |

The tracker is "whatever the house-profile points at". The read ops below are the ones the plugin's
ADO MCP exposes; for a different tracker the orchestrator supplies the equivalent read connector — the
*flow* (retrieve the graph → understand → find gaps → brief) is identical.

## (a) Retrieve the full work-item graph — READ-ONLY

Pull everything that bears on the requirement, in this order. **Use only the tracker's read
operations** (the plugin's ADO MCP read ops named below). Never a write.

| Step | What to pull | ADO MCP **read** op |
|---|---|---|
| 1 | The story itself with **relations/links expanded** — title, state, description, **acceptance criteria**, tags, area/iteration, and the full link set (parent, children, related, predecessor/successor, tested-by, affected-by) | `wit_get_work_item` with `$expand` = relations (or `all`) |
| 2 | Every **linked item in one batch** — parent epic/feature, child tasks, related stories, linked **bugs/defects**, dependencies — so you read the neighbourhood, not just the node | `wit_get_work_items_batch_by_ids` (ids gathered from step 1's relations) |
| 3 | The **discussion** — all comments/replies, decisions, clarifications, back-and-forth with Product/BA/Dev | `wit_list_work_item_comments` |
| 4 | **History / state changes** where it matters (what was reworded, when AC changed, reopens) | `wit_list_work_item_revisions` *(read-only; where available)* |
| 5 | **Siblings & neighbours you were not handed** — other stories under the same parent, related bugs by area/tag, prior work on the same module — to catch regression surface and duplicate intent | `wit_query_by_wiql` (a read WIQL query) and `search_workitem` (free-text) |

Rules for the retrieval:

- **Read-only, always.** Every call above returns data; none of them mutates. This engine references
  **no** create/update/add/link/comment/file operation of any kind.
- **Follow the graph, don't stop at the node.** A story's real requirement often lives in its parent's
  intent, a sibling's decision, a linked bug's history, or a buried comment. Pull the neighbourhood.
- **Record what you could not read** (a linked item you lack access to, an empty AC field, a missing
  design link) as a **Gap-or-Question** — never fill it with a guess.
- **Label every source.** Each fact you carry forward names where it came from (field, comment, linked
  id, history revision). No source means it is not Confirmed — see the labels below.

## (b) Requirement understanding

From the retrieved graph, state — concisely, each claim labeled:

- **What is changing & why** — the behaviour the story introduces or alters, and the user/business
  reason behind it (from the parent's intent where the story itself is thin).
- **Expected behaviour** — what the system should do after the change, in observable terms.
- **Affected modules / features** — which product areas this touches (in the team's domain nouns).
- **Integrations / APIs / external systems** — any service, API, or external/partner system (e.g. a
  DMS or other integration the house-profile names) that this change talks to or depends on.
- **Existing behaviour at risk** — what already works today that this change could break (the
  regression surface).

## (c) QA concerns — scan the full checklist

Walk the concern taxonomy in `references/concern-taxonomy.md` and surface what applies. Cover, at
minimum:

- **Ambiguities** — anything the story states loosely or two ways.
- **Missing requirements / AC / validation rules / error handling** — behaviour implied but not
  specified; fields with no validation stated; error/empty/failure paths left undefined.
- **Permissions / security** — who may do this; role/permission gaps; data-exposure risk.
- **Integration** — contracts with APIs/external systems; what happens when a dependency is slow,
  down, or returns an error.
- **Regression** — existing flows that share state or code with the change.
- **Mobile / responsive** — where a UI is involved and the product has a mobile/responsive surface.
- **Edge cases** — boundaries, empties, maxima, concurrency, duplicates, time zones.
- **Data / state** — migrations, defaults, soft vs hard delete, stale/cached state, idempotency.
- **Backward-compatibility** — older clients, saved data, in-flight records, API versioning.
- **Risks the change introduces** — new failure modes the feature itself creates.

## (d) Label EVERY claim — and never invent a requirement

Every statement in the output carries exactly one label. This labeling is **load-bearing**: it is how
QA knows what to trust and what to confirm.

| Label | Means | Example |
|---|---|---|
| **Confirmed** | Stated explicitly in the story, its AC, a comment, or a linked item — with a source | "Deleting an order sets status to `cancelled`. *(Confirmed — AC item 3)*" |
| **Inferred** | Reasoned from the retrieved context, not stated outright | "This likely reuses the existing Orders permission check. *(Inferred — parent epic scopes Orders to the User role)*" |
| **Assumption** | A silence you filled to proceed — must be validated | "Assuming soft delete (the item stays listed as cancelled). *(Assumption — delete semantics not stated)*" |
| **Gap-or-Question** | A hole that needs Product / BA / Dev before testing is safe | "What status is set when a delete fails midway? *(Gap-or-Question — no error path given)*" |

> **Never invent a requirement.** If the story does not say it and you cannot source it, it is an
> **Assumption** or a **Gap-or-Question** — never a Confirmed requirement. Do not promote a convenient
> guess into a spec. A blank stays a labeled gap; it is surfaced, not silently resolved.

## (e) QA review brief + test strategy

Produce the brief in the format of `references/review-brief-format.md`. Its sections:

- **Understanding** — the requirement in two or three labeled lines (what/why/expected).
- **Scope** — what is in and what is explicitly out (and what is unclear, as a gap).
- **Risks** — the highest-risk areas to break, ordered; each with why.
- **Questions / Gaps** — the numbered list of Gap-or-Question items to resolve with Product/BA/Dev.
- **Regression impact** — the existing flows/modules to re-check because they share surface.
- **Test strategy** — **which test types apply and why**: functional, regression, API, UI,
  integration, permissions, validation, negative, cross-browser, mobile, DMS/external-integration,
  performance. For each that applies, one line on *why it applies here*; name the ones that do **not**
  apply and why, so the QA sees a deliberate choice, not an omission.

This brief exists to help QA **think** — it is not a test-case list. It does not enumerate click steps
or request matrices (that is the authoring engines' job).

## (f) Write the `story` slice of `qa-context`

Per `knowledge/orchestration/qa-context.md`, write this engine's output into `qa-context.json` at the
framework root (**read and write it from the file** — never rely on a chat block that a compaction may
drop). Write **only** this engine's slices, additively; never clobber another engine's slice.

- **`story`** = `{ id, analysis, gaps[] }` — the work-item id, the structured requirement analysis
  (the labeled understanding + concerns), and the open **Gap-or-Question** items surfaced for the QA.
- **`review`** = `{ verdict, risks[], coverageGaps[] }` — because this one engine also produces the QA
  review, write the companion review slice from the brief: the testability verdict, the ordered risks,
  and the coverage gaps the brief raised.

Keep the traceability thread intact: `story.id` is the anchor the authored cases will point back to
(`cases.items[].tracesStory`). Nothing product-specific, secret or real-URL goes into the context.

> Note on qa-context mediation: in the normal loop the `qa-orchestrator` hands this engine the slice
> it needs and folds the returned output back into `qa-context.json`. Writing the `story`/`review`
> slices is a **context-state write at the framework root — not a tracker write.** The READ-ONLY rule
> is about the tracker; it does not forbid saving your own analysis to the local session-state file.

## (g) End at the gate — do not auto-advance

Stop here and surface the gate, verbatim in spirit:

> **"I found N gaps/questions — resolve with Product/BA first, or proceed on the stated assumptions?"**

List the N Gap-or-Question items and the Assumptions you would proceed on. **Do not** auto-advance to
test-case generation. Case authoring is a separate engine (`author-api-cases` / `author-ui-cases`),
reached only after the QA chooses to resolve the gaps or to proceed on the stated assumptions.

## Rules

1. **Read-only against the tracker.** Only the read ops in (a). No `create`, `update`, `add`, `link`,
   `comment`, or `file` operation appears anywhere in this engine.
2. **Never invent a requirement.** Unstated ⇒ Assumption or Gap-or-Question, never Confirmed.
3. **Label every claim** — Confirmed / Inferred / Assumption / Gap-or-Question, each with its source.
4. **Read the specifics from the house-profile**; degrade to neutral defaults and name the blank slot
   when it is absent. No hard-coded project, board, org, field or product.
5. **Pull the whole graph**, not just the node — parent intent, siblings, linked bugs, discussion,
   history.
6. **Write the `qa-context` story slice from the file**, additively; keep `story.id` as the trace
   anchor.
7. **End at the gaps gate**; never auto-advance to case generation.
8. **Product-neutral and secret-free** — generic examples only; no real company/product/board/URL/
   account/credential.

## Reference files

- `references/concern-taxonomy.md` — the full concern/gap checklist to scan a story against (c).
- `references/review-brief-format.md` — the Understanding / Scope / Risks / Questions / Regression /
  Test-strategy format, with a neutral worked example (e).

## Done when

- [ ] The full graph was retrieved **read-only** (fields, AC, comments, history, parent/children/
      related/bugs/links) via the tracker's read ops; nothing was written to the tracker
- [ ] The specifics (project/board/field/domain) were read from the **house-profile**, not hard-coded
- [ ] Requirement understanding + the concern checklist were produced, **every claim labeled**
      Confirmed / Inferred / Assumption / Gap-or-Question, and **no requirement was invented**
- [ ] A QA review brief + test strategy was produced in the reference format
- [ ] The `story` (and companion `review`) slice of `qa-context` was written **from the file**,
      additively, with `story.id` as the trace anchor
- [ ] The engine **ended at the gaps gate** and did not auto-advance to case generation
- [ ] Nothing product-specific, secret or real-URL appears in the skill or in what it committed

Next: on the QA's go-ahead at the gate, hand off to `author-api-cases` / `author-ui-cases` to turn the
understood, gap-resolved requirement into test cases — they read the `story`/`review` slices this
engine wrote.
