---
name: figma-screen-generation
description: >-
  Builds a complete, visually finished Figma screen — real layout, typography,
  spacing, colors/tokens (as bound Figma Variables, never raw hex), icons,
  components, states, borders/radius, and real content — from a structured
  Figma design analysis (from figma-design-analysis) and/or a written design
  intent, using the Figma MCP write tools. Use when the developer wants a new
  or updated Figma screen created/matched to an existing screen's visual
  language, not code. It does NOT analyze raw Figma itself (figma-design-analysis
  does that), does NOT judge compliance (design-system-review does that), and
  never invents org tokens, colors, or component behavior beyond what the
  analysis/org design-system knowledge supports.
---

# Purpose

Turn a structured Figma analysis (and/or a written design intent) into a
**complete, visually finished Figma screen** built directly in Figma via the
Figma MCP write tools — not code, not an empty skeleton of placeholder boxes.
This is the Figma-output counterpart to `design-system-generation`: same
design-system authority and token discipline, different output medium
(Figma nodes instead of React/MUI code).

# When to Use

- The developer wants a **new Figma screen/frame created or updated** to match
  an existing screen's visual language (layout, typography, spacing, tokens,
  icons, components, states, radius, content) — not a code implementation.
- A structured analysis from `figma-design-analysis` already exists (or can be
  produced first) describing the reference screen/design system to match.

# When NOT to Use

- To produce React/MUI code → `design-system-generation`.
- To read/understand a Figma design → `figma-design-analysis` (run it first;
  this skill consumes its output, it does not re-inspect raw Figma from
  scratch beyond what's needed to discover reusable Figma components/variables
  per the Discover-first rule below).
- To judge compliance, PASS/FAIL, or accessibility → `design-system-review`.
- To adapt an analysis into a code-facing implementation spec →
  `figma-to-code` (that skill's output feeds `design-system-generation`, not
  this skill).

# Input Contract

- **analysis** *(required)* — the structured, tagged output of
  `figma-design-analysis` for the reference screen(s)/design system to match:
  layout hierarchy, components, variants, states, typography, colors, spacing,
  borders/radius, icons/assets, and `design_system_mappings`, each tagged
  `CONFIRMED` / `INFERRED` / `UNKNOWN` / `CONFLICT`.
- **target** *(required)* — where to build: `fileKey`, and either an existing
  empty page/frame (`nodeId`/name) to populate, or a page/location to create
  the new frame in. Never assume a target — if ambiguous, that is a blocking
  question, not something to guess.
- **screen_intent** *(required)* — what the new screen is *for* in plain
  language (e.g. "an archived-items view of the Inbox, same visual language as
  the Inbox list") — the content and any structural differences from the
  reference screen come from here, not invented independently.
- **platform** *(optional)* — `web` | `mobile`; selects which `_shared`
  ruleset applies. If absent, record `UNKNOWN` and default to what the
  reference analysis reports.
- **content** *(optional)* — real copy/data to populate the screen with (names,
  labels, sample messages, counts). If absent, use the reference analysis's
  own confirmed content verbatim rather than inventing new copy.

Do not proceed on a Figma URL alone with no `analysis` — report that
`figma-design-analysis` must run first (same rule `figma-to-code` follows).

# Dependencies (reference, never copy)

- `../figma-design-analysis/SKILL.md` — the input producer; its `design_system_mappings`
  and confidence tags are authoritative for what this skill may treat as
  `CONFIRMED`.
- `../design-system-generation/` (`typography.md`, `colors.md`, `alerts.md`,
  `component-guidelines.md`) — the same org design-system rules Generation
  uses for code, applied here to Figma nodes instead (resolved copies —
  overlay first).
- `_shared/config/manifest-schema.md` — this skill's manifest **must** conform
  to this exact schema (shared with `design-system-generation`) so
  `design-system-review` can consume it unmodified.
- `_shared/config/required-states.md` — canonical state vocabulary; see the
  "States in Figma" rule below for how it applies to a static artifact.
- `_shared/config/token-resolution.md` — resolved token→hex/value map; the
  border-radius representation rule; MUI-default detection (used here to
  detect an un-overridden default color leaking in from a reused MUI-themed
  Figma library).
- `_shared/knowledge/mui-reference.md` — MUI component/variant reference, for
  mapping Figma components to their MUI equivalents by name.
- Figma MCP write tool: `mcp__Figma__use_figma` (**MUST** load the Figma MCP
  server's `figma-use` guidance before every call — see Figma Tool Usage Rules).
- Figma MCP read tools: `mcp__Figma__get_metadata`, `mcp__Figma__get_design_context`,
  `mcp__Figma__get_screenshot`, `mcp__Figma__get_variable_defs`,
  `mcp__Figma__get_libraries` — used for discovery and validation, per the
  Workflow below.

# Step 0 — Org design system

Before anything else, run **Step 0** in `../../_shared/config/org-design-system.md`:
load the org's local, git-ignored overlay (`.claude/design-intelligence/` in the
project root), ask the user for their design-system sources if it is missing (the
bundled values are an illustrative example, used only if the user opts in), and
confirm the resolved sources in one line. Every org file this skill names means its
**resolved copy** (overlay first). `_shared/...` paths are relative to the plugin
root (`../../_shared/` from this file).

# Workflow

Deterministic order; work incrementally and validate after each step (see
Figma Tool Usage Rules) — do not attempt the whole screen in one write call.

1. **Receive inputs.** Confirm `analysis`, `target`, and `screen_intent` are
   present; if not, stop and ask rather than guessing.
2. **Discover existing conventions first.** Before creating anything, inspect
   the target file: existing pages, components/variants (`get_metadata`,
   `get_libraries`), and existing Figma Variables (`get_variable_defs`) that
   already encode the org's tokens (colors, e.g. `Primary_color`,
   `Border`, chip colors — as already surfaced in the analysis). **Reuse
   these Figma Variables and existing components by reference; do not create
   duplicate variables or components that already exist in the file.**
3. **Confirm the target is safe to build into.** Read the target node/page. If
   it already contains unrelated content, stop and ask before writing —
   never overwrite existing frames not named in `target`.
4. **Resolve tokens.** Map every color/spacing/radius/typography value the
   screen needs to: (a) an existing Figma Variable discovered in step 2, else
   (b) a `CONFIRMED` value from `analysis`/`_shared`, else (c) mark `UNKNOWN`
   and use the nearest confirmed org value while logging an `assumption` —
   never invent a token or a hex value that appears nowhere in `analysis` or
   `_shared`.
5. **Build the skeleton.** Create the root frame at the target location, sized
   per the analysis's confirmed frame dimensions, with named placeholder
   sections for each top-level region (matching the analysis's layout
   hierarchy). Mark each section `placeholder = true`.
6. **Fill in sections incrementally**, one `use_figma` call per section:
   - **Layout** — reproduce the confirmed layout hierarchy (auto-layout for
     any container with structurally related children, per `figma-use`
     rule 12a) and exact positions/sizes from `analysis.dimensions`/
     `layout_hierarchy`.
   - **Typography** — exact org family (`token-resolution.md` "Font family"),
     size, and weight per
     `typography.md`/`analysis.typography`; never an arbitrary font/size.
   - **Spacing** — exact values from `analysis.spacing`, on the org's 4px grid
     (2px for chips), never an eyeballed number.
   - **Colors/tokens** — bind fills/strokes to the resolved Figma Variable
     from step 4; only fall back to a literal hex when no variable exists yet
     for a `CONFIRMED` org value, and log that as a `design_decision` (a
     literal hex is otherwise the same violation as hardcoding it in code).
   - **Icons** — reuse the exact icon components/instances identified in
     `analysis.icons_assets` (Material Filled per `component-guidelines.md`);
     do not draw new icon vectors from scratch when a matching icon component
     already exists in the file/library.
   - **Components** — reuse existing component instances (buttons, chips,
     inputs, cards) from the file's component library wherever
     `design_system_mappings` identifies one; only build new node structures
     when no matching component/instance exists, and note that as an
     `assumption`.
   - **States** — see "States in Figma" below.
   - **Borders/radius** — exact org radius (`token-resolution.md`; 8px in the
     bundled example) (or the analysis's confirmed
     radius per element) — never a bare, unexplained multiplier.
   - **Content** — real copy from `content` (if given) or the analysis's own
     confirmed text, never lorem-ipsum or invented copy.
   Clear each section's `placeholder` flag as it's completed.
7. **Validate after every section**: `get_metadata` for structural correctness
   (hierarchy, counts, names), `get_screenshot` (or inline `node.screenshot()`)
   for visual correctness (no clipping, no overlap, tokens visibly correct).
   Fix before moving to the next section.
8. **Final verification pass.** One full-frame `get_screenshot` plus a final
   `get_metadata` of the whole root frame. Confirm the target it was told not
   to touch (e.g. an existing reference screen) is unchanged if that was part
   of the request.
9. **Assemble the Output Contract** (below) and hand off to
   `design-system-review`.

## States in Figma

Figma has no runtime — there is no MUI-auto `hover`/`focus`/`active` the way
compiled code gets it for free. Consequently:

- **Never mark a state `(mui-auto)`.** That marker means "the framework
  supplies this automatically," which is only true for rendered code, not a
  static design file.
- A state counts as **implemented** only if it exists as its own visible,
  named variant/frame in the file (e.g. a `Button` component with a `hover`
  variant actually present in the library, or an explicit "Error" version of
  an input placed on the canvas). If the reference analysis or the file's
  component library doesn't have a given required state, mark it absent in
  `states_implemented` rather than claiming it — `design-system-review` will
  flag missing required states either way, and a false claim is worse than an
  honest gap.
- For components consumed as existing library instances that already define
  their own state variants (e.g. a `Button` component set with
  default/hover/focus/disabled variants built in), record the states that
  component set actually defines, per its own variant properties — not by
  assumption.

# Figma Tool Usage Rules

1. **Always load the Figma MCP server's `figma-use` guidance before every
   `use_figma` call** (the `/figma-use` guidance when the Figma integration
   provides it as a skill; otherwise read the server's
   `skill://figma/figma-use/SKILL.md` resource).
   Pass `figma-use` (or `resource:figma-use`) in `skillNames`. This is
   non-negotiable — skipping it causes exactly the class of bugs that rule
   exists to prevent.
2. **Work incrementally.** At most ~10 logical operations (create + configure
   + parent a node) per `use_figma` call. Build skeleton → fill sections →
   verify, never one giant script for the whole screen.
3. **Return every created/mutated node ID** from every call, structured as
   `{ createdNodeIds: [...], mutatedNodeIds: [...] }`, so later calls and the
   final Output Contract can reference them.
4. **Switch pages at most once per call**, via `await figma.setCurrentPageAsync(page)`
   — never the sync setter. If work spans multiple pages, fan out multiple
   `use_figma` calls in parallel rather than looping over pages in one script.
5. **Never hardcode a color/spacing/radius value that a Figma Variable or a
   `CONFIRMED` org token already covers.** Bind to variables
   (`setBoundVariable`) wherever the org token already exists as one; this is
   the Figma-native equivalent of "never hardcode hex" in code.
6. **Use auto-layout (`figma.createAutoLayout()`) for any container whose
   children have a structural relationship** — stacked, side-by-side, gapped —
   never absolute `x`/`y` for those. Absolute positioning is only for
   independently placed top-level elements.
7. **Follow the canonical text-edit recipe** for every text node: load the
   font (`loadFontAsync`) → `await` → mutate `characters`/size/style → return
   affected IDs. Verify style names via `listAvailableFontsAsync()` rather
   than guessing (`"SemiBold"` vs `"Semi Bold"`).
8. **On any `use_figma` error, stop — do not immediately retry.** Read the
   error, consult `figma-use`'s gotchas reference, fix the script, then retry.
   Failed scripts are atomic (no partial writes), so there is no cleanup step.
9. **Never use `figma.notify()`**; return data instead. Never leave a Promise
   un-awaited.
10. **Position new top-level nodes away from `(0,0)`** and away from any
    existing content on the page that must remain untouched.
11. Screenshot the result inline (`node.screenshot()`) or via
    `get_screenshot` after every meaningful milestone — do not assume a
    script "worked" just because it returned without error.

# Output Contract

Return exactly two parts, mirroring `design-system-generation`'s contract so
`design-system-review` can consume either without modification:

**artifact** — the built Figma screen, described as:

```yaml
figma_artifact:
  fileKey: <fileKey>
  pageId: <page id>
  rootFrameId: <created root frame node id>
  nodeTree: <summary tree of created/mutated node ids with name + type>
  resolved_values:
    typography: [ { node, family, size, weight, source: variable|confirmed-literal } ]
    colors: [ { node, property, value, source: variable|confirmed-literal, variableId? } ]
    spacing: [ { node, value, source } ]
    radius: [ { node, value, source } ]
  icons_used: [ { node, componentId, name } ]
  components_reused: [ { node, mainComponentId, name } ]
  content: [ { node, text } ]
  screenshots: [ <short-lived get_screenshot URLs from the validation passes> ]
  unchanged_targets: [ <node/page ids the request required to be left untouched, confirmed unchanged> ]
```

**manifest** — **exactly** the `_shared/config/manifest-schema.md` structure
(do not redefine it here):

```yaml
manifest:
  platform: web | mobile
  components_used:
    - id: <unique instance key>
      name: <component name>
      source: mui | component-library | custom
      variant: <variant>          # optional
  states_implemented:
    <id>: [<state>, ...]          # never (mui-auto) — see States in Figma
  design_decisions:
    - "<one line each; literal-hex fallbacks, reused-vs-created calls, etc.>"
  assumptions:
    - "<one line each; UNKNOWN values used, missing states, etc.>"
```

Note what the artifact does **not** contain: no compliance claim, no PASS/FAIL,
no score. It states what was built, where, and from which resolved values;
whether it passes is for `design-system-review` to decide.

# Boundaries

**Does:** consume a `figma-design-analysis` output (and/or written intent);
discover and reuse existing Figma components/variables before creating new
ones; build a complete, visually finished Figma screen — layout, typography,
spacing, colors/tokens (as bound variables), icons, components, states,
borders/radius, and real content — via the Figma MCP write tools; validate
structurally and visually after each step; produce the artifact + manifest
described above.

**Does NOT:** analyze raw Figma from scratch (that's `figma-design-analysis`);
generate React/MUI code (that's `design-system-generation`); judge compliance,
PASS/FAIL, or accessibility (that's `design-system-review`); invent org
tokens, colors, spacing, or component behavior beyond `analysis`/`_shared`;
claim a `(mui-auto)` state (no such thing exists in a static Figma file);
modify or overwrite any existing Figma content outside the agreed `target`;
duplicate a component/variable that already exists in the file.

# Relationship to Other Skills

```text
Figma (reference) → figma-design-analysis → structured analysis
                                                     ↓
                                        figma-screen-generation → Figma artifact + manifest
                                                     ↓
                                          design-system-review → PASS/FAIL + findings
                                                     ↓ FAIL
                                        figma-screen-generation (correction pass, same manifest schema)
```

This skill does not replace `figma-to-code` → `design-system-generation` (the
code-output path) — it is a parallel path for when the developer's deliverable
is a Figma screen, not code. Both paths converge on the same
`design-system-review` skill and the same manifest schema, so Review needs no
changes to evaluate either one.

# Validation Checklist

Before returning the artifact + manifest, confirm: every color/spacing/radius
either binds to an existing Figma Variable or is a `CONFIRMED` org value
logged as a literal-fallback `design_decision`; no invented token, color, or
copy exists anywhere in the screen; every claimed state in
`states_implemented` corresponds to an actually-visible variant/frame (never
`(mui-auto)`); the manifest matches `_shared/config/manifest-schema.md`
exactly (field names, `id` keys, state vocabulary); a `get_metadata` and
`get_screenshot` were run after the final assembly and show no structural or
visual defects; any node/page the request required untouched was re-verified
unchanged; all created/mutated node IDs were returned.
