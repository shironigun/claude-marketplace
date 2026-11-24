---
name: design-system-generation
description: >-
  Generates a UI implementation from a Figma frame, reference image, or written
  design intent so it follows the organization's design system — MUI usage,
  design tokens, spacing, typography, platform rules (web/mobile), and required
  component states. When no Figma/spec exists (No-Figma path), it first designs
  the screen from the org design system, then builds. When a developer codebase
  is provided, it first inspects that codebase and follows Inspect → Reuse →
  Extend → Create so the implementation fits the existing architecture. Use when
  the user wants to design and/or build a screen, view, or component from a
  design or requirement, or to refine a prior implementation from Review
  feedback. Returns the generated artifact plus a minimal manifest. This skill
  only designs and builds — it never reviews, scores, or certifies its own
  output.
---

# Purpose

Turn a design request — a Figma frame, a reference image, or a written intent —
into an implementation that already conforms to the organization's design
system. This skill **only builds**. It never evaluates, scores, or certifies its
own output; judging the result is the responsibility of `design-system-review`.

# When to Use

Use this skill when the request is to:

- Build, implement, or reproduce a screen, view, or component from a Figma
  frame / URL, a reference image, or a written requirement.
- **No-Figma path:** design *and* build a screen/feature when no Figma design or
  implementation spec exists — designing from the org design system first.
- Implement into an **existing developer codebase** (inspect it first; reuse
  before creating).
- Refine an existing implementation using correction feedback from a prior
  Review pass.

Do **not** use this skill to review, test, compare, or score an implementation —
that is `design-system-review`.

# Inputs

- **original_request** *(required)* — the design intent, as any of: an
  `implementation_request` from `figma-to-code` (Figma path), a Figma node/URL,
  a reference image, or a **text feature brief** (No-Figma path).
- **platform** *(optional)* — `web` or `mobile`. If absent, infer from the
  request and record the choice as an assumption.
- **codebase_path** *(optional)* — path/root of the existing developer codebase.
  When present, run the Codebase-Aware step (Inspect → Reuse → Extend → Create)
  before building.
- **corrections** *(optional)* — findings/corrections from a previous Review
  pass, when refining an earlier artifact.

# Required Context

Read these before generating. They are the single source of truth — do not
restate or duplicate them in the output.

**This skill's own design-system knowledge (this folder; overlay
`generation/` copies win):**

- `typography.md` — font family, weights, type scale, usage/hierarchy.
- `colors.md` — semantic colors, palette-usage rules, approved values.
- `alerts.md` — alert variants, severities, colors, icons, states.
- `component-guidelines.md` — how to compose MUI/component-library primitives
  per the org design system.

**Shared contract + framework knowledge (`_shared/`):**

- `_shared/config/manifest-schema.md` — exact output manifest structure
  (instance `id`s; states keyed by id).
- `_shared/config/required-states.md` — required states per component; MUI-auto
  state rule.
- `_shared/config/token-resolution.md` — token→value map, **radius
  representation rule** (8px in the bundled example), **MUI-provided-states
  rule**, spacing grids (4px/2px), touch targets (40px mobile / 48px web),
  platform switch, MUI-default detection.
- `_shared/knowledge/icons.md` — app icon → approved MUI icon mapping (Filled
  style).
- `_shared/knowledge/mui-reference.md` — MUI v7.3.11 component API, valid
  variants/props, v7-vs-v9 syntax, theming defaults.

If the request conflicts with this context, prefer the context and log an
assumption. Never invent values that a token or rule already defines. Org design
values live in this skill's knowledge files and `token-resolution.md`; MUI
framework facts live in `mui-reference.md` — keep them distinct.

# Step 0 — Org design system

Before anything else, run **Step 0** in `../../_shared/config/org-design-system.md`:
load the org's local, git-ignored overlay (`.claude/design-intelligence/` in the
project root), ask the user for their design-system sources if it is missing (the
bundled values are an illustrative example, used only if the user opts in), and
confirm the resolved sources in one line. Every org file this skill names means its
**resolved copy** (overlay first). `_shared/...` paths are relative to the plugin
root (`../../_shared/` from this file).

# Generation Workflow

0. **Design (No-Figma path only)** — if the input is a text feature brief with no
   Figma analysis / implementation spec, first *design* the screen from the org
   design system: derive the layout, the components, the tokens, and the required
   states from `_shared` knowledge (+ this skill's knowledge files) before
   building. Tag any gap `assumption` / `UNKNOWN`; never invent org values. On the
   Figma path this step is already done upstream (analysis → figma-to-code) — skip it.
1. **Interpret intent** — parse the request/spec into concrete requirements
   (elements, actions, content, layout). Resolve the platform.
1a. **Inspect codebase (only if `codebase_path` given)** — before selecting or
   writing anything, inspect the existing codebase and follow **Inspect → Reuse →
   Extend → Create**: read module/folder structure; find existing shared
   components, feature-specific and page-specific components, MUI/design-system
   wrappers, and relevant hooks/services/utilities; determine where the new
   feature belongs. **Reuse** an existing component/wrapper that fits, **Extend**
   one that is close, and **Create** new only when nothing fits. Do **not**
   introduce a competing architecture or refactor beyond what the feature needs.
   Record reuse/extend/create decisions and placement in `design_decisions`.
2. **Load context** — pull the tokens, rules, and config that apply to the
   resolved platform from `_shared/`.
3. **Select components** — map each requirement to a component, preferring, in
   order: an **existing codebase component/wrapper** (when a codebase was
   inspected) → existing library primitive → MUI core → custom only as a last
   resort.
4. **Apply tokens & rules** — colors from palette tokens, type from the scale,
   spacing on the grid, radius, and elevation per `_shared`. Never hardcode a
   value that a token exists for.
5. **Compose** — assemble the components into the screen/component with correct
   layout and platform-appropriate responsive structure.
6. **Implement states** — for every interactive component, implement each state
   in the required-states list that applies to it.
7. **Assemble output** — emit the artifact plus the minimal manifest.

# Decision Rules

- Component priority: **existing codebase component/wrapper** (if a codebase was
  inspected) → existing library primitive → MUI core → custom. Reuse → Extend →
  Create; create new only when nothing fits.
- Every color / spacing / typography / radius value must map to a token or rule
  in `_shared`. If none fits exactly, choose the closest and log it as a
  `design_decision`.
- One primary (`contained`) action per section; secondary → `outlined`;
  low-emphasis → `text`.
- Apply the resolved platform's touch-target and breakpoint rules — never
  generic ones.
- When the request is ambiguous or underspecified, choose the
  design-system-consistent default and log an `assumption`. Do not block or ask
  for confirmation mid-generation.
- When refining from `corrections`: apply each correction, hold everything else
  stable, and do not regress areas that were already correct.

# Platform Handling

- Resolve the platform first — it selects which `design.md`, breakpoint table,
  and touch target apply (mobile 40px, web 48px).
- Do not mix web and mobile rules within a single artifact.
- If the platform is unstated and cannot be inferred confidently, pick the most
  likely default from the request context and record `platform` in the manifest
  as an assumption.

# Component / State Handling

- Map each interactive element to a component defined in `_shared` knowledge and
  record it in `components_used`.
- Implement every applicable state from the required-states list (e.g. default,
  hover, active/pressed, focus, error, disabled, loading, empty). Web includes
  hover; mobile emphasizes active/pressed.
- Record what was implemented per component in `states_implemented` as plain
  fact — no judgment about completeness or quality.

# Output Contract

Return exactly two parts.

**artifact** — the implementation (code).

**manifest** — declarative facts only, exactly these five fields:

```yaml
platform: web | mobile
components_used:
  - name: <ComponentName>
    source: mui | component-library | custom
    variant: <variant>          # optional
states_implemented:
  <ComponentName>: [<state>, ...]
design_decisions:               # non-obvious choices / deviations, 1 line each; may be empty
  - "<decision>"
assumptions:                    # gaps filled where intent was ambiguous; may be empty
  - "<assumption>"
```

`design_decisions` and `assumptions` are exception logs, not narration — an empty
list is normal and expected.

# Constraints

- **Never self-certify.** No "compliant", no PASS/FAIL, no score, no review of
  any kind.
- Do not perform any Review/Supervisor responsibility.
- Do not restate or duplicate the full design-system rulebook — reference
  `_shared`. Instructions live here; values live in `_shared`.
- The manifest contains only the five specified fields — nothing more.
- Keep the skill portable: no project-specific values baked into these
  instructions.
- **Codebase-aware guardrails:** never introduce a new competing architecture and
  never perform speculative/unnecessary refactoring. Fit the existing structure;
  reuse before creating; place new code where the codebase's conventions put it.
  If the codebase can't be inspected, say so and record it as an `assumption` —
  do not invent its structure.

# Examples

**Request:** "Implement a mobile *Delete Account* confirmation button — a
destructive primary action."

**Artifact:**

```jsx
<Button
  variant="contained"
  color="error"
  sx={{ minHeight: 40 }}
  aria-label="Delete account"
>
  Delete Account
</Button>
```

**Manifest:**

```yaml
platform: mobile
components_used:
  - name: Button
    source: mui
    variant: contained
states_implemented:
  Button: [default, active, focus, disabled, loading]
design_decisions:
  - "contained variant chosen for the single primary destructive action"
assumptions:
  - "platform inferred as mobile from the request wording"
  - "no loading behavior specified; included loading state for the async delete"
```

Note what the artifact does **not** contain: no claim that it is compliant,
accessible, or correct. It states what was built and why; whether it passes is
for Review to decide.
