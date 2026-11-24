# Manifest Schema (shared source of truth)

The single definition of the Generation output manifest. **Generation produces
exactly this structure; Review consumes exactly this structure.** Neither
`SKILL.md` redefines these fields — both reference this file.

## Structure

```yaml
manifest:
  platform:            # required — enum: web | mobile
  components_used:     # required — list (may be []）
    - id:              #   required — unique instance key (see Instance ID rule below)
      name:            #   required — component name as in component library or MUI (e.g. Button, TextField)
      source:          #   required — enum: mui | component-library | custom
      variant:         #   optional — variant string (e.g. contained, outlined)
  states_implemented:  # required — map: <id> -> [state, ...] (may be {}); keyed by id, NOT name
  design_decisions:    # required — list of one-line strings (may be []）
  assumptions:         # required — list of one-line strings (may be []）
```

## Field rules

- **platform** selects the platform ruleset (breakpoints, touch target, and
  hover-vs-active) in `required-states.md` and `token-resolution.md`.
- **Instance ID rule (E2E issue #3):** every `components_used` entry has a
  unique **`id`**, and `states_implemented` is keyed by that **`id`** (not by
  `name`). This lets the same component appear multiple times with different
  variants and different state sets, unambiguously. Convention:
  `<Name>` when unique, or `<Name>:<variant>` / `<Name>:<n>` when the same
  component recurs — e.g. `Button:contained`, `Button:outlined`.
- Every key in **states_implemented** MUST match an **`id`** in
  `components_used`, and every interactive `components_used` id SHOULD appear in
  `states_implemented`, so Review can cross-reference instance → states.
- **State names** in `states_implemented` MUST come from the canonical state
  vocabulary in `required-states.md`.
- **design_decisions** and **assumptions** are exception logs — declarative,
  one line each, empty lists are normal.
- The manifest is **declarative fact only**: no compliance claims, no PASS/FAIL,
  no scores.
- Field names are **load-bearing** — do not rename them in either skill. Empty
  collections are written as `[]` / `{}`, never omitted.

## Example

```yaml
manifest:
  platform: mobile
  components_used:
    - id: Button:contained
      name: Button
      source: mui
      variant: contained
    - id: Button:outlined
      name: Button
      source: mui
      variant: outlined
  states_implemented:
    Button:contained: [default, active (mui-auto), focus (mui-auto), disabled (mui-auto), loading]
    Button:outlined:  [default, active (mui-auto), focus (mui-auto), disabled (mui-auto)]
  design_decisions:
    - "contained variant for the single primary destructive action; outlined for secondary"
  assumptions:
    - "platform inferred as mobile from the request wording"
```

The example shows all three fixes: unique `id`s for two Button variants,
`states_implemented` keyed by `id`, and MUI-auto states marked `(mui-auto)`.

*Source: derived entirely from the Generation/Review output contracts in this
plugin — not organization-specific, so it is never overlaid (see
`org-design-system.md`).*
