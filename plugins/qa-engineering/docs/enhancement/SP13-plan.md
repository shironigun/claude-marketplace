# SP13 — Implementation plan

Executes [`SP13-spec.md`](./SP13-spec.md). Branch `dev`. Build → self-verify → commit → push → **independent
adversarial review** → close. The read-only code-intelligence that closes the codebase → QA direction.

- [x] **P0 — Setup.** Grounded: `story-intelligence` (SKILL + references/{concern-taxonomy, review-brief-format})
      is the mirror; `scan-and-confirm` produces the `module` slice / flow-map to reuse; authoring reads
      `module` + `review`. Spec + plan written.
- [x] **P1 — code-intelligence skill + wiring.**
  - [x] `skills/code-intelligence/SKILL.md` — read a module (reuse flow-map when present) → requirement
    understanding + gaps + QA review, every claim labeled Confirmed/Inferred/Assumption/Gap → write `module` +
    `review` slices → gaps gate → hand to author-*. **Read-only; invents nothing; reuses scan-and-confirm +
    story-intelligence refs.**
  - [x] `references/code-reading-guide.md` — reading a module's code for QA + labeling from evidence (reuses
    the story-intelligence concern/brief refs by pointer).
  - [x] Wire `qa-orchestrator` (split "analyze this module": *to test* → code-intelligence; *to build* →
    scan-and-confirm; module → code-intelligence → author-*) + `qa-context.md` (`module`/`review` written-by
    += code-intelligence); README QA-loop table + self-contained engine list.
  - [x] Verify: zero write ops; labeling fail-safe; correct slice shapes; real reuse; neutral.
- [ ] **P2 — Independent review + close.** Combined adversarial review with SP12. Fix round; README roadmap +=
      SP13. Commit; push.
