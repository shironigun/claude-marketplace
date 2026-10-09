# Case → spec mapping — approved case to a framework spec

How an approved case from the qa-context `cases` slice maps onto a runnable spec. This reference **points**
at the authority — `${CLAUDE_PLUGIN_ROOT}/docs/script-generation.md` (the emit rules + worked examples) and
`knowledge/standards/` (the building-block standards) — it does **not** restate them. The engine reuses that
guidance; this table is only the case-field → spec-artifact lookup.

> Product-neutral: `Widgets`, `Orders`, `<module>` are placeholders. The real module/fields come from the
> cases and the framework map, never hard-coded.

## The field map

| Case field (from `qa-context.cases.items[]`) | Spec artifact | Authority |
|---|---|---|
| `level` (`contract`/`endpoint`/`workflow`) | the API **folder**: `modules/<m>/api/tests/{contracts,endpoints,workflows}/` (the folder name = the Playwright project name) | `script-generation.md` §1 · `knowledge/standards/test-levels.md` |
| `level` (`smoke`/`regression`/`e2e`) | the UI **folder**: `modules/<m>/ui/tests/{smoke,regression,e2e}/` — **folder name, not the project name**: the Playwright projects `ui-smoke`/`ui-regression`/`ui-e2e` are what `testMatch` points at these `smoke`/`regression`/`e2e` folders | `script-generation.md` §7 · `test-levels.md` |
| `level` | the **one level tag** — `@contract`/`@endpoint`/`@workflow` or `@smoke`/`@regression`/`@e2e` | `script-generation.md` §2 (rule: tags in `{ tag: [...] }`, never the title) |
| the case's `tags[]` + its module | `@<module>` + the case tags (+ `@security` where relevant) on the `{ tag: [...] }` option | `script-generation.md` §2 |
| `title` | the **`traces-case:` line** (one per `test()` block, in a JSDoc directly above it) — value = the case title | `script-generation.md` §2 (worked examples §4–§6) |
| `tracesStory` | carried in the slice for the thread; the story the case came from | `qa-context.md` (traceability thread) |
| `adoCaseId` (when published) | the `automation.specs[].tracesCase` key written back + the ADO case the script tests | `ado-publish` (stamps it) · `qa-context.md` |
| the case's steps / expected results | the spec body — requests/assertions (API) or actions/locators (UI), per the translation rules | `script-generation.md` §2, §3–§6 |

## The level is the folder (never the title)

`playwright.config.ts` maps each level folder to its own project (timeout + report group), so a spec in the
wrong folder runs under the wrong budget. Put the level in the **folder + tag only** — never in the title
string. A case's `level` was already chosen at authoring (SP8), so the engine does not re-decide it; if a
pulled ADO case has no level signal, ask rather than guess.

## Which building blocks to reuse (add only when none fits)

Before emitting, reuse what the module (and its dependencies) already has — do not re-implement:

| Need | Reuse | Standard |
|---|---|---|
| Routes | `common/routes/routes.<m>.ts` | `knowledge/standards/routes.md` |
| Request bodies | the module **builder** (`common/builders/<m>-builder.ts`) | `knowledge/standards/builders.md` |
| HTTP calls | the module **service** (`common/services/<m>.service.ts`) | `knowledge/standards/services.md` |
| Response shape | the **schema** (`modules/<m>/api/schemas/<m>.schemas.ts`), really asserted | `knowledge/standards/schemas.md` · `matchers.md` |
| UI screens | the **page objects** (`modules/<m>/ui/pages/`), locators by role/label, no `expect()` | `knowledge/standards/page-objects.md` · `components.md` |
| Seed / cleanup | the module **fixture** (worker seed for read-only; own-and-clean for mutating) | `knowledge/standards/fixtures.md` · `cleanup-and-sweepers.md` · `isolation-and-parallelism.md` |
| A prerequisite another module owns | that module's service/POM via **merged fixtures** | `knowledge/standards/cross-module-reuse.md` |

A new block is created **only** when none fits, built to its Standard; `reuse-guardian` blocks a duplicate.

## Honest outcome
A spec is claimed generated only when it typechecks; a case whose spec could not be generated cleanly is
reported as such (honest-outcome rule). The engine reports reused vs newly-added blocks per case.
