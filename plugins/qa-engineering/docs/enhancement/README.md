# qa-engineering — Enhancement Program

Turning the kit into a **complete, self-contained, product-general automation ecosystem**: it
**teaches** a manual QA automation from zero *and* **builds** a production-quality Playwright +
TypeScript framework with them, brick by brick. The north-star vision is the author's 23-section
enhancement spec (kept with the author; not shipped in this repo).

## Program principles (hold across every sub-project)
1. **General & product-adaptable** — nothing product-specific is committed. "Customer"/"Deal" appear
   only as clearly-labeled illustrations. Everything must work on any product/stack.
2. **Delivered as skills + agents** — capabilities are skills and agents that draw on a shared,
   general knowledge core; not just static prose.
3. **Self-contained** — no external *plugin* dependency for core function (the Playwright + ADO MCP
   servers are fine). qa-toolkit's capabilities are internalized.
4. **Official-docs-grounded** — teaching and generation lead with and link official sources
   (playwright.dev, etc.). Never present an invented practice as an official recommendation.
5. **Ask-with-recommendation** — every decision point gives a recommended option + the reason; "you
   decide" is honored by taking the recommendation. Opinionated defaults are not re-asked.
6. **Honest tests, isolation, and cross-module reuse by construction** — one exact assertion, real
   schemas, no failure-hiding skips, each test owns+cleans its data, and framework functionality is
   reused across modules (DRY), never duplicated.
7. **Preserve existing strengths** — `qa-orchestrator` (was `kit-orchestrator`), `scan-and-confirm`, `kit-builder`, the
   6-phase state machine, the `template/` scaffold, secret scanning, the MCP servers.

## Sub-project decomposition (each: spec → plan → build → review)

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP1** | **Self-contained foundation + Framework Standards core** | — | ✅ **complete** (2026-10-07) |
| SP2 | Automation Tutor (curriculum · depth levels · on-demand Playwright Q&A · decision guide) | SP1 | ✅ **complete** (2026-10-08) |
| SP3 | Framework Builder + enforcement (opinionated generation · isolation · cross-module reuse · Allure · terminal toolkit · VS Code extension) | SP1 | ✅ **complete** (2026-10-08) |
| SP4 | Reviewer + Reuse Guardian (review gates, block on hard-rule violations) | SP1, SP3 | ✅ **complete** (2026-10-08) |

**Phase 1 complete (2026-10-08).** SP1–SP4 are done and pushed. The plugin is a self-contained teach+build
automation ecosystem: **`qa-orchestrator`** routes teach↔build; **`automation-tutor`** teaches from the
Standards at adjustable depth; **`scan-and-confirm → kit-builder`** scans/confirms then generates **to the
Standards** with a per-phase self-check; **`framework-reviewer` + `reuse-guardian`** gate each phase.

## Phase 2 — QA Engineering expansion (SP5–SP11)

The plugin (renamed `test-automation-kit` → **`qa-engineering`**, 2026-10-08) now expands into **the single
AI QA Engineering plugin** for the whole QA loop: *story → understand/gaps → QA review → cases → ADO plan/
suite → API+UI automation (levels) → run → investigate → defect*, plus the mirror *codebase → QA* direction.
Design (architecture, capability matrix, workflows, roadmap): the **QA Engineering Plugin** artifact
(https://claude.ai/artifact/R4DPcqGmL5DTs9s7tTAFsW).

**Approach:** product-neutral engines + a team **house profile** (user-supplied, git-ignored config) so the core
stays shareable; **QA in control at every gate**; ADO *writes* only behind a confirmed gate. **Unlock:** the
shipped ADO MCP already exposes `testplan_add_test_cases_to_suite` + `list_test_cases` — the "suite add is
manual" limit in the filing skills is obsolete.

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP5** | Orchestrator (→ `qa-orchestrator`) + `qa-context` state + house-profile scaffold | SP1–4 | ✅ **complete** (2026-10-08) |
| SP6 | Story intelligence + QA review (full ADO work-item graph → understanding + gaps; read-only) | SP5 | ✅ **complete** (2026-10-08) |
| SP7 | ADO publish — pick Test Plan + Suite, add-to-suite, link to story (gated writes) | SP5 | ✅ **complete** (2026-10-08) |
| SP8 | Consolidate case authoring + house voice (via profile) + wire the approval seam | SP5 | ✅ **complete** (2026-10-08) |
| SP9 | Automation engine — framework-aware, the six levels, approved/ADO cases→scripts | SP5, SP3 | ✅ **complete** (2026-10-08) |
| SP10 | Failure → investigation → bug (API+UI) + trace/screenshot reading + gated ADO filing | SP5 | ✅ **complete** (2026-10-08) |
| SP11 | Integrate the single entry point + end-to-end rehearsal | SP5–10 | ✅ **complete** (2026-10-08) |

**Phase 2 complete (2026-10-08).** SP5–SP11 are done and pushed to `dev`. The plugin is now **the single AI
QA engineering plugin** — one orchestrator (`qa-orchestrator`) routing the whole loop to native engines:
**story-intelligence** (analyze a story, read-only) → **author-api-cases / author-ui-cases** (one shared
house-style core; write the `cases` slice; the fail-safe **approval seam**) → **ado-publish** (gated
Test-Plan/Suite publish + link) → **automation-engine** (approved/ADO cases → framework specs at the six
levels, reusing the Standards) → **failure-to-bug** (investigate API+UI failures → gated bug file), all
threaded through **qa-context** (story ⇄ case ⇄ script ⇄ defect) and driven by the git-ignored
**house-profile**. Every tracker write is human-gated. The build path (`scan-and-confirm` → `kit-builder`,
phases 0–5) is one routed workflow. See [`end-to-end-rehearsal.md`](./end-to-end-rehearsal.md) for the
full-loop trace. Next (user-authorized, not done here): merge `dev` → `main` + refresh the marketplace
listing.

release-notes-suite stays a sibling the orchestrator can hand off to; `design-studio` is out of scope.

## SP1 (this sub-project)
Spec: [`SP1-spec.md`](./SP1-spec.md) · Plan: [`SP1-plan.md`](./SP1-plan.md) · Research notes:
[`research/official-docs-notes.md`](./research/official-docs-notes.md).

SP1 makes the plugin standalone and opinionated, and builds the **Framework Standards** knowledge core
(general, official-docs-grounded, one reference per building block) plus a thin `framework-standards`
skill that the Tutor/Builder/Reviewer all consume. It internalizes qa-toolkit's four capabilities as
native general skills and removes the external dependency. It does **not** build the tutor, the
generators, or the reviewer — those are SP2–SP4.
