# SP18 — Implementation plan

Executes [`SP18-spec.md`](./SP18-spec.md). Branch `dev`, mirrored to cache. Build → self-verify → independent
adversarial review → (hold for the user's ship). The frontend-first Knowledge Base that grounds the loop.

**Status: built + reviewed (PASS-WITH-FIXES, 0 blockers, 5 Minor fixed), mirrored to cache, v0.5.0→0.6.0.
Holding for the user's ship.**

- [x] **P0 — Setup.** Grounded: prior-art KB format + investigation protocol; the plugin's `scan-and-confirm`
      (phase-0 discovery), `catalog` + `qa-context` contract, `story-/code-intelligence` (consumers),
      `author-*` (RULES → cases), `system-map` variant axis. Spec + plan written.
- [x] **P1 — The standard.** `knowledge/standards/knowledge-base.md` — the KB format (modules/RULES/atlas),
      frontend-first discovery, keyword packs, evidence rails, the lazy depth model (absent→stub→deep), where
      it lives + committable-in-QA-repo-never-in-plugin, and the consumer guide. Add it to
      `knowledge/standards/overview.md`.
- [x] **P2 — kb-builder engine.** `skills/kb-builder/SKILL.md` — deep per-module generation: investigation
      protocol (FE surface → trace calls → resolve BE → cross-check → extract rules → keyword packs/traps →
      emit modules + atlas + RULES patch) + coverage self-audit; read-only product, writes only
      `knowledge-base/`, confirm-surface gate; one module at depth. `references/` as needed
      (investigation-protocol / kb-skeletons). Reuse `code-intelligence`'s code-reading refs by pointer.
- [x] **P3 — scan-and-confirm extend.** Frontend-first module discovery (backend fallback for API-only);
      seed `catalog` from the frontend surface; scaffold `knowledge-base/` (README + CONVENTIONS + empty
      RULES + thin `modules/<slug>.md` stubs, `kb: stub`) on first run. Keep `flow-map.json` + `system-map`
      as-is (KB layered on top, not a replacement).
- [x] **P4 — Consumers + contract.**
  - [x] `story-intelligence` + `code-intelligence`: read `modules/<slug>.md` + RULES to ground; offer to
        deepen a `stub` via `kb-builder`.
  - [x] `author-api-cases` + `author-ui-cases`: seed cases from RULES anchors; set `tracesRule`.
  - [x] `automation-engine` / `kit-builder`: use atlas globs + link table to scope reuse-inspection.
  - [x] `qa-context.md`: `catalog.modules[].kb` status; `cases` item `tracesRule`; the `knowledge-base/`
        artifact note (committable, not git-ignored, never in the plugin); extend the traceability-thread
        diagram to rule ⇄ case.
- [x] **P5 — Template + docs.** `template/knowledge-base/` scaffold (README/CONVENTIONS/RULES/modules/example/
      atlas/example, neutral placeholders); confirm `template/.gitignore` does not ignore it. README (KB
      section), `docs/phases.md` (phase 0 += frontend-first discovery + KB scaffold), plugin.json description,
      the guide artifact.
- [x] **P6 — Self-verify.** `knowledge-base/` created frontend-first with stubs + catalog seeded; a deep
      module generates to format with the self-audit; consumers read it; `tracesRule` threads; read-only
      product; neutral + secret-free; markdown/skill content only (no load-risk to frontmatter/JSON).
- [x] **P7 — Independent review + close.** `framework-reviewer` + `reuse-guardian` siblings; fix round; README
      roadmap += SP18; version bump. **Hold for the user's explicit ship** (no-auto-commit).
