---
name: framework-standards
description: The single source of truth for this plugin's automation-framework engineering standards — pull the right standard for a building block or a design decision, product-neutrally and grounded in official docs. Use whenever the kit (the tutor teaching a concept, the builder generating code, a reviewer checking it) or the QA directly needs "what is our standard for X", "how should I structure Y", "which test level fits this case", "POM vs raw selectors", "builder vs JSON test data", "how do we keep tests isolated", or "how do we reuse another module's functionality". It reads the reference files under `knowledge/standards/` and returns the relevant standard(s): Purpose, When to use it (and when not), the official-doc link(s), a product-neutral code shape, and the anti-patterns. It does not generate framework code itself — it supplies the standard that the tutor teaches, the builder generates to, and the reviewer checks against.
---

# Framework Standards — the shared source of truth

This skill resolves a **building block** or a **design decision** to the right standard in
`${CLAUDE_PLUGIN_ROOT}/knowledge/standards/`. Every other capability in the kit teaches, generates,
and reviews against these same files, so the framework stays consistent and DRY. The standards are
**product-neutral** and **official-docs-grounded**: each one cites the official source for any
practice it presents as a best practice, and labels the kit's own opinions as opinions.

## How to use it

1. **Identify what's being asked** — a block (e.g. "page objects", "fixtures", "schemas") or a
   decision (e.g. "which test level?", "how do I reuse customer creation in a deal test?").
2. **Open the matching standard file(s)** under `knowledge/standards/` (index below). For a decision,
   open the decision-oriented standards it spans.
3. **Return the relevant slice** — Purpose · When to use it (and when NOT) · Official-doc link(s) ·
   Product-neutral code shape · Anti-patterns · Related standards. Quote the official link; never
   present an invented practice as an official recommendation.
4. **Stay neutral** — swap the standard's generic placeholders (orders, widgets, User) for the QA's
   real domain only in the answer, never by editing the standard.

## Standards index (`knowledge/standards/`)

**Orientation & defaults**
- `overview.md` — what a framework is, the building blocks, how a test's data flows end to end.
- `defaults-and-deviation.md` — the opinionated default stack + the deviation protocol (why the
  default is preferred → why this case may differ → trade-offs → recommended decision).

**Foundation**
- `config-and-profiles.md` · `routes.md` · `api-client.md` · `auth-and-storage-state.md`

**Data & actions**
- `builders.md` · `services.md` · `fixtures.md` · `worker-seeds.md`

**Assertions & contracts**
- `matchers.md` · `schemas.md` · `helpers.md` · `cleanup-and-sweepers.md`

**UI**
- `page-objects.md` · `components.md`

**Strategy & quality**
- `test-levels.md` · `isolation-and-parallelism.md` · `cross-module-reuse.md`

**Operations**
- `reporting-allure.md` · `ci.md` · `tooling-and-commands.md` · `vscode-playwright.md`

## Decision routing (common "when to choose what")

| The QA is deciding… | Open these standards |
|---|---|
| Which test level for a check (contract / endpoint / workflow / smoke / regression / e2e) | `test-levels.md`, `isolation-and-parallelism.md` |
| POM vs raw selectors / what belongs in a page object | `page-objects.md`, `components.md` |
| Builder vs inline JSON test data | `builders.md` |
| Service object vs inline request code | `services.md` |
| How to keep a test independent | `isolation-and-parallelism.md`, `cleanup-and-sweepers.md` |
| A flow that depends on another module (e.g. a deal needs a customer) | `cross-module-reuse.md`, `services.md`, `page-objects.md`, `fixtures.md` |
| Exact-status vs loose assertions / schema validation | `matchers.md`, `schemas.md` |
| Which environment/tenant/creds a run uses | `config-and-profiles.md`, `auth-and-storage-state.md` |
| How to read a failure / configure reporting | `reporting-allure.md`, `tooling-and-commands.md` |

## Boundary
This skill **supplies** the standard; it does not scaffold or write test code (that is the builder's
job) and it does not teach a full curriculum (that is the tutor's job) — both of those consume these
same files so there is exactly one source of truth.
