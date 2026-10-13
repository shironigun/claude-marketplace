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

## Latest — Desktop & manual track (SP19, 2026-10-13)

Spec: [`SP19-spec.md`](./SP19-spec.md) · Plan: [`SP19-plan.md`](./SP19-plan.md). Makes the plugin useful to QAs
on **legacy/desktop products** (VB.NET, Delphi, WinForms/WPF) that **cannot** be Playwright-automated — story
analysis, the Knowledge Base/atlas, test-case authoring and all Azure DevOps work (Test Plans/Suites, sprints,
SWAT/bug boards) are relevant to them even though the automation pillar is not. Adds a **`productKind`**
dimension to `system-map.json` (`web` | `api` | `desktop` | `mixed`) and a derived **`automation`**
(`applicable` | `manual` | `partial`) that **gates which loop applies**. `scan-and-confirm` confirms the product
kind first (question 2, default `web`, never silently inferred) and discovers modules **surface-first** — web
routes/nav, **desktop forms/windows/menus**, or API backend-prefix — skipping all connection questions for a
pure desktop product. The **manual track** for a `desktop` product is: analyze → KB → author **manual** cases
(`author-ui-cases` names controls by label) → **publish to ADO** → *test by hand* → **file bugs**
(`failure-to-bug` from a QA-described failure) — **no Playwright build/run**. The KB/atlas gains a desktop
variant (**screen → code-behind → service**); a `mixed` product automates its **API** surface and tests its
**desktop UI** manually. The whole change is **additive-only to the web/api path** — every new branch sits
behind a `productKind`/`automation` check and a web/api product behaves exactly as before. Independent
adversarial review (web non-regression + clean gating): **PASS after fixes** — 4 findings (1 HIGH `mixed`
UI-case mis-gating, 1 broken question cross-reference from the renumbering, 2 low consistency nits), **all
fixed**; the core invariant held. Desktop UI **automation** is explicitly out of scope today. Version
`0.6.2 → 0.7.0`.

## Knowledge Base (SP18, 2026-10-11)

Spec: [`SP18-spec.md`](./SP18-spec.md) · Plan: [`SP18-plan.md`](./SP18-plan.md). Adds a **frontend-first,
per-module Knowledge Base** the plugin generates into the QA's own repo: a behavior brief (`modules/<slug>.md`),
a central file of atomic testable rules (`RULES.md`), and a thin code atlas (`atlas/<slug>.md`). Modules are
discovered **frontend-first** (from the app's routes/nav, not backend controllers). Generated **lazily** (a stub
per module on first `/qa`, deepened on demand by the new `kb-builder` engine). The KB **grounds**
`story-/code-intelligence`, **seeds** cases from RULES anchors (new `tracesRule` link → rule → case → script →
bug), and **scopes** automation reuse via the atlas globs. New standard `knowledge/standards/knowledge-base.md`;
the KB is **committable in the QA's repo, never shipped in the plugin**. Independent review: PASS-WITH-FIXES
(0 blockers; 5 Minor fixed). Version `0.5.0 → 0.6.0`.

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

## Phase 3 — Gap closure (SP12–SP13)

A post-Phase-2 audit against the Phase-2 loop (*story → … → API+UI automation → **run** → investigate →
defect*, plus the mirror ***codebase → QA***) found two links the roadmap advertised but had not shipped as
standalone engines: the **"→ run →"** step (the loop ran automation only *inside* a build phase, with no
on-demand run engine) and the **codebase → QA** direction ("analyze this module" only routed to
`scan-and-confirm`, which produces a build flow-map — not a QA understanding + gaps + review). Phase 3 closes
both, making the orchestrator's "generate or run automation" and "codebase → QA" claims real.

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP12** | Run engine (`run-suite`) — run the kit's own scripts on demand, capture the **real** result, write `failures`, offer gated `failure-to-bug` | SP5, SP9, SP10 | ✅ **complete** (2026-10-09) |
| **SP13** | Code-intelligence — read-only *codebase → QA* mirror of story-intelligence (module code → understanding + gaps + QA review, writes `module` + `review`, feeds author-*) | SP5, SP6, SP8 | ✅ **complete** (2026-10-09) |

**Phase 3 complete (2026-10-09).** **`run-suite`** closes *"→ run →"*: it drives the framework's **own**
npm scripts / Playwright projects (never a reinvented runner), parses the real pass/fail/flaky/skipped
result (honest outcomes — no fabricated green), writes the `failures` slice, and offers the gated
`failure-to-bug` hand-off. **`code-intelligence`** closes *codebase → QA*: given a module/path it reads the
code read-only (reusing a confirmed `flow-map.json` when present), produces a requirement understanding +
gaps + QA review with **every claim labeled** Confirmed/Inferred/Assumption/Gap-or-Question (never inventing
intent), writes the `module` + `review` slices the authoring engines already consume, and ends at the gaps
gate. Both are product-neutral, secret-free, and gated; specs/plans: [`SP12-spec.md`](./SP12-spec.md) ·
[`SP13-spec.md`](./SP13-spec.md).

## Phase 4 — Ease-of-use command surface (SP14)

Phase 1–3 built the whole loop, but the only entry point was "invoke the `qa-orchestrator` agent and phrase
your intent." For a manual-QA audience that is the first bit of friction. Phase 4 adds a discoverable
**slash-command layer** so a QA drives the loop from the `/` menu without knowing the engines.

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP14** | QA-friendly command surface — `commands/` slash commands (easy-button journeys + per-step), routed through the orchestrator | SP5–SP13 | ✅ complete (2026-10-10) · **superseded by SP15 (14→7)** |

> The 14-command set below is SP14's historical record; **SP15 consolidated it to 7** (see Phase 5). The
> command names listed here no longer exist as separate files.

**Phase 4 complete (2026-10-10).** Added `commands/` (auto-discovered, namespaced `/qa-engineering:*`) in two
tiers. **Easy-buttons** walk the whole loop in sequence, pausing at every human gate in plain language: `/qa`
(concierge / front door), `/test-story <id>`, `/test-module <path>` (the codebase → QA journey), `/resume`.
**Single steps**, one per engine: `/analyze-story`, `/analyze-module`, `/make-cases`, `/review-cases`,
`/push-cases`, `/automate`, `/run`, `/file-bug`, `/build-framework`, `/learn`. Every command is a **thin
wrapper that routes through the `qa-orchestrator`** — it hands a clean intent + argument to the orchestrator,
which keeps house-profile reading, qa-context threading, and all the gates centralized; no command bypasses a
gate, performs an un-gated tracker write, or restates an engine's procedure (nothing to drift). Product-neutral
+ secret-free. Spec/plan: [`SP14-spec.md`](./SP14-spec.md) · [`SP14-plan.md`](./SP14-plan.md).

## Phase 5 — The guided QA experience (SP15)

SP14's 14 flat commands were too many for a manual QA, and there was no single "start here and guide me" entry.
Phase 5 turns the plugin into a guided experience: a flagship that walks a QA from zero → first automated
module and back to expand, a lean smart-command set, a module registry for "one module at a time", and a
`/learn` that saves progress. Spec/plan: [`SP15-spec.md`](./SP15-spec.md) · [`SP15-plan.md`](./SP15-plan.md).

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP15 P-build** | Flagship `/qa` guided arc + lean 7-command set (14→7, optional-context args) + `catalog` module registry + `/build` expand | SP5–SP14 | ✅ **complete** (2026-10-10) |
| **SP15 P-learn** | `/learn` as a progress-saving course — `learning` slice, kickstart/resume best-sequence path, durable study-plan | SP2, SP15 P-build | ✅ **complete** (2026-10-10) |

**P-build complete (2026-10-10).** Commands **14 → 7**: ⭐ `/qa` (flagship — first run walks set-up → scan the
codebase → module list + recommendation → pick one → structure once → build that module, gated; returning, it's
the home base), `/build` (build/expand — structure once, then one module at a time, resumes), `/test` and
`/analyze` (auto-detect story vs module), `/run`, `/learn`, `/resume`; **every command takes optional context to
steer it**. New `catalog` slice in qa-context is the **module registry** (`discovered`/`in-progress`/`built` +
`frameworkScaffold`) that makes expand-one-module-at-a-time real. The gated sub-steps (cases/publish/automate/
file-bug) fold into the journeys + `/qa` — capability kept, menu halved. Orchestrator drives the arc + registry;
version bumped `0.1.0 → 0.2.0`.

**P-learn complete (2026-10-10).** `/learn` is now a **progress-saving course**, not a Q&A box. New `learning`
slice in qa-context (`goal`, `depth`, `current`, `path[]` with `pending`/`covered`, `studyPlanPath`) persists
the learner's place across sessions. `/learn` with no arg **kickstarts** (ask goal + level → build the
best-sequence path from `learning-path.md` → write the slice + a durable **study-plan** markdown the learner
keeps) or **resumes** ("last time: X; next: Y"); an arg jumps/steers. The **`automation-tutor` teaches
read-only; the orchestrator persists** progress and the study-plan after each topic — fixing the audit's #1
learning gap (teaching had zero persistence) and the SP2 "pick up where they left off" regression. Checkpoints
at stage ends; a "try it in the kit" hand-off to `/build`. `teach-automation`'s old "keeps no external state"
rule was replaced with learning-slice-backed resume.

## Phase 6 — The QA status board (SP16)

The plugin modeled its whole state in `qa-context` but never showed it (both audits' #1 gap). Phase 6 renders
it as a **status board** — the "you are here" view that makes the plugin feel like one application. Spec/plan:
[`SP16-spec.md`](./SP16-spec.md) · [`SP16-plan.md`](./SP16-plan.md).

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP16 P-view** | In-chat status board — `/status` + `/qa` home base render it from one spec (loop + you-are-here, module table, metrics, next) | SP5, SP15 | ✅ **complete** (2026-10-11) |
| **SP16 P-rich** | Durable `qa-status.md` + coverage matrix + run-history trend | SP16 P-view, SP12 | ✅ **complete** (2026-10-11) |

**P-view complete (2026-10-11).** One render spec (`knowledge/orchestration/status-board.md`) defines the board
— header, metric line (modules built / last run / course / open bugs), the **loop strip with you-are-here**
(`✓`/`●`/`○`/`✗`), the module table from `catalog`, and the single next action — drawn from the slices
`qa-context` already holds. New **`/status [section]`** command renders it on demand (optional section focus);
**`/qa` returning** renders the same board as its home base, both from the one spec. **Read-only + honest**
(absent slices → "not started", nothing fabricated, no gate) and **portable markdown** (no graphics
dependency — the baseline that works in any Claude Code surface). Version `0.2.0 → 0.3.0`.

**P-rich complete (2026-10-11).** Tier 2 adds the durable + coverage + trend layer: a **`runHistory`** slice
(`run-suite` appends real totals per run) so the board shows the last run's **passed/flaky + a trend** (the
`failures` slice holds only failing entries, so it couldn't); a **coverage matrix** (modules × the six levels,
`✓`/`○` from `automation` + a read-only scan of the spec folders) behind `/status coverage`, replacing eyeballed
`--list`; and a durable **`qa-status.md`** snapshot the orchestrator refreshes each step (git-ignored, with
`learning-plan.md`). All honest + read-only for rendering (the `qa-status.md` write is the one local-file write).
Version `0.3.0 → 0.4.0`. A live Claude Code **mod** pane (Tier 3) stays deferred. **SP16 complete.**

## Phase 7 — Live status pane (SP17, mods / Tier 3)

The deferred Tier 3 of the status board: a live Claude Code **mod** pane that renders the board beside the work
and refreshes as `qa-context` changes — the "always-on app" surface.

| SP | Title | Depends on | Status |
|---|---|---|---|
| **SP17** | Live status pane — a `hooks/` mod (`register.tsx`) rendering the board in a live Pane; `/qa-status` + auto-open | SP16 | ✅ **complete** (2026-10-11) |

**Complete (2026-10-11).** Built with the `plugin-authoring` mods API: `hooks/hooks.json` (`{ "modules": [...] }`)
+ `hooks/register.tsx` opens a `QA status` Pane via `ui.open`/`ui.render`, reads `qa-context.json` with `$.fs`,
and refreshes every 3s via `$.clock.every` (bumping a `$.state` tick atom; contract in `types/index.d.ts`). It
renders the same board as `/status` — metric line, loop strip with you-are-here (`✓`/`●`/`○`/`✗`), module list,
coverage + trend — **read-only and honest** (absent slices → "not started"; nothing fabricated). Verified
working live (empty + populated states). Version `0.4.0 → 0.5.0`.

**Decision + honest caveat (documented in the README).** Folded **into** `qa-engineering` (user's call) rather
than a sibling plugin, so the pane ships with the plugin. The trade: the mods `hooks.json` format only loads on
the mods runtime (≈2.1.293+). **Confirmed consequence (observed on the 2.1.233 CLI after install):** on an engine
without the mods runtime the **entire plugin fails to load** — `claude plugin list` → `✘ failed to load` /
`Error: Hook load failed` — so all skills/commands/agents are unavailable there, not just the pane. Mods-capable
*interactive* engines load the whole plugin fine. Affects the standalone CLI, `claude -p` / CI, and older
versions. The documented remedy for those: **delete `hooks/`** (the only thing that depends on it) — everything
else, including the in-chat `/status` board, then loads normally. User chose to keep it folded in regardless
(their users are on current mods-capable builds); the trade is accepted and documented, not hidden.

> Side-fix found via the full-plugin validate this phase triggered: `framework-standards` and `teach-automation`
> had an in-value `: ` (colon-space) in their YAML `description`, which a strict parser rejects (the desktop
> runtime tolerated it) — replaced with an em dash so the frontmatter is valid YAML everywhere.

## SP1 (this sub-project)
Spec: [`SP1-spec.md`](./SP1-spec.md) · Plan: [`SP1-plan.md`](./SP1-plan.md) · Research notes:
[`research/official-docs-notes.md`](./research/official-docs-notes.md).

SP1 makes the plugin standalone and opinionated, and builds the **Framework Standards** knowledge core
(general, official-docs-grounded, one reference per building block) plus a thin `framework-standards`
skill that the Tutor/Builder/Reviewer all consume. It internalizes qa-toolkit's four capabilities as
native general skills and removes the external dependency. It does **not** build the tutor, the
generators, or the reviewer — those are SP2–SP4.
