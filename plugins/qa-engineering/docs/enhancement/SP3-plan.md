# SP3 — Implementation plan

Executes [`SP3-spec.md`](./SP3-spec.md). Branch `dev`. Build → self-verify → commit → push (secret/product
scan before push). Surgical edits to existing build guidance + small new VS Code files; no rebuild.

- [x] **P0 — Setup.** Confirmed: template already ships Allure + toolkit scripts + 9 projects; script-gen
  already enforces exact-status/isolation/knownBug; builder NOT yet linked to `knowledge/standards/`;
  no `.vscode/`; cross-module reuse not an explicit generation rule. Spec+plan written.
- [ ] **P1 — Generate-to-standard + cross-module-reuse enforcement + self-check.**
  - Edit `docs/script-generation.md`: add a "generate to the Standards" preamble (link `knowledge/standards/`
    + `defaults-and-deviation.md`); add the **mandatory cross-module-reuse rule** (cite `cross-module-reuse.md`)
    with a neutral customer→deal worked example (own-data isolation + reuse via `mergeTests`, no duplication);
    add the **per-phase self-check** checklist.
  - Edit `skills/kit-builder/SKILL.md`: reference the Standards as the generation authority; add the
    self-check step to each build phase; route "when to choose what" to `framework-standards`.
  - Edit `docs/reuse.md` + `docs/verification.md`: point at the Standards; document the self-check.
  - Edit `agents/kit-orchestrator.md`: build intent generates to-standard (light).
  - Verify: standards links resolve; cross-module rule present; self-check present; neutral; no secrets.
  - Commit `feat(qa-engineering): generate to standards + enforce cross-module reuse & self-check [SP3]`; push.
- [ ] **P2 — VS Code extension config + reporting/tooling alignment.**
  - Add `template/.vscode/extensions.json`, `settings.json`, `launch.json` (node debug; playwright.env;
    recommend `ms-playwright.playwright`).
  - Align `knowledge/standards/vscode-playwright.md`, `reporting-allure.md`, `tooling-and-commands.md` to the
    template's real `.vscode/`, Allure config, and `package.json` scripts; add any standard-listed command
    missing from `package.json` (e.g. a `verify`/CI-equivalent) generated from the real scripts.
  - Verify: `.vscode/*.json` valid JSONC, no `"type":"playwright"`; standards match the template.
  - Commit `feat(qa-engineering): VS Code extension config + align reporting/tooling standards [SP3]`; push.
- [ ] **P3 — Verify + close SP3.**
  - Acceptance (spec §4). Product-neutral + secret scan. Confirm build path still coherent (6-phase,
    template, MCP). Update program `README.md` status → SP3 complete; commit; push.
  - Report SP3 done; SP4 (Reviewer + reuse-guardian) next.

## Notes
- No new agents. Enforcement is generation-time (self-check); SP4 adds the independent blocking review.
- Everything generated must trace to a Standard; the Standards stay the single source of truth (DRY).
