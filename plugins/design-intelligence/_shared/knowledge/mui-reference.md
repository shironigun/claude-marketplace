# MUI Framework Reference (authoritative)

Framework-level MUI knowledge, sourced from the **MUI MCP** (`fetchDocs`:
palette, theming, breakpoints pages). This is **generic MUI**, kept separate from
the organization's design values (those live in `token-resolution.md` /
`required-states.md`, resolved from the org's local overlay — see
`../config/org-design-system.md`). Org values quoted in notes below (4px grid, 8px
radius, breakpoints, touch targets) are the bundled example's. Both skills use this to validate that generated code uses
MUI correctly.

> **Version caveat.** The project pins **MUI v7.3.11**, but the MUI MCP served
> the **v9.3.1** docs. Every value below was confirmed by the subagent to be
> **stable across v5–v9** and therefore valid for v7.3.11. Version-sensitive
> items are flagged inline. Re-verify against v7 docs before relying on anything
> not marked stable.

## Palette structure (stable across v5–v9)

Each palette color role has four tokens: `main` (required), `light`, `dark`,
`contrastText`. For **default** roles, only `main` is required — `light`, `dark`,
`contrastText` are auto-calculated (via `tonalOffset`, default `0.2`, and
`contrastThreshold`, default `3`). **Custom** colors are NOT auto-calculated
unless run through `augmentColor`.

**MUI DEFAULT palette values** (framework defaults — NOT the org's brand values;
the org overrides these in its theme):

| Role | light | main | dark |
|---|---|---|---|
| primary | `#42a5f5` | `#1976d2` | `#1565c0` |
| secondary | `#ba68c8` | `#9c27b0` | `#7b1fa2` |
| error | `#ef5350` | `#d32f2f` | `#c62828` |
| warning | `#ff9800` | `#ed6c02` | `#e65100` |
| info | `#03a9f4` | `#0288d1` | `#01579b` |
| success | `#4caf50` | `#2e7d32` | `#1b5e20` |

`primary.contrastText` default is `#fff`. `background.*`, `text.*`, `divider`
default values are **not covered** in the fetched pages.

Role intent: primary = primary elements; secondary = secondary elements;
error = user must be made aware; warning = dangerous/important; info = neutral
info; success = successful action.

## Palette usage (for validating generated code)

- Reference values as `theme.palette.<role>.<main|light|dark|contrastText>`.
- The `color` prop maps a component to a palette role:
  `<Button color="error">`, `<Button color="secondary">`, or `color="custom"`
  for a registered custom role. **This is the correct, compliant way to apply a
  semantic color — preferred over `sx={{ color: '#hex' }}`.**
- Supported color formats: hex, rgb, hsl.
- Utilities (`@mui/material/styles`): `alpha()`, `getContrastRatio()`,
  `augmentColor`.

## Theming mechanism

- `createTheme(options)` → theme; provided via `<ThemeProvider>` at the root.
- Configurable keys: `.palette`, `.typography`, `.spacing`, `.breakpoints`,
  `.zIndex`, `.transitions`, `.components`.
- `theme.spacing()` unit default = **8px** (observed from rendered output; the
  Spacing doc page was not in the dump). *Note: this is MUI's default; the org
  design system uses a **4px** grid — see org config. If the org theme sets
  `spacing: 4`, `sx={{ p: 1 }}` = 4px. This interaction is **[TODO]** below.*
- `theme.shape.borderRadius` default: **not covered** (Shape page absent).
- Custom theme variables: add top-level keys (e.g. `theme.custom.*`) accessed via
  `useTheme()`; `theme.vars` is reserved.
- `cssVariables: true` emits `--mui-palette-*` CSS variables.

## Breakpoints API (default values stable across v5–v9)

MUI default breakpoints (min-width): `xs` 0 · `sm` 600 · `md` **900** · `lg`
**1200** · `xl` **1536**.

> These are the **MUI defaults** and differ from the org's breakpoints
> (web: md 905 / lg 1240 / xl 1440; mobile: its own set). The org overrides
> `theme.breakpoints.values`. When validating, use the **org** breakpoints in
> `token-resolution.md`, not these — these are here only to recognize
> un-overridden MUI defaults.

- Config: `theme.breakpoints.values` (must supply all if overriding),
  `.unit` (`'px'`), `.step` (`5`).
- Helpers: `up(key)` (≥, inclusive), `down(key)` (<, exclusive), `only(key)`,
  `not(key)`, `between(start,end)` (≥start, <end).
- Responsive rendering: CSS media queries (idiomatic) or `useMediaQuery`.

## Typography

- **Not covered** in the fetched pages (Typography doc page absent). The variant
  scale (h1–h6, body1/2, etc.), default `fontFamily` (`Roboto` by default —
  observed, not doc-quoted), and fontWeight tokens are **[TODO — fetch the MUI
  Typography page]**.
- `responsiveFontSizes(theme, opts)` exists: default `breakpoints`
  `['sm','md','lg']`, `factor` `2`, `disableAlign` `false` (aligns to a 4px
  line-height grid).

## Accessibility (MUI-specific)

- `contrastThreshold` default `3` (⇒ 3:1). To target WCAG 2.x SC 1.4.3
  **4.5:1**, set `createTheme({ palette: { contrastThreshold: 4.5 } })`.
- `getContrastRatio(fg, bg)` utility computes the ratio (usable to validate
  contrast when both colors resolve).
- MUI docs caveat that `contrastThreshold` can be counterproductive; verify.
- `enhanceHighContrast` (forced-colors support) is **v9.1.0+ — NOT available in
  v7.3.11.** Do not rely on it.

## Version-sensitive (do not assume for v7.3.11)

- `colorSchemes` API — preferred light/dark API from **v6+**; available in v7.
- `enhanceHighContrast` — **v9.1.0+ only**, unavailable in v7.
- Palette default hexes, four tokens, breakpoint defaults, `tonalOffset` 0.2,
  `contrastThreshold` 3, `step` 5, `unit` px — **stable v5–v9**, safe for v7.

## Shape & spacing defaults (from MUI default-theme; stable v5–v9)

- `theme.shape.borderRadius` **default = `4`** (px). *Org overrides to 8px — see
  org config; if code renders 4px radius, the org override likely leaked.*
- `theme.spacing` base unit **default = `8px`**; `spacing(1)=8px`, `spacing(2)=16px`.
  Supports up to 4 args (`spacing(1,2)='8px 16px'`).
- **Spacing conflict to enforce:** the org uses a **4px** grid. If the org theme
  sets `spacing: 4`, then `sx={{ p: 2 }}` = 8px (`4 × 2`). Review must interpret
  `sx` numeric spacing through the **org spacing factor**, not MUI's default 8.
  The exact org `theme.spacing` setting is **[TODO — org theme file]**.
- Custom spacing forms: number (`spacing: 4`), function
  (`(f) => `${0.25*f}rem``), or array (`[0,4,8,16,...]`, positive-int indexes
  only — no `spacing(0.5)`/negatives/`'auto'`).

## Typography defaults (from MUI default-theme; stable v5–v9)

- Default `fontFamily`: `"Roboto","Helvetica","Arial",sans-serif`. *The org sets
  its own family (`token-resolution.md` "Font family") — org override required;
  Roboto in output = missing override.*
- `theme.typography.fontSize` default = `14`; `htmlFontSize` default = `16`.
- 13 variants: `h1–h6, subtitle1, subtitle2, body1, body2, button, caption,
  overline`. Default weight/size/line-height (verbatim from default theme):
  h1 `300 6rem/1.167` · h2 `300 3.75rem/1.2` · h3 `400 3rem/1.167` ·
  h4 `400 2.125rem/1.235` · h5 `400 1.5rem/1.334` · h6 `500 1.25rem/1.6` ·
  subtitle1 `400 1rem/1.75` · subtitle2 `500 0.875rem/1.57` ·
  body1 `400 1rem/1.5` · body2 `400 0.875rem/1.43` · button `500 0.875rem/1.75` ·
  caption `400 0.75rem/1.66` · overline `400 0.75rem/2.66`.
- `button` variant default `textTransform: uppercase` (from component CSS). *Org
  do's-and-don'ts require `textTransform: 'none'` on buttons — a Review check.*
- Usage: `<Typography variant="h6" component="h2">`; custom element mapping via
  `MuiTypography.defaultProps.variantMapping`.
- `fontWeightLight/Regular/Medium/Bold` named token numbers **not covered** in
  source (standard 300/400/500/700 not quoted) — **[VERSION-CHECK: MUI 7.3.11]**.

## MUI default palette — full (for detecting un-overridden defaults)

Light: `background.default/paper #fff` · `text.primary rgba(0,0,0,.87)` ·
`text.secondary rgba(0,0,0,.6)` · `text.disabled rgba(0,0,0,.38)` ·
`divider rgba(0,0,0,.12)`. Role defaults (`light/main/dark`) as in the table
above; all `contrastText #fff`. Dark: `background #121212`,
`text.primary #fff`, `primary.main #90caf9`, `error.main #f44336`, etc. These are
**MUI defaults, never org brand values** — seeing them in output signals a
missing org theme override.

## z-index defaults (stable) — relevant for Dialog/Snackbar

`appBar 1100` · `drawer 1200` · `modal 1300` (Dialog) · `snackbar 1400` ·
`tooltip 1500`.

## Component API facts (for Generation to emit / Review to validate)

Enum values and props below are from the MUI docs (v9.3.1) and are **stable for
v7.3.11 unless flagged**. Where the served docs use v9 `slots`/`slotProps`, the
**v7.3.11 flat-prop equivalent is given** — Generation must emit the v7 form and
Review must flag v9-only syntax.

### Button
- `variant`: `text` (default) | `contained` | `outlined`.
- `color`: `inherit|primary(default)|secondary|success|error|info|warning`.
- `size`: `small|medium(default)|large`.
- Props: `disabled`, `href` (renders `<a>`), `startIcon`, `endIcon`,
  `fullWidth`, `disableElevation`, `disableRipple` (⚠️ removes `:focus-visible`
  styling — a11y risk).
- `loading` (bool) + `loadingIndicator`, `loadingPosition` —
  **available since v6.4.0, so valid in v7.3.11** ✅.
- Disabled sets `pointer-events:none` and `.Mui-disabled` (no doc-stated
  opacity). Applying a semantic color via `color="error"` is the compliant path,
  not `sx={{ color:'#hex' }}`.
- ⚠️ `nativeButton` prop appears **v9-only** — do NOT emit for v7.3.11.

### TextField
- `variant`: `outlined` (default) | `filled` | `standard`.
- Props: `label`, `helperText`, `error`, `required`, `disabled`, `type`,
  `select`, `multiline` (+`rows`), `value`, `size`, `color`, `fullWidth`.
- Error state = `error` + `helperText` together.
- A11y: needs an explicit `id` for label association (and a `label`).
- Raw input attrs (`inputMode`, `autoComplete`): v9 uses
  `slotProps.htmlInput`; **v7.3.11 uses `inputProps={{ ... }}`** (also
  `InputProps` for adornments). **[VERSION-CHECK]** confirm v7 spelling.

### Select
- Variant follows the input: `outlined|filled|standard`.
- Pair with `FormControl` + `InputLabel` + `MenuItem`. **Outlined requires the
  label in BOTH `InputLabel` and the Select `label` prop** (float animation).
- Props: `value`, `onChange`, `labelId`, `id`, `multiple` (value is always an
  array), `native`, `defaultValue`, `open`, `error`, `disabled`.
- No `placeholder` prop. A11y: needs an accessible name via `labelId`↔`InputLabel`
  or `aria-label` on `inputProps`.

### Checkbox
- Props: `checked`, `defaultChecked`, `indeterminate`, `disabled`, `color`,
  `size` (`small`), `required`, `icon`, `checkedIcon`, `indeterminateIcon`.
- Pair with `FormControlLabel` for the visible label; group with `FormGroup`.
- Standalone a11y label: v9 `slotProps={{input:{'aria-label'}}}` →
  **v7: `inputProps={{ 'aria-label': ... }}`** ⚠️.

### Radio
- Props: `checked`, `value`, `disabled`, `color`, `size`, `name`. Use inside
  `RadioGroup` (`value`, `onChange`, `name`, `row`, `aria-labelledby`).
- Pair each with `FormControlLabel`; group under `FormControl` + `FormLabel`.
- Standalone a11y: **v7 `inputProps={{ 'aria-label' }}`** ⚠️.

### Chip
- `variant`: `filled` (default) | `outlined`.
- `color`: `default|primary|secondary|error|info|success|warning`.
- `size`: `medium` (default) | `small`.
- Props: `label`, `onClick` (→ clickable), `onDelete` (→ shows delete icon),
  `icon`, `avatar`, `deleteIcon`, `clickable`, `component`, `href`, `disabled`.
- A11y: clickable/deletable Chip is a button in tab order; Backspace/Delete
  fire `onDelete`, Escape blurs. (Maps to org `with-close` state via `onDelete`.)

### IconButton
- `color`: `inherit|default(default)|primary|secondary|error|info|success|warning`.
- `size`: `small|medium(default)|large` — **exact px not doc-stated**
  (**[VERSION-CHECK]**; org touch-target min still applies: 40 mobile/48 web).
- Props: `disabled`, `edge` (`start|end|false`), `disableRipple` (⚠️ a11y),
  `loading` (**v6.4.0+, valid in v7.3.11** ✅).
- A11y: docs demo `aria-label` on every IconButton — treat as **required
  convention** (no explicit normative "MUST" quote exists; do not cite one).

### Dialog
- Subcomponents: `DialogTitle`, `DialogContent`, `DialogContentText`,
  `DialogActions`.
- Props: `open`, `onClose`, `maxWidth`, `fullWidth`, `fullScreen`,
  `scroll` (`paper`|`body`).
- Alert-style dialogs: use `role="alertdialog"`. Focus trap is inherited from
  Modal (auto-trap **not restated** on the Dialog page — treat as MUI behavior).
- Transition: v9 `slots/slotProps.transition` →
  **v7 `TransitionComponent`/`TransitionProps`** ⚠️.

### Snackbar
- Props: `open`, `autoHideDuration` (ms), `onClose(event, reason)`, `message`,
  `action`, `anchorOrigin` (`{vertical,horizontal}`), `key`.
- **No `severity` prop** — nest an `<Alert>` child for severity.
- Content region carries `role="alert"`; dismiss on Escape
  (`reason==='escapeKeyDown'`). Default transition `Grow`.
- Transition/clickAway: v9 `slots/slotProps` → **v7 `TransitionComponent` /
  `TransitionProps` / `ClickAwayListenerProps`** ⚠️.

### Alert
- `severity`: `success(default)|info|warning|error`.
- `variant`: `standard` (default) | `filled` | `outlined`.
- Props: `severity`, `variant`, `onClose` (shows ✕), `action`, `icon`
  (`false` hides), `iconMapping`, `color`. `AlertTitle` subcomponent for titles.
- Renders `role="alert"` (= `aria-live="assertive"`); use `role="status"` for
  less urgent. Color must not be the only signal.
- Outlined inside Snackbar: set `sx={{ bgcolor: 'background.paper' }}`.

## Version-sensitive summary (v7.3.11 vs served v9.3.1 docs)

- **Emit flat props, not `slots`/`slotProps`:** `inputProps` (Checkbox/Radio/
  Select/TextField aria & htmlInput), `TransitionComponent`/`TransitionProps`
  (Dialog/Snackbar), `ClickAwayListenerProps` (Snackbar). Review flags v9
  `slots`/`slotProps` in v7 code as a version mismatch.
- **Available in v7.3.11:** `loading` on Button/IconButton (v6.4.0+).
- **v9-only — do NOT emit:** Button `nativeButton`; `enhanceHighContrast`.
- **[VERSION-CHECK: MUI 7.3.11]:** exact `fontWeight*` token numbers; IconButton
  size px; confirm `inputProps` vs `slotProps.htmlInput` spelling in v7.

## [TODO — still needs a source]

- Full MUI **breakpoint object incl. `xl:1536`** corroborated (only 600/900/1200
  seen in the default-theme dump) — minor; org overrides breakpoints anyway.
- `sx` shorthand → spacing prop list (p/m/px/py/gap, …) lives on the System page
  — fetch if Review must validate every `sx` spacing key by name.
- **v7.3.11-specific** confirmation of the `[VERSION-CHECK]` items above.
