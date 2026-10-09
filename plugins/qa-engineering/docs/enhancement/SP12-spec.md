# SP12 — Run engine: on-demand test execution + report (spec)

Status: in progress (2026-10-09). Phase 3 (gap-closure from the audit). Depends on SP5 (qa-context), SP9
(the specs + `automation` slice a run executes), SP10 (`failure-to-bug`, which consumes the `failures` slice
this engine writes). **Closes the "→ run →" link the loop advertises but never delivered.**

## 1. Why
The roadmap loop is *"…automation (levels) → **run** → investigate → defect"* and the orchestrator claims it
can *"generate **or run** automation"* — but there is **no run capability**. `automation-engine` explicitly
"does NOT … run them"; `kit-builder` runs tests only as internal build verification. A QA cannot say "run my
Orders suite" and get a routed run + pass/fail report feeding `failure-to-bug`. SP12 adds that.

## 2. Goal
A routed **run-the-suite** engine that executes the framework's **own** test scripts for a requested scope,
captures the **real** result, writes the `failures` slice (red runs), reports pass/fail honestly, and hands
real failures to the gated `failure-to-bug`. It reuses the kit's npm scripts (`test:api`, `test:ui`,
`test:smoke`, `test:impacted`, `playwright test --grep @<tag>` / `--project` / a spec path) — it **does not
reinvent a runner**.

## 3. Deliverable — `skills/run-suite/SKILL.md`
Triggers: "run the suite / run these tests / run the Orders tests / run the contract (or smoke) tests / run
impacted / run everything / did it pass / re-run the failures". Reads the framework root from the cwd; the
scope-to-command mapping is product-neutral (tags/levels/paths, never product names).

**The flow (in order):**
1. **Resolve scope + command** from intent + context: *all* → `npm test`; *a level* (contract/endpoint/
   workflow/smoke/regression/e2e) → the matching `test:<level>` script or `--project`; *a module* → `playwright
   test --grep @<module>`; *impacted/changed* → `npm run test:impacted`; *a spec path* → that path; *re-run
   failures* → the specs in the `failures` slice. If there is **no framework** (no `package.json` + no specs),
   STOP and say so — route to build (`kit-builder`) or generate (`automation-engine`) first.
2. **Confirm the scope** before a potentially-long run (ask-with-recommendation; "run everything" and e2e get
   a confirm with the reason; a single targeted level/module/path may proceed). State the exact command.
3. **Run** it (the npm script / `npx playwright test …`, prefer the machine-readable reporter where available
   so results parse reliably). Report the command and that it is running.
4. **Parse the real result** — total / passed / failed / flaky(retried) / skipped, duration, and for each
   failure: the spec path, the test title, and the failing assertion/error (and the level/tag). Never fabricate
   a result; a run that errored to start (missing deps, bad env) is reported as an environment problem, not a
   pass.
5. **Write the `failures` slice** — each red run `{ specPath, title, assertion, status }` per
   `knowledge/orchestration/qa-context.md` (empty when all green). Report the full pass/fail summary.
6. **Hand off on failures** — offer to send each real failure to **`failure-to-bug`** (investigate → classify
   → gated file). Never auto-file; a green run files nothing.

**Safety / honesty rules (stated in the skill):**
- **Honest outcomes** — report only what the run actually returned; a flaky/retried pass is reported as
  flaky; a green is claimed only from a green run.
- **Confirm before a broad/slow run**; a targeted run may proceed.
- **No tracker writes** — the run is local; filing stays gated in `failure-to-bug`.
- **Framework-aware, reinvents nothing** — drives the kit's scripts + Playwright projects/tags; no product
  specifics; reads the scope from tags/levels/paths.

**Reference** (`skills/run-suite/references/run-scopes.md`): intent → command mapping (level/module/impacted/
path/re-run), and how to turn Playwright output into the `failures` slice (points at `knowledge/standards/
reporting-allure.md` + `tooling-and-commands.md`, does not restate them).

## 4. Wiring
- `qa-orchestrator` routing: add **"run the suite / run these tests / run @module / run a level / run
  impacted / did it pass" → `run-suite`** (then `run-suite` → `failure-to-bug` on red). Keep the
  description's "generate or run automation" — now backed by a real engine.
- `qa-context.md`: the `failures` slice's "written by" gains **`run-suite`** (it is the primary producer; the
  build's own verify still writes it too).

## 5. Out of scope
Generating specs (SP9), authoring (SP6–8), filing bugs (SP10 — run-suite only *hands off* to it), the
brick-by-brick build (kit-builder runs its own phase verifies). SP12 executes an existing suite and reports.

## 6. Acceptance criteria
1. `run-suite` resolves a run scope (all/level/module/impacted/path/re-run) to the kit's own command, confirms
   a broad run, executes it, and **reports the real pass/fail result** (never fabricated).
2. It **writes the `failures` slice** from the actual failures and offers the gated `failure-to-bug` hand-off;
   it never auto-files and never claims green without a green run.
3. Product-neutral + secret-free; reuses the kit's scripts/standards (no reinvented runner); refuses cleanly
   when there is no framework. Committed + pushed to `dev`.
4. `qa-orchestrator` routes a run intent to `run-suite`; the "run" claim is now real.
5. **Independent adversarial review passes** — honest outcomes (no fabricated pass), confirm-before-broad-run,
   correct `failures` contract, no auto-file, neutral.

## 7. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product scan
before every push. Full independent review (a new action surface — must be honest).
