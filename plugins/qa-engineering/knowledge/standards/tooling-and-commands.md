# Tooling and commands

> The discoverable terminal command set — run all / ui / api / module / one test / headed / debug / by-tag / impacted / report / open-report / lint / typecheck / verify — generated from the real `package.json` scripts, not hardcoded.

## Purpose
A suite people actually run has a small, memorable command set. The kit exposes one script per common
action through `package.json`, so a QA discovers them with `npm run` and never memorizes raw Playwright
flags. The authoritative list is whatever the workspace's `package.json` declares — this standard
describes the *shape* of that set and names the common actions; always read the real `scripts` block
rather than copying a command that may have drifted.

## When to use it (and when NOT)
- **Use the scripts** for every routine action — running a level, a module, one test, headed, by tag, the
  impacted subset, the report, lint/typecheck, and the environment check.
- **Generate the list from the real `package.json`** when documenting or teaching — the scripts are the
  source of truth; a hardcoded list rots.
- **Prefer `test:impacted`** locally and on path triggers to run only what a change can affect; keep the
  scheduled run on the full suite.
- **Run `verify` before you push** — it is the local CI-equivalent gate, composed from existing scripts
  (`typecheck` + `lint` + `test:smoke`); `verify:setup` is the separate, earlier environment probe.
- **Do NOT** hand people raw `npx playwright test …` incantations when a named script exists.
- **Do NOT** document a command you have not confirmed against the current `scripts` block.

## Official guidance
- Run the suite with `npx playwright test`, a single file/line with `file.spec.ts:NN`, headed, and
  `--debug`; filter with `--grep @tag` — the named scripts wrap these —
  https://playwright.dev/docs/best-practices · https://playwright.dev/docs/debug
- Lint with ESLint + `@typescript-eslint/no-floating-promises` and run `tsc --noEmit` on CI — the `lint`
  and `typecheck` scripts exist for this — https://playwright.dev/docs/best-practices
- (Kit convention) the specific script *names* below are the kit's own; the underlying commands are
  Playwright's.

## Code shape (product-neutral)
```text
The command set (names are the kit's; read package.json for the live list)

  Action                         Script                     Wraps
  ─────────────────────────────  ─────────────────────────  ──────────────────────────────────
  run everything                 npm test                   playwright test
  API levels only                npm run test:api           --project=contracts|endpoints|workflows
  one level                      npm run test:contracts     --project=contracts (also :endpoints, :workflows)
  UI levels only                 npm run test:ui            --project=ui-smoke|ui-regression|ui-e2e
  by tag                         npm run test:smoke         --grep "@smoke"
  one module                     npm test -- --grep @orders  tag filter
  one test (file:line)           npm test -- file.spec.ts:12
  headed                         npm test -- --headed
  debug                          npm test -- --debug        Playwright Inspector
  impacted only                  npm run test:impacted      diff → tags → filtered run
  print impacted tags            npm run impacted           grep expression only
  refresh browser auth           npm run auth:refresh       --project=auth-setup
  verify environment             npm run verify:setup       fail fast if unreachable
  typecheck                      npm run typecheck          tsc --noEmit
  lint                           npm run lint               eslint .
  verify (CI-equivalent)         npm run verify             typecheck + lint + test:smoke
  generate report                npm run report:summarize   results.json → summary
  open report                    npm run report:open        playwright show-report
  generate Allure report         npm run report:allure      allure generate → reports/allure-html
  open Allure report             npm run report:allure:open allure open reports/allure-html
```
```bash
# discover the real set — always the source of truth
npm run            # lists every script this workspace actually defines
```

## Anti-patterns
- Hardcoding a command list that drifts from `package.json` — regenerate it from the live `scripts`.
- Teaching raw `npx playwright test` flags when a named script exists and is more discoverable.
- Running the whole suite on every commit instead of `test:impacted` — people start skipping a suite that
  is slow to run.
- A `verify:setup` that is never run first, so a broken environment shows up as hundreds of identical
  auth failures.

## Related standards
- `ci.md` — calls `verify:setup`, `test:*`, and the impacted selector.
- `reporting-allure.md` — the `report:*` scripts and what they produce.
- `vscode-playwright.md` — the editor equivalent of run/debug for people who prefer the UI.
- `test-levels.md` — the level projects the `test:*` scripts target.
