# SP11 — Implementation plan

Executes [`SP11-spec.md`](./SP11-spec.md). Branch `dev`. The capstone: integrate the single entry point,
prove the loop end-to-end, finish the deferred doc. Build → self-verify → commit → push → **independent
review** → close the program.

- [x] **P0 — Setup.** Grounded: all SP6–10 engines native; the orchestrator's top section + intro + build
      Phase-4 + delegation list are stale; `ado-integration.md` body still pre-SP7. Spec + plan written.
- [x] **P1 — Orchestrator reconcile (D1).**
  - Reframe the intro so the orchestrator is the single entry point for the **whole** loop; the brick-by-brick
    build is one routed workflow (keep its 5-beat loop, phase/gate table, never-assume, secret-scan).
  - Drop the "arrives later / not built yet / route to what exists" scaffolding (all native); keep the
    runtime "dependency unavailable → degrade and say so" rule.
  - Fix the build-path **Phase-4** delegate → `ado-publish` (gated); update the delegation list (add
    story-intelligence, ado-publish, automation-engine; `file-to-tracker` = router, not an authoring skill).
  - Verify: whole-loop framing first; no stale roadmap wording; Phase 4 = ado-publish; delegation complete;
    build detail intact; neutral.
  - Commit `refactor(qa-engineering): qa-orchestrator = single entry point, all engines native [SP11]`; push.
- [x] **P2 — End-to-end rehearsal + ado-integration rewrite (D2, D3).**
  - `docs/enhancement/end-to-end-rehearsal.md` — the neutral full-loop trace (slice in/out per engine + where
    each gate fires); honest (no faked live run).
  - `docs/ado-integration.md` full rewrite to the gated path (ado-publish + failure-to-bug); remove the
    `file-to-tracker`-creates steps + the `testcase-to-tracker`/`api-failure-to-bug` names; point ADO
    field/link specifics at `ado-publish`'s reference.
  - Verify: the rehearsal's contracts chain with no gap; ado-integration has no retired names/steps; neutral.
  - Commit `docs(qa-engineering): end-to-end rehearsal + ado-integration reconciled to the gated path [SP11]`; push.
- [x] **P3 — Final sweep + independent review + close the program.**
  - Whole-plugin scan 0; plugin.json/marketplace.json/README refreshed to the single-QA-plugin scope.
    Capstone review (opus): **NEEDS-FIX, 0 Critical** — rehearsal + orchestrator verified contract-accurate
    and honest. Fix round: **#1** `docs/phases.md` + `docs/reuse.md` Phase-4 still routed through the retired
    `file-to-tracker` creator/filer (contradicting the reconciled orchestrator) → fixed to gated
    `ado-publish` + `failure-to-bug`; **#2** the plugin-root `README.md` was build-only and labelled
    file-to-tracker "tracker filing" → reframed to the whole loop, native-engine list corrected; **#3**
    removed a duplicated blockquote in `ado-integration.md`; **#4** dropped the stale "engines don't exist
    yet" note + fixed the `review` slice writer (→ `story-intelligence`) in `qa-context.md`; **#5** fixed
    two present-tense `kit-orchestrator` refs in the enhancement README. **Phase 2 complete.**
  - Whole-plugin secret + product scan (0); README Phase-2 table all ✅ + "Phase 2 complete"; confirm the
    marketplace/plugin description reflects the single QA-engineering plugin (update if stale).
  - Dispatch review (opus): whole-loop coherence, thread holds end to end, no orphaned/contradictory routing,
    rehearsal honest (no faked live run), neutral, secret-free. Fix round; re-verify.
  - On pass: README/program status → **Phase 2 complete**; commit; push. **Offer** the dev→main merge +
    marketplace listing (do not do it unasked). Report the whole program.

## Notes
- Reconcile, don't gut: the build-path machinery (phases, gates, secret-scan, never-assume) is good and
  stays; SP11 only re-frames it as one workflow under the single entry point and fixes the stale wiring.
- The rehearsal is a **documented proof**, not a live execution — the committed plugin is neutral and must
  not fake a tracker/app run.
