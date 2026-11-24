# Required States (shared source of truth)

Required component states, keyed by component. **Generation implements the
applicable set; Review flags missing or extra states against this same list.**
Both skills read this file — neither maintains its own list.

> **Illustrative example.** This bundled copy is the template and a worked example.
> The org's own list lives in the local overlay
> `.claude/design-intelligence/config/required-states.md`, which the skills read
> instead of this file when it exists (see `org-design-system.md`). The
> **canonical state vocabulary** below is part of the shared contract and stays the
> same in every overlay.

## Canonical state vocabulary

Both skills MUST use these exact names in `states_implemented` and in findings:

`default` · `hover` · `active` · `focus` · `error` · `disabled` · `loading` ·
`selected` · `checked` · `unchecked` · `indeterminate` · `open` · `success` ·
`empty` · `with-close`

## Platform rule (applies to every component)

- **`hover` is web-only.** On `mobile`, `hover` is not required; `active`
  (pressed) is required instead.
- Everything else applies to both platforms unless noted.
  *Source: mobile `design.md` — "Hover (web only; use active on mobile)".*

## MUI-auto states

`focus`, `active`, `hover` (web), and `disabled` are provided automatically by
MUI and satisfy the requirement when recorded as `(mui-auto)` in the manifest —
see the "MUI-provided states" rule in `token-resolution.md` for the exact
Generation/Review contract (including the `disableRipple` exception).
`error`, `loading`, `selected`, `checked`, `unchecked`, `indeterminate`, `open`,
`success`, `empty`, `with-close` are never mui-auto and must be authored.

## Per-component requirements

Legend: **[sourced]** = taken from project material · **[TODO]** = not defined
in available material, needs the design-system owner.

### Button  *(partly sourced)*
- Required: `default`, `active`, `focus`, `disabled` — plus `hover` on web.
- Conditionally required: `loading` (for async/destructive actions).
- *Source: mobile `design.md` Button states; web `design.md` (disabled must use
  reduced opacity, never hidden).*
- **[TODO]** Confirm whether `loading` is required for **all** buttons or only
  async actions — source does not state this explicitly.

### TextField / Input Field  *(sourced)*
- Required: `default`, `active`, `focus`, `error`, `disabled` — plus `hover` on web.
- Optional: `loading`, `success`.
- *Source: Figma component library "Input field" symbol states — Default, Hover,
  Active, Error; mobile `design.md` Input Field states (adds disabled, optional
  loading/success).*

### Dropdown / Select  *(partly sourced)*
- Required: `default`, `focus`, `open`, `selected`, `disabled`, `error`.
- *Source: mobile `design.md` Dropdown/Select states.*

### Checkbox  *(sourced)*
- Required: `unchecked`, `checked`, `indeterminate`, `focus`, `disabled`, `error`.
- *Source: mobile `design.md` Checkbox states.*

### Radio Button  *(sourced)*
- Required: `default` (unselected), `selected`, `focus`, `disabled`, `error`.
- *Source: mobile `design.md` Radio Button states.*

### Chip  *(sourced)*
- Required: `default`, `focus`, `selected`, `disabled`, `with-close` — plus
  `hover` on web.
- *Source: mobile `design.md` Chip states.*

### Other components (Card, Dialog, Snackbar/Alert, Navigation Bar, List Item, Search Bar, Avatar, Icon Button, List Card)
- **[TODO / source required]** The available `design.md` files describe these
  components but do not enumerate a complete, authoritative state list for each.
  Extract the full state matrix from the org's Figma component library (the
  page named in the overlay's `sources.md`) and record it here before Review
  treats missing states on these components as failures.

## How the two skills use this file

- **Generation** reads the required set for each component it uses (for the
  resolved platform) and implements them, recording the result in
  `states_implemented`.
- **Review** reads the same set and flags any required state absent from
  `states_implemented`/the artifact, and any state claimed but not present.
- For **[TODO]** components, Review must NOT raise a missing-state failure until
  the list is filled — absence of a rule is not a violation.
