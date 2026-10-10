# SP14 — Implementation plan

Executes [`SP14-spec.md`](./SP14-spec.md). Branch `dev`. Build → self-verify → **independent adversarial
review** → commit. The QA-friendly slash-command surface (easy-buttons + single steps) over the existing
loop.

- [x] **P0 — Setup.** Grounded: no `commands/` yet; plugin.json uses default component paths (auto-discovers
      `commands/`); the orchestrator is the single router and owns the gates; every fronted engine exists
      (SP6–SP13 + build/teach). Spec + plan written.
- [x] **P1 — commands + wiring.**
  - [x] `commands/` Tier 1 (journeys): `qa.md`, `test-story.md`, `test-module.md`, `resume.md`.
  - [x] `commands/` Tier 2 (steps): `analyze-story.md`, `analyze-module.md`, `make-cases.md`,
    `review-cases.md`, `push-cases.md`, `automate.md`, `run.md`, `file-bug.md`, `build-framework.md`,
    `learn.md`.
  - [x] Each: plain-language `description` + `argument-hint`; thin body routing intent through the
    `qa-orchestrator`; gates preserved; product-neutral + secret-free.
  - [x] README **Commands** quick-start (easy-buttons vs steps) + "How to launch"; `docs/enhancement/README.md`
    Phase-4 (SP14).
  - [x] Verify: routes-through-orchestrator (not around); gates intact; thin; plain language; neutral;
    valid frontmatter.
- [ ] **P2 — Independent review + close.** Adversarial review of the command set. Fix round; commit to `dev`;
      offer push + the dev→main merge.
