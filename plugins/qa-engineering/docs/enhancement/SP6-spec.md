# SP6 — Story Intelligence + QA Review (spec)

Status: in progress (2026-10-08). Phase 2. Depends on SP5 (orchestrator + qa-context + house-profile).
**Read-only against the tracker — NO writes.** The biggest net-new capability: help QA understand the
*requirement*, not just generate cases from the acceptance criteria.

## 1. Goal
Given a story (an ADO work-item id), retrieve its **full context**, reason about the requirement, surface
**gaps/concerns**, and produce a **QA review brief + test strategy** — every claim labeled so QA can trust
it, and never inventing a requirement. Output is written into `qa-context` and ends at the "resolve the
gaps or proceed on assumptions" gate.

## 2. Deliverable — `skills/story-intelligence/SKILL.md` (one engine, two outputs)
Triggers: "analyze this story / understand this story / get me ready to test / what should I clarify /
review story / story <id>". Product-neutral and **tracker-agnostic**: the ADO project, board, and field
names come from the **house-profile**; the skill describes the flow for any tracker.

**(a) Retrieve the full work-item graph (read-only).** Using the plugin's ADO MCP read operations
(`wit_get_work_item` with relations/`$expand`, `wit_get_work_items_batch_by_ids`,
`wit_list_work_item_comments`, `wit_query_by_wiql`, `search_workitem`), pull — where available — the
title, description, **acceptance criteria**, **comments/discussions**, history, **parent**, **children**,
**related**, dependencies, **bugs**, other linked items, and design/implementation context. Never write.

**(b) Requirement understanding.** What is changing & why · expected behavior · affected
modules/features · integrations/APIs/DMS systems that may be affected · existing behavior that could break.

**(c) QA concerns.** Ambiguities · missing requirements/AC/validation rules/error handling ·
permissions/security · integration · regression · mobile/responsive (where applicable) · edge cases ·
data/state issues · backward-compatibility · risks introduced by the change.

**(d) Label every claim** — **Confirmed** (stated in the story) · **Inferred** (reasoned from context) ·
**Assumption** (filled a silence) · **Gap/Question** (needs Product/BA/Dev). **Never invent a requirement.**

**(e) QA review brief + test strategy.** A concise, QA-oriented summary: **Understanding · Scope · Risks ·
Questions/Gaps · Regression impact · Test strategy** (which of functional / regression / API / UI /
integration / permissions / validation / negative / cross-browser / mobile / DMS / performance apply, and
why). This helps QA *think*, not just produce artifacts.

**(f) Write to `qa-context`** (the `story` slice: id, the analysis, the labeled gaps, the review) so
downstream engines (case authoring, ADO publish) build on it and traceability starts here.

**(g) End at the gate.** Surface: "I found N gaps/questions — resolve with Product/BA first, or proceed on
the stated assumptions?" It does not auto-advance to case generation.

**References** (`skills/story-intelligence/references/`): a concern/gap **taxonomy** (the checklist of
concern types to scan for) and the **review-brief format**. Keep them product-neutral.

## 3. Out of scope
Case generation (SP8 / existing author-cases), any ADO **write** (SP7+), automation (SP9), failure→bug
(SP10). SP6 reads and reasons only. The orchestrator's routing to `story-intelligence` exists from SP5 —
update its wording if needed so the single skill covers both the analysis and the review.

## 4. Acceptance criteria
1. `story-intelligence` skill exists, product-neutral, triggers on the story-analysis intents, and reads the
   ADO project/fields from the **house-profile** (no hard-coded project/board/org).
2. It retrieves the full graph via the ADO MCP **read** ops (fields, AC, comments, parent/child/related/
   bugs/links) and uses **no write op**.
3. Output = requirement understanding + concern list + the QA review brief + test strategy, with every
   claim labeled Confirmed/Inferred/Assumption/Gap; it never invents a requirement.
4. It writes the `story` slice of `qa-context` and ends at the gaps gate (no auto-advance to cases).
5. Product-neutral + secret-free (scan); committed + pushed to `dev`.

## 5. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per chunk; push; secret + product scan before every push. No PR.
Conventional commits scoped `qa-engineering`. Independent review after the build (higher-value SP).
