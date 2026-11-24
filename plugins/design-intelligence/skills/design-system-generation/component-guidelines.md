# Component Guidelines (Generation knowledge)

> **Illustrative example values.** This bundled copy is the template and a worked
> example, not any real organization's design system. The org's own copy lives in
> the local overlay `.claude/design-intelligence/generation/component-guidelines.md`, which the
> skills read instead of this file when it exists (see
> `../../_shared/config/org-design-system.md`).

How the org expects MUI / component-library primitives to be composed. Org rules
only; MUI component APIs (valid variants/props, v7 vs v9 syntax) live in
`_shared/knowledge/mui-reference.md`; required states live in
`_shared/config/required-states.md`. Sources: web + mobile `design.md`, Figma
component library.

## General rules

- Prefer existing **component-library primitives → MUI core → custom** (last).
- One primary (`contained`) action per section; secondary → `outlined`;
  low-emphasis → `text`. *(web)*
- All components use **8px border radius** — express per
  `_shared/config/token-resolution.md` "Border radius representation".
- Spacing on the org grid (see `_shared/config/token-resolution.md` spacing):
  4px grid (2px for chips/tags); never odd values.
- Icons: Material **Filled** style only, 24px default; icon buttons need
  `aria-label`.

## Button

- Structure: **icon + label** for primary/secondary. *(web)*
- Variants: `contained` (primary), `outlined` (secondary), `text` (low emphasis).
- Disabled: reduced opacity, never hidden. *(web)*
- `textTransform: 'none'` (org overrides MUI uppercase).
- Touch target: platform min (mobile 40px / web 48px) — `token-resolution.md`.
- Sorting button: default icon/text `#B5BAC1`; active `#2E5BA6`; ascending = up
  arrow (oldest), descending = down arrow (newest). *(web)*

## TextField / Input

- Variants: `outlined` (default forms/search), `filled` (dense), avoid
  `standard`. *(web)*
- Always a visible `label` (never placeholder-as-label); `helperText` for hints;
  `error` + `helperText` for validation; explicit `id` for label association.
- Figma "Input field" confirms states Default/Hover/Active/Error.

## Select / Dropdown

- Pair `FormControl` + `InputLabel` + `MenuItem`; outlined needs the label in
  both `InputLabel` and `label`. Min item height = platform touch target.

## Checkbox / Radio

- Pair with `FormControlLabel`; group (Radio) via `RadioGroup` + `FormLabel`.
- Checked/selected use the active color `#2F5DA8`.

## Chip

- Variants filled/outlined; removable via `onDelete` (org `with-close`).
- Chip/tag padding on the 2px grid; chip text 11px.
- Colors per `colors.md` (unassigned `#FEF3C7`/`#A16207`, location/dept
  icon `#4B5563`).

## Dialog

- Trap focus (MUI Modal behavior); destructive/confirm button on the **right**;
  alert-style dialogs use `role="alertdialog"`; max width `sm` for simple
  confirmations. *(web)* On mobile, consider `fullScreen` at small breakpoints.

## Snackbar & Alert

- See `alerts.md` for severities/variants/colors and the MUI mapping.

## Elevation

- Use MUI `elevation` (0–24) for hierarchy; don't hand-roll `box-shadow`.
  Org elevation levels documented in web/mobile `design.md`.

## `[TODO]`

- Full component/state matrix for Card, Dialog, Snackbar, Navigation Bar, List
  Item, Search Bar, Avatar, List Card — extract from the org's Figma library
  (the page named in the overlay's `sources.md`); until then treat those states per
  `required-states.md` `[TODO]` guidance (do not fail on undefined states).
