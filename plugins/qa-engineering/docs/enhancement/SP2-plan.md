# SP2 — Implementation plan

Executes [`SP2-spec.md`](./SP2-spec.md). Branch `dev`. Build → self-verify → commit → push (secret/
product-name scan before push). Controller may dispatch implementer subagents; each gets the
product-neutral + teach-from-standards (no duplication) + official-docs rules.

- [x] **P0 — Setup.** SP1 standards + `framework-standards` skill in place; `dev` clean/synced. Spec+plan written.
- [ ] **P1 — Curriculum + teaching skill.**
  - `knowledge/curriculum/learning-path.md` — the ordered ~35-topic path; each row: goal · prerequisites ·
    mapped SP1 standard(s) · official-doc link(s) · a build-with-the-kit hook. Thin index, no duplicated content.
  - `skills/teach-automation/SKILL.md` — walks the path, applies the 4 depth levels (§2d), teaches each
    topic from its standard + official docs, tracks progress, checks understanding.
  - Verify: every topic maps to a real `knowledge/standards/*.md` file and/or an official URL from the
    research notes; no standard content copied; neutral.
  - Commit `feat(qa-engineering): automation tutor — curriculum + teaching skill [SP2]`; push.
- [ ] **P2 — On-demand explainer + tutor agent + orchestrator wiring.**
  - `skills/playwright-topic/SKILL.md` — the 10-point explainer template, depth-adjustable, official-docs-linked.
  - `agents/automation-tutor.md` — the teaching brain (curriculum / on-demand / decision-help modes; invokes
    `teach-automation`, `playwright-topic`, `framework-standards`; depth-adjustable; teaches, never scaffolds).
  - Edit `agents/kit-orchestrator.md` — route teach vs build (light).
  - Verify: agent references only existing skills; depth-level definitions consistent across both skills.
  - Commit `feat(qa-engineering): automation tutor agent + on-demand Playwright explainer [SP2]`; push.
- [ ] **P3 — Verify + close SP2.**
  - Acceptance (spec §4): tutor + 2 skills exist, consume standards (grep: no standard paragraphs copied),
    curriculum covers ~35 topics mapped to standards+docs, depth levels defined once, orchestrator routes.
  - Product-neutral + secret scan. Update program `README.md` status → SP2 complete; commit; push.
  - Report SP2 done; SP3 (Builder + enforcement) next.

## Notes
- DRY: the tutor TEACHES the SP1 standards; it must not restate a standard's body. A curriculum row points
  at the standard; the skill explains it at the chosen depth.
- Decision guidance ("when to choose what") is SP1's `framework-standards` — the tutor routes to it, not a copy.
