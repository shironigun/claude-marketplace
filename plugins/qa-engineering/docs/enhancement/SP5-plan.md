# SP5 — Implementation plan

Executes [`SP5-spec.md`](./SP5-spec.md). Branch `dev`. Foundation only — routing + state + profile seam; no
new engines, no ADO writes. Build → self-verify → commit → push (secret/product scan before push).

- [x] **P0 — Setup.** Plugin renamed to `qa-engineering`; Phase-2 roadmap recorded in README. Spec+plan written.
- [ ] **P1 — qa-orchestrator (rename + expand).**
  - `git mv agents/kit-orchestrator.md agents/qa-orchestrator.md`; set `name: qa-orchestrator`; update every
    `kit-orchestrator` reference across the plugin (grep → 0 stale).
  - Preserve existing teach↔build↔review routing; add the full QA-loop intent→workflow table (existing
    engines + named SP6–SP10 placeholders); document the human gates + that it reads house-profile and
    reads/writes qa-context.
  - Verify: `grep -rn "kit-orchestrator" plugins/qa-engineering` → 0; agent frontmatter valid; tools intact.
  - Commit `feat(qa-engineering): kit-orchestrator → qa-orchestrator, route the full QA loop [SP5]`; push.
- [ ] **P2 — qa-context + house-profile scaffold.**
  - `knowledge/orchestration/qa-context.md` — the shared session-state contract + traceability thread.
  - `knowledge/orchestration/house-profile.md` — the config contract (neutral) + `house-profile.example.json`
    (neutral example). Add `house-profile.json` to the plugin + `template/` `.gitignore`.
  - Verify: neutral (no real org/product/secret in committed files); example profile uses generic placeholders.
  - Commit `feat(qa-engineering): qa-context + house-profile scaffold [SP5]`; push.
- [ ] **P3 — Verify + close SP5.**
  - Acceptance (spec §4): orchestrator routes the loop; context + profile contracts exist; no ADO writes;
    existing flow intact. Product-neutral + secret scan. Update README status → SP5 complete; commit; push.
  - Report SP5 done; SP6 (story intelligence + QA review) next.

## Notes
- The orchestrator routes + gates; engines do the work. Placeholders keep the routing map complete and
  forward-compatible so SP6–SP10 slot in without reworking the entry point.
- House-profile is the ONLY product-aware file; committed engines + examples stay neutral.
