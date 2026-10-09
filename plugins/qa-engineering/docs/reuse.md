# Reuse map — what each phase delegates to, and how

`kit-builder` is the only new capability in the `qa-engineering`. Everything else is
**composed**: each phase invokes one of the kit's own native skills or its product-neutral
guidance, and `kit-builder` passes the previous phase's structured output forward as the next
dependency's input (producer → consumer), the way the design-intelligence steward sequences
its skills. The orchestrator **never copies a reused skill's body** — it invokes the skill and
relays the structured output.

## The D11 rule (what the kit may depend on)

- **The capability work runs on the plugin's own native engines:**
  `story-intelligence`, `author-api-cases`, `author-ui-cases`, `ado-publish`, `automation-engine`,
  `failure-to-bug` (plus `file-to-tracker`, the thin author→publish router) — self-contained, with no
  external plugin dependency. They are tracker- and product-agnostic, so the committed kit stays agnostic.
- Where **no** native skill has a capability — runnable **script** generation, ADO **linking**,
  **CI** — the kit carries that guidance itself, written product-neutrally, so it adds no
  product dependency: `docs/script-generation.md`, `docs/ado-integration.md`,
  `docs/ci-and-tools.md`.
- The product-specific sibling plugins are **inspiration only, never a hard dependency** (see the
  "Inspiration" section at the end). A QA who has them installed may use them; the exercise
  does not require them, and the kit must run without them.

## Capability → dependency

| Phase | Capability | Dependency (how kit-builder invokes it) | Structured input passed forward |
|---|---|---|---|
| 0 | Scan the repo/API, confirm flows, select module | kit's **`scan-and-confirm`** skill (Skill tool) | — (produces `flow-map.json` + `.env`) |
| 1 | Scaffold the foundation | kit's `template/` + `kit-builder` itself (no external skill) | `flow-map.json` `hosts` / `authKind` / `module` → `config/services.ts`, `AUTH_STRATEGY`, `modules/<module>/` |
| 2 | API cases (contract / endpoint / workflow) | **`author-api-cases`** (Skill tool) | `flow-map.json` `endpoints` + `flows` as the case seed |
| 2 | API case → runnable Playwright + zod script | kit's **`docs/script-generation.md`** (product-neutral guidance) | the authored cases + the flow-map endpoints |
| 2 | API failure → bug draft | **`failure-to-bug`** (Skill tool) | the failing test's output / assertion / non-2xx response |
| 3 | UI cases (smoke / regression / e2e) | **`author-ui-cases`** (Skill tool) | the same `flows` + the module name |
| 3 | UI case → Playwright script + page objects | kit's **`docs/script-generation.md`** (UI section) | the authored UI cases |
| 4 | Publish ADO Test Cases (gated) + link script ↔ case | **`ado-publish`** (Skill tool, gated: dry-run + confirm) + **`docs/ado-integration.md`** | the **approved** cases (qa-context `cases`) + generated scripts |
| 4 | File bug / defect in the tracker (gated) | **`failure-to-bug`** (Skill tool — investigate → dry-run → gated file) | the failing run + its evidence |
| 5 | CI pipeline, local tools, docs | kit's `template/pipelines/` + **`docs/ci-and-tools.md`** | the whole workspace + the chosen CI host |

## The Standards are the generation authority

The per-phase map above says *which capability* backs each phase; the **engineering standards** every
generating and deciding phase follows are one shared source: `knowledge/standards/` (the Standards),
surfaced through the **`framework-standards`** skill. `docs/script-generation.md` is those standards
turned into emit code — it implements the rules, it does not invent them. So the map has a
cross-cutting dependency that is not a per-phase box:

| Cross-cutting capability | Dependency (how it is used) |
|---|---|
| Opinionated stack + settled defaults (don't re-ask) | `knowledge/standards/defaults-and-deviation.md` — cite the default; deviate only via its four-step protocol |
| "When to choose what" mid-build (test level, POM vs selectors, builder vs inline data, cross-module reuse) | the **`framework-standards`** skill (Skill tool) → returns the governing standard |
| Each generated block conforms to its standard | routes→`routes.md` · services→`services.md` · builders→`builders.md` · schemas→`schemas.md` · fixtures→`fixtures.md` · matchers→`matchers.md` · cleanup→`cleanup-and-sweepers.md` · POM→`page-objects.md` · levels→`test-levels.md` · cross-module→`cross-module-reuse.md` |
| Generation-time self-check against the above | `skills/kit-builder/SKILL.md` (per-phase self-check) + `docs/verification.md` |

`framework-standards` **supplies** the standard; it never scaffolds or writes test code — the builder
generates to it. That keeps exactly one source of truth across the tutor (teaches it), the builder
(generates to it), and the SP4 reviewer (checks against it).

## How a phase invokes a dependency

1. **Read the producer's output** — for most phases that is `flow-map.json` from the
   framework root (never a chat block), plus `.env`. Phase 4 also consumes the authored cases
   and generated scripts from phases 2-3.
2. **Invoke the skill with the Skill tool**, by its name
   (`author-api-cases`, etc.), handing it exactly the structured slice it needs — the
   flow-map endpoints and flows as the case seed, a failing run's output as the bug seed, the
   case structure as the tracker seed. Do not paraphrase the skill's job into kit-builder; let
   the skill do it.
3. **Capture the skill's structured output** (authored cases, drafted bug fields, created work
   items) and carry it into the next phase as that phase's input.
4. **For a capability with no generic skill** (script generation, ADO linking, CI), follow the
   kit's own doc instead of a Skill call: `docs/script-generation.md`,
   `docs/ado-integration.md`, `docs/ci-and-tools.md`.

### Why script generation lives in the kit, not a dependency
Only a product-specific skill has runnable **script** generation (cases ↔ Playwright+zod
scripts). Depending on it would make the committed kit product-specific, breaking D2/D11. So
the kit reimplements that one capability as **product-neutral guidance it owns**
(`docs/script-generation.md`), derived from the cleaned, generic automation patterns — adding
no product dependency.

## Inspiration (not required)

These product-specific sibling plugins inspired patterns in the kit but are **never** a hard
dependency, and nothing in the kit requires them:

| Kit capability | Inspired by (not required) |
|---|---|
| `scan-and-confirm` (scan half, but it asks instead of assuming) | `setup/automation-setup` |
| `docs/script-generation.md` (API cases ↔ scripts) | `api-testing/api-tester` |
| `failure-to-bug` usage (failure → bug) | `api-testing/api-bugger` |
| `docs/script-generation.md` (UI cases ↔ scripts) | `ui-testing/tester`, `setup/ui-tester` |
| bug / defect filing | a product-specific bug/defect-filing plugin |

A QA who already has those product-specific plugins installed may lean
on them, but the exercise and the committed kit run entirely on the kit's own native skills
plus its own docs.
