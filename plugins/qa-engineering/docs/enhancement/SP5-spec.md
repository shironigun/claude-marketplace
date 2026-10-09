# SP5 — QA Orchestrator + qa-context + house-profile scaffold (spec)

Status: in progress (2026-10-08). First sub-project of **Phase 2** (QA Engineering expansion). Foundation
that SP6–SP11 plug into. Design: the QA Engineering Plugin artifact
(https://claude.ai/artifact/R4DPcqGmL5DTs9s7tTAFsW). No new engines, **no ADO writes** — this is the skeleton.

## 1. Goal
Turn the plugin's entry point into **one AI QA orchestrator** that reads a QA's intent + the available
context and routes to the right workflow, carries work forward in a shared **`qa-context`**, and keeps QA
in control at every gate — and establish the **house-profile** config seam so all product/tracker specifics
live in one user-supplied file while the engines stay product-neutral.

## 2. Deliverables

### 2a. `agents/qa-orchestrator.md` (rename `kit-orchestrator` → `qa-orchestrator`, expand)
- `git mv agents/kit-orchestrator.md agents/qa-orchestrator.md`; update `name:` and every reference across
  the plugin (README, docs, the other agents, skills that mention it).
- Keep all existing teach↔build↔review routing. **Expand** the routing to the full QA loop with an
  intent → workflow table (route to what exists today; name the SP6–SP10 engines as "arriving in SPx" so
  the map is complete and forward-compatible):
  | Signal | Route |
  |---|---|
  | ADO work-item id / "analyze this story" | **story-intelligence** (SP6) → **qa-review** (SP6) |
  | "create test cases" (+ story / review / module) | `author-api-cases` / `author-ui-cases` (exist) |
  | "push to ADO" / approved cases | **ado-publish** (SP7) |
  | "automate these" / a suite id / approved cases | `kit-builder` generation (exists) → **automation engine** (SP9) |
  | failing `.spec.ts` / stack / red run | `failure-to-bug` (exists) → **investigation** (SP10) |
  | "analyze this module" / code path | `scan-and-confirm` (exists) |
  | "teach me…" / "how does X work" / "is this right" | `automation-tutor` / `framework-reviewer` (exist) |
- Document the **human gates** it enforces (never auto push cases/bugs, never modify product code or the
  framework, never resolve an ambiguous requirement silently) and that it **reads the house-profile** and
  **reads/writes `qa-context`**. It routes and gates; it does not itself author/generate (the engines do).
- `tools`: Skill, Read, Grep, Glob, Bash, + the plugin's playwright + ado MCP (same as today).

### 2b. `knowledge/orchestration/qa-context.md` — the shared session state contract
Define a per-session **`qa-context`** (extends the existing `flow-map.json` pattern) that threads the loop:
- Fields (documented, product-neutral): `story` (id + the analysis + gaps), `review`, `module` (scan
  result), `cases` (+ the `.md` path + coverage notes), `ado` (chosen plan/suite + created case ids),
  `framework` (the inspected framework map), `automation` (generated specs + levels), `failures`/`bugs`.
- How engines **read** the slice they need and **write** their output back, so "push these" / "automate
  these" always know what *these* are, and **traceability** (story ⇄ case ⇄ script `traces-case:` ⇄ defect)
  is maintained. Where it lives (framework root, git-ignored) and its lifecycle.

### 2c. House-profile scaffold — the product-specific config seam
- `knowledge/orchestration/house-profile.md` — the **contract**: the slots a team fills, product-neutrally
  described — case-authoring **voice/format**, bug/defect **house format**, tracker **kind + org/project/
  boards**, default **test plan/suite**, identity handles, environment/profile pointers. States that the
  committed engines stay neutral and read these slots; the real profile is **user-supplied and git-ignored**.
- `template/house-profile.example.json` (or `knowledge/orchestration/house-profile.example.json`) — a
  **neutral example** profile (generic placeholders: `Orders`, `widgets`, `YOUR_ORG`, `Team A`), copied to a
  git-ignored real `house-profile.json`. Add `house-profile.json` to the plugin + template `.gitignore`.

## 3. Out of scope (later SPs)
story-intelligence + qa-review engines (SP6), ADO publish writes (SP7), the consolidated authoring engine +
house voice body (SP8), the automation engine + ADO-cases→scripts (SP9), failure→bug investigation (SP10),
the end-to-end integration (SP11). SP5 wires routing + state + the profile seam only.

## 4. Acceptance criteria
1. `qa-orchestrator` exists (renamed from kit-orchestrator; 0 stale `kit-orchestrator` refs), routes the
   full QA loop (existing engines now + named SP6–SP10 placeholders), documents the human gates, and reads
   the house-profile + qa-context.
2. `qa-context.md` defines the shared session-state contract + the traceability thread.
3. `house-profile.md` + a neutral `house-profile.example.json` exist; the real `house-profile.json` is
   git-ignored; the contract is clear that engines stay neutral.
4. No new engine is built, **no ADO write path is added**; the existing teach/build/review flow still works.
5. Product-neutral + secret-free (scan); committed + pushed to `dev`.

## 5. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per chunk; push; secret + product scan before every push. No PR.
Conventional commits scoped `qa-engineering`.
