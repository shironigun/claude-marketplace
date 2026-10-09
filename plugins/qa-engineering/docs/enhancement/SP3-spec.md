# SP3 — Framework Builder + enforcement (spec)

Status: in progress (2026-10-08). Part of the [Enhancement Program](./README.md). Depends on SP1
(Standards). **Surgical, not a rebuild** — the `template/` already carries Allure, the terminal-toolkit
scripts, the 9 Playwright projects (contract/endpoint/workflow + ui-smoke/regression/e2e), and
`docs/script-generation.md` already enforces exact-status / no-`toContain` / `knownBug` placement /
own-data+cleanup isolation. SP3 closes the remaining gaps and connects generation to the Standards.

## 1. Goal
Make the kit **generate to the SP1 Standards with the opinionated defaults, and enforce isolation **and**
cross-module reuse during generation**, plus finish the editor/reporting/tooling story (VS Code extension
config; confirm Allure + terminal toolkit). Generation-time enforcement here; the independent review gate
is SP4.

## 2. Deliverables

### 2a. Connect the builder to the Standards (generate-to-standard)
Update `skills/kit-builder/SKILL.md`, `docs/script-generation.md`, `docs/reuse.md`, and
`agents/kit-orchestrator.md` so generation explicitly follows `knowledge/standards/`:
- The **opinionated defaults** come from `defaults-and-deviation.md` (don't re-ask settled stack choices;
  deviate only via the deviation protocol).
- Each generated block cites / conforms to its standard (routes→`routes.md`, services→`services.md`,
  builders→`builders.md`, POM→`page-objects.md`, schemas→`schemas.md`, matchers→`matchers.md`, fixtures→
  `fixtures.md`, cleanup→`cleanup-and-sweepers.md`, levels→`test-levels.md`, …).
- "When to choose what" during a build routes through the `framework-standards` skill (don't re-decide ad hoc).

### 2b. Cross-module reuse enforcement (the gap)
Add an explicit, **mandatory** generation rule (citing `cross-module-reuse.md`): when a flow depends on
another module, the generated test **reuses that module's service/POM/builder via the merged fixtures**
(`mergeTests`) and **must not duplicate** it — the customer→deal pattern (own-data isolation + reuse). Add
it to `script-generation.md` (with a worked neutral example) and make it a checklist item the builder
verifies.

### 2c. Per-phase generation self-check
Add a self-check the builder runs after generating a phase's specs (before moving on), verifying the
generated code against the Standards: one exact status (no OR-lists), real schema/`toMatchContract`, no
failure-hiding skips, `knownBug` placement, **each test owns+cleans its data**, **cross-module setup reuses
not duplicates**, POM by role/label. Record it in `docs/verification.md` and reference from `kit-builder`.
(This is generation-time; the independent reviewer + reuse-guardian that *block* progression are SP4.)

### 2d. VS Code extension configuration (the gap)
Add to `template/`:
- `.vscode/extensions.json` — recommend `ms-playwright.playwright` (and the repo's eslint).
- `.vscode/settings.json` — the `playwright` settings so the extension discovers tests from
  `playwright.config.ts`, the `playwright.env` pointer (profile/`.env`), and test-explorer config.
- `.vscode/launch.json` — a `node`-type debug config for the current spec (cwd, the `@playwright/test`
  CLI, the profile env) — NOT the deprecated `"type":"playwright"`.
Align `knowledge/standards/vscode-playwright.md` with what the template actually ships (official
getting-started-vscode / Marketplace guidance).

### 2e. Confirm Allure + terminal toolkit (align, don't rebuild)
The template already has Allure (`allure-playwright` + `report:allure`) and the toolkit scripts. Verify
`reporting-allure.md` and `tooling-and-commands.md` describe the template's **real** scripts/config (and
add any missing command the standard lists, e.g. a `verify`/CI-equivalent, generated from the real
`package.json`). No rebuild.

## 3. Out of scope (SP4 / done)
Independent reviewer + reuse-guardian agents that *block* progression (SP4). No new redundant
`framework-architect`/`framework-builder` agents — `kit-orchestrator` + `kit-builder` already architect +
execute; SP3 strengthens them in place.

## 4. Acceptance criteria
1. `kit-builder`/`script-generation.md`/`reuse.md`/`kit-orchestrator` reference `knowledge/standards/` as
   the generation authority, defaults from `defaults-and-deviation.md`, decisions via `framework-standards`.
2. Cross-module reuse is a **mandatory** generation rule with a worked neutral example and a builder
   checklist item (`cross-module-reuse.md` cited).
3. A per-phase generation self-check exists (isolation + reuse + honest-assertions + POM), documented in
   `verification.md` and referenced by `kit-builder`.
4. `template/.vscode/{extensions,settings,launch}.json` exist and match the kit (no `"type":"playwright"`);
   `vscode-playwright.md` matches the shipped config.
5. `reporting-allure.md` + `tooling-and-commands.md` match the template's real scripts/config.
6. Product-neutral + secret-free (scan); committed + pushed to `dev`. Existing build path still coherent
   (6-phase machine, template, MCP intact).

## 5. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per chunk; push (user-authorized); secret + product scan before
every push. No PR. Conventional commits scoped `qa-engineering`.
