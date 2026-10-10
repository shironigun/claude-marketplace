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
| **Git** | **git-ignored.** It may carry story text, analysis notes, created work-item ids and module findings, so it never gets committed (added to the template `.gitignore`). |
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
| `catalog` | `{ product, recommended, frameworkScaffold, modules[] }` — the **registry of the whole product**: `modules[]` each `{ name, summary, endpointCount?, status }` with `status ∈ discovered \| in-progress \| built`; `recommended` = the module to start with; `frameworkScaffold ∈ built \| absent` (the shared foundation is built once). This is what makes the build **structure-once, then one module at a time, expand forever**: the flagship/orchestrator writes it from the initial codebase scan and updates a module to `built` as `kit-builder` finishes it, so `/build` and `/qa` always know what's done, what's pending, and what to resume — across sessions. `module` stays the *current* module's detail; `catalog` is the map of them all | **the orchestrator / flagship `/qa`** (SP15 — from `scan-and-confirm`'s detected module list) · updated as `kit-builder` completes a module | `/build`, `/qa` (home base + expand), the build engines |
| `cases` | `{ approved, items[], mdPath, coverage }` — the authored cases (each `{ title, level, tags[], tracesStory, adoCaseId? }`), the `.md` file, coverage notes, and **`approved`** = QA has signed off on this set. `ado-publish` refuses to push until `approved` is `true`; it writes each created case's id back onto `items[].adoCaseId` (the key the automation + traceability thread resolve on) | `author-api-cases` / `author-ui-cases` (exist; they set `approved`) | ado-publish, the automation engine |
| `ado` | `{ plan, suite, published[] }` — the chosen test plan + suite and, per published case, `{ caseTitle, adoCaseId }` (the case→id key, so a re-run never double-creates). Written once the QA approves a push (**write path is SP7, not SP5**) | **ado-publish** (SP7) | the automation engine, the traceability thread |
| `framework` | `{ map }` — the inspected framework map (services, fixtures, modules present) the build/automation engines reason over | `kit-builder` (exists) | the automation engine |
| `automation` | `{ specs[], levels[] }` — the generated `.spec.ts` files (each `{ path, level, tracesCase }`) and the levels covered (contract / endpoint / workflow, smoke / regression / e2e) | `kit-builder` generation (exists) → **automation-engine** (SP9) | `failure-to-bug` (a red run → the `failures` slice) |
| `failures` | `{ runs[] }` — red runs captured for triage (each `{ specPath, title, assertion, status }`); an all-green run writes an empty `runs[]` | **run-suite** (SP12 — the run engine) / `failure-to-bug` | `failure-to-bug` (the investigate stage) |
| `runHistory` | `{ runs[] }` — a rolling record of the last few runs (keep ~10, newest last), each `{ when, scope, total, passed, failed, flaky, skipped, duration }` — all **real numbers from the actual run** (never inferred). This is what lets the status board show a **passed/flaky count and a trend** (the `failures` slice holds only the latest *failing* entries, so it can't). | **run-suite** (SP16 P-rich — appends one entry per run) | the status board (`/status`, `/qa` home base) |
| `bugs` | `{ items[] }` — drafted or filed defects (each `{ id?, title, tracesCase, tracesStory, status }`) | **`failure-to-bug`** (SP10: investigate → classify → draft → gated file) | the traceability thread |
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
story.id  ⇄  cases.items[].tracesStory / .adoCaseId  ⇄  automation.specs[].tracesCase  ⇄  bugs.items[].tracesCase
   │                     │                                    │                              │
 the story        each case points back              each script carries the           each defect points at
 under test       at its story                       `traces-case:` tag of             the case (and story)
                                                      the case it automates             it proves broken
```

- A **case** records the story it came from (`tracesStory`).
- A **script** records the case it automates via a `traces-case:` tag (`automation.specs[].tracesCase`) —
  the same tag the build path already uses so a spec resolves to a Test Case.
- A **defect** records the case (and through it the story) it proves broken (`bugs.items[].tracesCase`).

Keeping this chain in `qa-context` is what lets a later "push these" find the right cases, "automate
these" find the right scripts, and "file a bug for this failure" link the defect to the case and story
without the QA restating anything.

## Example (illustrative — generic placeholders, no real values)

```json
{
  "story":   { "id": "0000", "analysis": "Create/read/update an order…", "gaps": ["status set on soft-delete unconfirmed"] },
  "review":  { "verdict": "testable", "risks": ["soft-delete semantics"], "coverageGaps": ["negative: duplicate order"] },
  "module":  { "name": "orders", "mapRef": "flow-map.json", "findings": [] },
  "catalog": { "product": "Acme", "recommended": "orders", "frameworkScaffold": "built",
               "modules": [ { "name": "orders", "summary": "order lifecycle", "endpointCount": 34, "status": "built" },
                            { "name": "billing", "summary": "invoices", "endpointCount": 28, "status": "discovered" } ] },
  "cases":   { "approved": false, "items": [{ "title": "Order lifecycle", "level": "workflow", "tags": ["@orders","@api"], "tracesStory": "0000", "adoCaseId": null }], "mdPath": "cases/orders.md", "coverage": "contract+endpoint+workflow" },
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
- [ ] Not-yet-built engines' slices are defined and left absent until those engines land — no invented output
- [ ] Nothing product-specific, secret or real-URL appears anywhere in the context or this contract
