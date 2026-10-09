# Verification — end-to-end dry runs + agnosticism

Evidence that the `qa-engineering` works end to end and ships product-agnostic (spec §9).
Two dry runs were driven from empty temp workspaces **outside** this repo; nothing from those
workspaces is committed. This file records **results only** — no URLs, credentials, tenant/client
ids, account names, or product data. The runbook for reproducing it is the kit itself (`docs/phases.md`).

| Run | Target | Module | Auth | Phases driven |
|---|---|---|---|---|
| 1 | A real QA backend, via a QA-supplied git-ignored `.env` | Customer | password | 0–5 |
| 2 | A public sample API (no org affiliation) | posts | none | 0–2 |

Both workspaces were scaffolded from `template/` only, installed with `npm ci`, and configured
with their own `.env` + `flow-map.json`. The kit itself was never modified to make a run pass.

---

## Run 1 — real QA backend, Customer module (phases 0–5)

| Phase | What ran | Result |
|---|---|---|
| 0 Scan & confirm | Authored `flow-map.json` for the Customer module from the live API — exactly the five fields (`module`, `hosts`, `authKind`, `endpoints`, `flows`) and nothing else (out-of-scope endpoints are recorded in the human-readable confirmation log, not the map); `authKind: password`; `baseUrlEnvKey` resolves to a key that exists in `.env`; no secret/URL value in the map. | **Ran — pass** |
| 1 Foundation | `template/` scaffolded; the confirmed host registered `primary` in `config/services.ts` (base URL from `.env`, not source); `npm ci` (127 packages); `npm run typecheck` clean; `npm run lint` clean; `npm run verify:setup` minted a token and the authenticated probe returned **200**. | **Ran — pass** |
| 2 Module — API | Authored a **contract** spec (3 cases: unauth 401 guard, list-shape vs Zod contract, a pure schema-rejection unit test) and an **endpoint** spec (3 cases: create-then-read-back, list returns 200+empty on a no-match search, unknown-id negative). Ran against QA: **8 tests** incl. `auth-check` + `sweep` → **all green**, on **two consecutive runs** (stable). One real defect surfaced and was encoded with `knownBug` (see Findings). | **Ran — pass (1 real bug surfaced)** |
| 3 Module — UI | Authored a page object + one UI **smoke** spec. `typecheck` + `lint` clean; Playwright `--list` collected the `ui-smoke` project (the spec compiles and is discoverable). Not executed — a headless browser login was out of scope for this run. | **Verified statically (compiles + collected)** |
| 4 ADO integration | The ADO MCP was **not** interactively authenticated in this headless run, so the documented **degrade path** ran (`docs/ado-integration.md` §5): **6 Test Case drafts** + **1 bug draft** written under `docs/tracker-drafts/`; every `traces-case:` header left **unlinked** (no fabricated ids); the link-grammar check printed no violations; no secret in any draft. | **Ran — degrade path (as designed)** |
| 5 CI + tools + docs | Both shipped pipelines (`azure-pipelines.automation.yml`, `github-actions.automation.yml`) parse with a YAML parser; each carries a **schedule** (`schedules:` / `on.schedule`); credentials appear only as `$(NAME)` / `${{ secrets.NAME }}` references (no inline secrets). Impact map + runbook ship in `template/`. | **Verified (YAML validates; no inline secrets)** |

### Findings (Run 1)

- **Real defect surfaced by the kit** — `GET v2/customers/{id}` with an unknown id returns **500**
  (an unhandled "value cannot be null" server error) where **404** is correct. Reproducible against
  QA. The endpoint spec asserts the correct 404 and carries a `knownBug` marker on the line directly
  above that assertion, so the suite stays green while the defect is open and turns red the day it is
  fixed. A matching bug draft was written on the degrade path (`failure-to-bug` JSON shape).
- **Softer observation (not filed)** — `GET customer/detailsv2/{id}` with an unknown id returns 200
  with an all-null body rather than a 404. Noted for triage; not drafted as a defect.
- **Data hygiene** — the Customer API has no DELETE endpoint, so create tests leave `AUTOMATION_`-named
  records (teardown is a no-op; the name keeps them greppable for the SQL cleanup). Expected, not a
  kit defect.

---

## Run 2 — public sample API, posts module (phases 0–2, agnosticism)

| Phase | What ran | Result |
|---|---|---|
| 0 Scan & confirm | `flow-map.json` authored for a `posts` module; `authKind: none`. | **Ran — pass** |
| 1 Foundation | Scaffolded from the same `template/`; `.env` with `AUTH_STRATEGY=none`; `typecheck` + `lint` clean; `verify:setup` green (no token required; probe **200**). | **Ran — pass** |
| 2 Module — API | Authored a **contract** spec (list contract, detail contract, schema-rejection unit test) and an **endpoint** spec (get-by-id happy, unknown-id → **404**, create → **201**). Ran: **8 tests** incl. `auth-check` + `sweep` → **all green**. | **Ran — pass** |

**Agnosticism conclusion.** The identical `template/` — same client, fixtures, custom matchers, and
the `docs/script-generation.md` emit order — produced a green suite against a completely unrelated
public API by changing only the `.env`, the `flow-map.json`, and the module files. No assumption from
Run 1's product leaked into the kit. The two runs differ only in QA-supplied configuration.

---

## Secret scan (whole plugin)

Run over the committed `plugins/qa-engineering/`:

(Pattern tokens are described in prose below, deliberately, so this file does not trip its own
scan — the same convention `docs/script-generation.md` §12 uses.)

| Scan | Result |
|---|---|
| Credential / host / id indicators — signature query parameters, managed-platform host patterns, the dev-platform hostname, a password-shaped credential assignment, and a known tenant-id literal | **0** |
| `template/` (the scaffolded artifact a QA receives) against the full pattern | **0** |
| Broad pattern that additionally flags the bare product/role words | matches only in docs/skills/agent, **all documentation prose** |

Those broad-pattern hits are not leaks: they are the kit's own product-agnostic **rules** ("no
product, client, org, URL, token, or account name …"), the decision-D11 statements that the
product-specific sibling plugins are **inspiration only, never a dependency**, and this file's own
explanation of the agnosticism result. Stating those requires naming them. No credential, host,
URL, tenant id, or product datum appears in the kit or its template. The binding pre-commit gate
(the credential/host subset above) is **0**.

---

## Reuse check (spec §9)

Each phase delegates rather than reimplementing: phase 0 → `scan-and-confirm`; phase 2 authoring +
emit follow `author-api-cases` and `docs/script-generation.md`, failures → the
`failure-to-bug` draft shape; phase 4 → `file-to-tracker` drafts on the degrade path; phase 5
→ the `template/pipelines/` files. No reused skill body was copied into a generated artifact.

## Per-phase generation self-check (generation-time gate)

Generation does not rely on the dry runs alone. After `kit-builder` generates a phase's specs
(phases 2-3), and **before** that phase's objective verify, it runs a **self-check of the generated
code against the Standards** (`knowledge/standards/`) — the builder checking its own output while it
still holds the context. This is the **generation-time gate**; it is documented as a checklist in
`skills/kit-builder/SKILL.md` and covers:

- one exact status per assertion, no OR-lists (`matchers.md`);
- a real `.passthrough()` schema actually asserted via `toMatchContract`, never all-`.optional()`
  (`schemas.md`);
- no failure-hiding skips — `test.skip` for an environment condition only, a defect carries
  `knownBug` instead, placed on the line immediately before its assertion;
- each test owns and cleans its own data, or correctly uses the read-only worker seed
  (`cleanup-and-sweepers.md`, `isolation-and-parallelism.md`);
- cross-module setup **reuses** the owning module's service/POM through the merged fixtures and does
  not duplicate it (`cross-module-reuse.md`);
- page objects locate by role/label and hold no `expect()` (`page-objects.md`).

**This is generation-time only.** The *independent* blocking gate — a reviewer agent and a
reuse-guardian that **halt progression** when generated code violates a standard — ships in **SP4** and is
described in the two-tier model below. The self-check here strengthens generation but does not replace that
independent reviewer.

## Two-tier verification model (SP4)

Generated framework code passes through **two** gates, by **two different actors**, before a build phase
advances:

| Tier | Gate | Actor | When | Blocking? |
|---|---|---|---|---|
| 1 | **Generation self-check** | the **builder** (`kit-builder`), grading its own output | right after it generates a phase's specs, while it still holds the context | strengthens generation; not an independent block |
| 2 | **Independent review gate** | the **`framework-reviewer`** agent + the **`reuse-guardian`** agent | after the self-check passes, before the phase's objective verify | **yes — a Blocking finding stops the phase** |

Why two tiers: the self-check is the same actor that wrote the code, so it catches what it was already
looking for; the independent gate is a *second* actor with no stake in the generation, checking against the
same canon (`knowledge/review/review-rubric.md` + `knowledge/standards/`) and running the grep-/build-gates.
It catches what the self-check missed.

- The review gate is **review-only**: `framework-reviewer` and `reuse-guardian` report findings
  (file:line · violated standard · why · fix **direction**) and **block**; they never edit. The **builder**
  applies the fix on its next pass, then the gate re-runs until it returns **PASS**.
- The reviewer **delegates the reuse/duplication dimension** to `reuse-guardian` and merges its Blocking
  findings; both agents also run **standalone** on a "review my framework" request (routed by
  `qa-orchestrator`).
- Nothing is committed while a Blocking finding is open. The two tiers are distinct — neither replaces the
  other.

So the per-phase order is: **generate → self-check → review gate (blocking) → objective verify → report.**

## Honest limitations of this run

- Phase 3 UI and phase 5 CI were **verified statically** (compile/collect; YAML parse + schedule +
  no-inline-secrets), not executed live — a browser login and a real pipeline run were out of scope
  for a headless verification. Both are structurally ready.
- Phase 4 ran its **degrade path** because the ADO MCP was not interactively signed in here; the
  authenticated path (create + link work items) was not exercised in this run.
- The DoD "break-on-purpose" check is demonstrated for the one negative case via its `knownBug`
  marker (it is red against the real 500); it was not repeated per test.
