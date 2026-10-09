# SP10 — Implementation plan

Executes [`SP10-spec.md`](./SP10-spec.md). Branch `dev`. Build → self-verify → commit → push → **independent
adversarial review** → close. One failure→investigation→bug engine, API+UI, with gated filing.

- [x] **P0 — Setup.** Grounded: `failure-to-bug` is API-only, light triage, hands filing to the retired
      `file-to-tracker`; `failures`/`bugs` slices + the `defectFormat` slot already exist. Spec + plan written.
- [x] **P1 — Broaden the engine + investigation (D1, D2).**
  - `skills/failure-to-bug/SKILL.md`: cover **API and UI** failures; add the **investigate** stage (read the
    assertion/stack + logs + Playwright trace/screenshot/video/error-context/console+network) → root-cause
    hypothesis + honest classification (real_bug / flake / environment / test-defect); only `real_bug` drafts.
    Keep draft-and-review + the house format.
  - `references/investigation-guide.md` — reading a failure's evidence per domain + the classification rubric;
    points at `knowledge/standards/` (reporting-allure, isolation-and-parallelism), does not restate them.
  - Verify: both domains covered; investigation reads real artifacts; classification fail-safe; neutral.
  - Commit `feat(qa-engineering): failure-to-bug covers API+UI with an investigation stage [SP10]`; push.
- [x] **P2 — Gated bug-file + wiring (D3, D4).**
  - Add the **gated filing** flow to the skill: draft → approve → **dry-run** → explicit confirm →
    `wit_create_work_item` ($Bug, `defectFormat` fields) + link to case (`adoCaseId`, `type: "related"` — a
    bug relates to the case, not "tests") + story; read `defectFormat` from the profile; write the `bugs`
    slice. Reference `ado-publish`'s `publish-gates.md` for the gate principles incl. **idempotency** (don't
    restate). Retire the "hand to `file-to-tracker` to file" wording. Set `references/bug-format.md`'s ADO
    bug→case link relation to `type: "related"`. Wire `qa-orchestrator` routing (red run / stack trace → this engine).
  - Verify: no auto-file; write only after the confirm; honest outcomes; `bugs` slice written; neutral,
    secret-free.
  - Commit `feat(qa-engineering): gated bug filing (defectFormat) + wire failures/bugs slices [SP10]`; push.
- [x] **P3 — Independent adversarial review + close.**
  - Adversarial review (opus): **NEEDS-FIX, 0 Critical.** Verified clean: gate airtight (no write before
    gate 2; never auto-files), classification fail-safe (flake/env/uncertain not filed), investigation
    concrete (real artifacts), contracts agree, link relation `related` correct + consistent, neutral, no
    stale file-to-tracker wiring. Fix round: **#1** added the **idempotency/re-run** rule publish-gates.md
    has but SP10 had dropped (don't double-file a re-run) — in the dry-run + safety rules; **#2** fixed a
    status-vocab contradiction (`"Drafted"`→`"Approved"`); **#3** noted the ADO severity strings are the
    neutral default overridden by `defectFormat.severityScale`; **#4** corrected the stale `type:"tests"` in
    the SP10 spec/plan to `type:"related"` (the engine was already right). README → SP10 complete. SP11
    (integrate + end-to-end rehearsal) next.

## Notes
- This is the **second tracker write path** — the gate discipline must be as tight as SP7's. Mirror
  `publish-gates.md`; a drafted bug is not permission to file it.
- Classification must fail **safe**: when unsure real-vs-flake, say so and do **not** file — a wrongly-filed
  flake is worse than an unfiled real bug the QA can still file manually.
