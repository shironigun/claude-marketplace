# SP12 — Implementation plan

Executes [`SP12-spec.md`](./SP12-spec.md). Branch `dev`. Build → self-verify → commit → push → **independent
adversarial review** → close. The run engine that closes the "→ run →" link.

- [x] **P0 — Setup.** Grounded: template exposes `test`/`test:api`/`test:ui`/`test:contracts|endpoints|
      workflows`/`test:smoke`/`test:impacted`; the `failures` slice `{ runs[] }` is ready; `failure-to-bug`
      consumes it. Spec + plan written.
- [x] **P1 — run-suite skill + wiring.**
  - [x] `skills/run-suite/SKILL.md` — resolve scope → the kit's command → confirm a broad run → execute →
    parse the real result → write the `failures` slice → report pass/fail → gated `failure-to-bug` hand-off.
    Honest outcomes; no reinvented runner; refuses cleanly with no framework.
  - [x] `references/run-scopes.md` — intent→command map + Playwright-output→`failures`-slice (points at the
    Standards).
  - [x] Wire `qa-orchestrator` (run route → run-suite → failure-to-bug) + `qa-context.md` (`failures`
    written-by += run-suite); README QA-loop table + self-contained engine list.
  - [x] Verify: honest-outcome stated; confirm-before-broad; correct `failures` contract; no auto-file; neutral.
- [ ] **P2 — Independent review + close.** Combined adversarial review with SP13 (both gap-closures). Fix round;
      README roadmap += SP12. Commit; push.
