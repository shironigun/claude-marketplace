# Learning path — the ordered automation curriculum

> A ~35-topic progressive path from "what is automation" to "framework architecture at scale". This is a
> **thin index**, not a textbook: each topic points at the SP1 standard(s) that teach it and the official
> doc(s) that ground it. The teaching itself lives in the standards + the `teach-automation` skill's
> pedagogy — **nothing here restates a standard's body.**

## How to read a topic row
Each row carries five fields:
- **Goal** — the one thing the QA can do after this topic.
- **Prereqs** — earlier topics assumed; the tutor respects these before advancing.
- **Standard(s)** — the real file(s) under `knowledge/standards/` the tutor opens to teach it (via the
  `framework-standards` skill). This is where the explanation comes from.
- **Official docs** — the grounding URL(s). Every URL here is one the kit actually researched (see
  `docs/enhancement/research/official-docs-notes.md` Source URLs); none is invented.
- **Build it with the kit (SP3)** — the one thing the SP3 builder will generate for this topic, so a QA
  can go from "I understand it" to "the kit scaffolds it".

Depth (L1–L4) is **not** fixed per topic — the tutor picks a level (default L2) per
`knowledge/curriculum/depth-levels.md` and adjusts on request. The order below is the default progression;
a QA can "jump to <topic>" and the tutor will flag any missing prerequisites.

---

## Tracks — order the path by the learner's goal

The 35 topics below are the canonical content; a **track** is the order/subset `/learn` follows for a
given **goal**, so a learner doesn't sit through topics their goal doesn't need yet. `/learn` picks the
track from the stated goal (and records it in the `learning` slice); deferred topics aren't dropped — they
move to the end as a "pick up later" tail. Depth (L1–L4) is still chosen separately per
`depth-levels.md`.

| Goal says… | Track | Order (topic numbers) | Deferred tail |
|---|---|---|---|
| "API", "API testing", "services", "backend" | **api-first** | 1-7 · 12,13,14,15 · 16,17,18,19,20 · 21,22,23,24,25,26,28 · 29,30,31,32,33 · 34,35 | 8,9,10,11,27 (UI) |
| "UI", "browser", "end-to-end clicking", "web app" | **ui-first** | 1-7 · 12 · 8,9,10,11 · 16,17,18,19,20 · 23,24,25,26,27 · 29,30,31,32,33 · 34,35 | 13,14,15,21,22,28 (API-internals) |
| "both", "everything", unspecified, or "full course" | **full** | 1 … 35 (the default stage order below) | none |
| "the VS Code extension", "codegen", "Record", "Pick locator", "Trace Viewer", "debug in the editor" (via **`/learn-extension`**) | **extension** | E1 → E6 (the *Extension track* cluster below) | the 1-35 course (run `/learn` for that) |

Rules: **Foundations (1-7) are in every track** — never skipped. A track is an *ordering*, not a licence
to invent topics: every number comes from the canonical list below. If the goal is ambiguous, default to
**full** and say so (don't guess a narrow track). A learner can switch tracks or jump to any topic at any
time; `/learn` re-derives the order and keeps what's already `covered`.

## Stage 1 — Foundations
*What automation and a framework are, and the raw tools a test is written with.*

#### 1. What automation is
- **Goal:** Explain what test automation is and where machine *checking* fits beside human testing.
- **Prereqs:** none.
- **Standard(s):** `overview.md`
- **Official docs:** https://www.satisfice.com/blog/archives/856 · https://playwright.dev/docs/writing-tests
- **Build it with the kit (SP3):** Nothing to scaffold yet — frames what the generated suite is *for*.

#### 2. What a test-automation framework is
- **Goal:** Name the building blocks and trace how one test's data flows from config to cleanup.
- **Prereqs:** 1.
- **Standard(s):** `overview.md`
- **Official docs:** https://playwright.dev/docs/best-practices · https://playwright.dev/docs/writing-tests
- **Build it with the kit (SP3):** The builder lays down the layered folder skeleton (config → routes → client → services → fixtures → specs).

#### 3. Why frameworks (vs flat scripts)
- **Goal:** Say what the layered structure buys — isolation, one-place changes, honest reporting.
- **Prereqs:** 2.
- **Standard(s):** `overview.md` · `defaults-and-deviation.md`
- **Official docs:** https://playwright.dev/docs/best-practices · https://playwright.dev/docs/pom
- **Build it with the kit (SP3):** Generates the opinionated default stack so structure isn't re-litigated per test.

#### 4. Playwright fundamentals
- **Goal:** Understand what Playwright is, actionability auto-waiting, and the browser-context model.
- **Prereqs:** 2.
- **Standard(s):** `defaults-and-deviation.md`
- **Official docs:** https://playwright.dev/docs/writing-tests · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Initialises a Playwright Test project with a product-neutral config.

#### 5. TypeScript fundamentals for automation
- **Goal:** Know the TS a test author needs — types, async/await, and why missing awaits bite.
- **Prereqs:** 4.
- **Standard(s):** `defaults-and-deviation.md`
- **Official docs:** https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Emits typed helpers plus `tsconfig`/ESLint (`no-floating-promises`) so awaits can't go missing.

#### 6. Test runners
- **Goal:** Understand what Playwright Test (the runner) does — discovery, projects, parallel workers.
- **Prereqs:** 4.
- **Standard(s):** `defaults-and-deviation.md`
- **Official docs:** https://playwright.dev/docs/writing-tests · https://playwright.dev/docs/test-parallel
- **Build it with the kit (SP3):** Wires `playwright.config.ts` projects (one per level) that the runner discovers.

#### 7. Test structure
- **Goal:** Write a test that reads as intent — `describe`, hooks, the arrange/act/assert shape.
- **Prereqs:** 4, 6.
- **Standard(s):** `overview.md`
- **Official docs:** https://playwright.dev/docs/writing-tests
- **Build it with the kit (SP3):** Generates spec skeletons that read as intent, plumbing in the layers below.

---

## Stage 2 — UI automation
*Driving a real browser: finding elements, asserting, and the objects that keep UI tests maintainable.*

#### 8. Locators
- **Goal:** Find elements by what a user sees (role/label/text) instead of CSS/XPath.
- **Prereqs:** 7.
- **Standard(s):** `page-objects.md`
- **Official docs:** https://playwright.dev/docs/locators · https://playwright.dev/docs/other-locators
- **Build it with the kit (SP3):** Generates role/label locators (never brittle CSS/XPath) inside page objects.

#### 9. Assertions
- **Goal:** Use web-first, auto-retrying assertions and avoid manual non-waiting checks.
- **Prereqs:** 8.
- **Standard(s):** `matchers.md`
- **Official docs:** https://playwright.dev/docs/test-assertions
- **Build it with the kit (SP3):** Emits web-first `expect` assertions, not `expect(await …isVisible())` checks.

#### 10. Page Object Model
- **Goal:** Put each screen's locators and actions in one class; keep assertions out of it.
- **Prereqs:** 8, 9.
- **Standard(s):** `page-objects.md`
- **Official docs:** https://playwright.dev/docs/pom
- **Build it with the kit (SP3):** Scaffolds one page-object class per screen with a field per control and a method per action.

#### 11. Components
- **Goal:** Extract widgets that repeat across screens (nav, dialog, toast, table) into reusable objects.
- **Prereqs:** 10.
- **Standard(s):** `components.md`
- **Official docs:** https://playwright.dev/docs/pom · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Extracts repeated widgets into component objects composed into pages.

---

## Stage 3 — API automation
*Wiring tests that call services directly, and the layers that keep every request in one place.*

#### 12. Fixtures
- **Goal:** Hand a test its ready services/clients/seeds via `test.extend`; prefer fixtures over hooks.
- **Prereqs:** 7.
- **Standard(s):** `fixtures.md`
- **Official docs:** https://playwright.dev/docs/test-fixtures
- **Build it with the kit (SP3):** Generates the `test.extend` fixtures (test- and worker-scoped) a spec names in its arguments.

#### 13. API automation
- **Goal:** Call server APIs from a test with `APIRequestContext`; keep paths out of spec bodies.
- **Prereqs:** 5, 7.
- **Standard(s):** `api-client.md` · `routes.md`
- **Official docs:** https://playwright.dev/docs/api-testing
- **Build it with the kit (SP3):** Wires the `request`-based API layer and a route-constant table (with `fillRoute`) per module.

#### 14. API clients
- **Goal:** Route every request through one wrapper that attaches auth, re-mints on 401, flags a dead host.
- **Prereqs:** 13.
- **Standard(s):** `api-client.md`
- **Official docs:** https://playwright.dev/docs/api-testing
- **Build it with the kit (SP3):** Generates the one api-client wrapper per host — the single place cross-cutting request concerns live.

#### 15. Services
- **Goal:** Wrap client calls as domain verbs (`create`/`activate`/`archive`) that act, wait, never assert.
- **Prereqs:** 14.
- **Standard(s):** `services.md`
- **Official docs:** https://playwright.dev/docs/api-testing
- **Build it with the kit (SP3):** Scaffolds a domain-verb service per resource, returning a ref that carries its own undo.

---

## Stage 4 — Data & Auth
*Valid test data, who the test is, and which environment it runs against.*

#### 16. Builders
- **Goal:** Return a valid default payload and override exactly one field per negative test.
- **Prereqs:** 15.
- **Standard(s):** `builders.md`
- **Official docs:** https://playwright.dev/docs/test-parallel
- **Build it with the kit (SP3):** Emits a builder per entity: a valid default with a unique, sweepable name, overridable one field at a time.

#### 17. Test data
- **Goal:** Choose read-only worker seeds for reads and built-per-test data for mutations.
- **Prereqs:** 12, 16.
- **Standard(s):** `builders.md` · `worker-seeds.md`
- **Official docs:** https://playwright.dev/docs/test-parallel · https://playwright.dev/docs/test-fixtures
- **Build it with the kit (SP3):** Generates worker seeds (read-only, null-guarded) for reads and builders for mutating tests.

#### 18. Authentication
- **Goal:** Log in once — a minted token for API, saved `storageState` for UI — not once per test.
- **Prereqs:** 14.
- **Standard(s):** `auth-and-storage-state.md`
- **Official docs:** https://playwright.dev/docs/auth · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Wires the auth-setup project (saves `storageState`) and the token-minting path with 401 re-mint.

#### 19. Configuration
- **Goal:** Put every URL/credential/tenant in a profile selected by one env var; secrets in a gitignored `.env`.
- **Prereqs:** 13.
- **Standard(s):** `config-and-profiles.md`
- **Official docs:** https://playwright.dev/docs/api-testing · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Generates the profile factory + `.env.example` keyed by env var, validated loudly at startup.

#### 20. Environment management
- **Goal:** Switch env/tenant with one variable; keep auth state and secrets out of the repo and in CI by name.
- **Prereqs:** 18, 19.
- **Standard(s):** `config-and-profiles.md` · `auth-and-storage-state.md`
- **Official docs:** https://playwright.dev/docs/best-practices · https://playwright.dev/docs/auth
- **Build it with the kit (SP3):** Wires profile switching by one var and the gitignore for state/secrets.

---

## Stage 5 — Quality & Strategy
*Asserting precisely, keeping tests independent, and choosing the right level for each check.*

#### 21. Schemas
- **Goal:** Describe a response shape in zod from a real body; required by default, strict vs passthrough.
- **Prereqs:** 15.
- **Standard(s):** `schemas.md`
- **Official docs:** https://docs.pact.io/ · https://playwright.dev/docs/api-testing
- **Build it with the kit (SP3):** Generates a zod schema per response, modelled from a captured real body and asserted at least once.

#### 22. Matchers
- **Goal:** Assert one exact status (no OR-lists) and a 200-plus-contract in one step.
- **Prereqs:** 9, 21.
- **Standard(s):** `matchers.md`
- **Official docs:** https://playwright.dev/docs/test-assertions
- **Build it with the kit (SP3):** Registers `toHaveStatus`/`toMatchContract` via `expect.extend`.

#### 23. Test isolation
- **Goal:** Make every test own its data and session so it stands alone and runs in any order.
- **Prereqs:** 17.
- **Standard(s):** `isolation-and-parallelism.md`
- **Official docs:** https://playwright.dev/docs/best-practices · https://playwright.dev/docs/test-parallel
- **Build it with the kit (SP3):** Generates specs that own their data and derive unique names from test/worker identity.

#### 24. Cleanup
- **Goal:** Register an undo for everything created and reclaim orphans with a prefix sweeper.
- **Prereqs:** 23.
- **Standard(s):** `cleanup-and-sweepers.md`
- **Official docs:** https://playwright.dev/docs/best-practices · https://playwright.dev/docs/test-fixtures
- **Build it with the kit (SP3):** Wires the cleanup-registry fixture (reverse-order, failure-tolerant) + the run-level `AUTOMATION_` sweeper.

#### 25. Cross-module reuse
- **Goal:** Build a prerequisite by calling the owning module's method — never a duplicate creation path.
- **Prereqs:** 15, 24.
- **Standard(s):** `cross-module-reuse.md`
- **Official docs:** https://playwright.dev/docs/test-fixtures · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Composes modules with `mergeTests` so a flow reuses the owner's service/POM, not a copy.

#### 26. Test levels
- **Goal:** Push each check to the cheapest level that still catches the bug (the test pyramid).
- **Prereqs:** 10, 15.
- **Standard(s):** `test-levels.md`
- **Official docs:** https://martinfowler.com/articles/practical-test-pyramid.html · https://docs.pact.io/
- **Build it with the kit (SP3):** Lays out the six level folders, each a Playwright project with its own budget and tag.

#### 27. Smoke / regression / e2e (UI levels)
- **Goal:** Place a UI check at smoke, regression, or e2e by what it proves.
- **Prereqs:** 26.
- **Standard(s):** `test-levels.md` · `page-objects.md`
- **Official docs:** https://martinfowler.com/articles/practical-test-pyramid.html · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** Scaffolds UI smoke/regression/e2e specs tagged by level, preconditions built over the API.

#### 28. Contract / endpoint / workflow (API levels)
- **Goal:** Place an API check at contract, endpoint, or workflow; chain ≥5 steps for a workflow.
- **Prereqs:** 21, 22, 26.
- **Standard(s):** `test-levels.md` · `schemas.md`
- **Official docs:** https://docs.pact.io/getting_started/what_is_pact_good_for · https://playwright.dev/docs/api-testing
- **Build it with the kit (SP3):** Scaffolds contract/endpoint/workflow API specs tagged by level, with the negative matrix per endpoint.

---

## Stage 6 — Operations
*Running the suite at scale and seeing clearly when it breaks.*

#### 29. Parallel execution
- **Goal:** Run fully parallel by default; use locks for a shared resource; tune workers and sharding.
- **Prereqs:** 23.
- **Standard(s):** `isolation-and-parallelism.md`
- **Official docs:** https://playwright.dev/docs/test-parallel · https://playwright.dev/docs/test-sharding
- **Build it with the kit (SP3):** Sets `fullyParallel` plus the CI worker/sharding knobs.

#### 30. Flaky tests
- **Goal:** Find the real cause (shared state, non-waiting assertions) and mark a known defect honestly.
- **Prereqs:** 23, 29.
- **Standard(s):** `helpers.md` · `isolation-and-parallelism.md`
- **Official docs:** https://playwright.dev/docs/test-assertions · https://playwright.dev/docs/test-parallel
- **Build it with the kit (SP3):** Emits `knownBug` markers (assert the correct behaviour) and retries — never a flaky assertion.

#### 31. Debugging
- **Goal:** Debug a failure with the VS Code extension, the Inspector, and the Trace Viewer.
- **Prereqs:** 7.
- **Standard(s):** `vscode-playwright.md` · `tooling-and-commands.md`
- **Official docs:** https://playwright.dev/docs/debug · https://playwright.dev/docs/trace-viewer-intro · https://playwright.dev/docs/getting-started-vscode
- **Build it with the kit (SP3):** Generates the `test:*`/`--debug` scripts and the VS Code `.env` wiring.

#### 32. Reporting
- **Goal:** Configure Allure, attach metadata and the trace, and read a failure from the report.
- **Prereqs:** 31.
- **Standard(s):** `reporting-allure.md`
- **Official docs:** https://allurereport.org/docs/playwright/ · https://playwright.dev/docs/trace-viewer-intro
- **Build it with the kit (SP3):** Registers the Allure reporter + `trace: on-first-retry` and the `report:*` scripts.

#### 33. CI/CD
- **Goal:** Run a standalone pipeline that goes red on failure and publishes a readable result.
- **Prereqs:** 20, 29, 32.
- **Standard(s):** `ci.md`
- **Official docs:** https://playwright.dev/docs/ci · https://playwright.dev/docs/test-sharding
- **Build it with the kit (SP3):** Generates a standalone red-on-failure pipeline with every secret supplied by name.

---

## Stage 7 — Mastery
*Keeping a framework healthy and designing one that scales.*

#### 34. Framework maintenance
- **Goal:** Keep the suite runnable — lint, typecheck, run only impacted tests, keep Playwright current.
- **Prereqs:** 31, 33.
- **Standard(s):** `tooling-and-commands.md` · `defaults-and-deviation.md`
- **Official docs:** https://playwright.dev/docs/best-practices · https://playwright.dev/docs/codegen
- **Build it with the kit (SP3):** Generates `lint`/`typecheck`/`test:impacted` scripts and the deviation protocol to keep the stack consistent.

#### 35. Framework architecture & scalability
- **Goal:** See how the layers compose into one isolated, shardable suite — and when to deviate.
- **Prereqs:** 25, 29, 34.
- **Standard(s):** `overview.md` · `isolation-and-parallelism.md` · `defaults-and-deviation.md`
- **Official docs:** https://playwright.dev/docs/test-parallel · https://playwright.dev/docs/test-sharding · https://playwright.dev/docs/best-practices
- **Build it with the kit (SP3):** The builder's whole output *is* this architecture — a layered, isolated, shardable suite you can extend by the same rules.

---

## Extension track — mastering the Playwright VS Code extension
*The focused `extension` cluster that **`/learn-extension`** runs — set up by `ui-automation-setup` during the
build, mastered here. It uses the same tutor pedagogy, depth levels, and `learning` slice as the main course
(an `extension` track), and is grounded in the one standard `vscode-playwright.md` (no restating). Each topic
has a **Try it** that the **orchestrator** launches (the read-only tutor has no shell) so the learner practises
immediately — the CLI-launchable tools (`codegen`, `show-trace`, `show-report`) mirror the in-editor actions the
plugin can't drive for you.*

#### E1. Install & test discovery
- **Goal:** Install the extension, run "Test: Install Playwright" to add browsers + pick them, and see tests appear in the Testing panel.
- **Prereqs:** 7 (basic framework), a scaffolded framework (`ui-automation-setup` may have done the install).
- **Standard(s):** `vscode-playwright.md`
- **Official docs:** https://playwright.dev/docs/getting-started-vscode · https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright
- **Try it:** open the project in VS Code; accept the recommended-extensions prompt (`.vscode/extensions.json`).

#### E2. Run & debug from the editor
- **Goal:** Run via the play icons, tick the project(s)/level(s), set a breakpoint and "Debug Test", and read expected-vs-received with the locator highlighted live.
- **Prereqs:** E1.
- **Standard(s):** `vscode-playwright.md` · `tooling-and-commands.md`
- **Official docs:** https://playwright.dev/docs/getting-started-vscode · https://playwright.dev/docs/debug
- **Try it:** run one `ui-smoke` test from the editor; set a breakpoint and step through it.

#### E3. Generate locators — Record & Pick locator
- **Goal:** Use Record new / Record at cursor / **Pick locator**, and recognise the role-first locator priority the recorder follows.
- **Prereqs:** E2.
- **Standard(s):** `vscode-playwright.md` · `page-objects.md`
- **Official docs:** https://playwright.dev/docs/codegen · https://playwright.dev/docs/getting-started-vscode
- **Try it:** `npx playwright codegen <your-app-url>` — record a short flow, watch the locators it emits.

#### E4. Refactor codegen into page objects
- **Goal:** Treat codegen output as a **draft** — move its locators into page objects (role/label-first, no `expect()` in the POM) and reuse, never commit a recorded script verbatim.
- **Prereqs:** E3.
- **Standard(s):** `page-objects.md` · `vscode-playwright.md` (the "don't commit codegen verbatim" anti-pattern)
- **Official docs:** https://playwright.dev/docs/pom · https://playwright.dev/docs/best-practices
- **Try it:** take the E3 recording and lift its selectors into a `*.page.ts`, leaving assertions in the spec.

#### E5. Trace Viewer
- **Goal:** Open the Trace Viewer for a failed run from the editor and read the actions, network, console and DOM snapshots to find the real cause.
- **Prereqs:** E2.
- **Standard(s):** `vscode-playwright.md` · `reporting-allure.md`
- **Official docs:** https://playwright.dev/docs/trace-viewer-intro · https://playwright.dev/docs/debug
- **Try it:** `npx playwright show-trace` on a `trace.zip` from a failed run (or `npx playwright show-report`).

#### E6. Multi-config & the right env
- **Goal:** Switch between multiple `playwright.config.ts` from the extension, and point it at the right `.env`/profile (`playwright.env`) so an editor run matches a terminal run.
- **Prereqs:** E2.
- **Standard(s):** `vscode-playwright.md` · `config-and-profiles.md`
- **Official docs:** https://playwright.dev/docs/getting-started-vscode
- **Try it:** set `playwright.env` to your profile and run a test from the editor; confirm it authenticates like the terminal.

---

## Coverage note
Every standard under `knowledge/standards/` is the mapped teaching source for at least
one topic above, and every official URL is drawn from the researched Source URLs list — so the tutor never
teaches ungrounded, and the curriculum never duplicates what a standard already says.
