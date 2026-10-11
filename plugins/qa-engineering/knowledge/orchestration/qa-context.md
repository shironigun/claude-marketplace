# qa-context — the shared session-state contract

The QA loop runs across many engines — analyze a story, author cases, push to a tracker, generate
automation, turn a failure into a bug. **`qa-context`** is the memory between them: a per-session state
file the `qa-orchestrator` reads and writes so that "push *these*" and "automate *these*" always know
what *these* are, and so the thread from a story to its cases to its scripts to its defects is never
lost across a sub-agent hand-off or a context compaction.

It **extends the `flow-map.json` pattern** that phase 0 already uses: a single JSON file at the
framework root that *is* the hand-off. Where `flow-map.json` captures one thing (the confirmed module
surface), `qa-context` carries the whole loop's state and **references** `flow-map.json` rather than
copying it.

> **Product-neutral by rule.** This contract names no product, org, tracker, board, URL, account or
> secret. The illustrative values below (`orders`, `widgets`) are generic placeholders. Real specifics
> come from the git-ignored `house-profile.json` (see `house-profile.md`) and the QA's `.env`; they are
> never written into this contract or into any committed file.

## Where it lives and its lifecycle

| | |
|---|---|
| **File** | `qa-context.json`, pretty-printed JSON at the **framework root** — beside `.env`, `flow-map.json` and `package.json`. (The `learning` slice can exist **before any framework** — a QA may learn first; then `qa-context.json` and the study-plan live in the QA's current working folder.) |
| **Git** | **git-ignored.** It may carry story text, analysis notes, created work-item ids and module findings, so it never gets committed (added to the template `.gitignore`). **The Knowledge Base is the opposite:** `qa-context.json` is ephemeral session state (git-ignored); the `knowledge-base/` files it points at via `catalog.kb` are durable product knowledge that **is committable in the QA's repo** (the template `.gitignore` deliberately does not ignore `knowledge-base/`), and is **never** written into the plugin. See `knowledge/standards/knowledge-base.md`. |
| **Created** | lazily — the first engine that produces a slice writes the file; there is no "init" step and no example to copy (unlike the house profile). |
| **Owner** | the `qa-orchestrator` mediates every read and write. An engine receives only the slice it needs and returns its output; the orchestrator folds that output back into the file. |
| **Scope** | one QA session / one piece of work. A new story starts a fresh context (or a new top-level entry); stale **work** slices (`story`, `review`, `module`, `cases`, `ado`, `automation`, `failures`, `bugs`) are cleared, not silently reused. **Exception — never cleared by a new work-item:** `catalog` (the framework/module registry) and `learning` (course progress) persist across stories and sessions; clearing them would lose what's built and where the learner is. |
| **Hand-off** | **the file is the hand-off.** Read `qa-context` *from the file*, never from a chat block that may be gone after a compaction — exactly as `kit-builder` reads `flow-map.json`. |

## The slices

Each engine owns one slice: it **reads** the slices it depends on and **writes** its own back. Slices
are additive — an engine writes only its own key and never clobbers another's. A slice an engine has
not produced yet is simply absent.

| Slice | Shape (product-neutral) | Written by | Read by |
|---|---|---|---|
| `story` | `{ id, analysis, gaps[] }` — the work-item id, the structured analysis of what it asks, and the open requirement gaps/ambiguities surfaced for the QA | **story-intelligence** (SP6) | the authoring engines |
| `review` | `{ verdict, risks[], coverageGaps[] }` — the QA review of the story **or module**: is it testable, what is risky, what coverage it implies | **story-intelligence** (SP6 — one skill writes both `story` and `review`) · **code-intelligence** (SP13 — writes `review` from a code analysis) | the authoring engines |
| `module` | `{ name, mapRef, findings[] }` — the scan/analysis of a code path / module; `mapRef` points at `flow-map.json` rather than duplicating it. `findings[]` holds the build scan and/or the QA understanding | `scan-and-confirm` (the build scan, exists) · **code-intelligence** (SP13 — extends `findings[]` with the read-only QA understanding + gaps) | the authoring + build engines |
| `catalog` | `{ product, recommended, frameworkScaffold, modules[] }` — the **registry of the whole product**: `modules[]` each `{ name, summary, endpointCount?, status, kb? }` with `status ∈ discovered \| in-progress \| built` and **`kb ∈ absent \| stub \| deep`** (the module's Knowledge-Base depth — `scan-and-confirm` stubs each on first `/qa`, `kb-builder` deepens one on demand; the `knowledge-base/` files on disk are the source of truth, `kb` only tracks depth — see `knowledge/standards/knowledge-base.md`); `recommended` = the module to start with; `frameworkScaffold ∈ built \| absent` (the shared foundation is built once). This is what makes the build **structure-once, then one module at a time, expand forever**: the flagship/orchestrator writes it from the initial codebase scan and updates a module to `built` as `kit-builder` finishes it, so `/build` and `/qa` always know what's done, what's pending, and what to resume — across sessions. `module` stays the *current* module's detail; `catalog` is the map of them all | **`scan-and-confirm`** seeds it from the confirmed module inventory (modules `discovered`, target `in-progress`, `frameworkScaffold: absent`); **`kit-builder`** flips `frameworkScaffold`→`built` (phase 1) and the module→`built` (phase 2); the flagship `/qa`/`/build` may also update it. Written by the **engines**, not only the commands, so an engine-direct build still populates it | `/build`, `/qa` (home base + expand), the build engines, the status board |
| `cases` | `{ approved, items[], mdPath, coverage }` — the authored cases (each `{ title, level, tags[], tracesStory, tracesModule, tracesRule?, adoCaseId?, source? }` — **set `tracesStory` for a story-sourced case or `tracesModule` (the module name) for a code-sourced one; the other is `null`**; `tracesRule` is the `knowledge-base/RULES.md` anchor the case verifies when it was seeded from a Knowledge-Base rule (`null` otherwise), extending the thread to **rule ⇄ case**; `source` is `authored` by default, and `generated` for an item **backfilled by the reconcile step** from a spec that exists on disk with no authored case — see [the reconcile step](#keeping-the-thread-consistent--the-reconcile-step)), the `.md` file, coverage notes, and **`approved`** = QA has signed off on this set. `ado-publish` refuses to push until `approved` is `true`; it writes each created case's id back onto `items[].adoCaseId` (the key the automation + traceability thread resolve on) | `author-api-cases` / `author-ui-cases` (exist; they set `approved`) · **reconcile** (backfills `source: "generated"` items) | ado-publish, the automation engine |
| `ado` | `{ plan, suite, published[] }` — the chosen test plan + suite and, per published case, `{ caseTitle, adoCaseId }` (the case→id key, so a re-run never double-creates). Written once the QA approves a push (**write path is SP7, not SP5**) | **ado-publish** (SP7) | the automation engine, the traceability thread |
| `framework` | `{ map }` — the inspected framework map (services, fixtures, modules present) the build/automation engines reason over | `kit-builder` (exists) | the automation engine |
| `automation` | `{ specs[], levels[] }` — the generated `.spec.ts` files (each `{ path, level, tracesCase }`) and the levels covered (contract / endpoint / workflow, smoke / regression / e2e) | `kit-builder` generation (exists) → **automation-engine** (SP9) | `failure-to-bug` (a red run → the `failures` slice) |
| `failures` | `{ runs[] }` — red runs captured for triage (each `{ specPath, title, assertion, status }`); an all-green run writes an empty `runs[]` | **run-suite** (SP12 — the run engine) / `failure-to-bug` | `failure-to-bug` (the investigate stage) |
| `runHistory` | `{ runs[] }` — a rolling record of the last few runs (keep ~10, newest last), each `{ when, scope, total, passed, failed, flaky, skipped, duration }` — all **real numbers from the actual run** (never inferred). This is what lets the status board show a **passed/flaky count and a trend** (the `failures` slice holds only the latest *failing* entries, so it can't). | **run-suite** (SP16 P-rich — appends one entry per run) | the status board (`/status`, `/qa` home base) |
| `bugs` | `{ items[] }` — drafted or filed defects (each `{ id?, title, tracesCase, tracesStory, tracesModule, knownBugRef?, status }` — carry the source case's `tracesStory`/`tracesModule` onto the bug so a module-sourced defect isn't an orphan; `knownBugRef` is the marker string the spec's `knownBug(...)` uses, so filing can backfill the real `id` into it) | **`failure-to-bug`** (SP10: investigate → classify → draft → gated file) | the traceability thread |
| `learning` | `{ goal, depth, current, path[], studyPlanPath }` — the **learning-course state**, independent of the QA loop: `goal` (what the QA wants from automation), `depth` (their level — new / basics / confident, which the tutor maps to its L1–L4 altitude: new→L1, basics→L2, confident→L3, per `curriculum/depth-levels.md`), `current` (the current topic), `path[]` each `{ topic, status }` with `status ∈ pending \| covered` (the best-sequence curriculum, so progress persists across sessions), and `studyPlanPath` (the durable study-plan markdown the learner keeps). The **`automation-tutor` teaches read-only; the orchestrator persists this slice** after each topic. This is what turns learning from ephemeral chat into a course you can leave and resume | **the orchestrator** (SP15 P-learn — writes progress; the tutor stays read-only) | `/learn`, `/resume` (resume where you left off) |

Every engine named above is **built** (the `SPx` tags are provenance, not a roadmap). The orchestrator
routes to the one that owns each slice; a slice simply stays **absent** until its engine has run this
session, and the orchestrator says plainly which slice has not been produced yet rather than inventing it.

## How an engine reads and writes its slice

1. The orchestrator **reads** `qa-context.json` from the framework root and pulls the slice(s) the
   chosen engine depends on (the `cases` slice for a push, the `cases` + `framework` slices for
   automation, the `failures` slice for a bug).
2. It **invokes** the engine (Skill tool) with exactly that slice as the structured input — the engine
   never needs the whole file.
3. When the engine returns, the orchestrator **writes** its output back under the engine's own slice,
   merges the **traceability links** (below), and re-saves the file.
4. Any blank the engine could not fill stays recorded as a gap in its slice — never invented. An
   ambiguous requirement is surfaced to the QA, not silently resolved.

## The traceability thread

The loop stays linked end to end through one chain, recorded as ids/tags across the slices:

```
story.id / module ⇄ cases.items[].tracesStory|tracesModule / .adoCaseId ⇄ automation.specs[].tracesCase ⇄ bugs.items[].tracesCase
   │                     │                                    │                              │
 the story OR         each case points back              each script carries the           each defect points at
 module under test    at its story or module             `traces-case:` tag of             the case (+ its story/
                                                          the case it automates             module) it proves broken
```

- A **rule** (a `knowledge-base/RULES.md` anchor — the atomic, testable Condition → Result unit of "what to
  test") is the upstream source when a case is seeded from the Knowledge Base: the case records the anchor as
  **`tracesRule`**, so the thread can run **rule → case → script → defect** and a KB rule's coverage is
  visible. `tracesRule` is `null` for a case not seeded from a rule.
- A **case** records where it came from: `tracesStory` when authored from a tracker story, **or
  `tracesModule`** (the module name) when authored from code (codebase→QA). Exactly one is set; the other
  is `null`. So a module-sourced case is **not an orphan** — the thread runs module → case → script → defect.
- A **script** records the case it automates via a `traces-case:` tag (`automation.specs[].tracesCase`) —
  the same tag the build path already uses so a spec resolves to a Test Case.
- A **defect** records the case (and through it the story **or** module) it proves broken: `tracesCase`
  plus the case's `tracesStory`/`tracesModule` carried onto `bugs.items[].tracesStory`/`tracesModule`.

Keeping this chain in `qa-context` is what lets a later "push these" find the right cases, "automate
these" find the right scripts, and "file a bug for this failure" link the defect to the case and story
without the QA restating anything.

### Keeping the thread consistent — the reconcile step

The thread drifts when the **specs on disk** and the **`cases` slice** fall out of step: a generator may
emit a spec for a behaviour beyond the approved set (a negative/edge case, a `knownBug` expected-fail), a
case title may be edited after the spec was written, or a spec may be added by hand. When that happens
`automation.specs[].tracesCase` — and any later `bugs.items[].tracesCase` — resolves to a title that is **not
in the `cases` slice**, so the defect is an orphan with nothing to link to. The **reconcile step** is the one
procedure that keeps `cases ⇄ automation ⇄ bugs` consistent, so the thread never has to be repaired by hand.

**Disk is the source of truth for which specs exist** (the same read-only principle the status board already
uses for its disk fallback — see `status-board.md`; reconcile reuses that scan, it does not add a second
one). The procedure:

1. **Scan** `modules/**/tests/**` read-only for every `test()` / `authGuardTests` entry and collect its
   `traces-case:` value (the case title) and its level tag + `@<module>` tag. This is the actual spec
   inventory — the `automation` slice should mirror it but may be stale; **disk wins**.
2. **Match** each spec key to a `cases.items[]` entry — by `adoCaseId` when the value is an id, else by exact
   title.
3. **Orphan spec (no match):** the spec tests behaviour with no authored case. **Backfill** a minimal
   `cases.items[]` entry `{ title: <the traces-case value>, level: <from the level tag/folder>, tags,
   tracesStory: null, tracesModule: <module>, adoCaseId: null, source: "generated" }` — it carries
   `tracesModule` so the thread runs module → case → script → defect, and `source: "generated"` marks it as
   **not QA-authored**. Then set that spec's `automation.specs[].tracesCase` to the title. This is exactly the
   repair that otherwise has to be done by hand before a bug can link.
4. **Matched spec:** ensure `automation.specs[].tracesCase` points at the case (its `adoCaseId` when present,
   else the title).
5. **Authored case with no spec on disk:** record it as a **coverage gap** in the report — read-only.
   **Never delete a case**; a missing spec is a gap to fill, not a case to drop.

A `source: "generated"` case is recorded **for traceability only** — it is not a QA-approved case. It does
**not** flip the slice-level `cases.approved` (so `automation-engine`'s fail-closed gate is unaffected), and
**`ado-publish` surfaces it for review rather than publishing it as authored** — a reconciled case must be
seen by the QA before it can be pushed to a tracker. **When reconcile runs:** the generation engines
(`automation-engine` step 6, `kit-builder` phases 2-3) run it right after writing the `automation` slice;
`failure-to-bug` runs it before it resolves `tracesCase`, so a failure on an orphan spec still links. It is
read-only against the product and the tracker — it only reads spec files and writes the `cases`/`automation`
slices.

## Example (illustrative — generic placeholders, no real values)

```json
{
  "story":   { "id": "0000", "analysis": "Create/read/update an order…", "gaps": ["status set on soft-delete unconfirmed"] },
  "review":  { "verdict": "testable", "risks": ["soft-delete semantics"], "coverageGaps": ["negative: duplicate order"] },
  "module":  { "name": "orders", "mapRef": "flow-map.json", "findings": [] },
  "catalog": { "product": "Acme", "recommended": "orders", "frameworkScaffold": "built",
               "modules": [ { "name": "orders", "summary": "order lifecycle", "endpointCount": 34, "status": "built", "kb": "deep" },
                            { "name": "billing", "summary": "invoices", "endpointCount": 28, "status": "discovered", "kb": "stub" } ] },
  "cases":   { "approved": false, "items": [{ "title": "Order lifecycle", "level": "workflow", "tags": ["@orders","@api"], "tracesStory": "0000", "tracesModule": null, "tracesRule": null, "adoCaseId": null }], "mdPath": "cases/orders.md", "coverage": "contract+endpoint+workflow" },
  "ado":     { "plan": "Plan Name", "suite": "Suite Name", "published": [] },
  "framework": { "map": "services: api; fixtures: orders, widgets" },
  "automation": { "specs": [{ "path": "modules/orders/api/tests/lifecycle.spec.ts", "level": "workflow", "tracesCase": null }], "levels": ["contract","endpoint","workflow"] },
  "failures": { "runs": [] },
  "runHistory": { "runs": [ { "when": "2026-10-11T09:00:00Z", "scope": "@orders", "total": 50, "passed": 48, "failed": 2, "flaky": 0, "skipped": 0, "duration": "41s" } ] },
  "bugs":     { "items": [] },
  "learning": { "goal": "test our API confidently", "depth": "basics", "current": "fixtures",
                "studyPlanPath": "learning-plan.md",
                "path": [ { "topic": "what is automation", "status": "covered" },
                          { "topic": "fixtures", "status": "pending" } ] }
}
```

## Done when

- [ ] `qa-context.json` lives at the framework root, git-ignored, and is read/written **from the file**
- [ ] Every engine reads only the slice(s) it depends on and writes only its own slice back (additive)
- [ ] `flow-map.json` is **referenced** (`module.mapRef`), not duplicated, into the context
- [ ] The traceability thread (story ⇄ case ⇄ script `traces-case:` ⇄ defect) is maintained on every write
- [ ] The **reconcile step** keeps `cases ⇄ automation ⇄ bugs` consistent from the specs on disk — an orphan spec is backfilled as a `source: "generated"` case (never left to orphan a bug), an uncovered case is reported (never deleted), and a reconciled case is surfaced for review, never pushed as authored
- [ ] Not-yet-built engines' slices are defined and left absent until those engines land — no invented output
- [ ] Nothing product-specific, secret or real-URL appears anywhere in the context or this contract
