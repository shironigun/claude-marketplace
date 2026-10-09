# SP1 — Implementation plan

Executes [`SP1-spec.md`](./SP1-spec.md). Branch `dev`. Each phase: build → self-verify → commit → push
(secret/product-name scan before push). Controller may dispatch implementer subagents for bulk
authoring; every subagent gets the product-neutral + official-docs-grounded rules.

- [x] **P0 — Setup.** Confirm `dev`; locate qa-toolkit skills (`plugins/qa-toolkit/skills/*`, 4 skills
  + `references/`, no agents); map the ~10 kit files referencing `qa-toolkit`.
- [ ] **P1 — Research.** `research/official-docs-notes.md` — faithful official-docs notes (Playwright
  best-practices/isolation/locators/assertions/POM/fixtures/API/auth/parallelism/debug/CI/codegen/
  test-agents/VS Code ext/Allure; + pyramid/quadrants/Pact). *(dispatched)*
- [ ] **P2 — Framework Standards core.**
  - `knowledge/standards/<block>.md` for every block in spec §2a, each on the standard template
    (Purpose · When to use / not · Official-doc link(s) · Neutral code shape · Anti-patterns · Related).
  - `knowledge/standards/defaults-and-deviation.md` — default stack + deviation protocol.
  - `skills/framework-standards/SKILL.md` — the access skill.
  - Verify: every file neutral (no product/org/URL/secret), every official claim cites a URL from P1.
  - Commit `feat(qa-engineering): framework standards knowledge core [SP1]`; push.
- [ ] **P3 — Internalize capability skills + remove qa-toolkit dependency.**
  - Copy the 4 skills (+ `references/`) into `skills/` as `author-api-cases`, `author-ui-cases`,
    `file-to-tracker`, `failure-to-bug`; neutralize; re-ground in the Standards.
  - Rewire every `qa-toolkit:<skill>` reference in kit-builder SKILL, kit-orchestrator agent, and
    `docs/{reuse,phases,ado-integration,script-generation,verification,exercise}.md`, `README.md`;
    change "hard dependency on qa-toolkit" → "self-contained".
  - Update plugin.json description if it claims composition of external skills.
  - Verify: `grep -rn "qa-toolkit:" plugins/qa-engineering` → 0 (outside historical notes).
  - Commit `feat(qa-engineering): internalize QA skills, drop qa-toolkit dependency [SP1]`; push.
- [ ] **P4 — Verify + close SP1.**
  - Product-neutral scan (no product/company/client/org names, real URLs, or credential tokens); secret scan
    (`git diff --cached | grep -c 'sig='` = 0, no webhook/token literals).
  - Coherence: `kit-orchestrator`/`scan-and-confirm`/`kit-builder`/6-phase/`template/`/MCP intact.
  - Update `docs/enhancement/README.md` status → SP1 complete; commit docs; push.
  - Report SP1 done; SP2 (Tutor) is next.

## Notes
- qa-toolkit stays its own marketplace plugin; we only remove qa-engineering's *dependency* on it.
- Standards files are the DRY knowledge; SP2/SP3 skills/agents consume them (don't duplicate content).
- Keep `ENHANCEMENT-CONTEXT.md` as the program's external-facing brief.
