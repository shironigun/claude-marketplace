# SP4 — Implementation plan

Executes [`SP4-spec.md`](./SP4-spec.md). Branch `dev`. The final sub-project. Build → self-verify → commit
→ push (secret/product scan before push).

- [x] **P0 — Setup.** SP1 standards + SP3 self-check in place; `dev` clean/synced. Spec+plan written.
- [ ] **P1 — Review rubric + the two review agents.**
  - `knowledge/review/review-rubric.md` — dimensions × what-good/bad → owning SP1 standard × severity; the
    blocking hard rules; the grep-gates + build-gates. DRY: points at standards, no restating.
  - `agents/framework-reviewer.md` — broad gate; `tools: Read, Grep, Glob, Bash, Skill` (no Write/Edit);
    runs gates, judges each dimension via `framework-standards`, delegates reuse to `reuse-guardian`,
    returns Blocking/Important/Minor with file:line + standard + fix direction.
  - `agents/reuse-guardian.md` — DRY/cross-module specialist; same tools; detects re-implemented cross-module
    setup / duplicated logic / duplicated POM selectors; cites `cross-module-reuse.md` + `page-objects.md`.
  - Verify: both agents review-only (no Write/Edit in `tools`); rubric links real standards; neutral; no secrets.
  - Commit `feat(qa-engineering): framework-reviewer + reuse-guardian review gate [SP4]`; push.
- [ ] **P2 — Wire the review gate.**
  - `skills/kit-builder/SKILL.md` — after the self-check, run `framework-reviewer`; Blocking findings stop
    the phase. `agents/kit-orchestrator.md` — a build phase ends with the reviewer gate; "review this" →
    `framework-reviewer`. `docs/verification.md` — the two-tier model (self-check → independent gate).
  - Verify: additive; phase machine intact; references resolve.
  - Commit `feat(qa-engineering): wire reviewer as a blocking phase gate [SP4]`; push.
- [ ] **P3 — Verify + close the program.**
  - Acceptance (spec §3). Product-neutral + secret scan. Confirm the full §22 UX exists (orchestrator
    teach↔build · tutor · builder generate-to-standard + self-check · reviewer + reuse-guardian gate) and
    the kit is coherent (agents: kit-orchestrator, automation-tutor, framework-reviewer, reuse-guardian;
    skills: scan-and-confirm, kit-builder, framework-standards, teach-automation, playwright-topic, +4
    internalized; template + MCP intact).
  - Update program `README.md` → SP4 complete + **program complete**; commit; push.
  - Report: the enhancement program is done.

## Notes
- Reviewers are review-only (report + block, never edit) — fixing is the builder's next pass.
- Two tiers: builder self-check (same actor, generation-time) vs the independent reviewer gate (SP4).
