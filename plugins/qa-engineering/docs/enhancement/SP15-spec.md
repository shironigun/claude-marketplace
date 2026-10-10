# SP15 — The guided QA experience: flagship `/qa` arc, lean commands, module registry, learning course

Status: in progress (2026-10-10). Phase 5 (experience). Depends on SP5 (orchestrator + qa-context), SP6/SP13
(story/code intelligence), the build path (scan-and-confirm + kit-builder), SP2 (tutor + curriculum), and
SP14 (the command surface this reshapes). **Turns a set of 14 flat commands into one guided experience: a
flagship that walks a QA from zero → first automated module and back to expand, a lean smart-command set, a
module registry that makes "one module at a time, expand forever" real, and a `/learn` that is an actual
progress-saving course.**

## 1. Why
SP14 shipped 14 commands. Real feedback: that is *a lot* for a manual QA — a wall of menu items is the
complexity it was meant to remove. And the plugin has no single "start here and I'll guide you through
everything" entry: a new QA must already know which of 14 to pick. Separately, the audit found the learning
surface has **no persistence** (close the window, lose your place) and the loop's rich state is **never shown**.
SP15 fixes all three: fewer, smarter commands; one flagship guided arc; durable learning progress.

## 2. Goal
1. A **flagship `/qa`** that is the first and the everyday command: first run → guided arc (set up → read the
   codebase → show modules → pick one → build the structure once → build that module step by step); returning
   → home base (where you are + what's next) that routes anything.
2. A **lean command set (7)** — smart, auto-detecting, each accepting **optional trailing context**.
3. A **module registry** in qa-context so the framework is built **structure-once, then one module at a time**,
   and a QA can **expand** (add the next module) and resume cleanly across sessions.
4. A **`/learn` that is a course** — kickstarts a best-sequence path, **saves progress**, resumes, with a
   durable study-plan the learner keeps.

## 3. Deliverables

### Part A — the lean command set (`commands/`, 14 → 7)
Every command accepts an **optional trailing context string** (`$ARGUMENTS`): no arg = smart default, arg =
steer. All route through the `qa-orchestrator` (gates stay centralized); the gated sub-steps live inside the
journeys and are still reachable by asking `/qa`.

| Command | Arg | Behavior |
|---|---|---|
| ⭐ **`/qa`** | `[anything]` | **Flagship.** No arg: first-run detect → guided arc (below) **or** home base (status + next move). Arg: treat as intent/context and route ("test payments", "add the reports module", "I have story 123"). |
| **`/build`** | `[context]` | Build/expand the framework. First time: structure + first module. After: read the registry, offer the next pending (discovered) module or resume an in-progress one. Arg steers ("API only", "the reports module", "continue"). |
| **`/test`** | `<id or module> [context]` | End-to-end journey (understand → cases → publish → automate → run → bug), gated. **Auto-detects** a work-item id vs a module. |
| **`/analyze`** | `<id or module> [context]` | Read-only understanding (what to test + gaps). Auto-detects id vs module. |
| **`/run`** | `[scope/context]` | Run tests, real result, offer to file bugs. Arg = scope ("smoke", "impacted", "yesterday's failures"). |
| **`/learn`** | `[context]` | **The course** (Part E). No arg: kickstart/resume the sequenced path. Arg: steer ("start at fixtures", "I know basics"). |
| **`/resume`** | `[context]` | Continue where you left off — build, test, or learning — from qa-context. |

Consolidations (capability kept, menu halved): `/analyze-story`+`/analyze-module` → `/analyze`;
`/test-story`+`/test-module` → `/test`; `/make-cases`+`/review-cases` → folded into `/test` and `/qa`;
`/push-cases`, `/automate`, `/file-bug` → folded into the journeys (and reachable via `/qa "push my cases"`
etc.); `/build-framework` → `/build`.

### Part B — the `/qa` flagship guided arc
On first run (no framework and/or no house-profile), `/qa` runs the arc, each step gated/confirmed, in plain
language, driving the **existing** engines (it orchestrates; it does not reimplement):
1. **Welcome + set you up** — detect a missing `house-profile.json`; walk the required slots interactively
   (tracker/org/project, product name, API base URL, auth) instead of "copy the example and fill it".
2. **Read the codebase** — run `scan-and-confirm`'s scan to detect the stack and **identify the module list**
   (name + one-line purpose + rough endpoint count each). Write the **registry** (Part C).
3. **Give context** — present the module map and **recommend the most provable module** to start with, and why.
4. **Pick one module** — the QA chooses (or takes the rec).
5. **Confirm that module's flows** — `scan-and-confirm` → `flow-map.json` for the chosen module.
6. **Build the structure once** — `kit-builder` phase 1 (foundation/scaffold/config/auth), shared by all
   modules. Mark it done in the registry so it is never rebuilt.
7. **Build that module** — `kit-builder` phases 2-3 (API + UI), gated phase by phase; mark the module `built`.
8. **You're live + expand** — summarize what was built; tell the QA they can add the next module anytime with
   `/qa` or `/build`.

Returning (framework exists), `/qa` is the **home base**: one short read of where things stand (from the
registry + qa-context) and the single best next move offered — continue an in-progress module, add a discovered (not-yet-built)
one, test a story, run, or learn.

### Part C — the module registry (qa-context)
Add a `catalog` slice to `qa-context` (contract in `qa-context.md`): `{ product, recommended,
modules: [{ name, summary, endpointCount?, status }] }`, `status ∈ discovered | in-progress | built`; plus a
`frameworkScaffold: built|absent` marker. Written by the flagship/`scan-and-confirm` on the initial scan;
updated by `kit-builder`/the orchestrator as modules move to `built`. `flow-map.json` stays per-module (the
current focus); the registry is the **map of all modules and what's done**, so "expand one at a time" and
cross-session resume work. The existing `module` slice stays the detail for the currently-focused module.

### Part D — `/build` scaffold-aware build + expand
`/build` reads the registry: no scaffold yet → run the structure build (once) + the first module; scaffold
present → offer the next **discovered** (not-yet-built) module (or resume an **in-progress** one), build just that module reusing
the scaffold. Never rebuilds the structure. Resumes mid-phase from `qa-context`. This is the engine behind the
teal "expand" loop.

### Part E — `/learn` as a progress-saving course
- **Kickstart (no arg):** if no learning progress exists, start the **best-sequence** path
  (`knowledge/curriculum/learning-path.md`, 7 stages / 35 topics) — ask one quick question (goal + rough
  level), then teach topic 1. If progress exists, **resume** ("last time: X; next: Y").
- **Save progress:** a new `learning` slice in qa-context — `{ goal, depth, current, path:[{topic,status}],
  lastTopic }` — written as the learner advances. The **orchestrator persists it** (it owns qa-context
  writes); the `automation-tutor` stays read-only and teaches. `/resume` and "where was I" read it.
- **Durable study-plan:** on kickstart, render the path as a **study-plan the learner keeps** (a checklist of
  the stages/topics with their position marked), updated as topics complete — the visible, persistent
  progress surface (fixes the audit's #1 learning gap).
- **Teach Playwright in the right order:** default to the curriculum sequence; adapt to the stated goal/level;
  still teach FROM the standards + official docs (unchanged rule), never an invented practice.
- **Steer (arg):** `/learn fixtures`, `/learn I know the basics` → jump/adjust within the path.

### Wiring
- `qa-orchestrator`: drive the flagship arc; read/write the `catalog` + `learning` slices; the
  "analyze/test/build" routes honor the optional context arg; home-base vs first-run detection.
- `qa-context.md`: add the `catalog` and `learning` slices (+ `frameworkScaffold`) to the contract and the
  example; note their written-by/read-by.
- README: replace the 14-command section with the 7-command guided-experience quick-start (+ the arc).
- `docs/enhancement/README.md`: Phase-5 (SP15) entry.

## 4. Out of scope
Rewriting the engines themselves (the arc orchestrates existing scan-and-confirm / kit-builder / tutor) · the
CI/headless idea (parked) · new tracker capabilities · a full rendered loop-status dashboard (the audit's
bigger "status board" — this ships the registry + study-plan; the full dashboard is a later sub-project).

## 5. Acceptance criteria
1. The command set is **7**, each accepts an optional context arg, each routes through the orchestrator;
   capability of every former command is preserved (via the journeys/`/qa`), nothing silently lost.
2. `/qa` first run runs the **guided arc** (setup → scan → module list + rec → pick → structure-once → build
   module → live), gated at each step, orchestrating the existing engines (no reimplementation); returning
   `/qa` is a home base that states where things stand and offers the next move.
3. The **`catalog` registry** records all modules + status + the scaffold marker; `/build` builds the
   structure once and then **one module at a time**, offers the next pending (discovered) module, and **resumes** across
   sessions.
4. **`/learn` with no arg kickstarts/resumes a best-sequence course**, **persists a `learning` slice**, renders
   a durable study-plan with progress marked, and teaches from the standards/official docs.
5. qa-context.md documents `catalog` + `learning`; README shows the 7-command experience; product-neutral +
   secret-free; committed to `dev`.
6. **Independent adversarial review passes** — the arc orchestrates (not reimplements) and keeps every gate;
   registry/learning contracts are correct and additive; commands are thin + consistent; nothing lost in the
   14→7 consolidation; neutral.

## 6. Logistics
Repo `claude-marketplace`, branch `dev`. Bump plugin version `0.1.0 → 0.2.0` (new features; makes the update
reach installed users). Conventional commits scoped `qa-engineering`. Secret + product scan before push.
Build in two phases, each self-verified + independently reviewed: **P-build** (Parts A–D: commands + flagship
arc + registry + expand) and **P-learn** (Part E: course + persistence). Full independent review (the key
risk is the arc reimplementing an engine or dropping a gate, and the registry/learning contracts drifting).
