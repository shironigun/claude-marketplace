---
name: figma-to-code
description: >-
  Adapter skill that turns a structured Figma design analysis (from
  figma-design-analysis) into a precise implementation specification that
  design-system-generation builds from. Validates completeness, maps Figma
  objects to org components/tokens/states by reference, preserves CONFIRMED /
  INFERRED / UNKNOWN / CONFLICT tags, and hands off to Generation. Use when the
  user wants to go from an analyzed Figma design toward a coded implementation.
  It does NOT generate code, does NOT review compliance, and never invents design
  values — the actual UI/code is produced by design-system-generation.
---

# Purpose

Thin **adapter / orchestration** skill. It converts a structured Figma analysis
into an implementation specification Generation can consume. It is **not** a
second UI generator — building the UI stays with `design-system-generation`.

# When to Use

- You have a structured analysis from `figma-design-analysis` and want to move
  toward an implementation.
- You want a clean implementation spec that preserves what's confirmed vs.
  unresolved before Generation runs.

# When NOT to Use

- To generate React/JSX/MUI code → `design-system-generation`.
- To inspect raw Figma → `figma-design-analysis` (run it first).
- To judge compliance / accessibility / visual match → `design-system-review`.

# Inputs

- **analysis** *(primary, required)* — structured output from
  `figma-design-analysis`.
- **intent** *(optional)* — original user goal.
- **platform** *(optional)* — `web` | `mobile`.
- **implementation_constraints** *(optional)* — e.g. existing app patterns,
  output format.
- **existing_application_context** *(optional)*.

If only a **Figma URL** is provided (no analysis), do NOT inspect Figma here —
report that `figma-design-analysis` must run first, and stop.

# Step 0 — Org design system

Before anything else, run **Step 0** in `../../_shared/config/org-design-system.md`:
load the org's local, git-ignored overlay (`.claude/design-intelligence/` in the
project root), and if it is missing build it automatically by Discovery (read-only
scan of the codebase and Figma, one confirmation; the
bundled values are an illustrative example, used only if the user opts in), and
confirm the resolved sources in one line. Every org file this skill names means its
**resolved copy** (overlay first). `_shared/...` paths are relative to the plugin
root (`../../_shared/` from this file).

# Workflow

Deterministic:

1. Receive the structured Figma analysis.
2. Validate it is complete enough to implement (see Completeness).
3. Separate `CONFIRMED` / `INFERRED` / `UNKNOWN` / `CONFLICT` information.
4. Resolve which design-system components correspond to the analyzed components.
5. Map Figma variants/states to the existing component/state vocabulary
   (`_shared/config/required-states.md`).
6. Map identified tokens to existing org tokens (`_shared/config`,
   `design-system-generation/*`).
7. Identify responsive/layout requirements.
8. Identify required assets/icons.
9. Identify implementation constraints.
10. Identify unresolved decisions.
11. Convert the analysis into an implementation specification.
12. Hand the specification to `design-system-generation`.
13. Preserve all unresolved/ambiguous/conflicting info — never invent values.

# Mapping Rules

Map Figma → design system by **reference** to existing files (never copy them):

- **Confirmed mapping** → use the known component/token, tag `CONFIRMED`
  (e.g. Figma primary button → MUI Button, `contained`, `color=error/primary`).
- **Probable, not confirmed** → tag `INFERRED`; never promote to `CONFIRMED`.
- **No mapping** → tag `UNKNOWN`; give Generation enough context to make a
  controlled decision (do not decide for it).
- **Figma conflicts with the known system** → tag `CONFLICT`; preserve **both**
  values + the org source. Never silently overwrite either direction.
- Never resolve a `[TODO]`/`[CONFLICT]` org value by guessing from Figma.

# Completeness

- If the analysis lacks what implementation needs, do NOT emit a spec that
  pretends everything is known. Emit:

```yaml
status: BLOCKED | PARTIAL
missing_information: [ ... ]
impact: [ ... ]
recommended_next_step: [ ... ]   # e.g. re-run figma-design-analysis on node X
```

- If implementation can safely proceed with known info:

```yaml
status: READY_WITH_ASSUMPTIONS
assumptions: [ ... ]             # explicit, each traceable
```

- Only when fully sufficient: `status: READY`.

# Output — Implementation Specification

For Generation to consume. Distinguish Figma facts, org mappings, inferences,
and unresolved items throughout (carry the source tags).

```yaml
implementation_request:
  status: READY | READY_WITH_ASSUMPTIONS | PARTIAL | BLOCKED
  source: { fileKey, nodeId, url }        # from analysis
  original_intent: <given | UNKNOWN>
  platform: web | mobile | UNKNOWN
  screen_structure: <frames/regions>
  layout: <hierarchy, auto-layout notes>
  components:
    - component: <figma object>
      mapped_system_component: <MUI/library component | UNKNOWN>
      variant: <variant | UNKNOWN>
      states: [ <state from required-states.md vocab> ]
      confidence: CONFIRMED | INFERRED | UNKNOWN | CONFLICT
      source: <analysis node / org file>
  typography: [ { value, maps_to, tag } ]
  colors: [ { value, maps_to, tag } ]
  spacing: [ { value, tag } ]
  sizing: [ { element, value, tag } ]
  radius: [ { value, tag } ]
  elevation: [ { value, tag } ]
  icons_assets: [ { name, type, tag } ]
  responsive_behavior: [ { requirement, tag } ]
  interactions: [ { behavior, tag } ]
  accessibility_requirements: [ { requirement, source, tag } ]   # requirements, not a verdict
  design_system_constraints: [ <references to _shared / gen knowledge> ]
  confirmed_values: [ ... ]
  unresolved_values: [ ... ]              # UNKNOWN items Generation must decide
  conflicts: [ { figma_value, org_value, org_source } ]
  generation_instructions: <neutral guidance for Generation; NOT code>
```

# Boundaries

**Does:** validate the analysis; classify info by confidence; map Figma →
org components/variants/states/tokens by reference; assemble a structured
implementation spec; preserve unresolved/conflicting info; hand off to
Generation.

**Does NOT:** generate React/JSX/MUI code; design missing UI; implement or
compose components; apply tokens or implement states (that's Generation);
perform compliance review, accessibility certification, or visual comparison
(that's Review); modify Figma; invent Figma data or org tokens; resolve
`[TODO]`/`[CONFLICT]` by guessing; copy MUI docs into this skill.

# Dependencies (reference, never copy)

- `../figma-design-analysis/SKILL.md` — the input producer.
- `../design-system-generation/` (`typography.md`, `colors.md`, `alerts.md`,
  `component-guidelines.md`) — org mapping targets; Generation owns the rules
  (resolved copies — overlay first).
- `_shared/knowledge/icons.md` — app icon → approved MUI icon mapping.
- `_shared/config/*` — tokens, required-states vocabulary, radius/state rules.
- `_shared/knowledge/mui-reference.md` — MUI component/variant reference.

Rules that belong to Generation or Review are referenced by owner, not restated.

# Generation Handoff

```text
implementation_request → design-system-generation (as original_request) → React/MUI + manifest
```
The `implementation_request` this skill produces IS the value passed to
`design-system-generation` as its **`original_request`** input (Generation accepts
a structured/text design intent). No schema change is required — the structured
request is the intent Generation builds from. Generation remains responsible for:
selecting/implementing components, composing
the UI, applying tokens, implementing required states, producing the code, and
producing its manifest. `figma-to-code` does not reproduce those workflows — it
supplies the spec and the unresolved decisions Generation must make.

# Relationship with Review

```text
Figma → analysis → figma-to-code → Generation → artifact + manifest → Review
```
`figma-to-code` never performs Review. Review remains the authority for
compliance and quality verdicts.

# Validation Checklist

Before returning a spec, confirm: no code was generated; the analysis was
consumed (not re-inspected); UI generation is delegated to Generation; the
output matches the spec schema; all four confidence tags are preserved; no org
value was invented; `UNKNOWN`/`CONFLICT` items are surfaced, not resolved by
guessing; mappings reference source files; the correct `status`
(READY / READY_WITH_ASSUMPTIONS / PARTIAL / BLOCKED) is set.
