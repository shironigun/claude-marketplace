---
name: automation-engine
description: Native skill of the qa-engineering — take QA-approved test cases (from qa-context, or from an ADO Test Plan/Suite) and generate framework-aware Playwright + TypeScript spec files for them, reusing the kit's existing Standards, services, schemas, page-objects, builders and fixtures rather than duplicating them. Each generated spec lands at the framework's own level (folder + tag) and carries a traces-case line back to its case so the story-case-script thread holds. Product-neutral and tracker-agnostic (Azure DevOps is the implemented case source). Use whenever the user wants to "automate these cases", "turn these test cases into scripts", "generate automation for this suite", "write specs for the approved cases", or points at an approved set / a Test Plan+Suite and asks for automation. It reads the qa-context cases + framework slices and writes the qa-context automation slice. It does NOT author cases (author-api-cases / author-ui-cases), publish them (ado-publish), run them, or triage failures (failure-to-bug). For a brick-by-brick framework build from a module scan, that is kit-builder; this engine generates from cases.
---

# Automation engine — approved cases → framework-aware specs

Take cases **QA has already approved** and turn each into a runnable Playwright + TypeScript spec, at the
framework's own level, **reusing** what the framework already has. This is the **"automate these cases"**
entry point: it shares the kit's generation pipeline with `kit-builder` but starts from **cases** (the
qa-context `cases` slice, or ADO Test Cases) instead of a module scan.

This engine **generates**; it does not author, publish, run, or triage. If there are no approved cases, it
stops and says so.

> **Reuse, don't reinvent (the load-bearing rule).** Script generation already exists as the kit's own
> product-neutral guidance — `${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md` (authored case → runnable
> spec, folder-is-the-level, the `traces-case:` line, §0 mapping each emitted block to its Standard). This
> engine **uses that doc as-is**, exactly as `kit-builder` phases 2-3 do, and leans on the existing
> `knowledge/standards/`, services, schemas, page-objects, builders and fixtures. It does not restate the
> emit rules and does not hand-roll a parallel generator. A new helper/fixture is created **only** when none
> fits, and `reuse-guardian` blocks duplication.

> **Product-neutral by rule.** Examples (Widgets, Orders) are generic placeholders. The module, endpoints,
> fields and environment are the QA's — from the cases, the framework map and `.env` — never hard-coded
> here. No real product, org, URL, account or secret belongs in this skill or in anything it generates to a
> committed file.

## Relationship to kit-builder (complements, does not fork)

| | `kit-builder` (phases 2-3) | `automation-engine` (this skill) |
|---|---|---|
| **Seed** | a module scan (`flow-map.json`) | **approved cases** (qa-context `cases`, or ADO Test Cases) |
| **Entry** | the brick-by-brick build state machine | a direct "automate these cases" request |
| **Generation** | `docs/script-generation.md` | **the same `docs/script-generation.md`** |
| **Gates** | self-check → `framework-reviewer` + `reuse-guardian` | **the same** self-check → independent gate |

Same Standards, same emit guidance, same review + reuse gates — only the seed and the entry differ. The
orchestrator routes "build a framework brick by brick / continue the build" to `kit-builder` and
"automate these cases / a suite id / approved cases" here.

## Inputs (read from the file, never a chat block)

- **qa-context `cases` slice** at the framework root (`knowledge/orchestration/qa-context.md`):
  `{ approved, items[], mdPath, coverage }`, each item `{ title, level, tags[], tracesStory, adoCaseId? }`.
  `level` is the framework level already chosen at authoring (API: `contract`/`endpoint`/`workflow`;
  UI: `smoke`/`regression`/`e2e`).
- **qa-context `framework` slice** (`{ map }`) — the inspected framework (services, fixtures, modules,
  page-objects present) to reuse. If absent, inspect the framework root directly (the same inspection
  `kit-builder` does) before generating.
- **`.env`** — URLs/auth, read by the generated specs at run time; never copied into a committed file.

## The flow — in order

### 1. Load approved cases (fail-closed)
Read the `cases` slice from `qa-context.json`.
- If the slice is **absent / has no items**, STOP: "I generate specs from approved cases — there are none
  in the context yet. Author them (`author-api-cases` / `author-ui-cases`) and approve them first."
- If present but **not approved** (`cases.approved` is anything other than `true`), STOP: "These cases
  aren't approved yet (`cases.approved` isn't set). Approve them first, then I'll automate them." Treat an
  absent `approved` as not-approved — **fail closed**, same discipline as `ado-publish`.

**Alternate source — an ADO suite.** If the QA points at a published Test Plan + Suite instead of local
cases, pull the cases with `testplan_list_test_cases` (read-only) for that plan/suite, and map each ADO
Test Case to the same item shape (`title`, `level` from its tag/folder convention or **asked if ambiguous —
never guessed**, `adoCaseId` = its id, `tracesStory` from its tested-by link). Then continue as below. A
populated suite already passed `ado-publish`'s approval + publish gate, and this pull is **read-only and
generate-only** (no tracker writes), so generating from it is safe by construction — still, confirm with the
QA **which** plan/suite before generating.

### 2. Inspect the framework for reuse (before generating anything)
Read the `framework` slice (or inspect the root). Build the reuse map the way `kit-builder` does: which
services, schemas, routes, builders, page-objects, components and fixtures already exist for this module and
its dependencies. **Prefer reuse**: a prerequisite another module owns is built by that module's
service/POM via the merged fixtures, never re-implemented. Note the gaps you will need to add (a missing
schema, a new page-object) — the minimum, nothing speculative.

### 3. Generate one spec per case — via `docs/script-generation.md`
For each approved case, following `${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md` exactly (**do not restate
or re-derive its emit rules here** — it is the single source; this engine only feeds it cases):
- Resolve the case's `level` → its **folder + level tag** per that doc (§1 API / §7 UI) and
  `references/case-to-spec-mapping.md`. **The folder is the level:** API `contracts/`/`endpoints/`/
  `workflows/`, UI `smoke/`/`regression/`/`e2e/` — note `ui-smoke`/`ui-regression`/`ui-e2e` are the
  Playwright **project** names (what `testMatch` targets those folders), **not** the folder names. The tag
  is `@contract`…/`@smoke`…. Never encode the level in a title.
- Emit the spec per the doc's emit order + translation rules (its §2).
- Emit **one `traces-case:` line per case / `test()` block** in a JSDoc directly above it, its value the
  case **title** (the same convention the doc's worked examples use), so the spec resolves back to its Test
  Case. Carry the case's own `tags[]` plus `@<module>` and the one level tag.
- Reuse the building blocks from step 2; add a new one only when none fits, to the Standards.

### 4. Self-check, then the independent gate (same two tiers as kit-builder)
After emitting the specs and **before** any verify, run **`kit-builder`'s per-phase generation self-check**
(the seven items in its SKILL, each naming its Standard) over the generated specs — run it from there, do
not re-list it here. Then run the **independent** gate:
invoke **`framework-reviewer`** over the generated files (it re-checks against
`knowledge/review/review-rubric.md` + the Standards and delegates the reuse dimension to
**`reuse-guardian`**). **Blocking findings stop generation** — fix on the next pass until the reviewer
returns PASS. The self-check does not replace the independent gate.

### 5. Verify honestly
Run the objective check (`npm run typecheck` / `lint`, and the level's `npm run test:*`). Report the real
result — a red run is reported red. A spec counts as generated only when it typechecks; a case whose spec
could not be generated cleanly is reported as such, never glossed.

### 6. Write the qa-context `automation` slice + return
Per `knowledge/orchestration/qa-context.md`, write **only** the `automation` slice back, additively:
- **`automation`** = `{ specs[], levels[] }` — each spec `{ path, level, tracesCase }` where `tracesCase`
  is the case's `adoCaseId` when it has one (else the case title), and `levels[]` the levels covered.

The traceability thread stays linked: `story.id ⇄ cases.items[].tracesStory / .adoCaseId ⇄
automation.specs[].tracesCase`. Then return the generated paths + a per-case summary (generated ✓/✗,
level, reused vs newly-added blocks), reporting only what verification actually showed.

## Safety & honesty rules (state and obey)
1. **Approved only, fail-closed.** No spec is generated from an unapproved or absent `cases` slice.
2. **Reuse, never duplicate.** Lean on the Standards + existing building blocks; `reuse-guardian` blocks a
   re-implementation of what a module already owns. A new helper only when none fits.
3. **Generate to the Standards via the kit's doc.** Use `docs/script-generation.md` + `knowledge/standards/`;
   do not hand-roll a parallel generator or restate the emit rules here.
4. **Honest outcomes.** Report typecheck/run results truthfully; a case whose spec failed to generate is
   reported failed. No green claimed without the run.
5. **Product-neutral + secret-free.** Generic examples only; nothing product-specific, no real URL/account/
   credential in the skill or in generated committed files. `.env` holds the environment; the tracker signs
   in interactively.

## Reference files
- `references/case-to-spec-mapping.md` — how a case (level, steps, tags, `tracesStory`, `adoCaseId`) maps
  onto the folder, the level tag, the `traces-case:` line, and which Standards + which `script-generation.md`
  section apply (pointers, not copies).

## Done when
- [ ] Specs were generated **only** from approved cases (fail-closed), or from an ADO suite's cases pulled
      read-only; nothing was authored here
- [ ] Each case mapped to the correct framework **level** (folder + tag); the level is never in a title
- [ ] Generation used `docs/script-generation.md` + `knowledge/standards/` and **reused** existing building
      blocks — no duplicated framework functionality (`reuse-guardian` clean)
- [ ] Each spec carries a `traces-case:` line resolving to its case; the story ⇄ case ⇄ script thread holds
- [ ] The self-check ran, then the independent `framework-reviewer` gate returned PASS before verify
- [ ] The `automation` slice was written from the file, additively; results were reported honestly
- [ ] Nothing product-specific, secret or real-URL appears in the skill or in what it generated to a
      committed file
