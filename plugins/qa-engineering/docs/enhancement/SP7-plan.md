# SP7 — Implementation plan

Executes [`SP7-spec.md`](./SP7-spec.md). Branch `dev`. **First write path — gated.** Build → self-verify →
commit → push → **independent adversarial review** (required).

- [x] **P0 — Setup.** SP5 (qa-context + house-profile) + SP6 (story-intelligence) in place; dev synced. Spec+plan written.
- [x] **P1 — ado-publish skill.**
  - `skills/ado-publish/SKILL.md` — the gated flow (load approved cases → confirm → list+pick plan/suite →
    **dry-run preview** → confirm target → create → add-to-suite → link to story → write qa-context ado slice
    → return ids), with the safety rules (never auto-run, idempotency, honest outcomes, house-profile-driven).
  - `references/test-case-field-mapping.md` + `references/publish-gates.md` (both product-neutral).
  - Update `qa-orchestrator` routing to `ado-publish` (exists as placeholder); retire the "suite add is
    manual" wording in `file-to-tracker` (one-line note; full merge is SP8).
  - Verify: no write op described before the dry-run+confirm gate; the unlock op present; reads house-profile
    (no hard-coded project/plan/suite); product-neutral; secret-free.
  - Commit `feat(qa-engineering): ado-publish — gated Test Plan/Suite publishing + add-to-suite [SP7]`; push.
- [x] **P2 — Independent adversarial review.**
  - Adversarial review run (0 Critical, NEEDS-FIX). Findings fixed in the fix round: **I-1** approval gate keys
    on `cases.approved` (fail-closed); **I-2** idempotency + traceability key = per-case `adoCaseId` +
    `ado.published[]` (was no case→id key); **I-3** raw TCM Steps XML/Tags/AssignedTo routed through
    `wit_create_work_item` (testplan_create_test_case takes only a pipe-delimited `steps` string); **M-1** link
    via `wit_work_items_link type: "tests"` (not the `TestedBy-Reverse` reference name, which belongs to
    `testsWorkItemId`); **M-2** link step is a no-op when `testsWorkItemId` set it at create; **M-3** dry-run
    enumerates a new-suite create. **M-4** root `index.html` left untracked (not committed).
- [x] **P3 — Close SP7.**
  - Fixes committed (`3a059c7`) + pushed to `dev`; README status → SP7 complete. SP8 (consolidate authoring) next.

## Notes
- The whole point of SP7 is SAFE writes. The reviewer's #1 job: prove no write happens before the explicit
  confirm, and nothing is hard-coded.
- ado-publish consumes approved cases from qa-context regardless of which authoring skill produced them, so
  it works today with the existing author-*-cases (SP8 consolidates authoring but isn't a dependency).
