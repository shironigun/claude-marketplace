# SP16 — Implementation plan

Executes [`SP16-spec.md`](./SP16-spec.md). Branch `dev`. Two phases, each build → self-verify → **independent
adversarial review** → commit. The QA status board (sense of place).

- [x] **P0 — Setup.** Grounded: all board data already exists in `qa-context` (loop slices + `catalog` +
      `learning` + `bugs`); `/qa` returning = home base (renders 1-2 lines today); the plugin can't assume a
      graphics tool → render is portable markdown. Spec + plan written.
- [x] **P-view — Tier 1: the in-chat status view.**
  - [x] `knowledge/orchestration/status-board.md` — the one render spec (sections · `✓/●/○/✗` legend ·
    slice→cell mapping · markdown shapes · read-only + honest + absent=not-started rules · worked example).
  - [x] `commands/status.md` — `/status [section]`: read-only, renders the board per the spec; optional section
    focus; routes through the orchestrator.
  - [x] `commands/qa.md` — returning/home-base branch renders the board (per `status-board.md`), then next action.
  - [x] `agents/qa-orchestrator.md` — home base + `/status` render per the one spec; routing row added. README:
    `/status` + home-base board. Version `0.2.0 → 0.3.0`. docs/enhancement Phase-6 entry.
  - [x] Verify: read-only + honest; `/qa` + `/status` share the one spec; portable markdown; neutral.
  - [ ] Independent review; fix; commit.
- [x] **P-rich — Tier 2.**
  - [x] `runHistory` slice in `qa-context.md` (contract + example); `run-suite` appends a real-totals entry per
    run (step 5), none for a start-up/env non-run.
  - [x] `status-board.md`: last-run metric now uses `runHistory` (passed/flaky + trend, `failures` fallback); a
    **coverage matrix** (modules × levels, `✓`/`○` from `automation` + read-only spec-folder scan) for
    `/status coverage`; a durable **`qa-status.md`** snapshot (orchestrator refreshes; git-ignored).
  - [x] `commands/status.md` (coverage matrix + the qa-status.md snapshot), `qa.md`/orchestrator home base
    (trend + coverage + snapshot refresh), `template/.gitignore` (`qa-status.md`, `learning-plan.md`), version
    `0.3.0 → 0.4.0`, roadmap.
  - [x] Verify: real numbers only (no inferred passed/flaky); coverage read-only; snapshot write is the only
    write; neutral.
  - [ ] Independent review; fix; commit.
