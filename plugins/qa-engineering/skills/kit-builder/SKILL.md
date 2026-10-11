---
name: kit-builder
description: The orchestrator for the qa-engineering — build an API + UI test-automation framework brick by brick, running phases 0-5 as a state machine and pausing at every phase to say what it will do, recommend an option with its reason, act, verify, and report before moving on. Use whenever the user asks to "build a test framework brick by brick", "scaffold an automation framework step by step", "set up test automation one phase at a time", "run the test-automation kit", "continue the framework build", or is at any phase (foundation, module API suite, UI suite, ADO integration, CI) after phase 0's scan-and-confirm. It reads the confirmed flow map from `flow-map.json`, scaffolds the kit's product-agnostic `template/`, and delegates each capability to the kit's own native skills and guidance docs — it never reinvents what those already do.
---

# kit-builder — the phase state machine

`kit-builder` is the only new brain in the `qa-engineering`. It does not author test
cases, draft bugs, or file work items itself — it **sequences** the phases, and at each
phase it invokes the right dependency and passes the previous phase's structured output
forward (producer → consumer), the way the design-intelligence steward sequences its
skills. The kit builds the framework **brick by brick**: one phase, one confirmation, one
verified artifact, then the next.

> Product-agnostic by rule. Nothing in this skill, in anything it scaffolds, or in anything
> it commits names a product, client, org, URL, token, or account. "Customer" appears only
> as the workshop's default module. The QA's own environment lives in their git-ignored
> `.env`, never here.

See **`${CLAUDE_PLUGIN_ROOT}/docs/phases.md`** for every phase in full (exact questions, recommended option +
reason, inputs, produced artifact, verification) and **`${CLAUDE_PLUGIN_ROOT}/docs/reuse.md`** for the reuse map
(which generic skill backs each capability and how it is invoked).

## The loop every phase runs

A phase never silently assumes. Each one runs the same five beats:

1. **State** — say what this phase will do and what it needs, in one or two lines.
2. **Ask + recommend** — ask the phase's question(s), each carrying a **recommended option
   and the reason** for it (never a bare "what do you want?"). One decision at a time; wait
   for the answer. If the QA says "you decide", take the recommendation, *say that you did*,
   and record it as QA-delegated — do not convert a non-answer into a silent assumption.
3. **Act** — do the work on the confirmed answer: scaffold, or invoke the mapped dependency
   with the phase's structured input.
4. **Verify** — run the phase's objective check (typecheck, lint, a probe, a green run, a
   validated YAML). Report the real result, red or green.
5. **Report** — name the artifact produced and the verification result, then move to the
   next phase. If a phase's dependency is unavailable (e.g. the ADO MCP is not authed),
   **degrade gracefully** to the draft-only path and say so, rather than failing the build.

## Inputs this skill consumes

- **`system-map.json`** at the framework root — the **system-level** output of phase 0, read
  **before** the flow map. It carries the product's variant axis and module inventory, and it
  drives the architecture (the profile set) before any module is built:

  | Field | Type | How kit-builder uses it |
  |---|---|---|
  | `variantAxis` | `{ name, source, surface, values[] }` \| `null` | the **profile set**: one profile per in-scope variant value (`inScope && hasTestAccount`), each with `variant`/`variantName` + `<VARIANT>_AUTH_*` creds; `null` → a single `default` profile. See `knowledge/standards/variants-and-user-types.md` |
  | `modules` | `[{ name, variantSensitive, evidence[] }]` | which modules get **variant-specific** tests (`onlyFor`/`skipFor`, citing the branch) vs shared-only |
  | `hosts`, `authKind` | as in the flow map | the system-wide hosts + auth kind (the flow map repeats the module's subset) |

  If `system-map.json` is missing, phase 0's system analysis did not run — invoke
  `scan-and-confirm` first (it writes the system map before the flow map).

- **`flow-map.json`** at the framework root — the confirmed output of phase 0
  (`scan-and-confirm`). Read it from the file, not from a chat block: a map that lives only
  in chat is lost across a subagent handoff or a context compaction. Its fields are exact
  and fixed (do not rename or add):

  | Field | Type | How kit-builder uses it |
  |---|---|---|
  | `module` | string (kebab-case) | `modules/<module>/` and the `@<module>` test tag |
  | `hosts` | `[{ name, baseUrlEnvKey }]` | entries in `config/services.ts` + the matching URL keys in `.env`; the **first** entry is the primary host |
  | `authKind` | `password` \| `client-credentials` \| `static` \| `none` | mirrors `AUTH_STRATEGY`; tells phase 1's probe which auth keys it needs |
  | `endpoints` | `[{ method, path, purpose }]` | route constants and the module's service layer; the seed for the API test cases |
  | `flows` | `[{ name, steps }]` | the workflow tests and the seed for the API/UI test cases |

- **Multi-host convention:** when `hosts` has more than one entry, each endpoint's `purpose`
  is prefixed `[<host name>]`. Parse that prefix to route the endpoint to the right host.
  Single-host maps have no prefix.
- **`.env`** at the same root — URLs, auth details, credentials. Auth *details* (login path,
  field names, token location) live here, not in the flow map; `authKind` is the only auth
  value the map carries.
- **The module's Knowledge Base, when `deep`** (`knowledge-base/modules/<slug>.md` +
  `atlas/<slug>.md`, `catalog.modules[].kb` — `knowledge/standards/knowledge-base.md`). Phase 0
  (`scan-and-confirm`) scaffolds a KB stub per module; when a module's KB has been deepened, phases 2-3
  read its **Flows + RULES** to ground what to cover and use the atlas **FE/BE globs + link table** to scope
  which product files back each feature (reuse targeting). The KB is optional grounding, not a required input.

If `flow-map.json` is missing, phase 0 has not run — invoke `scan-and-confirm` first.

## The phases (0-5)

| # | Phase | Input | Produces | Delegates to |
|---|---|---|---|---|
| 0 | **Scan & confirm** | repo / live API | `system-map.json` (variant axis + module map) + `flow-map.json` + populated `.env` + target module | kit's **`scan-and-confirm`** skill |
| 1 | **Foundation** | `system-map.json`, `flow-map.json`, `.env` | compiling, lintable skeleton with the **per-variant profile set** + a green auth probe | kit's `template/` + this skill (fill from the maps) |
| 2 | **Module — API** | `flow-map.json` | a green API suite (contract / endpoint / workflow) for the module | cases: **`author-api-cases`** · scripts: **`${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md`** · failures: **`failure-to-bug`** |
| 3 | **Module — UI** | `flow-map.json`, `.env` (`WEB_APP_URL`) | a UI suite at parity (smoke / regression / e2e) | cases: **`author-ui-cases`** · scripts: **`${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md`** |
| 4 | **ADO integration** | the phase 2-3 approved cases + scripts | ADO Test Cases (gated), each script linked to its case; bugs filed | **`ado-publish`** (gated create/add-to-suite/link) + **`failure-to-bug`** + **`${CLAUDE_PLUGIN_ROOT}/docs/ado-integration.md`** |
| 5 | **CI + tools + docs** | the whole workspace | a scheduled pipeline + runbook/README | kit's `template/pipelines/` + **`${CLAUDE_PLUGIN_ROOT}/docs/ci-and-tools.md`** |

> **Generate to the Standards.** Phases 1-3 generate **to the Standards** in
> `${CLAUDE_PLUGIN_ROOT}/knowledge/standards/` — the single source of truth the tutor teaches and the
> SP4 reviewer will check. Take the opinionated stack and settled defaults from
> `defaults-and-deviation.md` (do not re-ask them; deviate only via its four-step protocol), and
> route any mid-build "when to choose what" — which test level, POM vs raw selectors, builder vs
> inline data, how to reuse another module — through the **`framework-standards`** skill (Skill tool)
> rather than deciding ad hoc. `${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md` is those standards
> turned into emit code (its §0 maps each emitted block to its standard).

### Phase 0 — Scan & confirm
Hand control to the **`scan-and-confirm`** skill (its own ask/recommend loop). It reads the
repo or live API, proposes the module's flows, asks the QA to confirm or correct each,
collects connection details into `.env`, and writes `flow-map.json`. kit-builder resumes at
phase 1 once that file exists. Produces: a confirmed flow map + module scope + populated
`.env`.

### Phase 1 — Foundation
Scaffold the product-agnostic `template/` into the framework root, then **fill it from the
system map and the flow map**: register each `hosts` entry in `config/services.ts` (first =
primary) with its `baseUrlEnvKey`; create `modules/<module>/` from `modules/example/`; set
`AUTH_STRATEGY` from `authKind`.

**Scaffold the profile set from `system-map.variantAxis` — this is the architecture step.**
When the axis is present, register **one profile per in-scope variant** in
`config/profiles.index.ts` (each carrying `variant`/`variantName` from the axis value and
reading `<VARIANT>_AUTH_*` with the global `AUTH_*` as fallback), plus a `default` profile;
add the matching `<VARIANT>_AUTH_*` (and any `<VARIANT>_WEB_APP_LOGIN_URL`) keys to
`.env`/`.env.example`, leaving secrets blank. When the axis is `null`, register the single
`default` profile. This is why phase 0 analyses the system first: the profile set is decided
here, once, before any module — not retrofitted per module. See
`knowledge/standards/variants-and-user-types.md` and `config-and-profiles.md`.

**Do not overwrite an existing `.env`, `flow-map.json` or `system-map.json`** —
`scan-and-confirm` may have created them; fill/append missing keys only. Verify: `npm run
typecheck` and `npm run lint` clean, and `npm run verify:setup` mints a token and probes
`VERIFY_PATH` green (for **each** in-scope variant profile when there is an axis). **Then update
state:** set `catalog.frameworkScaffold = "built"` in `qa-context.json` (the shared foundation now
exists — this is what makes the build "structure once, then expand"); if `scan-and-confirm` did not
seed `catalog`, seed it now from `system-map.modules`. Produces: a compiling, lintable skeleton with a
working per-variant auth probe. Delegates to: no external skill — the template + this skill.

### Phase 2 — Module (API)
For each `flow` and `endpoint` in the map, invoke **`author-api-cases`** to author
the three levels (contract / endpoint / workflow), passing the flow-map endpoints and flows
as its input. Turn each authored case into a runnable Playwright + TypeScript + zod script
following **`${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md`** (the kit's own product-neutral script-generation
guidance).

**Generate variant-aware tests when the module is variant-sensitive.** If
`system-map.modules[<module>].variantSensitive` is true, the shared behaviour is tested once
(the same body runs under every variant profile), and each behaviour the product branches on
the axis gets a variant-specific test guarded by `onlyFor`/`skipFor(profile, [variant],
reason)` — the reason citing the `file:line` branch it covers (`variants-and-user-types.md`).
Never invent a per-variant test with no cited branch, and never branch test logic on the
variant for a pure config difference.

When a script fails, invoke **`failure-to-bug`** to triage and
draft a bug (draft only — filing is phase 4). Before moving on, run the **per-phase generation
self-check** (below) over the emitted specs. Verify: `npm run test:api` and `npm run
typecheck`/`lint` clean; a green run that also fails for the right reason when broken on
purpose. **Then update state:** write the `automation` slice (`specs[]` = each emitted spec
`{ path, level, tracesCase }`), **run the reconcile step** (`knowledge/orchestration/qa-context.md` —
"Keeping the thread consistent": a spec the matrix emits beyond the authored set, e.g. a `knownBug`
expected-fail, is backfilled as a `source: "generated"` case so it never orphans a later bug; uncovered cases
are reported, never deleted), and set this module's `catalog.modules[].status = "built"` (it was
`in-progress`). That keeps the status board + `/build` truthful about what's done without a disk re-scan.
Produces: a green API suite for the module.

### Phase 3 — Module (UI)
If `.env` has `WEB_APP_URL`, invoke **`author-ui-cases`** to author UI cases at the
three levels (smoke / regression / e2e), seeded by the same flows, then generate page
objects and Playwright UI specs following **`${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md`**. Run the
**per-phase generation self-check** (below) over the emitted page objects + specs first. Verify:
`npm run test:ui` green. **Then update state:** extend the `automation` slice `specs[]` with the UI specs
(so the coverage matrix sees the UI levels). Produces: a UI suite at parity with the API levels. (Blank
`WEB_APP_URL` means API-only — say so and skip.)

### Phase 4 — ADO integration
Publish the phase 2-3 **approved** cases to ADO through the **gated `ado-publish`** skill (approved cases →
Test Plan/Suite: it creates each Test Case, adds it to the suite via `testplan_add_test_cases_to_suite`, and
links it to the story — **nothing is written before the QA confirms the dry-run**, and the suite-add is
**not** manual). Each generated script already carries its `traces-case:` line, so link script ↔ case by the
**`adoCaseId`** that `ado-publish` stamps onto the `cases` slice — **not** by the retired `file-to-tracker`
create path (`file-to-tracker` is now only the author→publish router). File bugs via the phase-2
**`failure-to-bug`** draft. See **`${CLAUDE_PLUGIN_ROOT}/docs/ado-integration.md`** for the linking
convention (being reconciled to this gated path in SP11). If the ADO MCP is not authenticated, degrade to
drafts and say so. Produces: scripts traceable to ADO work items.

### Phase 5 — CI + tools + docs
Wire up the kit's `template/pipelines/` (Azure DevOps or GitHub Actions) and local tools,
and write the README/runbook, following **`${CLAUDE_PLUGIN_ROOT}/docs/ci-and-tools.md`**. Verify: the pipeline
YAML validates and the scheduled trigger is set; secrets come from a variable group, never
inline. Produces: a scheduled run + documentation.

## Per-phase generation self-check

After generating a phase's specs (phases 2-3) and **before** that phase's objective verify — while
the generated code is still in hand — run this self-check against the Standards. It is a
**generation-time** gate the builder runs on its own output; the **independent blocking reviewer and
reuse-guardian arrive in SP4**. Each item names the standard it enforces:

- [ ] **One exact status per assertion** — `toHaveStatus(n)` / `toMatchContract`, never an OR-list
      such as `expect([400, 403]).toContain(res.status())` (`knowledge/standards/matchers.md`).
- [ ] **Real schema, really asserted** — `toMatchContract` against a `.passthrough()` schema built
      from a real body, never an all-`.optional()` schema that parses `{}`; **every exported schema is
      asserted at least once** (an exported-but-unused schema rots) (`knowledge/standards/schemas.md`).
- [ ] **Nullable from the contract** — a field the contract marks `nullable` is `.nullable()` (even if
      the sample body showed no null), and no spec asserts `typeof`/exact-type on a nullable field
      (`knowledge/standards/schemas.md`, `docs/script-generation.md` rule 3).
- [ ] **No bypassed service layer; reads throw** — a service method is emitted only if a spec uses it
      (pure contract GETs assert the raw response, no wrapper); a read **throws** on a non-2xx (a 200 with
      `[]` is the only empty), never `return []` + warn; a required-body write sends a builder body
      (`knowledge/standards/services.md`, `docs/script-generation.md` rules 9-11).
- [ ] **No failure-hiding skips** — a `test.skip` guards an environment condition (blank URL, null
      seed) only; a known defect carries `knownBug`, never a skip.
- [ ] **`knownBug` placement** — on the line **immediately before** the assertion it explains, never
      the first line of the test (so it cannot swallow a setup/auth/host failure).
- [ ] **Each test owns and cleans its data** — mutating tests create their own data and tear it down
      (`finally` / `CleanupRegistry`); read-only tests use the worker seed
      (`knowledge/standards/cleanup-and-sweepers.md`, `knowledge/standards/isolation-and-parallelism.md`).
- [ ] **No de-facto-singleton race** — a resource that is a per-tenant singleton, an **ensure/upsert**
      "create", or **1:1 with a single shared prerequisite** is NOT given a per-test create/`finally` void
      scattered across parallel files (it would flake in parallel). It either creates its prerequisite per
      test (real isolation) or is serialized in one file / locked, per `isolation-and-parallelism.md` +
      `docs/script-generation.md` (singletons note).
- [ ] **Cross-module setup reuses, not duplicates** — a prerequisite another module owns is built by
      that module's service/POM via the merged fixtures, never a local re-implementation
      (`knowledge/standards/cross-module-reuse.md`).
- [ ] **Page objects by role/label** — locators follow the role-first priority and the page object
      holds no `expect()` (`knowledge/standards/page-objects.md`).
- [ ] **Variant coverage is honest** — a variant-sensitive module tests shared behaviour once (same body,
      every profile) and guards each variant-specific test with `onlyFor`/`skipFor` citing the `file:line`
      branch; no invented per-variant test, no variant branch for a pure config difference
      (`knowledge/standards/variants-and-user-types.md`).

The full checklist and how it was exercised live in `${CLAUDE_PLUGIN_ROOT}/docs/verification.md`.

## Independent review gate (after the self-check)

The self-check above is the builder grading its **own** output (same actor, generation-time). After it
passes, and still within the phase, run the **independent** gate. **kit-builder (the orchestrator) is the
top-level actor, so IT spawns both review agents as SIBLING passes over the phase's changed/target files:**

- **`framework-reviewer`** — the broad gate: the shared rubric
  (`${CLAUDE_PLUGIN_ROOT}/knowledge/review/review-rubric.md`) + the Standards + the grep-/build-gates, for
  **every dimension except reuse/duplication**.
- **`reuse-guardian`** — the DRY / cross-module-reuse specialist, for the **reuse/duplication dimension**.

> **Why sibling, not nested (the fix for the gate's biggest hole):** a subagent **cannot spawn another
> subagent**, so `framework-reviewer` cannot invoke `reuse-guardian` itself — if it tried, the specialist
> pass silently never runs and reuse is graded by a generalist. The orchestrator therefore runs **both**
> (in parallel is fine), then **combines** their findings. `framework-reviewer`'s own reuse check is only a
> **labeled fallback** for when it is run standalone with no sibling `reuse-guardian` pass (see its agent
> definition) — in the kit-builder gate, the sibling specialist pass is the real one.

- **Blocking findings from EITHER agent stop the phase.** The phase does **not** advance (and nothing is
  committed) until the builder addresses each Blocking finding on its next pass and **both** agents return
  **PASS**. Important/Minor findings are listed and fixed where practical; the QA may accept a non-blocking
  one explicitly.
- Both agents are **review-only** — they report file:line · standard · why · fix direction; the **builder**
  applies the fix. Keep the tiers distinct: the self-check does not replace the independent gate, and the
  independent gate does not replace the self-check.

So the per-phase order is: generate → **self-check** (builder, same actor) → **review gate** (the
orchestrator runs `framework-reviewer` **and** `reuse-guardian` as sibling passes, independent, blocking —
both must PASS) → objective verify → **reconcile the thread** (write `automation`, backfill any orphan spec
as a `source: "generated"` case) → report.

## Delegation contract (D11)

- **The capability work runs on the kit's own native skills:** `author-api-cases`,
  `author-ui-cases`, `file-to-tracker`, `failure-to-bug` — self-contained, no external plugin.
  Invoke each with the **Skill tool**, passing the phase's structured output (flow-map
  fields, authored cases, drafted bug) forward as its input. kit-builder never copies a
  reused skill's body.
- **Script generation, ADO linking, and CI** have no generic skill, so the kit carries that
  guidance itself, written product-neutrally: `${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md` (phases 2-3),
  `${CLAUDE_PLUGIN_ROOT}/docs/ado-integration.md` (phase 4), `${CLAUDE_PLUGIN_ROOT}/docs/ci-and-tools.md` (phase 5).
- See `${CLAUDE_PLUGIN_ROOT}/docs/reuse.md` for the full capability → dependency map.

### Inspiration (not required)
The product-specific sibling plugins in the marketplace inspired
the script-generation and bug-filing patterns but are **never a dependency** of this kit. A
QA who has them installed may use them; the exercise does not require them, and the committed
kit must run without them.

## Guard rails

- **Never overwrite** an existing `.env` or `flow-map.json` — fill/append missing keys only.
- **Secret scan before every commit** the kit makes. Grep the staged diff for known secret
  and host signatures — shared-access `sig` query params, Power Platform / Azure API
  Management / Azure DevOps host names, and any non-empty `AUTH_PASSWORD` assignment — and
  refuse the commit on any hit (the count must be `0`).
- `.env`, `reports/`, `test-results/`, and `playwright/.auth/*` stay git-ignored (template
  `.gitignore` covers them). `flow-map.json` may be committed — it holds env key *names*,
  route templates and flow steps, never a value.
- Report verification honestly — a red typecheck or a failing probe is reported red, not
  smoothed over.

## Done when

- [ ] Each phase 0-5 ran its state → ask+recommend → act → verify → report loop, one at a time
- [ ] `system-map.json` was read first and its `variantAxis` drove the **profile set** in phase 1 (one profile per in-scope variant, or a single `default` when the axis is `null`) — the architecture was decided before any module
- [ ] A variant-sensitive module generated shared-once + variant-specific (`onlyFor`/`skipFor` citing the branch) tests; a variant-agnostic one generated shared-only
- [ ] Each generating phase ran the self-check, then the independent `framework-reviewer` gate returned PASS (no Blocking finding) before it advanced
- [ ] `flow-map.json` was read from the file (not a chat block) and its five fields drove phase 1-2
- [ ] Every capability was delegated (a native kit skill or the kit's own doc) — nothing reinvented
- [ ] No product-specific sibling plugin is a hard dependency
- [ ] The secret scan returned 0 before every commit; nothing product-specific was committed
