# Test automation workspace

Standalone API + UI test-automation workspace — Playwright + TypeScript + Zod.

Everything lives in this folder. `git status` after any run shows changes only
here; the framework never edits the application under test or its pipelines.

---

## First run

```bash
npm install
npm run scan                                  # read the backend, propose the config
npx playwright install --with-deps chromium   # skip for a strictly API-only suite
cp .env.example .env                          # then fill it in from the scan
npm run verify:setup                          # ← must be green before anything else
```

`npm run scan` reads the surrounding repo — stack, protocol, routes, auth
endpoints, base URLs, CI — and writes `reports/scan.md`. Read-only and
deterministic.

**Commit the `package-lock.json` that `npm install` creates** — CI uses `npm ci`,
which needs it in the repo.

`npm run verify:setup` resolves the profile, mints a token, and probes every
configured service. Get it green first — every other problem you might chase is
downstream of this one.

**`AGENTS.md` is the complete working reference** — fixture surface, exact import
paths, copy-ready examples for routes, builders, services, schemas and all three
spec levels, the rules, and the failure modes. Read it before writing a test, agent
or not. `npm run install:agents` distributes it to Claude Code and Copilot.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run scan` | Read the backend repo → `reports/scan.md`. Read-only. Run before configuring. |
| `npm run install:agents` | Install the Claude + Copilot instruction files from `AGENTS.md`. Idempotent. |
| `npm run verify:setup` | Auth + connectivity check. Run this first, and whenever something is inexplicably red. |
| `npm test` | Everything |
| `npm run test:api` | contracts + endpoints + workflows |
| `npm run test:contracts` | Response shape vs Zod schema |
| `npm run test:endpoints` | One operation, one condition |
| `npm run test:workflows` | Multi-step business journeys |
| `npm run test:ui` | ui-smoke + ui-regression + ui-e2e |
| `npm run test:smoke` | Everything tagged `@smoke` |
| `npm run test:impacted` | Only what the current diff can affect |
| `npm run typecheck` | `tsc --noEmit` — run before every commit |
| `npm run lint` | ESLint, incl. `no-floating-promises` |
| `npm run auth:refresh` | Re-do the browser login, refresh storage state |
| `npm run report:open` | Open the last HTML report |
| `npm run report:summarize` | `results.json` → `summary.json` |
| `npm run notify` | Post the summary to Teams/Slack |

Useful ad-hoc forms:

```bash
npx playwright test modules/orders/api/tests/workflows/order-lifecycle.workflow.spec.ts
npx playwright test --grep "@orders"
npx playwright test --grep "@orders" --grep "@smoke"
npx playwright test --no-deps --project=endpoints     # skip the auth-check dependency
npx playwright test --headed --project=ui-smoke       # watch a UI test run
npx cross-env AUTOMATION_PROFILE=staging npm test     # another environment
```

---

## Layout

```
config/         services registry · env reader · profile registry · notify config
common/
  api/          the one HTTP client (auth, latency, 401 re-mint, host-down)
  auth/         token minting (the only file that knows your identity provider)
  fixtures/     base → api.fixture / ui.fixture · matchers · helpers
  profiles/     environment/tenant config objects
  services/     API service classes (the API's Page Object)
  builders/     request payload factories
  routes/       route templates + fillRoute()
  schemas/      shared Zod primitives
  helpers/      http · cleanup · schema · unique
  pages/        cross-module UI page objects
  components/   reusable UI widgets
  setup/        auth-check + sweep + browser auth (Playwright projects)
modules/
  README.md                 the "add a module" walkthrough
  <module>/
    fixtures.ts             module seed + sweeper (extends the base fixture)
    api/schemas/            module Zod schemas
    api/tests/contracts/    ┐
    api/tests/endpoints/    ├─ the folder IS the level
    api/tests/workflows/    ┘
    ui/pages/               module page objects
    ui/tests/{smoke,regression,e2e}/
pipelines/      CI definitions + impact selection
resources/      impact-map.json
scripts/        scan-backend · install-agent-config · verify-setup · summarize · notify
docs/           RUNBOOK + per-module domain knowledge
reports/        gitignored run output
AGENTS.md       house rules for anyone — human or agent — working in here
```

---

## The rules that keep this working

1. **Everything in this workspace.** Never edit the application under test.
2. **Every test creates its own data and tears it down** in `finally`. More than
   one resource → `CleanupRegistry`.
3. **Assertions only in `*.spec.ts`.** Services and page objects act and wait;
   they never `expect()`.
4. **One exact status code per assertion.** `expect([400, 403]).toContain(...)`
   passes whichever the API does — it has stopped testing anything.
5. **Never hardcode a URL or a route string.** Route templates + `fillRoute()`.
6. **Unique data always** — `uniqueName()`, never a bare `Date.now()`.
7. **`test.step()` in every workflow.** A failed 10-call workflow without steps
   is a trace of 200 undifferentiated requests.
8. **Parameterize, don't duplicate.** One test body, N profiles. Write a
   profile-specific test only where the business logic genuinely differs.

Complete reference with worked examples: `AGENTS.md`.
