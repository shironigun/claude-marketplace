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
- [ ] **P-rich — Tier 2.** Durable `qa-status.md` (refreshed each step); coverage matrix (modules × levels,
      replacing eyeballed `--list`); run-history trend (`run-suite` appends; `runHistory` in qa-context).
      Independent review; fix; commit.
