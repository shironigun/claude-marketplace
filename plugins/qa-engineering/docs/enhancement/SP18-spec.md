# SP18 — Knowledge Base: a frontend-first per-module KB that grounds the loop (spec)

Status: in progress (2026-10-11). Phase 8+ (post-live-test enhancement). Depends on SP5 (qa-context /
`catalog`), SP6 (`story-intelligence`), SP13 (`code-intelligence`), `scan-and-confirm` (phase-0 discovery),
and SP-variants (`system-map.json` variant axis). **Adds the one thing the plugin lacks that a mature QA
copilot needs: a persistent, human-readable knowledge base of the product's existing features that both tracks
what exists and grounds story/module analysis.**

Adapted from prior art (a standalone QA copilot's "god-tier KB + Code Atlas"): a per-module behavior brief, a
central testable-rules file, and a thin code atlas, discovered **frontend-first** (modules = what users see in
the nav, not how controllers are grouped). We take the *format and method*, drop the app infrastructure (no
FTS5/SSE/DB — the plugin is an agent that reads markdown directly), and wire it into the existing loop.

## 1. Why
Today the plugin knows a module's **structure** (`flow-map.json` endpoints/flows, `catalog` registry,
`system-map` variant axis) but holds no **behavioral knowledge** of the product: what each feature does, its
flows and exact UI/API messages, its business rules, how it varies by variant. So `story-intelligence` and
`code-intelligence` re-derive context from raw code every time, story analysis is ungrounded, and there is no
living feature map a QA (or the next QA) can read. The ask: **when a QA starts on a product repo and runs
`/qa`, the plugin should create a knowledgebase — in a defined format — that keeps track of existing features
and grounds the analysis of stories.** Also: **module identification should be driven by the frontend** (the
product's real, user-visible surface), which is more accurate than grouping backend controllers.

## 2. Goal
A **Knowledge Base** the plugin generates into the QA's **own framework repo** (committable team knowledge,
never shipped in the plugin), in three linked markdown artifacts per module, discovered **frontend-first**,
generated **lazily** (scaffold + stubs on first `/qa`, deep per module on demand), and **consumed** by the
analysis + authoring engines to ground their output. Every claim carries an evidence label; nothing is
invented.

## 3. The KB format (the standard — `knowledge/standards/knowledge-base.md`)
The KB lives at the framework root under **`knowledge-base/`**:

```
knowledge-base/
├── README.md         index + mindmap + which engine reads which file first
├── CONVENTIONS.md    slug rules, evidence-tag grammar, FE/BE separation, lazy-depth legend
├── RULES.md          one anchored, testable rule per heading (the case backbone)
├── modules/<slug>.md behavior brief per module (product + QA view)
└── atlas/<slug>.md   thin code map per module (FE/BE globs + link table)
```

- **`modules/<slug>.md`** (product + QA brief): `Purpose` · `Route(s)` · `Touches` (cross-module links) ·
  `Key rules` (links into RULES.md) · `Keyword pack` (exclusive / shared-ambiguous / reject + negative-query
  examples, for lookalike disambiguation) · `Flows` (each: Trigger · Steps action→expected · Rules links ·
  Breaks exact strings · UI anchors semantic-only · API-behind-it summary · Negative/edge) · `States` ·
  `Variants` (which flows/rules change by the `system-map` variant axis, cited) · `Gaps` (`[UNCLEAR]`).
- **`RULES.md`** (the testable backbone): one rule per `## anchor-slug`, format
  `**Title** (see [Module](modules/<slug>.md)) — Condition → Result`, with the exact message/status when
  known; grouped by module. Covers auth, validation, variant, permission, money/credit, destructive-action
  rules. **Each rule is a unit a case can trace to** (the new `tracesRule` link).
- **`atlas/<slug>.md`** (trimmed v1 — code map): YAML frontmatter (`routes`, `frontend_path_includes/excludes`,
  `api_prefixes`, `backend_path_includes/excludes`, `features[]`) · a **route map** · a **FE↔BE link table**
  (feature → route/component → API calls → handler files). **Deferred to a later SP:** the full impact /
  regression packs and change-impact heuristics.

**Discovery is frontend-first** (the standard's load-bearing rule): enumerate modules from the SPA route
table / nav / lazy-imports (what users see), extract each screen's API calls (fetch/Axios/RTK Query/service
wrappers) deterministically, then resolve those into backend handlers. **FE and BE globs are always
separate** so scoped work can prefer UI files for UI stories and controllers for API stories. For an
**API-only** product (no frontend), fall back to backend route-prefix grouping and say so.

**Evidence rails** (same discipline the plugin already uses, stated for the KB): **code wins** for technical
facts (method/path/DTO/status/message); existing docs/help pages are **cited vocabulary**, never code truth;
**never invent** an endpoint/route/message/field/permission — write `[UNCLEAR: …]` / `[ASSUMED: …]` /
`[TODO: confirm]`; prefer exact strings copied from code; no em/en dashes in prose.

## 4. Deliverables

### 4.1 `knowledge/standards/knowledge-base.md` (NEW standard — the single source of truth)
The format above, the frontend-first discovery rule, keyword packs, evidence rails, the **lazy depth model**
(`absent → stub → deep`), **where the KB lives + that it is committable in the QA's repo but never in the
plugin**, and the **consumer guide** (which engine reads which file first).

### 4.2 `skills/kb-builder/SKILL.md` (NEW engine — deep per-module generation)
Given one module, run the **investigation protocol** (adapted, product-neutral): map the frontend surface →
trace FE calls → resolve to BE → cross-check contracts → extract rules → build keyword packs + traps →
emit `modules/<slug>.md` + an `atlas/<slug>.md` + a `RULES.md` patch, then a **coverage self-audit** (every
route has screens; every FE call appears in the link table or is marked external/TODO; every feature has a
flow; keyword packs present; globs match prose). **One module at a time at depth** (not a thin whole-tree
pass). Reads the product repo **read-only**; writes only the `knowledge-base/` files; presents the discovered
module surface for QA confirmation before deep-writing. Product-neutral; the module/routes/messages come from
the code, never hard-coded.

### 4.3 `skills/scan-and-confirm/SKILL.md` (EXTEND — frontend-first discovery + KB scaffold on first run)
- **Frontend-first module discovery:** enumerate modules from the SPA routes/nav first (fall back to backend
  grouping for an API-only product), and **seed `catalog` from the frontend surface**.
- **Scaffold the KB on first `/qa`:** create `knowledge-base/` with `README.md` + `CONVENTIONS.md` + an empty
  `RULES.md`, and a **thin `modules/<slug>.md` stub** per discovered module (Purpose + Route + keyword-pack
  placeholder + `kb: stub`). This is the "`/qa` creates a knowledgebase" headline — the scaffold exists
  immediately; depth comes lazily.

### 4.4 Consumers (WIRE by pointer — no duplication)
- **`story-intelligence` / `code-intelligence`:** before analyzing, **read the relevant
  `modules/<slug>.md` + its RULES anchors** to ground the analysis; if the module's KB is a `stub`, offer to
  deepen it via `kb-builder` first. (Reading markdown replaces the prior-art's FTS5/BM25 retrieval — the
  plugin is an agent.)
- **`author-api-cases` / `author-ui-cases`:** seed cases from the module's **RULES anchors** (each rule →
  at least one case) and set the new **`tracesRule`** link.
- **`automation-engine` / `kit-builder`:** use the atlas **FE/BE globs + link table** to scope the
  reuse-inspection (which services/components back a feature).

### 4.5 qa-context contract (`knowledge/orchestration/qa-context.md`)
- `catalog.modules[]` gains **`kb: "absent" | "stub" | "deep"`** (status, disk-truth: the `knowledge-base/`
  files are the source; catalog tracks depth).
- `cases` item gains **`tracesRule`** (the RULES.md anchor a case verifies) — extends the thread to
  **rule ⇄ case ⇄ script ⇄ bug**; `null` when a case isn't rule-derived.
- A short section documenting the `knowledge-base/` artifact: committable in the QA's repo, **not**
  git-ignored (unlike `.env` / `qa-context.json` / `house-profile.json`), never in the plugin.

### 4.6 Template (`template/knowledge-base/`)
Ship the scaffold: `README.md`, `CONVENTIONS.md`, `RULES.md` (header only), `modules/example.md`,
`atlas/example.md` — generic placeholders (orders/widgets), demonstrating the format. Ensure
`template/.gitignore` does **not** ignore `knowledge-base/` (it is committable knowledge); it continues to
ignore `.env`, reports, auth state, `qa-context.json`, `house-profile.json`.

### 4.7 Commands + docs + artifact
- No new top-level command (keep the 8-command surface): KB creation happens **inside `/qa`** (first-run
  scaffold) and **`/analyze`** (deepen a module's KB); `/build` and `/test` consume it. A `/qa kb <module>`
  / `/analyze <module>` deepen path is enough.
- README (what the KB is + where it lives + committable), `docs/phases.md` (phase 0 now does frontend-first
  discovery + KB scaffold), the guide artifact.

## 5. Out of scope (this SP)
Full atlas impact/regression packs + change-impact heuristics (trimmed atlas only) · a coverage matrix of
KB-features vs existing cases · ingesting external help-sites/OpenAPI/Postman as KB input (optional later) ·
any search/retrieval infrastructure (we read markdown) · eager whole-app deep KB generation (lazy only) ·
writing the KB into the public plugin repo (it only ever lands in the QA's own repo).

## 6. Acceptance criteria
1. Running `/qa` on a product repo **creates `knowledge-base/`** with README + CONVENTIONS + RULES + a thin
   `modules/<slug>.md` stub per module, **discovered frontend-first** (backend fallback for API-only), with
   `catalog` seeded from the frontend surface and each module marked `kb: stub`.
2. `kb-builder` deep-generates **one module** into a full `modules/<slug>.md` + trimmed `atlas/<slug>.md` +
   a `RULES.md` patch, following the investigation protocol + coverage self-audit, **read-only against the
   product**, writing only `knowledge-base/` files, after a QA confirmation of the discovered surface.
3. The KB uses the **defined format** (modules/RULES/atlas, keyword packs, evidence tags, FE/BE separation,
   variant citations) and every claim is **labeled**; nothing is invented.
4. `story-intelligence` / `code-intelligence` **read the KB to ground** analysis; `author-*` seed cases from
   RULES anchors and set `tracesRule`; the thread is **rule ⇄ case ⇄ script ⇄ bug**.
5. The KB is generated into the **QA's own repo, committable there, never into the plugin**; it is **not**
   git-ignored by the template; the plugin stays product-neutral + secret-free.
6. **Independent adversarial review passes** (`framework-reviewer` + `reuse-guardian` siblings): real reuse
   (no duplicated discovery/analysis), read-only against the product, correct contracts, neutral.

## 7. Logistics
Repo `claude-marketplace`, branch `dev`, mirrored to the active cache. Conventional commits scoped
`qa-engineering`. Secret + product scan before every push. Full independent review (frontend-first discovery
accuracy + read-only product access are the key risks). Version bump on ship (new capability).
