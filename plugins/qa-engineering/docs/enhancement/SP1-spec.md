# SP1 — Self-contained foundation + Framework Standards core (spec)

Status: in progress (2026-10-07). Part of the [Enhancement Program](./README.md). Vision:
`../../ENHANCEMENT-CONTEXT.md`.

## 1. Goal
Make `qa-engineering` **standalone, opinionated, and product-general**, and build the shared
**Framework Standards** knowledge core that SP2 (Tutor) and SP3 (Builder) will both consume. No tutor,
no generators, no reviewer in SP1 — only the base they stand on.

## 2. Deliverables

### 2a. Framework Standards knowledge core
- **Knowledge as product-neutral reference files**, one per building block, under
  `knowledge/standards/`. Blocks: `overview`, `config-and-profiles`, `routes`, `api-client`,
  `auth-and-storage-state`, `builders`, `services`, `fixtures`, `worker-seeds`, `matchers`,
  `schemas`, `helpers`, `cleanup-and-sweepers`, `page-objects`, `components`, `test-levels`,
  `isolation-and-parallelism`, `cross-module-reuse`, `reporting-allure`, `ci`, `tooling-and-commands`,
  `vscode-playwright`, `defaults-and-deviation`.
- **Each file follows one template:** Purpose · When to use it (and when NOT) — the decision guidance ·
  Official-doc link(s) · Product-neutral code shape · Anti-patterns · Related standards.
- **Grounding:** mined from a real, cleaned reference framework the author maintains separately
  (a production Playwright + TypeScript + Zod suite — **patterns only, never shipped here**) + the
  fresh official-docs pass (`research/official-docs-notes.md`). **Neutralized**: no product/org/URL
  names; "Customer/Deal" only as a labeled example. Every recommendation cites an official URL where
  one exists; invented conventions are labeled as the kit's own opinion, never as official.

### 2b. `framework-standards` skill
A thin access skill (`skills/framework-standards/SKILL.md`) that the Tutor/Builder/Reviewer invoke to
pull the right standard for a block or a decision, so all three teach/generate/review against one
source of truth. It reads from `knowledge/standards/` and returns the relevant block(s) + the
decision guidance; it does not itself generate framework code.

### 2c. Opinionated defaults + deviation protocol
`knowledge/standards/defaults-and-deviation.md` states the default stack — TypeScript · Playwright ·
Playwright Test · POM · Zod · Allure · VS Code + "Playwright Test for VS Code" · APIRequestContext ·
env/profile config · storageState auth · POM+services+builders+fixtures+schemas+utilities — and
encodes the **deviation protocol** once: *why the default is normally preferred → why this case might
justify a change → trade-offs → recommended decision.* Skills/agents cite this instead of re-asking
settled choices.

### 2d. Internalized capability skills (remove qa-toolkit dependency)
Copy qa-toolkit's four skills into this plugin as **native, general** skills, neutralize any
product/tracker specifics, and re-ground them in the Standards:
- `author-api-cases` (← `api-test-cases`) — contract / endpoint / workflow API cases
- `author-ui-cases` (← `ui-test-cases`) — click-by-click UI cases
- `file-to-tracker` (← `testcase-to-tracker`) — file cases as work items + link back
- `failure-to-bug` (← `api-failure-to-bug`) — triage a failure → review-ready bug draft

Bring each skill's `references/` along. Then **rewire every `qa-toolkit:<skill>` reference** in the
kit (kit-builder SKILL, kit-orchestrator agent, `docs/reuse.md`, `docs/phases.md`,
`docs/ado-integration.md`, `docs/script-generation.md`, `docs/verification.md`, `docs/exercise.md`,
`README.md`) to the internal skill names, and change the "hard dependency on qa-toolkit" language to
"self-contained". The product-specific sibling plugins in the marketplace remain inspiration-only.

> Naming: the four are renamed to action-named, product-neutral skills (above). If keeping the
> original names is simpler during execution, that is acceptable as long as they live in this plugin
> and carry no `qa-toolkit:` qualifier — the de-dependency is what matters.

## 3. Out of scope (later SPs)
Automation Tutor + curriculum + depth levels + on-demand Q&A (SP2); build-phase generators, isolation/
reuse *enforcement in generation*, Allure wiring in the template, terminal toolkit, VS Code extension
*configuration* (SP3); reviewer + reuse-guardian agents (SP4). SP1 may *document* these in the
Standards (e.g. the reporting/vscode/tooling standards) but does not build the generators/agents.

## 4. Acceptance criteria
1. The plugin **builds and is usable with no external plugin dependency** — no `qa-toolkit:` reference
   remains in any committed file; the four capabilities exist as native skills.
2. `knowledge/standards/` exists with one neutral reference per block (§2a list), each following the
   template, each citing official docs where applicable, and **zero product/org/secret** content.
3. `framework-standards` skill resolves a block/decision request to the right standard.
4. `defaults-and-deviation.md` states the default stack + the deviation protocol.
5. Preserved: `kit-orchestrator`, `scan-and-confirm`, `kit-builder`, the 6-phase machine, `template/`,
   secret scanning, the MCP servers — none broken; their qa-toolkit references repointed internally.
6. Product-neutral + secret-free throughout (a scan confirms it); committed and pushed to `dev`.

## 5. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per logical chunk; **push to `dev`** (user-authorized);
secret + product-name scan before every push. No PR. Conventional commit messages scoped
`qa-engineering`.
