# SP15 — Implementation plan

Executes [`SP15-spec.md`](./SP15-spec.md). Branch `dev`. Two phases, each build → self-verify → **independent
adversarial review** → commit. The guided QA experience.

- [x] **P0 — Setup.** Grounded: current 14 commands; `scan-and-confirm` lists modules + picks one (writes
      `flow-map.json`); `kit-builder` phase 1 = shared scaffold, phases 2-3 = the module; qa-context has no
      `catalog`/`learning` slice; orchestrator mediates all qa-context writes. Spec + plan written.
- [ ] **P-build — commands + flagship arc + registry + expand (Parts A–D).**
  - `qa-context.md`: add the `catalog` slice `{ product, recommended, modules:[{name,summary,endpointCount?,status}] }`
    (status discovered|in-progress|built) + `frameworkScaffold: built|absent`; written-by/read-by; example.
  - `commands/` 14 → 7: keep+rewrite `qa`, `run`, `learn`, `resume`; new `build`, `test`, `analyze`; delete
    `analyze-story`, `analyze-module`, `test-story`, `test-module`, `make-cases`, `review-cases`, `push-cases`,
    `automate`, `file-bug`, `build-framework`. Every command takes an optional context arg; all route through
    the orchestrator; gated sub-steps fold into the journeys + `/qa`.
  - `qa-orchestrator.md`: the flagship `/qa` arc (first-run vs home-base), the registry + structure-once +
    one-module-at-a-time/expand model, honor optional-context args, routing table → the 7 commands.
  - `plugin.json`: version `0.1.0 → 0.2.0`. README: 7-command guided-experience quick-start + the arc + launch.
    `docs/enhancement/README.md`: Phase-5 (SP15) entry.
  - Verify: exactly 7 command files, valid frontmatter, each takes optional context + routes through
    orchestrator; arc orchestrates existing engines (no reimplementation) + keeps every gate; catalog contract
    additive + correct; no capability lost in 14→7; neutral + secret-free.
  - Independent review; fix; commit to `dev`.
- [x] **P-learn — `/learn` course + progress persistence (Part E).**
  - [x] `learning` slice in `qa-context.md` (contract + example + the "before any framework" location note).
  - [x] `commands/learn.md` rewritten to the course: kickstart (ask goal+level → build best-sequence path →
    write slice + study-plan) / resume; teach via the tutor; **orchestrator persists** each topic; durable
    `learning-plan.md` study-plan; checkpoints; steer via arg; teach→build hand-off.
  - [x] `teach-automation/SKILL.md`: replaced the "keeps no external state / per-conversation" rule with
    learning-slice-backed resume (read-only; orchestrator persists). `automation-tutor.md` + orchestrator teach
    routing: progress/resume note (tutor read-only, orchestrator owns the slice + study-plan).
  - [x] Verify: slice contract additive + correct; tutor stays read-only; orchestrator persists; best-sequence
    + resume; no-framework location handled; neutral.
  - [ ] Independent review; fix; commit.
