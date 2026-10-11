# The QA status board — render spec

The **one** definition of how the status board is drawn, so `/qa` (returning = home base) and `/status` render
it **identically**. The board turns `qa-context` from a backstage save-file into a "you are here" view — the
plugin's sense of place.

> **Read-only + honest + portable, by rule.**
> - **Read-only.** Rendering the board **reads** `qa-context` (and the house-profile for the product name); it
>   writes nothing and runs no gate. It only *links* to the command that does an action.
> - **Honest.** Every value comes from the **actual** slices in the file. A slice that isn't there yet renders
>   as "not started" / "—" — **never fabricated, never guessed, never carried from memory**. Read `qa-context`
>   *from the file* every time (not from a chat block a compaction may have dropped).
> - **Portable.** The plugin can't assume a graphics tool. The board is **plain markdown** (a metric line, a
>   loop strip, a table, a next line) that renders in any Claude Code surface. Where a richer visual tool
>   happens to be available it *may* be used, but markdown is the baseline and the contract.

## Deriving from disk when a slice is absent (fallback — read-only)

`qa-context` is written by the orchestrated engines. But a QA can build with the plugin's **guidance**
(the standards + `docs/script-generation.md`) without every step routing through the orchestrator, and a
session can be **cleared or compacted** — in all of which the `catalog` / `runHistory` / `house-profile`
slices are absent while a **real, runnable framework sits on disk**. A board that then says "no framework
yet" is wrong about reality. So when a slice the board needs is **absent**, derive it **read-only from
disk** rather than declaring nothing built — and **label the derived values `(from disk)`** so provenance
stays honest (never claim an orchestrated state that isn't there).

| Board input | Primary source (slice) | Disk fallback when the slice is absent (read-only) |
|---|---|---|
| product name | `house-profile.json` `product.name` | the framework folder name, else "your project" — never invented |
| modules + built state | `catalog.modules` | glob `modules/*/` (exclude `example`); a module is **built (from disk)** when it has ≥1 spec under `modules/<m>/**/tests/**` |
| per-level coverage | `automation.specs[]` | the six level folders under `modules/<m>/{api,ui}/tests/**` (contract/endpoint/workflow · smoke/regression/e2e) |
| last run | `runHistory` (then `failures`) | `reports/results.json` (the JSON reporter output) — read totals + the failures; **never invent** a passed/flaky count a file can't supply |

Rules for the fallback: it is **read-only** (glob + read files; never create, write, or run anything to
find out); it is **honest** (mark derived values `(from disk)`, and a module/level with no spec is `○`,
never a guessed `✓`); and it applies **per missing slice** — a present slice always wins. Only when there
is **neither a `catalog` slice nor any `modules/*/`** folder is the framework truly absent → then say
"No framework yet — run `/qa`". Writing the derived snapshot to `qa-status.md` is still allowed (the one
write); deriving/reading is read-only.

## The legend (use these marks everywhere)

| Mark | Means |
|---|---|
| `✓` | done |
| `●` | current — **you are here** |
| `○` | not started |
| `✗` | failing / red (e.g. the last run, or a blocked step) |
| `⏭` | skipped or not applicable (say why in one word) |

## The sections, in order

Render these top to bottom. Keep it tight — the whole board should read in a few seconds.

### 1. Header
`QA status — <product>` where `<product>` is the house-profile `product.name` (else "your project"), followed
by a muted "from qa-context". One line.

### 2. Metric line
One line of the headline numbers, each from its slice; show a metric only when its slice exists, else `—`:

| Metric | From | Shows |
|---|---|---|
| modules built | `catalog.modules` | count `status=built` / total — **else** the disk fallback: count `modules/*/` folders with ≥1 spec, shown as "N built (from disk)" |
| last run | `runHistory` (latest), else `failures` | From the latest `runHistory` entry: `N passed / M failed / K flaky` (+ a short trend of the last few runs **of a comparable scope**, noting the scope — e.g. "last 3 @orders: ✓ ✓ ✗" — so a narrow green run isn't shown as fixing a broad red one). If there's **no `runHistory` yet** (older session, or P-rich hasn't recorded one), fall back to `failures`: `N failed` / `all green` (empty `runs[]`) / `not run yet`. Only ever show numbers that are actually in a slice — never infer a passed/flaky count when only `failures` exists. **If neither slice exists**, read `reports/results.json` (the JSON reporter output) for the last run's real totals, shown "(from disk)"; if that is absent too, "not run yet". |
| course | `learning` | the current topic + progress (`<current> (N of M topics)`), from `learning.current` + `path[]` covered/total; omit the metric if there's no `learning` slice |
| open bugs | `bugs.items` | count whose `status` is not `closed` (closed = the terminal value), or `0` |

### 3. The loop (you-are-here)
A single strip for the **current focus** (the module being built, or the story/module under test), showing the
six steps and where the QA is:

```
analyze ✓ → cases ✓ → publish ✓ → automate ● → run ○ → bugs ○
```

Derive each mark from the slices (below); put `●` on the first not-yet-done step (that's "you are here"), `✓`
on completed ones, `○` on the rest, `✗` if a step is red/blocked, and `⏭` on a step that **deliberately doesn't
apply** (e.g. `publish` when the QA isn't using a tracker, or the UI-dependent work when there's no web app) —
say why in a word. Name the focus above the strip (e.g. "billing module" or "story 123").

**No active focus yet** (a framework/`catalog` exists but no story/module/cases is in progress — common right
after a module is built): don't invent a focus. Render the strip with every step `○` labeled "No active work —
pick a module with `/build` or a story with `/test`", or omit the strip and say that in one line.

| Step | Done (`✓`) when… |
|---|---|
| analyze | `story` or `module` + `review` slice exists for the focus |
| cases | `cases.items[]` exist for it |
| publish | `cases.approved` is true **and** `ado.published[]` / `adoCaseId`s set |
| automate | `automation.specs[]` exist for its cases |
| run | a run has executed (`failures` present — empty `runs[]` = green `✓`, red = `✗`) |
| bugs | handled — real failures filed or triaged (`bugs`/no open red) |

### 4. Modules
The `catalog` as a small markdown table — the map of the product and where each module stands:

```
| module    | status        |
|-----------|---------------|
| orders    | ✓ built       |
| billing   | ● in progress |
| customers | ○ not yet     |
```

Status from `catalog.modules[].status` only (`built`→`✓ built`, `in-progress`→`● in progress`,
`discovered`→`○ not yet`). **Don't add a per-level/coverage column in P-view** — `catalog` carries no per-level
field, and the `automation` slice only describes the *current* module, so levels are unknowable for the others;
the modules × levels **coverage matrix is P-rich** (`/status coverage`). If there's **no `catalog`**,
build the table from the **disk fallback** — glob `modules/*/` (exclude `example`) and mark each module
`✓ built (from disk)` when it has ≥1 spec, `○ not yet` otherwise — and note the row source is the disk
scan, not a catalog. Only when there is **also no `modules/*/` folder** is the framework truly absent →
then skip the table and say: "No framework yet — run `/qa` to set one up." If `catalog.frameworkScaffold`
is `absent`, note the structure isn't built yet.

### 5. Next
One line: the single best next action + its command (the same recommendation the home base computes) — e.g.
"Next: finish automating billing, then `/run`. Or add a module with `/build`." If gaps/questions are open
(`story.gaps` / `review`), surface that as the next action instead.

## Focusing a section (`/status <section>`)
`/status` with no arg renders the whole board. With a section word, render **only** that part, expanded:
`modules` (the full catalog table), `coverage` (the coverage matrix below), `learning` (the course position +
study-plan pointer), `loop` (the current focus's six steps with detail).

## Coverage matrix (P-rich)
`/status coverage` renders a **modules × levels** table — which of the six test levels each module actually has
specs for. It answers "what's covered" without the QA eyeballing `npm run test:api -- --list`.

- **Rows** = the modules from `catalog`. **Columns** = the six levels (API: contract · endpoint · workflow;
  UI: smoke · regression · e2e), per `knowledge/standards/test-levels.md`.
- **A cell is `✓`** when a spec exists for that module+level, **`○`** when not. Derive existence from
  `automation.specs[]` (each `{ path, level, tracesCase }`) **and** a **read-only** glob of the framework's
  spec folders (`modules/<module>/**/tests/**`, matched to the folder-is-the-level + tag convention). Read-only
  — never create or run anything to find out.
- A covered cell **may** be annotated `✗` when that **specific module+level**'s last run was red — derive this
  **only** from `failures.runs[]` (whose `specPath`/tag maps to the exact module+level). **Never from
  `runHistory`**, which holds only per-run totals + a coarse `scope` and can't say *which* cell failed (using it
  would paint every cell of a module red for one failure). Coverage (a spec exists) and result (it passed) are
  different things; keep them visually distinct and never imply a pass that didn't happen.
- Honest + absent-safe: a module/level with nothing is `○` ("no spec yet"), never a guessed `✓`. If there's no
  framework/`automation` yet, say "nothing automated yet" and point at `/build`.

```
| module   | contract | endpoint | workflow | smoke | regression | e2e |
|----------|----------|----------|----------|-------|------------|-----|
| orders   | ✓        | ✓        | ✓        | ✓     | ✓          | ○   |
| payments | ✓        | ✓        | ○        | ○     | ○          | ○   |
```

## Durable status file (P-rich)
Besides rendering in chat, the board is written to a **durable `qa-status.md`** at the framework root so the QA
has a kept snapshot (not just scrollback). The orchestrator writes/refreshes it whenever it renders the board
or completes a loop/build/run step; its content is the board — header, metrics, loop, modules, next — and
includes the coverage matrix (the one section the in-chat default leaves to `/status coverage`). It is
**git-ignored** (a personal snapshot derived from git-ignored state — a team may commit
a sanitized copy if they choose, but that's not the default). Writing the file is the orchestrator's one write
here; *rendering/reading* the board stays read-only.

## Worked example (illustrative — mock data)

```
QA status — Acme            (from qa-context)

modules built 2/7 · last run 48 passed / 2 failed (last 3: ✓ ✓ ✗) · course fixtures (1 of 2 topics) · open bugs 1

billing module:  analyze ✓ → cases ✓ → publish ✓ → automate ● → run ○ → bugs ○

| module    | status        |
|-----------|---------------|
| orders    | ✓ built       |
| payments  | ✓ built       |
| billing   | ● in progress |
| customers | ○ not yet     |
| reports…  | ○ not yet     |

Next: finish automating billing, then /run — or add a module with /build.
```

Values are illustrative; the real board shows only what `qa-context` actually holds.

## Done when
- [ ] Both `/qa` (home base) and `/status` render the board from this one spec, identically
- [ ] Every value traces to a real slice; absent slices render "not started"/"—"; nothing fabricated; read-only
- [ ] It's portable markdown (legend, metric line, loop strip, module table, next line); no graphics dependency
- [ ] **(P-rich)** last run uses `runHistory` for passed/flaky + a comparable-scope trend, falling back to
      `failures` with no inference; the **coverage matrix** marks `✓`/`○` from `automation` + a read-only scan and
      any per-cell `✗` only from `failures` (never `runHistory`); a durable **`qa-status.md`** snapshot is
      refreshed (git-ignored) and is the only write
- [ ] Nothing product-specific or secret appears in the spec or the rendered board beyond the house-profile
      product name the QA supplied
