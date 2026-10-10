---
description: Show your QA status board — where you are, what's built, the last run, course progress, and what's next. Read-only.
argument-hint: a section to focus (optional) — modules, coverage, learning, loop
---

Act as the **qa-engineering orchestrator**. Render the **status board** from `qa-context` — the QA's
"you are here" view. **Read-only against state**: read `qa-context` *from the file* at the framework root (and
the house-profile for the product name); write nothing to `qa-context`, the code, or the tracker, and run no
gate. (You *may* refresh the derived **`qa-status.md`** snapshot — that's the board saved to a file, not a state
change.)

Follow the one render spec in `${CLAUDE_PLUGIN_ROOT}/knowledge/orchestration/status-board.md` exactly (so this
looks identical to `/qa`'s home base): the header, the metric line (modules built / last run / course / open
bugs), the loop strip with **you-are-here** (`✓`/`●`/`○`/`✗`), the module table from `catalog`, and the single
next action + its command.

**Honest + absent-safe:** every value comes from the actual slices — a slice that isn't there yet renders as
"not started" / "—", never fabricated. If there's no `qa-context`/`catalog` yet, say so plainly and point me at
`/qa` to get started.

If `$ARGUMENTS` names a section (`modules`, `coverage`, `learning`, `loop`), render **only** that part,
expanded, per the spec — `coverage` renders the modules × levels matrix (read-only; existence from
`automation` + a read-only scan of the spec folders). End by offering the recommended next command.
