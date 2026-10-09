# The phases (bricks)

The `qa-engineering` builds an API + UI test-automation framework **one phase at a
time**. Each phase runs the same loop — **state → ask + recommend → act → verify → report** —
and never silently assumes. `kit-builder` (`skills/kit-builder/SKILL.md`) is the state
machine that drives them; this document is the detail for each phase: the exact question(s)
it asks, the recommended option and the reason, the inputs, the produced artifact, and how it
is verified.

Every question leads with a **recommended option and its reason** — never a bare "what do you
want?". "You decide" is honored by taking the recommendation, saying so, and recording it as
QA-delegated.

> Product-agnostic by rule: no product, client, org, URL, token, or account name appears in
> any phase or any artifact it commits. "Customer" is only the workshop's default module. The
> QA's environment lives in their git-ignored `.env`.

| # | Phase | Produces | Dependency / doc |
|---|---|---|---|
| 0 | Scan & confirm | `flow-map.json` + populated `.env` + target module | `scan-and-confirm` skill |
| 1 | Foundation | compiling, lintable skeleton + green auth probe | `template/` + `kit-builder` |
| 2 | Module — API | a green API suite for the module | `author-api-cases`, `docs/script-generation.md`, `failure-to-bug` |
| 3 | Module — UI | a UI suite at parity | `author-ui-cases`, `docs/script-generation.md` |
| 4 | ADO integration | scripts traceable to ADO work items | `ado-publish` (gated) + `failure-to-bug` (gated), `docs/ado-integration.md` |
| 5 | CI + tools + docs | a scheduled run + documentation | `template/pipelines/`, `docs/ci-and-tools.md` |

---

## Phase 0 — Scan & confirm

**What it does.** Read the target repo or live API, propose how the chosen module's flows
work, and ask the QA to confirm or correct each one before any test is written. This whole
phase is owned by the **`scan-and-confirm`** skill, which runs its own 13-question ask loop
(one question per turn, each with a recommendation). `kit-builder` hands off to it and resumes
at phase 1 once `flow-map.json` exists.

**Questions asked** (summarized — the skill owns the full wording): scan target (repo / live
API / both); stack + which module; each flow, one at a time; out-of-scope endpoints; host
count and base URLs; auth kind; auth details; tenancy; constant headers; credentials; a cheap
verify path; the UI app URL; final sign-off.

**Recommended options + reasons** (the load-bearing ones):
- *Scan target* → **the repo when available**, because code is exact where a live API shows
  only what is reachable.
- *Module* → the **most provable** module (clearest create/read/update/delete surface, fewest
  cross-module prerequisites), so every test layer can be proven end to end. **Workshop
  default: the Customer module**, because the shared exercise story targets it.
- *Credentials* → a **dedicated test account, never a personal one**; secrets are typed by the
  QA into `.env`, not into chat.

**Inputs.** A repo path and/or a live API / OpenAPI URL.

**Produced artifact.** `flow-map.json` at the framework root (fields `module`, `hosts`,
`authKind`, `endpoints`, `flows`), a populated git-ignored `.env`, and a confirmation log.

**Verification.** The flow map parses, has exactly the five fields, `authKind` is one of the
four allowed values, every `baseUrlEnvKey` names a key that exists in `.env`, and it contains
no secret, token, account name, or URL value. A read-only reachability `GET` to each base URL
resolved.

---

## Phase 1 — Foundation

**What it does.** Scaffold the product-agnostic `template/` into the framework root and fill
it from the flow map so the skeleton compiles, lints, and can authenticate — before any
module test is written.

**Question(s) asked:**

1. *Scaffold location* — "Scaffold the framework into **this folder** (the one holding `.env`
   / `flow-map.json`)?" **Recommended: yes, the same root** — `scan-and-confirm` wrote `.env`
   and `flow-map.json` there, and the config reads them relative to that root; a different
   folder splits the config from its values.
2. *Hosts* — "The flow map lists these host(s): `<names>`. Register them in
   `config/services.ts` with `<baseUrlEnvKey>` each, first as primary?" **Recommended:
   mirror the flow map exactly** — the map is what the QA confirmed; adding or dropping a host
   here desyncs the registry from `.env`.
3. *Auth probe* — "Run `npm run verify:setup` now to prove login + connectivity before we
   build?" **Recommended: yes** — every automation project that stalls, stalls here; a green
   probe is the real start.

**Inputs.** `flow-map.json` (`hosts`, `authKind`, `module`) and `.env`.

**Act.** Copy `template/`; register each `hosts` entry in `config/services.ts` (first =
`primary: true`) with its `baseUrlEnvKey`; set `AUTH_STRATEGY` from `authKind`; copy
`modules/example/fixtures.ts` to `modules/<module>/fixtures.ts` and create the
`api/{contracts,endpoints,workflows}` + `ui/{smoke,regression,e2e}` folders. **Do NOT
overwrite an existing `.env` or `flow-map.json`** — fill/append missing keys only.

**Produced artifact.** A compiling, lintable skeleton with a working auth probe:
`config/` · `common/` (one client with token / re-login / stopped-host handling, base
fixture, matchers, helpers) · `modules/<module>/` · `playwright.config.ts`.

**Verification.** `npm run typecheck` clean, `npm run lint` clean, `npm run verify:setup`
mints a token and probes `VERIFY_PATH` green on every registered service.

---

## Phase 2 — Module (API)

**What it does.** Author API test cases at three levels for the confirmed module and turn
each into a runnable script; turn failures into bug drafts.

**Question(s) asked:**

1. *Coverage depth* — "Author all three levels — **contract, endpoint (happy + full negative
   matrix), and workflow** — for `<module>`?" **Recommended: all three** — contract proves
   shape, endpoints prove each operation and its error matrix, workflows prove the flows the
   QA confirmed; dropping a level leaves a blind spot the rubric scores.
2. *Scope* — "Cover every in-scope endpoint in the flow map, excluding the out-of-scope set
   from phase 0?" **Recommended: yes** — the map already encodes what the QA chose to leave
   out.
3. *On a red test* — "A script failed — draft a bug for it now?" **Recommended: yes, draft
   now** (via `failure-to-bug`) — the failure context is freshest at the moment
   it goes red; filing is deferred to phase 4.

**Inputs.** `flow-map.json` (`endpoints`, `flows`, `module`, `authKind`). The endpoints and
flows are the seed handed to `author-api-cases`.

**Act.** Invoke **`author-api-cases`** with the flow-map endpoints/flows to author
the cases; generate Playwright + TypeScript + zod scripts per **`docs/script-generation.md`**
(route constants → builder → service → schema → specs, one level per folder); on any red
run, invoke **`failure-to-bug`** to triage and draft.

**Produced artifact.** A green API suite for the module — contract, endpoint, and workflow
specs, each tagged `@<module>` + its level tag — plus any failure-to-bug drafts.

**Verification.** `npm run test:api` green; `npm run typecheck` / `npm run lint` clean; each
test passes twice and, broken on purpose once, fails for the right reason; every test creates
and cleans up its own data.

---

## Phase 3 — Module (UI)

**What it does.** Bring the UI tier to parity with the API tier: page objects plus smoke,
regression, and e2e specs for the same module and flows.

**Question(s) asked:**

1. *Cover the UI?* — "`WEB_APP_URL` is `<set / blank>`. Build the UI suite for `<module>`
   now?" **Recommended: yes if `WEB_APP_URL` is set** — full UI parity is a goal of the kit;
   **if blank, skip and say so** (API-only is valid).
2. *Levels* — "Author **smoke (screen loads + core action), regression (per-feature
   behaviour), and e2e (cross-module journey)**?" **Recommended: all three** — this is the UI
   mirror of the API's contract/endpoint/workflow; regression is the bulk.

**Inputs.** `flow-map.json` (`flows`, `module`) and `.env` (`WEB_APP_URL`,
`WEB_APP_LOGIN_URL`, `WEB_APP_POST_LOGIN_HEADING`).

**Act.** Invoke **`author-ui-cases`** with the same flows to author click-by-click
UI cases; generate page objects and Playwright UI specs per the UI section of
**`docs/script-generation.md`** (added by Task 4). Browser auth is reused via the template's
`auth-setup` project / stored state.

**Produced artifact.** A UI suite at parity with the API levels — page objects under
`modules/<module>/ui/pages/` and specs under `ui/tests/{smoke,regression,e2e}/`, each tagged
`@<module>` + its level tag.

**Verification.** `npm run test:ui` green; typecheck / lint clean; smoke proves the screen
loads and its core action works before regression/e2e are trusted.

> Script-generation detail for both this phase and phase 2 lives in
> **`docs/script-generation.md`** (Task 4).

---

## Phase 4 — ADO integration

**What it does.** Make the suite traceable: create Test Case work items from the phase 2-3
structure, link each generated script to its Test Case, and file the bug drafts.

**Question(s) asked:**

1. *Tracker auth* — "Is the ADO MCP authenticated (org set, interactive sign-in done)?"
   **Recommended: authenticate now** — linking needs it; **if it cannot be authed, degrade to
   drafting the Test Cases and bugs locally** and say so, so the build still completes.
2. *Granularity* — "Create **one Test Case per authored case**, linked to the source
   story/suite?" **Recommended: one per case** — it keeps each script ↔ Test Case link
   one-to-one and the coverage legible.
3. *File bugs* — "File the phase-2 bug drafts as work items now?" **Recommended: file the
   confirmed ones** — a drafted-but-unfiled defect is invisible to the board.

**Inputs.** The authored case structure and generated scripts from phases 2-3, plus the
phase-2 failure-to-bug drafts.

**Act.** Publish the **approved** cases through the gated **`ado-publish`** (pick Test Plan + Suite →
dry-run → explicit confirm → create + add-to-suite + link the case to its story), then link each generated
script to its Test Case by the `adoCaseId` ado-publish stamped onto the `cases` slice plus its
`traces-case:` line, following the convention in **`docs/ado-integration.md`**. File each confirmed
`real_bug` through **`failure-to-bug`**'s own gated bug file — **not** `file-to-tracker`, which is only the
author→publish router and files nothing itself.

**Produced artifact.** ADO Test Cases created from the structure, each script linked to its
Test Case, and bugs/defects filed (or drafted locally if the MCP is unavailable) — scripts
traceable to ADO work items.

**Verification.** Each generated script resolves to a Test Case work item (link present);
filed bugs reference their failing script; nothing product-specific was written into a
committed file (the ADO org comes from an env var, not source).

> Linking convention and tracker specifics live in **`docs/ado-integration.md`** (Task 5).

---

## Phase 5 — CI + tools + docs

**What it does.** Make the suite run on a schedule and be operable: a pipeline, local tools,
and a README/runbook.

**Question(s) asked:**

1. *CI platform* — "Wire up **Azure DevOps Pipelines** or **GitHub Actions**?" **Recommended:
   match the repo's host** — use `template/pipelines/azure-pipelines.automation.yml` for Azure
   DevOps, `github-actions.automation.yml` for GitHub; register it as a **new** pipeline so
   the suite can fail without blocking a deploy.
2. *Trigger* — "Start **manual / scheduled** (weekday mornings), add path triggers once
   trusted?" **Recommended: scheduled + manual first** — a new suite earns its path triggers
   after it is proven stable.
3. *Secrets* — "Secrets from a **variable group / repo secrets**, never inline?" **Recommended:
   yes** — inline secrets fail the secret-scan gate and leak into history.

**Inputs.** The whole workspace, and the chosen CI host.

**Act.** Copy and fill the right `template/pipelines/*` file, wire local tools
(`run-impacted`, notifier, report summarizer), and write the README/runbook, following
**`docs/ci-and-tools.md`** (Task 6).

**Produced artifact.** A scheduled pipeline (secrets from a variable group), local tooling,
and documentation (README + `docs/RUNBOOK.md`).

**Verification.** The pipeline YAML validates; the scheduled trigger is set; secrets are
referenced from a variable group / repo secrets, never inlined; the secret scan returns 0.

> Pipeline and tooling detail live in **`docs/ci-and-tools.md`** (Task 6).

---

## Degrade gracefully

If a dependency is unavailable at its phase — the ADO MCP is not authed (phase 4), or
`WEB_APP_URL` is blank (phase 3) — the phase degrades to its draft-only / skip path, says so
in its report, and the build continues. The spine (phases 0-2) always runs; UI, ADO, and CI
follow and degrade without breaking what already landed.
