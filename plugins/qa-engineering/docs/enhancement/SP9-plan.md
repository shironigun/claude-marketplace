# SP9 — Implementation plan

Executes [`SP9-spec.md`](./SP9-spec.md). Branch `dev`. Build → self-verify → commit → push → **independent
adversarial review** → close. The "automate these cases" generation path, framework-aware, at the six levels.

- [x] **P0 — Setup.** Grounded: `kit-builder` is a phase machine seeded by a module scan; the Standards
      define six levels (folder-is-level + tag); the `cases` slice (SP8) records each case's `level` +
      `tracesStory` + `adoCaseId`. **Key reuse found:** `docs/script-generation.md` is already the
      product-neutral "authored case → runnable spec" guidance (folder-is-level, `traces-case:` line, §0→
      Standards) — the engine uses it as-is, not a parallel generator. Spec + plan written.
- [x] **P1 — automation-engine skill (D1, D2).**
  - `skills/automation-engine/SKILL.md` — load approved cases from `qa-context` (fail-closed on unapproved);
    optionally pull ADO cases via `testplan_list_test_cases` for a chosen plan/suite; inspect the framework
    map + Standards for reusable building blocks; generate one `.spec.ts` per case at its framework level
    (folder + level tag + `traces-case:` tag); run the per-phase generation self-check; write the
    `automation` slice. Reuses the Standards (points to `knowledge/standards/`), does not restate them.
  - `references/case-to-spec-mapping.md` — case level/steps/tags → folder, level tag, traces-case tag, which
    Standards apply (pointers, not copies).
  - Verify: approval fail-closed; six-level mapping correct; reuse-first (no duplicated framework code);
    traceability tag present; product-neutral; secret-free.
  - Commit `feat(qa-engineering): automation-engine — approved cases -> framework-aware specs [SP9]`; push.
- [x] **P2 — Orchestrator wiring + Phase-4 reconcile (D3, D4).**
  - `qa-orchestrator` routing: "automate these / a suite id / approved cases" → `automation-engine`;
    `kit-builder` keeps the brick-by-brick build. Fix `kit-builder` Phase 4 ADO wording to link case↔script
    via `adoCaseId` (`ado-publish`) + the `traces-case:` tag, not the retired `file-to-tracker` filing path.
  - Commit `refactor(qa-engineering): route automate-cases to automation-engine + reconcile kit-builder P4 [SP9]`; push.
- [x] **P3 — Independent adversarial review + close.**
  - Adversarial review (opus): **NEEDS-FIX, 0 Critical.** Verified clean: approval fail-closed (local path),
    slice contracts match qa-context exactly, the engine genuinely defers to `script-generation.md` +
    Standards (no hand-rolled generator), kit-builder Phase 4 honestly reconciled to `ado-publish`/`adoCaseId`.
    Fix round: **#1 (the real bug)** UI level→folder was wrong (`ui-smoke/` is the Playwright *project* name;
    the *folder* is `smoke/`) — a UI spec in `ui-smoke/` matches no project and silently never runs; fixed in
    SKILL step 3 + the reference to `{smoke,regression,e2e}/` with the project-vs-folder note, citation §1→§7
    for UI; **#2** extended the ado-integration banner to also remap the retired sibling names
    `testcase-to-tracker`→`ado-publish`, `api-failure-to-bug`→`failure-to-bug`; **#3** stated the ADO-suite
    source is safe-by-construction (suite already passed ado-publish's gate; read-only + generate-only);
    **#4** replaced the inline self-check/§2 re-listings with pointers. README status → SP9 complete. SP10
    (failure→bug) next.

## Notes
- The hard rule here is **reuse, not reinvent**: the engine must lean on the Standards + existing building
  blocks and the reuse-guardian, exactly like the phase build. A new fixture/helper only when none fits.
- Keep the six-level model; do not introduce an L1–L5 taxonomy the framework doesn't have.
