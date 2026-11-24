---
name: design-system-review
description: >-
  Evaluates a generated UI implementation against the organization's design
  system and the original request, acting as the supervisor/mentor for
  design-system-generation. Checks intent conformance, design-system compliance,
  accessibility, and responsive behavior + required states. Runs deterministic
  checks first, then judgment checks, assigns severity, and returns a structured
  PASS/FAIL verdict with cited, actionable findings. Use when the user wants to
  review, test, evaluate, or validate a generated implementation, or to judge
  whether Generation produced the correct result. This skill only evaluates — it
  never generates, regenerates, or edits the artifact.
---

# Purpose

Act as the supervisor/mentor for `design-system-generation`. Decide whether a
generated implementation is correct according to **both** the organization's
design system **and** the original request, and return actionable feedback so
Generation can refine it. This skill **only evaluates** — it never builds,
regenerates, or edits the artifact.

# When to Use

Use this skill to review, test, evaluate, or validate a generated
implementation — to answer: *"Did Generation produce the correct result
according to the required design system and the original request?"*

Do **not** use this skill to build or fix UI — that is
`design-system-generation`.

# Inputs

- **original_request** *(required)* — the intent Generation was asked to build
  (an `implementation_request` from the Figma path, a Figma node/URL, a reference
  image, or a No-Figma text feature brief). The oracle for intent conformance.
- **generation_artifact** *(required)* — the implementation code produced by
  Generation.
- **generation_manifest** *(required)* — Generation's declarative manifest per
  `_shared/config/manifest-schema.md`: `platform`, `components_used` (each with a
  unique `id`), `states_implemented` (keyed by that `id`), `design_decisions`,
  `assumptions`.
- **corrections_under_test** *(optional)* — corrections from a prior Review pass,
  when re-reviewing a refined artifact, to confirm they were addressed.

# Required Context

Read these to evaluate. They are the single source of truth — do not restate or
duplicate them in the output:

- `_shared/config/manifest-schema.md` — manifest structure (instance `id`s;
  states keyed by id) — how to read the Generation manifest.
- `_shared/config/required-states.md` — required states per component; MUI-auto
  state rule.
- `_shared/config/token-resolution.md` — token→value map, **radius
  representation rule** (8px in the bundled example), **MUI-provided-states
  rule**, spacing grids (4px/2px), touch targets (40px mobile / 48px web),
  platform switch, MUI-default detection.
- `_shared/knowledge/mui-reference.md` — MUI v7.3.11 component API, valid
  variants/props, v7-vs-v9 syntax, theming defaults.

Review does NOT read Generation's own design-system knowledge files
(`design-system-generation/*.md`); it evaluates against `_shared/config` + the
original request. Every finding must cite a specific rule/source from this
context. If the context does not define a rule for something, do not invent a
violation. Where a needed value is `[TODO]`, skip that check and note it — never
guess and never false-fail.

# Step 0 — Org design system

Before anything else, run **Step 0** in `../../_shared/config/org-design-system.md`:
load the org's local, git-ignored overlay (`.claude/design-intelligence/` in the
project root), and if it is missing build it automatically by Discovery (read-only
scan of the codebase and Figma, one confirmation; the
bundled values are an illustrative example, used only if the user opts in), and
confirm the resolved sources in one line. Every org file this skill names means its
**resolved copy** (overlay first). `_shared/...` paths are relative to the plugin
root (`../../_shared/` from this file).

# Review Workflow

Run in this fixed order:

1. **Resolve platform** — read `platform` from the manifest; it selects which
   `design.md`, breakpoints, and touch target apply.
2. **Deterministic checks** — objective, value-level comparisons (see below).
3. **Judgment checks** — reasoning-based evaluation (see below).
4. **Determine severity** — classify every finding as `blocker`, `major`, or
   `minor`.
5. **Determine verdict** — apply the verdict rule.
6. **Produce corrections** — attach an actionable correction to every finding
   and write the final recommendation.

For hybrid dimensions (responsive behavior, component usage), perform the
deterministic portion first and use reasoning only for what cannot be checked
by value.

# Deterministic Checks

Objectively testable against `_shared` — exact comparison, no reasoning:

- **Token usage** — colors/spacing/type/radius resolve to defined tokens.
- **Hardcoded colors** — flag any raw hex/rgb where a palette token exists.
- **Spacing / grid** — values are 4px multiples (2px for chips); no odd values.
- **Border radius** — apply the radius-representation rule in
  `_shared/config/token-resolution.md`: the explicit org radius (`8px` in the
  bundled example) PASSes; a bare multiplier
  (`borderRadius: n`) whose `theme.shape.borderRadius` base is unconfirmed
  `[TODO]` is a **major** finding, not a pass and not a blocker.
- **Typography** — font sizes are in the defined type scale.
- **Font family** — matches the configured family (`token-resolution.md`
  "Font family").
- **Touch-target sizes** — meet the platform minimum (40px mobile / 48px web).
- **Contrast** — where objectively calculable from hex pairs: ≥ 4.5:1 text,
  ≥ 3:1 large text / UI.
- **Required states** — `states_implemented` (keyed by component **`id`**, per
  `_shared/config/manifest-schema.md`) covers the required-states list for each
  interactive instance; cross-check the artifact against the manifest (flag both
  missing states and states claimed but not present). Honor the **MUI-auto state
  rule** in `_shared/config/token-resolution.md`: a state marked `(mui-auto)`
  counts as satisfied UNLESS `disableRipple`/`disableFocusRipple` is set on that
  component (then `focus`/`active` marked `(mui-auto)` is a **blocker** —
  claimed-but-voided). `error`, `loading`, `selected`, `checked`, `unchecked`,
  `indeterminate`, `open`, `success`, `empty`, `with-close` are never mui-auto
  and must be explicitly present.
- **MUI / component validity** — components exist in the configured MUI
  version / component library; variants are valid.
- **Accessibility attribute presence** — required attributes exist (e.g.
  `aria-label` on icon buttons, labels on inputs).
- **Platform-specific configuration** — the correct platform ruleset was applied
  (breakpoints, touch target); no mixing of web and mobile rules.

# Judgment Checks

Require reasoning; run after deterministic checks:

- **Intent conformance** — does the artifact build what the original request
  actually asked for (right elements, actions, content, behavior)?
- **Component appropriateness** — are the chosen components the right fit (e.g.
  is this genuinely the single primary action; is a Button correct here)?
- **Visual hierarchy** — does emphasis/structure guide attention correctly?
- **UX consistency** — consistent patterns, interactions, and terminology.
- **Reasonableness of assumptions** — are the `assumptions` in the manifest
  sound, or did one fill a gap incorrectly?
- **Responsive layout quality** — beyond breakpoint values, does the layout make
  sense at each breakpoint?
- **Ambiguous severity** — assign severity by reasoning when a finding is not
  clear-cut.

# Severity Rules

- **blocker** — violates a hard rule or breaks the request: hardcoded value
  where a token exists, contrast below threshold, touch target below minimum,
  missing required state, invalid component, or the artifact does not build what
  was requested.
- **major** — a real violation that degrades conformance but is not a hard-rule
  break: off-grid spacing, wrong typography variant, inappropriate component
  choice, unsound assumption, or a value that cannot be confirmed against the
  rule because its source is `[TODO]` (e.g. bare radius multiplier with an
  unconfirmed base).
- **minor** — cosmetic or low-impact deviation with negligible effect on
  conformance.

# Verdict Rules

Use exactly `PASS` or `FAIL`:

- Any `blocker` finding → **FAIL**
- Any `major` finding → **FAIL**
- Only `minor` findings, or no findings → **PASS**

Set each dimension to `PASS`, `FAIL`, or `N/A`:

- `N/A` only when the dimension does not apply to the artifact (e.g.
  `responsive_and_states` for a static, non-interactive element).
- A dimension is `FAIL` if it contains any `blocker` or `major` finding.

# Findings Format

Every finding must contain all six fields:

- **id** — stable identifier (`F1`, `F2`, …).
- **dimension** — `intent_conformance` | `design_system_compliance` |
  `accessibility` | `responsive_and_states`.
- **severity** — `blocker` | `major` | `minor`.
- **rule** — the specific rule/token/standard from `_shared` it violates
  (the citation; a finding without a traceable source is not valid).
- **evidence** — the exact offending fact (value + location, or the manifest
  field).
- **correction** — a concrete, actionable fix (Review is a mentor: always say
  how to fix it, never only what is wrong).

# Output Contract

Return exactly this structure — concise and machine-readable:

```yaml
review_output:
  verdict: PASS | FAIL
  summary: "one line — e.g. 2 blockers, 1 major; refine before ship"
  dimensions:
    intent_conformance: PASS | FAIL | N/A
    design_system_compliance: PASS | FAIL | N/A
    accessibility: PASS | FAIL | N/A
    responsive_and_states: PASS | FAIL | N/A
  findings:
    - id: F1
      dimension: design_system_compliance
      severity: blocker
      rule: "colors must come from theme.palette; error → theme.palette.error.main"
      evidence: "color: '#FF5252' (hardcoded hex) in the Button sx"
      correction: "replace with color=\"error\" / theme.palette.error.main"
  recommendation: "one line — ship, or refine with prioritized fixes"
```

`findings` is empty on a clean PASS. Keep every field to one line.

# Constraints

- **Evaluate only.** Never generate, regenerate, or edit the artifact; never
  return corrected code. Corrections are instructions, not replacements.
- Never silently fix an issue — surface it as a finding.
- Never claim an artifact is correct without evaluating it against `_shared` and
  the original request.
- Every finding must be traceable to a rule/source and carry an actionable
  correction.
- Do not restate or duplicate the full design-system rulebook — reference
  `_shared`. Instructions live here; values live in `_shared`.
- Output only the defined contract fields — nothing extra.
- Keep the skill portable: no project-specific values baked into these
  instructions.

# Examples

**Inputs** — original request: "mobile *Delete Account* confirmation button,
destructive primary action"; artifact: a `contained` Button with
`sx={{ color: '#FF5252', height: 36 }}`; manifest reports
`platform: mobile`, `states_implemented: { Button: [default, disabled] }`.

**Output:**

```yaml
review_output:
  verdict: FAIL
  summary: "2 blockers, 1 major — refine before ship"
  dimensions:
    intent_conformance: PASS
    design_system_compliance: FAIL
    accessibility: FAIL
    responsive_and_states: FAIL
  findings:
    - id: F1
      dimension: design_system_compliance
      severity: blocker
      rule: "colors must come from theme.palette; error → theme.palette.error.main"
      evidence: "color: '#FF5252' (hardcoded hex) in the Button sx"
      correction: "replace with color=\"error\" (theme.palette.error.main)"
    - id: F2
      dimension: accessibility
      severity: blocker
      rule: "mobile touch target ≥ 40px"
      evidence: "height: 36px on the Button"
      correction: "set minHeight 40px (size=\"large\" or sx)"
    - id: F3
      dimension: responsive_and_states
      severity: major
      rule: "required-states includes loading for async/destructive actions"
      evidence: "manifest states_implemented omits loading"
      correction: "add a loading state (disabled + spinner during the async delete)"
  recommendation: "Refine: fix F1 and F2 (blockers) and add the loading state (F3), then resubmit."
```

Intent conformance is `PASS` (a judgment call — it *is* a destructive primary
button); the compliance and accessibility failures are deterministic catches;
F3 was found from the manifest without parsing the code. On the refined
resubmit, the same checks should yield `verdict: PASS` — that FAIL → PASS
transition is the evidence the supervisor loop works.
