---
name: skill-maintenance
description: >-
  Platform/infrastructure skill that safely develops, updates, validates, and
  maintains the Design Intelligence skill library (design-system-generation,
  design-system-review, figma-design-analysis, figma-to-code, and their shared
  config/knowledge). Use when the user wants to update a skill instruction, add a
  workflow step, correct a dependency, fix a documentation inconsistency, add a
  guardrail, or update a skill after a real execution reveals a contract issue.
  It makes the smallest targeted edit, preserves contracts/boundaries, and stops
  before any architecture change or any change to a frozen skill without explicit
  authorization. It does NOT generate UI, review compliance, or invent design
  values.
---

# Purpose

Maintain the Design Intelligence skill library safely. This is **platform /
infrastructure**, not a core UI-intelligence capability — it edits skill files;
it never builds or reviews UI. Its job is minimal, contract-preserving edits with
mandatory validation and hard stops around frozen skills and architecture
changes.

# When to Use

- Update/correct a skill instruction, workflow step, dependency, input/output
  wording, validation rule, or guardrail.
- Remove an obsolete instruction; fix a documentation inconsistency.
- Update a skill after a real execution reveals a contract/tooling issue.
- Update `SKILL-ARCHITECTURE.md` when explicitly requested.

# When NOT to Use

- To author a brand-new skill from scratch → that is generic skill creation
  (a general skill-authoring workflow); this skill maintains the *existing*
  Design Intelligence library under its specific guardrails.
- To generate/review UI → the core skills.
- To resolve `[TODO]`/`[CONFLICT]` design values → needs the authoritative org
  source, never guessed here.

# Inputs

- **maintenance_request** *(required)* — what to change and why.
- **target** *(required)* — the skill/file to edit (path or skill name).
- **authorization** *(conditional)* — explicit user approval, required before
  editing a frozen skill or making any architecture-level change (see Stops).

# Architecture Authorities (protect, do not move)

- `design-system-generation` → implementation authority.
- `design-system-review` → compliance/review authority (sole PASS/FAIL).
- `figma-design-analysis` → Figma extraction/analysis authority.
- `figma-to-code` → Figma-to-implementation adaptation authority.
- `_shared/config/*` → shared design-system rules/config.
- `_shared/knowledge/*` → shared reference knowledge.
- `design-system-generation/*.md` (non-SKILL) → Generation-specific knowledge.
- The org's local overlay (`.claude/design-intelligence/`, git-ignored; see
  `../../_shared/config/org-design-system.md`) → the org's real design values.
  A change to an **org value** goes to the overlay copy, never into the plugin's
  bundled files (those hold the illustrative example only); the same stops and
  validation apply.

Conceptual placement:

```text
DESIGN INTELLIGENCE
├── Core Design Intelligence
│   ├── figma-design-analysis
│   ├── figma-to-code
│   ├── design-system-generation
│   └── design-system-review
└── Platform / Skill Infrastructure
    └── skill-maintenance   ← this skill
```

Do not move responsibilities between authorities because an edit is convenient.

# Workflow

```text
maintenance request → identify target → read COMPLETE target SKILL.md →
understand responsibility + boundaries + contracts → determine requested change →
check architectural impact → (STOP checks) → make smallest necessary edit →
validate → save → verify saved file → report exact changes
```

1. Identify the target file.
2. **Read the complete target `SKILL.md`** (never edit from memory/partial view).
3. Understand its responsibility, boundaries, and input/output contracts.
4. Determine the precise requested change.
5. Check architectural impact and ownership (does this belong here, in another
   skill, or in config/knowledge?).
6. Apply the **Stops** below — halt if any triggers.
7. Make the **smallest** targeted edit; preserve all unrelated content.
8. Run the Validation checklist.
9. Save.
10. Re-read the affected sections to verify the save.
11. Report exact changes.

# Hard Stops (halt and report before editing)

**Frozen-skill stop.** `design-system-generation` and `design-system-review` are
frozen. If the target is either: read it, determine the change, explain what
would change and why — then **STOP** and request explicit authorization before
modifying.

**Architecture-change stop.** If the request would create a new skill, merge or
split skills, change ownership between authorities, change a core input/output
contract, create a competing source of truth, move knowledge into a skill or
workflow into knowledge, or materially change the architecture — **STOP**,
report the architectural impact, and do not proceed without explicit approval.
Never autonomously redesign the architecture.

**Wrong-owner stop.** If the change belongs in another skill, in `_shared/config`,
or in `_shared/knowledge`, report that instead of forcing it into the target.

# Safety Rules

- Read the complete target before editing; make minimal, targeted edits.
- Preserve unrelated content, existing responsibilities, boundaries, and
  input/output contracts unless the user explicitly authorizes a change.
- Check for duplicated responsibility before adding behavior.
- Never invent org design rules, tokens, components, Figma behavior, or MUI facts.
- Never resolve `[TODO]`/`[CONFLICT]` by guessing; preserve
  `CONFIRMED`/`INFERRED`/`UNKNOWN`/`CONFLICT` distinctions exactly.
- Never silently delete an existing guardrail (removing one requires explicit
  authorization and must be reported).
- Never create a duplicate skill when an existing one can be updated.
- Never modify unrelated files. Always verify the file after saving.

# Validation (after every edit)

1. Responsibility still coherent. 2. Inputs still defined. 3. Outputs still
defined. 4. Workflow internally consistent. 5. Dependencies still exist.
6. No duplicated responsibility introduced. 7. No conflicting instruction
introduced. 8. Existing guardrails intact. 9. `[TODO]`/`[CONFLICT]` handling
intact. 10. No unrelated files changed.

# Output — Maintenance Report

```yaml
updated: <exact file path>
changes:
  - section: <heading>
    previous_behavior: <before>
    new_behavior: <after>
    reason: <why>
validation:
  responsibility: PASS | FAIL
  input_output_contract: PASS | FAIL
  dependencies: PASS | FAIL
  boundaries: PASS | FAIL
  guardrails: PASS | FAIL
  unrelated_files: PASS | FAIL
status: SAVED | BLOCKED
```

If **BLOCKED**, apply nothing (no partial edits) and explain the architectural or
technical reason. If a Hard Stop triggered, report the impact and await explicit
authorization.

# Boundaries

**Does:** read a target skill fully; make minimal contract-preserving edits;
validate; save; verify; report; maintain `SKILL-ARCHITECTURE.md` on request;
enforce frozen-skill and architecture stops.

**Does NOT:** generate or review UI; create new skills or redesign the
architecture autonomously; move responsibilities between authorities; invent
design/MUI/Figma values; resolve `[TODO]`/`[CONFLICT]`; edit frozen skills or
make architecture changes without explicit authorization; touch unrelated files.

# Dependencies

- The target skill/config/knowledge files under `skills/` (read + edit).
- `../../_shared/SKILL-ARCHITECTURE.md` (read for impact analysis; edit only on
  request).
- Read/Edit file tools. No design-system or MUI knowledge is embedded here — this
  skill edits files; it does not reason about design values.
