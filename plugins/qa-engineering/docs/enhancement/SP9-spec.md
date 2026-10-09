# SP9 — Automation engine: approved cases → framework-aware scripts (spec)

Status: planned (2026-10-08). Phase 2. Depends on SP5 (qa-context), SP8 (authoring writes the `cases` slice +
approval seam), SP7 (ado-publish stamps `adoCaseId`), and SP3 (`kit-builder` generation + the Standards +
the `framework-reviewer`/`reuse-guardian` gates).

## 1. Goal
Add the **"automate these cases"** path: take **approved** (and optionally ADO-published) test cases from
`qa-context` and generate **framework-aware** Playwright + TypeScript `.spec.ts` files at the framework's own
levels — reusing the existing Standards, fixtures, page-objects, services and builders instead of duplicating
them — each script carrying a `traces-case:` tag back to its case so the story ⇄ case ⇄ script thread stays
intact. It writes the `qa-context` `automation` slice and returns the generated paths.

## 2. Design decisions (expert calls — "reuse, don't reinvent")
1. **Align to the framework's six levels — there is no separate "L1–L5".** The Standards define six levels
   (`knowledge/standards/test-levels.md`): API contract / endpoint / workflow and UI smoke / regression /
   e2e, where **the folder is the level and a tag carries it**. Each case already records its `level` in the
   `cases` slice (SP8). The engine maps that level → the right folder + level tag + the Standards for it. We
   do **not** invent an L1–L5 scheme; the unified vision's "levels" are satisfied by the six real ones. This
   is the DRY/framework-aware mandate applied to levels.
2. **The engine complements `kit-builder`; it does not replace it.** `kit-builder` generates from a **module
   scan** (flow-map) during a brick-by-brick build. SP9's engine generates from **cases** (the `cases` slice,
   or ADO Test Cases pulled via `testplan_list_test_cases`). Both share the same Standards, the same
   generation self-check, and the same independent review + reuse gates — they differ only in the seed
   (scan vs cases). The orchestrator routes "automate these cases / a suite id / approved cases" here;
   "build a framework brick by brick" stays with the phase machine.
3. **Framework-aware = reuse by construction.** Before generating, the engine inspects the framework map
   (the `framework` slice / `kit-builder`'s inspection) and the Standards, and **reuses** existing services,
   schemas, page-objects, components, builders and fixtures. It creates a new helper only when none fits, and
   the `reuse-guardian` gate blocks duplication — same rule the phase build obeys.
4. **Traceability by tag.** Each generated spec carries the `traces-case:` tag resolving to the case
   (`adoCaseId` when published, else the case title/local id). This is the existing convention the build path
   uses, so a spec resolves back to its Test Case. The engine writes `automation.specs[]` each
   `{ path, level, tracesCase }`.

## 3. Deliverables
- **D1** `skills/automation-engine/SKILL.md` — the cases→scripts engine: load approved cases from
  `qa-context` (or pull ADO cases for a given plan/suite via `testplan_list_test_cases`), inspect the
  framework for reusable building blocks, generate one `.spec.ts` per case at its framework level (folder +
  tag + Standards), run the per-phase generation self-check, and write the `automation` slice. Product-neutral;
  tracker-agnostic; reuses the Standards (does not restate them).
- **D2** `references/` as needed — e.g. `case-to-spec-mapping.md` (how a case's level/steps/tags map onto the
  folder, the level tag, the `traces-case:` tag, and which Standards apply) — pointing at the Standards, not
  duplicating them.
- **D3** Wire `qa-orchestrator`: "automate these / a suite id / approved cases" → `automation-engine`; keep
  `kit-builder` generation for the brick-by-brick build. Update the `automation` slice consumers note.
- **D4** Reconcile the now-stale **`kit-builder` Phase 4** ADO wording: case↔script linking goes through the
  `adoCaseId` that `ado-publish` stamped (and the `traces-case:` tag), not the retired `file-to-tracker`
  authoring/filing path. (Targeted wording fix — the full phase-machine/engine integration is SP11.)

## 4. Out of scope
Authoring cases (SP8) · publishing cases (SP7) · failure→bug (SP10) · the single end-to-end rehearsal (SP11).
SP9 generates scripts from approved cases; it does not run them or triage failures.

## 5. Acceptance criteria
1. `automation-engine` generates `.spec.ts` from **approved** cases in `qa-context` (refuses unapproved,
   same fail-closed discipline as ado-publish), at the framework's six levels (folder + tag), reusing the
   Standards and existing building blocks — **no duplicated framework functionality** (reuse-guardian clean).
2. It can also seed from **ADO Test Cases** (`testplan_list_test_cases` for a chosen plan/suite) when the QA
   points at a published suite rather than local cases.
3. Each generated spec carries a `traces-case:` tag resolving to the case; the `automation` slice
   (`specs[]`, `levels[]`) is written; the story ⇄ case ⇄ script thread holds.
4. Product-neutral + secret-free (scan); reuses `knowledge/standards/` rather than restating it; committed +
   pushed to `dev`. `kit-builder` Phase 4 ADO wording reconciled to `ado-publish`/`adoCaseId`.
5. **Independent adversarial review passes** — framework-awareness (real reuse, no duplication), level
   mapping correct, approval fail-closed, traceability intact, neutral.

## 6. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product scan
before every push. No PR. Full independent review (generation correctness + the reuse mandate).
