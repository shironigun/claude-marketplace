# SP16 — The QA status board (sense of place)

Status: in progress (2026-10-10). Phase 6 (experience). Depends on SP5 (qa-context), SP15 (the `catalog` +
`learning` slices and the flagship `/qa` home base). **Renders the state the plugin already models — the loop,
the module registry, the last run, course progress, the next action — as a status board, so the plugin feels
like one application you can see, not a backstage save-file.** This is the #1 item both internal audits named.

## 1. Why
The plugin models its whole state in `qa-context` (the loop slices + `catalog` + `learning` + the traceability
thread) but **never shows it**. The only "where am I" is one line of prose that scrolls away. A QA has no sense
of place, no durable artifact of their progress, no coverage view (coverage is "eyeballed" today via
`npm run test:api -- --list`). SP16 surfaces the state as a board.

## 2. Goal
A **status board** — a single view that answers *where am I, what's built, what's left, did the last run pass,
where am I in the course, what should I do next* — read fresh from `qa-context` each time, carried by the
flagship `/qa` (returning = home base) and a dedicated `/status` command. Delivered in two phases: the in-chat
view first (Tier 1), then the durable file + coverage + run-trend (Tier 2).

## 3. The render truth (design constraint)
The plugin runs in the QA's Claude Code (terminal or desktop) and **cannot assume a graphics tool is present**.
So the **guaranteed render is clean, portable markdown**: a metric line, a module **table**, a **loop strip**
(`✓` done · `●` current/you-are-here · `○` not started · `✗`/red for a failing step), and a next-action line.
Where a richer visual tool is available it *may* render graphically, but markdown is the baseline and the spec.
No new runtime dependency; no external service.

## 4. Deliverables

### Part A — Tier 1: the in-chat status view (P-view)
- **`/status [section]`** — a new command that renders the board from `qa-context` on demand. Optional context
  focuses a section (`/status coverage`, `/status learning`, `/status modules`). Read-only; writes nothing.
- **`/qa` (returning / home base) renders the board** instead of one or two lines of prose, then offers the
  next action. (First-run arc unchanged.)
- **The board's sections** (all from existing slices — no new plumbing):
  - **Header** — product name (house-profile) + "from qa-context".
  - **Metric line** — modules automated (built / total, from `catalog`) · last run (pass/fail/flaky, from
    `failures`) · course (stage/position, from `learning`) · open bugs (from `bugs`).
  - **The loop** — for the current module/story: analyze → cases → publish → automate → run → bugs, each marked
    `✓`/`●`/`○` from the slices, with **you-are-here** on the current step.
  - **Modules** — the `catalog` as a table: each module + status (`built` / `in progress` / `not yet`) and the
    levels built where known.
  - **Next** — the single best next action + its command (the home-base recommendation).
- **Honest + read-only**: every value comes from the file; absent slices render as "not started", never
  fabricated. No gate, no write.
- Render format defined once in `knowledge/orchestration/status-board.md` (the section list, the `✓/●/○`
  legend, the markdown shapes) so `/qa` and `/status` render identically; the orchestrator points at it.

### Part B — Tier 2: durable file + coverage + run trend (P-rich)
- **Durable `qa-status.md`** at the framework root — the board written to a file, refreshed each step, so there
  is a kept artifact (not just chat). Git-ignored (a personal snapshot derived from git-ignored state; a team
  may commit a sanitized copy if they choose — noted, not default).
- **Coverage matrix** — compute which modules × levels (and, where cheap, endpoints × levels) have
  cases/specs, from `catalog` + `cases` + `automation` (and/or a read-only scan of `modules/**/tests/**`),
  rendered as a table — replacing the "eyeball `--list`" step.
- **Run-history trend** — persist each run's totals (append a small `runHistory[]` to `qa-context`, or a
  `reports/history.json`) so the board can show the last N runs' pass/fail trend, not just the latest red set.
  `run-suite` writes a history entry on each run.
- These are additive to the contract and to `run-suite`; still honest (real numbers only) and read-only for the
  board itself.

### Out of scope
A live Claude Code **mod** pane / status line (Tier 3) — deferred; revisit after Tier 1–2 prove out. No new
tracker capability; no graphics-tool dependency; the board never performs a gated action (it links to the
command that does).

## 5. Acceptance criteria
1. `/status` renders the board from `qa-context` (read-only, honest, absent slices = "not started"); `/qa`
   returning renders the same board as its home base; both use the one render spec in `status-board.md`.
2. The board shows, as portable markdown: the metric line, the loop with **you-are-here**, the module table
   (from `catalog`), and the next action — all from existing slices, nothing fabricated. (Tier 1)
3. Tier 2: a durable `qa-status.md` is written + refreshed; a coverage matrix is computed and rendered (not
   eyeballed); a run-history trend persists and `run-suite` appends to it.
4. Product-neutral + secret-free; `qa-context.md` documents any new field (`runHistory`); README mentions
   `/status` + the home-base board; version bumped `0.2.0 → 0.3.0`; committed to `dev`.
5. **Independent adversarial review passes** — read-only + honest board (no fabricated/auto state), correct
   slice reads, the one-render-spec shared by `/qa` + `/status`, Tier-2 additions additive + honest, neutral.

## 6. Logistics
Repo `claude-marketplace`, branch `dev`. Two phases, each build → self-verify → **independent adversarial
review** → commit: **P-view** (Tier 1) then **P-rich** (Tier 2). Conventional commits scoped `qa-engineering`;
secret + product scan before push. The key risk is the board drifting from honest/read-only or the two entry
points rendering differently — the single render spec + review guard both.
