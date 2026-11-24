---
name: figma-design-analysis
description: >-
  Reads a Figma file/frame and produces a structured, implementation-ready
  analysis — layout hierarchy, components, variants, states, typography, colors,
  spacing, sizing, borders/radius, elevation, icons/assets, responsive and
  interaction clues, accessibility observations, and mappings to the org design
  system — with every value tagged CONFIRMED / INFERRED / UNKNOWN / CONFLICT.
  Read-only. Use when the user wants to inspect, analyze, or understand a Figma
  design before implementing or reviewing it. It does NOT generate code, does NOT
  review compliance, and never invents design values.
---

# Purpose

Turn a Figma file/frame into a structured, implementation-ready analysis that
downstream skills consume. **Read-only.** It inspects and structures design
information; it does not build UI (`design-system-generation`) or judge it
(`design-system-review`).

# When to Use

- Inspect/analyze/understand a Figma frame before implementing or reviewing it.
- Produce the structured input `figma-to-code` / `design-system-generation` will
  build from.
- Provide extracted evidence (values + locations) that `design-system-review`
  can reference.

# When NOT to Use

- To generate React/MUI code → `design-system-generation`.
- To judge compliance / PASS-FAIL → `design-system-review`.
- To author, edit, or prototype in Figma, or run visual regression.
- When there is no Figma input (URL/node) to analyze.

# Inputs

- **figma_input** *(required)* — a Figma file URL and/or a frame/node id
  (extract `fileKey` + `nodeId` from the URL when given).
- **intent** *(optional)* — what the user plans to do with the analysis.
- **platform** *(optional)* — `web` | `mobile`; selects which design-system
  rules to compare against. If absent, record as UNKNOWN; do not assume.
- **design_system_context** *(optional)* — pointers to org knowledge to compare
  against (defaults to the files under Dependencies).

Do not assume information that isn't provided.

# Step 0 — Org design system

Before anything else, run **Step 0** in `../../_shared/config/org-design-system.md`:
load the org's local, git-ignored overlay (`.claude/design-intelligence/` in the
project root), ask the user for their design-system sources if it is missing (the
bundled values are an illustrative example, used only if the user opts in), and
confirm the resolved sources in one line. Every org file this skill names means its
**resolved copy** (overlay first). `_shared/...` paths are relative to the plugin
root (`../../_shared/` from this file).

# Workflow

Deterministic order:

1. Receive Figma input.
2. Resolve target file/frame/page (`fileKey`, `nodeId`).
3. Inspect Figma structure (metadata first, then per-node detail).
4. Identify layout hierarchy.
5. Identify components and instances.
6. Identify variants and states.
7. Extract typography.
8. Extract colors + semantic usage where identifiable.
9. Extract spacing and sizing.
10. Extract borders, radius, elevation, visual properties.
11. Identify icons / assets / images.
12. Identify responsive/layout behavior where evidence exists.
13. Identify interaction/state clues where evidence exists.
14. Identify accessibility-relevant observations.
15. Compare identifiable properties against existing design-system knowledge
    (see Dependencies) — mapping only, not review.
16. Separate confirmed facts from inference.
17. Record ambiguities, missing information, conflicts.
18. Produce the structured analysis artifact (Output Schema).

**Tool-depth note (verified):** `get_metadata` provides structural/node
information; `get_variable_defs` provides available variable/token definitions;
`get_design_context` may be needed for deeper visual properties such as
border-radius and internal spacing. If a property still cannot be retrieved after
these, record it as `UNKNOWN` — do not infer or invent it.

# Extraction Rules

- Extract only what the Figma data actually shows. If a property is not present
  in the retrieved data, mark it `UNKNOWN` — never fill it from a default.
- Map to the org design system by **reference**: name the token/component/state
  from the Dependencies files that the Figma value appears to match. Do not copy
  those files' contents into the analysis.
- A Figma value that contradicts a confirmed org value is a `CONFLICT` (record
  both sides + source); do not pick a winner — that's not this skill's job.
- Never resolve a `[TODO]`/`[CONFLICT]` org value by guessing from Figma.
- Do not restate MUI framework facts — reference `mui-reference.md` when noting a
  likely MUI component/variant.

# Confidence / Evidence Rules

Tag every important extracted value with exactly one:

- **CONFIRMED** — read directly from the Figma data (include the node id/source).
- **INFERRED** — deduced from evidence (state the reasoning); not authoritative.
- **UNKNOWN** — not retrievable from the available data.
- **CONFLICT** — contradicts a confirmed org design-system value (cite both).

An INFERRED value must never be presented as a CONFIRMED design-system value.

# Output Schema

Structured analysis with these sections (omit a value only by marking it
UNKNOWN, never silently):

```yaml
figma_analysis:
  source: { fileKey, nodeId, url }          # + retrieval status
  target_frame: <frame/page name or id>
  intent: <given | UNKNOWN>
  platform: web | mobile | UNKNOWN
  layout_hierarchy: <tree of frames/groups/auto-layout>
  components: [ { name, instance_of, node, tag } ]
  component_variants: [ { component, variant, tag } ]
  component_states: [ { component, state, tag } ]   # state vocab per required-states.md
  typography: [ { role/size, weight, lineHeight, family, tag } ]
  colors: [ { value, usage, tag } ]
  spacing: [ { value, context, tag } ]
  dimensions: [ { element, w, h, tag } ]
  borders_radius: [ { value, element, tag } ]
  elevation: [ { level/shadow, element, tag } ]
  icons_assets: [ { name, type, node, tag } ]
  responsive_behavior: [ { observation, evidence, tag } ]
  interaction_behavior: [ { observation, evidence, tag } ]
  accessibility_observations: [ { observation, tag } ]  # observations only, not a review
  design_system_mappings:                    # mapping, not compliance
    - { figma_object, maps_to, source_file, match: exact|likely|none, tag }
  confirmed_facts: [ ... ]
  inferred_information: [ ... ]
  ambiguities: [ ... ]
  conflicts: [ { figma_value, org_value, org_source } ]
  missing_information: [ ... ]
  implementation_notes: [ ... ]              # neutral hints for Generation, not code
```

Each `tag` is CONFIRMED | INFERRED | UNKNOWN | CONFLICT.

# Boundaries

**Does:** inspect Figma; extract & structure design info; map Figma objects to
known design-system concepts; identify components/variants/states/tokens/assets/
layout; flag ambiguity, missing info, conflicts; produce implementation-ready
analysis.

**Does NOT:** generate React/MUI code; implement UI; modify Figma; create
prototypes; run visual regression; replace Generation or Review; invent org
tokens; resolve `[TODO]`/`[CONFLICT]` by guessing; duplicate MUI reference docs;
produce a PASS/FAIL compliance verdict.

# Dependencies

Existing capabilities and knowledge — **reference, never copy**:

- **Figma MCP** (read-only, load via ToolSearch) — `get_metadata` (structure),
  `get_variable_defs` (tokens), `get_design_context` (detailed context),
  `get_screenshot` (visual), `get_libraries` (library refs). These are the
  available tools and are sufficient; do not reference tools that do not exist.
- Design-system knowledge (for mapping): `../design-system-generation/`
  `typography.md`, `colors.md`, `alerts.md`, `component-guidelines.md`
  (resolved copies — overlay first).
- Shared config: `../../_shared/config/*` (tokens, required-states, radius/state
  rules; resolved copies).
- Icon mapping: `../../_shared/knowledge/icons.md` (resolved copy).
- MUI facts: `../../_shared/knowledge/mui-reference.md`.

Consumed by: `design-system-generation` (as build input) and, as evidence only,
`design-system-review`.

# Failure / Degraded Behavior

- If the Figma MCP is unavailable or a call fails, report explicitly: **what was
  retrieved, what was not, why, and which downstream workflow is affected** —
  then emit a partial analysis with the missing parts marked `UNKNOWN`.
- Never fabricate Figma data to fill a gap.
- If output is truncated/too large, narrow to the target node and note the scope
  limit.

# Handoff to Generation

```text
Figma → figma-design-analysis → structured analysis → design-system-generation
      → UI implementation
```
Generation consumes the analysis as its `original_request` input; it re-decides
tokens/states from `_shared` — the analysis informs, it does not pre-authorize.

# Handoff to Review

```text
figma-design-analysis → evidence/input → design-system-review
```
Review may cite the analysis's CONFIRMED values/`conflicts` as evidence, but
performs its own compliance judgment. This skill never performs Review's job.

# Validation Checklist

Before returning an analysis, confirm: it is read-only (no code, no Figma
writes); every important value is tagged; no INFERRED value is presented as
authoritative; no `[TODO]`/`[CONFLICT]` org value was guessed; mappings reference
source files rather than copying them; retrieval gaps are reported, not
fabricated; output matches the Output Schema.
