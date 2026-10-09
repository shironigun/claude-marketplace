# Review rubric — the shared gate criteria

> The one place the review criteria live, so the `framework-reviewer`, the `reuse-guardian`, and anyone
> reading by hand all gate generated/modified framework code against the **same** canon.

This rubric is **DRY**: it does **not** restate a standard's body. Each dimension **points at the owning
SP1 standard** under `knowledge/standards/`; the reviewer opens that file (via the `framework-standards`
skill) for the full rule, the official-doc link, the code shape, and the anti-patterns. This file adds only
the three things a *reviewer* needs on top of the standards: the **dimension × good/fail × owner × severity**
table, the **blocking hard rules** that stop progression, and the **grep-/build-gates** a reviewer runs.

> **Product-neutral by rule.** Nothing here names a product, client, org, real URL, path, account, or
> secret. `customer` / `deal` / `widgets` / `orders` appear only as **labeled generic** placeholder modules.

## Severity

| Severity | Meaning | Effect on a build phase |
|---|---|---|
| **Blocking** | Violates a hard rule (below). The generated code is wrong in a way that hides bugs, couples tests, or leaks data. | **Progression stops** until the builder fixes it on its next pass. |
| **Important** | A real standards violation that degrades the suite but does not hide a bug or leak. | Listed; fix recommended before the phase is called done. The QA may accept it explicitly. |
| **Minor** | A style / consistency / discoverability nit. | Listed for cleanup; never blocks. |

A dimension's row shows the severity of its **characteristic** failure. **Any** finding escalates to
**Blocking** the moment it matches a hard rule in [Blocking hard rules](#blocking-hard-rules) — that list is
the authoritative stop-set, not the table's default column.

## The dimensions

Columns: **what good looks like** · **what fails** · **owning SP1 standard** (not restated) · **severity**.

| Dimension | What good looks like | What fails | Owning standard | Severity |
|---|---|---|---|---|
| **Architecture** | A spec reads as intent; URLs, auth, payloads, routes each live in their own layer; code lands in the layer that owns it. | A spec builds a URL, sets an auth header, or hand-crafts a payload inline; a layer reaches past the one below it. | `knowledge/standards/overview.md` · `knowledge/standards/defaults-and-deviation.md` | Important |
| **POM usage** | One page object per screen; controls by role/label; actions are methods; **no `expect()`** inside; waits only. | A giant god-POM; `expect()` in a page object; a precondition clicked through the UI that an API service could create. | `knowledge/standards/page-objects.md` | Important |
| **Reusability / duplication** | A cross-module prerequisite is built by **reusing** the owning module's service/POM/builder via merged fixtures. | Another module's create/setup re-implemented locally; duplicated logic, routes, or selectors copied instead of imported. | `knowledge/standards/cross-module-reuse.md` · `knowledge/standards/page-objects.md` | **Blocking** |
| **Test isolation** | Each test owns its data and session, shares no mutable state, depends on no other test's order or outcome. | A test depends on another test's data; shared module-level/mutated-seed state; a fixed record two tests both edit. | `knowledge/standards/isolation-and-parallelism.md` · `knowledge/standards/cleanup-and-sweepers.md` | **Blocking** |
| **Test data** | A builder returns a **valid** default; a test overrides the one field under test; every created name is unique and greppable. | A full inline JSON payload; a builder whose default is already invalid; `Date.now()` as a name; a tenant/URL baked into the builder. | `knowledge/standards/builders.md` · `knowledge/standards/worker-seeds.md` | Important |
| **Assertions** | One exact status per assertion (`toHaveStatus(n)`); a real `.passthrough()`/`.strict()` schema asserted via `toMatchContract`; every custom matcher `await`ed. | An OR-list of statuses; an all-`.optional()` schema that parses `{}`; a missing `await` on an async matcher. | `knowledge/standards/matchers.md` · `knowledge/standards/schemas.md` | **Blocking** |
| **API / UI boundary** | Services and page objects **act and wait**; assertions stay in the spec; UI preconditions are built over the API. | `expect()` inside a service or page object; the spec hand-rolls client calls a service should own. | `knowledge/standards/services.md` · `knowledge/standards/page-objects.md` | Important |
| **Configuration / secrets** | Every URL, id, and credential comes from a git-ignored `.env` by **key name**; one profile per environment, switched by one var. | A base URL/token/account/org in a committed file or a profile factory; a secret in a query string or header literal; config that fails late. | `knowledge/standards/config-and-profiles.md` · `knowledge/standards/auth-and-storage-state.md` | **Blocking** |
| **Naming** | Methods named by domain verb (`create` / `activate`); data names unique and greppable (`AUTOMATION_*`); the **level is a tag, not the title**. | A method named after an HTTP verb (`doPut`); a bare timestamp name; the level encoded in the test title string. | `knowledge/standards/services.md` · `knowledge/standards/builders.md` · `knowledge/standards/test-levels.md` | Minor |
| **Flakiness** | Web-first / `await`ed assertions; unique per-test data; a named lock for a truly shared resource; no hand-rolled waits in assertions. | Shared state that passes in order but breaks in parallel; a retry wrapper around a call a test asserts on; `workers: 1` used as a correctness patch. | `knowledge/standards/isolation-and-parallelism.md` · `knowledge/standards/matchers.md` | Important |
| **Maintainability** | Small single-responsibility layers; selectors/actions in one place; a check verified once at the cheapest level. | The same selector/action/assertion copy-pasted across classes or levels; plumbing scattered through specs. | `knowledge/standards/overview.md` · `knowledge/standards/page-objects.md` · `knowledge/standards/cross-module-reuse.md` | Minor |
| **Scalability** | `fullyParallel: true`; data derived from test/worker identity; scale handled by sharding, not by serializing. | Serial mode as a default convenience; collisions under parallel workers; a suite that only passes at `workers: 1`. | `knowledge/standards/isolation-and-parallelism.md` · `knowledge/standards/ci.md` | Minor |
| **Official best-practices** | Each practice presented as a best practice cites its **verified** official source; kit opinions are labeled as opinions. | An invented "official" rule; a practice asserted as Playwright guidance that no standard/official doc backs. | `knowledge/standards/defaults-and-deviation.md` · each standard's *Official guidance* section | Important |

## Blocking hard rules

A finding that matches any of these **stops progression** — the reviewer returns a **Blocking** verdict and
the phase does not advance until the builder addresses it on its next pass. The reviewer never fixes it.

1. **Failure-hiding skips or loose status assertions.** A `test.skip(` that guards a known defect instead of
   an environment condition; or an OR-list such as `expect([400, 403]).toContain(res.status())`. A defect
   carries `knownBug` on the line immediately before its assertion — never a skip, never a status-list.
   (`knowledge/standards/matchers.md`, `knowledge/standards/helpers.md`)
2. **A test depending on another test.** Reliance on another test's data, shared mutable state, or run
   ordering. Each test creates its own prerequisite and tears it down.
   (`knowledge/standards/isolation-and-parallelism.md`, `knowledge/standards/cleanup-and-sweepers.md`)
3. **Cross-module logic duplicated instead of reused.** A flow re-implements another module's create/setup
   locally rather than reusing that module's service/POM/builder via merged fixtures.
   (`knowledge/standards/cross-module-reuse.md`)
4. **Secrets or product data committed.** Any credential, host, URL, tenant/account id, org name, or product
   datum in a tracked file (code, config, fixture, or doc). (`knowledge/standards/config-and-profiles.md`)
5. **A brittle-locator page object.** A page object built on class-name / deep-CSS / XPath selectors where a
   role/label locator exists. (`knowledge/standards/page-objects.md`)
6. **Silenced types.** `as any` or a suppressed type error (`@ts-ignore` / `@ts-expect-error` without
   justification) in a generated spec, service, builder, or page object.
   (`knowledge/standards/defaults-and-deviation.md`)

## Grep-gates (fast, mechanical, run first)

A reviewer runs these over the **changed/target files** before judging dimensions. Each is a cheap signal,
not a verdict: a hit is read in context (a hit inside the kit's own matcher implementation or a comment is
not a violation), then mapped to a dimension and a severity above.

| Grep (literal pattern) | Signals | Dimension → hard rule |
|---|---|---|
| `toContain(res.status(` | an OR-list / loose status assertion | Assertions → rule 1 (**Blocking**) |
| `test.skip(` | a skip — confirm it guards an environment condition, not a defect | Assertions → rule 1 (**Blocking** if it hides a defect) |
| `as any` | a silenced type | Architecture/types → rule 6 (**Blocking**) |
| `#region auto-generated` | an unreviewed generated block passed off as hand-written | Maintainability (**Important**; review the block, don't trust the fence) |

For **secrets/product data** (hard rule 4) the reviewer runs the kit's existing **secret scan** — the
prose-described signature set in `qa-orchestrator` / `kit-builder`, assembled at run time and never stored
as a literal in a tracked file — over the staged diff (and, at phase 5, every tracked file). The count must
be **0**; report it as a number, not as "clean".

## Build-gates (the objective checks a reviewer runs)

The reviewer runs these from the framework root and reports the **real** result, red or green. A red
build-gate is itself a **Blocking** finding — the phase does not advance over it.

| Command | Proves | Dimension |
|---|---|---|
| `npm run typecheck` | `tsc --noEmit` is clean — no silenced or broken types | Architecture / types |
| `npm run lint` | ESLint (incl. `no-floating-promises`) is clean | Maintainability · Flakiness |
| `npm run verify` | the CI-equivalent gate (`typecheck` + `lint` + `test:smoke`) is green | end-to-end sanity |

Read the live `scripts` block in `package.json` rather than assuming these names
(`knowledge/standards/tooling-and-commands.md`); if a script is absent, say so instead of inventing a
command.

## Verdict shape (shared by both agents)

Both agents return the same shape, so a phase gate reads identically whoever produced it:

```
Verdict: PASS | BLOCKED
Gates:   grep-gates <counts> · typecheck <r/g> · lint <r/g> · verify <r/g> · secret scan <n>
Blocking (stops progression):
  - <file>:<line> · <violated standard> · <why it fails> · <fix DIRECTION — not the fix>
Important:
  - <file>:<line> · <standard> · <why> · <direction>
Minor:
  - <file>:<line> · <standard> · <why> · <direction>
```

Every finding names the **file:line**, the **violated standard**, **why** it fails, and a **fix direction** —
never the applied fix. A reviewer **cites** the owning standard (and, through it, the verified official doc);
it never invents an "official" rule to justify a finding.
