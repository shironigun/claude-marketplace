# Icon Mapping (canonical shared knowledge)

> **Illustrative example.** This bundled copy shows the format with a short,
> generic sample. The org's real mapping (extracted from its own Figma `Icons`
> component) lives in the local overlay
> `.claude/design-intelligence/knowledge/icons.md` + `icons.json`, which the skills
> read instead of these files when they exist (see
> `../config/org-design-system.md`).

Authoritative mapping of **app/Figma icon names → approved Google Material /
MUI icon names**, extracted verbatim from the organization's `Icons` component.
No mapping is invented or inferred; entries absent from the source are UNKNOWN.

## Naming convention (owner-confirmed)

Each icon node in the source is named `AppIconName (MUI name)`:
- **AppIconName** — the icon name used inside the **org's application**.
- **MUI name** (in parentheses) — the official **Google Material / MUI** icon name.
- A **`D:` prefix** on the parenthetical is a **developer-only name**, kept as a
  distinct `dev-name` (not assumed to equal the official MUI name).

## Source (authoritative)

- **Icons component:** the org's Figma `Foundations / Icons` component — its file
  key and node id are recorded in the overlay's `sources.md`, never in this plugin.
  (A typical legend in such a file: "Icon/size/icon_name (MUI name) (e.g:
  Icon/24/Calendar (Time))".)
- **Approved icon source:** Google Material Symbols & Icons — https://fonts.google.com/icons
- **MUI icon reference:** https://mui.com/material-ui/material-icons/

Machine-readable copy: `_shared/knowledge/icons.json` (overlay: `knowledge/icons.json`).

## Icon style (org rule) — FILLED

The org application in this example uses the **Filled** style of Google Material
Symbols & Icons for **all** icons. Browse/verify every icon in the Filled style at
the official source: **https://fonts.google.com/icons** (set Style = **Filled**).

- Every mapped MUI icon below is used in its **Filled** variant.
- In MUI, this is the default `@mui/icons-material` import (Filled) —
  e.g. `import SearchIcon from '@mui/icons-material/Search'`. Do **not** use the
  Outlined / Rounded / Sharp / Two-Tone variants.
- Generation must emit Filled icons; Review must flag any non-Filled icon style.

## Status legend

- **CONFIRMED** — mapping present in the `Icons` component.
- **CONFLICT** — same app icon maps to two genuinely different MUI icons;
  both preserved, neither chosen. Owner must resolve.
- **dev-name only (D:)** — source gave only the `D:` developer name; recorded as-is.
- **UNKNOWN** — a queried app icon is NOT in this file → return UNKNOWN, never guess.

## Conflicts (unresolved — do NOT choose)

| App icon | Competing MUI icons | Note |
|---|---|---|
| `Delivered` | `DoneAll` / `LocalShipping` | [CONFLICT] two distinct meanings in source |
| `Preview` | `Visibility` / `OpenInNew` | [CONFLICT] two distinct meanings in source |

## Mapping table (16 unique app icons, illustrative)

| App/Figma icon | Approved MUI / Google icon | Status | Note |
|---|---|---|---|
| `Add` | `Add` | CONFIRMED |  |
| `Archive` | `Archive` | CONFIRMED |  |
| `ArrowDown` | `KeyboardArrowDown` | CONFIRMED | dev-name only (D:) |
| `CalendarToday` | `CalendarToday` | CONFIRMED |  |
| `Close` | `Close` | CONFIRMED |  |
| `Delete` | `Delete` | CONFIRMED |  |
| `Delivered` | `DoneAll` / `LocalShipping` | CONFLICT | **[CONFLICT]** multiple MUI targets — do not choose |
| `Download` | `Download` | CONFIRMED |  |
| `Edit` | `Edit` | CONFIRMED |  |
| `Filter` | `FilterList` | CONFIRMED |  |
| `More_vert` | `MoreVert` | CONFIRMED |  |
| `Notifications` | `Notifications` | CONFIRMED |  |
| `Preview` | `Visibility` / `OpenInNew` | CONFLICT | **[CONFLICT]** multiple MUI targets — do not choose |
| `Search` | `Search` | CONFIRMED |  |
| `Settings` | `Settings` | CONFIRMED |  |
| `Sort` | `SwapVert` | CONFIRMED |  |

## How the pipeline uses this

Read by the existing skills as the authoritative icon source (referenced, never copied):
- **figma-design-analysis** — resolve a Figma icon's app name here; tag CONFIRMED / CONFLICT / UNKNOWN.
- **figma-to-code** — map app icon → approved MUI icon in the spec; carry CONFLICT/UNKNOWN forward, never pick a side.
- **design-system-generation** — import the mapped MUI icon from `@mui/icons-material` in the **Filled** style (see "Icon style" rule above); if UNKNOWN, do not invent an icon.
- **design-system-review** — flag any icon that is not the approved MUI mapping, or an UNKNOWN/CONFLICT icon used without resolution.

## Handling unmapped icons

If an app icon is not in the table, the correct result is **UNKNOWN** — do not
substitute a visually similar icon. Add it to the `Icons` component, then re-ingest
into the overlay copy.
