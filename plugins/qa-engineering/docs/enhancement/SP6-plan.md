# SP6 — Implementation plan

Executes [`SP6-spec.md`](./SP6-spec.md). Branch `dev`. **Read-only against ADO — no writes.** Build →
self-verify → commit → push (secret/product scan before push) → independent review.

- [x] **P0 — Setup.** SP5 orchestrator + qa-context + house-profile in place; dev synced. Spec+plan written.
- [ ] **P1 — story-intelligence skill.**
  - `skills/story-intelligence/SKILL.md` — the engine (retrieve full graph → requirement understanding →
    concerns → Confirmed/Inferred/Assumption/Gap labels → QA review brief + test strategy → write qa-context
    story slice → gaps gate). Reads the project/fields from the house-profile; uses ONLY ADO MCP read ops.
  - `skills/story-intelligence/references/concern-taxonomy.md` (the gap/concern checklist) and
    `review-brief-format.md` (the Understanding/Scope/Risks/Questions/Regression/Test-strategy format).
  - Confirm the `qa-orchestrator` routing to `story-intelligence` matches (one skill covers analysis+review);
    adjust its wording if it implied a separate `qa-review`.
  - Verify: product-neutral (project/board/org from house-profile, generic examples only); **grep the skill
    for ADO write ops (`wit_create`/`wit_update`/`wit_add`/`testplan_*create*`/`add_test_cases`) → 0**;
    never-invent rule present; labels present; writes qa-context story slice.
  - Commit `feat(qa-engineering): story-intelligence — ADO story -> understanding + gaps + QA review [SP6]`; push.
- [ ] **P2 — Independent review + close SP6.**
  - Dispatch `framework-reviewer`-style review (or a scoped review): read-only confirmed (no write ops),
    house-profile-driven (no hard-coded ADO project), labels + never-invent enforced, qa-context slice
    written, product-neutral + secret-free.
  - On pass: update README status → SP6 complete; commit; push. Report; SP7 (ADO publish) next.

## Notes
- SP6 is the first engine to touch ADO — it must be provably **read-only**. The reviewer greps for write ops.
- Case generation stays with the existing `author-*-cases` skills (consolidated in SP8); SP6 stops at the gate.
