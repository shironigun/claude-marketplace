# SP11 — Integrate the single entry point + end-to-end rehearsal (spec)

Status: planned (2026-10-08). Phase 2 — **the capstone.** Depends on SP5–SP10 (all engines now exist:
story-intelligence, ado-publish, the consolidated authoring + approval seam, automation-engine,
failure-to-bug). No new engine; this sub-project makes the whole thing **cohere** and **proves** it.

## 1. Goal
Make the `qa-orchestrator` a coherent **single entry point** for the whole QA loop now that every engine is
native, remove the "arrives later / not built yet" scaffolding, reconcile the last stale wiring (the build
path's Phase 4 + the delegation list still name the retired `file-to-tracker` filing path), and **rehearse
the full loop end-to-end** so the qa-context thread is shown to chain cleanly from a story to a filed bug.

## 2. What's incoherent now (grounded)
- The orchestrator's top "Route the whole QA loop" section (SP5) still says *"Some engines exist today; the
  rest arrive in later sub-projects"* and *"For a route whose engine is not built yet, say so…"* — **stale:
  SP6–10 are all native.** The routing-table "Status" column is right per-row; the surrounding prose lags.
- The orchestrator's **intro + body** are still the older build-centric agent (*"A QA has asked you to build
  an API + UI test-automation framework… brick by brick"*). That build is now **one** routed workflow, not
  the orchestrator's whole identity. The 5-beat phase loop, the phase/gate table and the secret-scan are all
  valid for the **build path** and stay — but the framing must put the whole-loop entry point first.
- **Build-path Phase 4** (the phase table + the delegation list) still names **`file-to-tracker`** as the
  ADO creator; SP9 reconciled `kit-builder`'s own Phase 4 to the gated `ado-publish`, but the orchestrator's
  copy wasn't updated. The delegation list omits the new engines (ado-publish, automation-engine,
  story-intelligence) and still calls `file-to-tracker` an authoring skill (it is now a router).
- `docs/ado-integration.md` body is still the pre-SP7 flow (SP9 added a banner, deferred the rewrite here).

## 3. Design decisions (expert calls)
1. **One entry point, the whole loop first; the build is one workflow.** Reframe the orchestrator intro so it
   is the single AI QA orchestrator for the whole loop (analyze → cases → publish → automate → run →
   investigate → bug, plus teach/build/review), and the brick-by-brick build is one routed workflow that
   then uses the existing phase machinery. **Keep** the valuable build-path detail (5-beat loop, phase/gate
   table, never-assume, secret-scan) — reconcile, don't delete.
2. **Everything native; drop the "arrives later" scaffolding.** All SP6–10 engines are built; remove the
   "not built yet / arrives in SPx" prose and the fallback-to-what-exists hedge. Keep the honest "if a
   dependency (ADO sign-in, WEB_APP_URL) is unavailable, degrade and say so" rule — that is runtime, not
   roadmap.
3. **Prove it with a rehearsal, not a live run.** The committed plugin is product-neutral and cannot touch a
   real tracker/app; the rehearsal is a **documented end-to-end trace** on a neutral placeholder story that
   shows each engine's input slice → output slice and confirms the qa-context contracts chain (and the gates
   fire) — an honest proof the integration holds, not a claim of a live execution.
4. **Finish the deferred `ado-integration.md` rewrite** to the gated path (ado-publish + failure-to-bug),
   removing the stale `file-to-tracker`-creates steps and the retired sibling-skill names.

## 4. Deliverables
- **D1** `qa-orchestrator` reconcile: whole-loop entry-point framing first; drop "arrives later / not built
  yet"; fix the build-path Phase-4 delegate → `ado-publish`; complete + correct the delegation list (add
  story-intelligence, ado-publish, automation-engine; `file-to-tracker` = router). Keep the build detail.
- **D2** `docs/enhancement/end-to-end-rehearsal.md` — a neutral, documented trace of the full loop
  (story → analysis+gaps → review → cases(approved) → publish(adoCaseId) → automate(specs, traces-case) →
  run → failure → investigate → bug(linked)), showing each hand-off's qa-context slice in/out and where each
  human gate fires. The integration proof.
- **D3** `docs/ado-integration.md` full rewrite to the gated path (ado-publish create/add-to-suite/link +
  failure-to-bug gated bug file); remove `file-to-tracker`-creates steps + the `testcase-to-tracker` /
  `api-failure-to-bug` sibling names; keep the product-neutral Steps-XML/link conventions by pointing at
  `ado-publish`'s reference.
- **D4** Final sweep: whole-plugin neutrality + secret scan; README Phase-2 table all ✅ + a "Phase 2
  complete" note; confirm `marketplace.json`/`plugin.json` description reflects the single AI QA engineering
  plugin (update if it still reads teach+build only).

## 5. Out of scope
Any new engine. A live ADO/app execution (neutral plugin can't, and won't fake one). Merging `dev`→`main` /
publishing (a separate, user-authorized step — offer it, don't do it unasked).

## 6. Acceptance criteria
1. The orchestrator reads as **one entry point for the whole loop**, every engine native, no "arrives
   later/not built yet" wording; the build path detail is preserved and its Phase 4 points at `ado-publish`;
   the delegation list is complete and current.
2. `end-to-end-rehearsal.md` traces the full loop on a neutral story, showing the qa-context slice at each
   hand-off and where each gate fires — contracts chain with no gap; nothing claims a live run.
3. `docs/ado-integration.md` is reconciled to the gated path; no `file-to-tracker`-creates steps or retired
   sibling-skill names remain.
4. Whole-plugin scan is secret-free + product-neutral; README shows Phase 2 complete; the marketplace/plugin
   description reflects the single QA-engineering plugin.
5. **Independent adversarial review passes** — the thread holds end to end, no orphaned/contradictory
   routing, the rehearsal is honest (no faked live run), neutral, secret-free.

## 7. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product scan
before every push. No PR (offer the dev→main merge + marketplace listing at the end; do not do it unasked).
Full independent review (the capstone — coherence of the whole).
