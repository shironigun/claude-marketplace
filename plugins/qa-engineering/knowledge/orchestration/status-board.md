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
| modules built | `catalog.modules` | count `status=built` / total |
| last run | `failures` | `N failed`, or `all green` (empty `runs[]`), or `not run yet` (no slice). **Do not show a passed or flaky count in P-view** — the `failures` slice holds only *failing* entries, so passed/flaky totals are underivable here; they arrive with the P-rich `runHistory`. |
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
the modules × levels **coverage matrix is P-rich** (`/status coverage`). If there's **no `catalog`** (no
framework yet), skip the table and say: "No framework yet — run `/qa` to set one up." If
`catalog.frameworkScaffold` is `absent`, note the structure isn't built yet.

### 5. Next
One line: the single best next action + its command (the same recommendation the home base computes) — e.g.
"Next: finish automating billing, then `/run`. Or add a module with `/build`." If gaps/questions are open
(`story.gaps` / `review`), surface that as the next action instead.

## Focusing a section (`/status <section>`)
`/status` with no arg renders the whole board. With a section word, render **only** that part, expanded:
`modules` (the full catalog table), `coverage` (P-rich — the coverage matrix; until then, the module table),
`learning` (the course position + study-plan pointer), `loop` (the current focus's six steps with detail).

## Worked example (illustrative — mock data)

```
QA status — Acme            (from qa-context)

modules built 2/7 · last run 2 failed · course fixtures (1 of 2 topics) · open bugs 1

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
- [ ] Nothing product-specific or secret appears in the spec or the rendered board beyond the house-profile
      product name the QA supplied
