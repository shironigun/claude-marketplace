# Token Resolution (shared source of truth)

> **Illustrative example values.** This bundled copy is the template and a worked
> example, not any real organization's palette. The org's real values live in the
> local overlay `.claude/design-intelligence/config/token-resolution.md`, which the
> skills read instead of this file when it exists (see `org-design-system.md`).
> Section names and `design.md` citations below show the citation style only.

The minimum token → configured-value mapping Review needs to (a) confirm a used
token is valid and (b) compute contrast where both colors resolve. **Both skills
reference this file; neither restates the palette.** Values are taken only from
existing project material; anything not defined there is marked
**[TODO / source required]** and must not be invented.

## Resolved tokens (sourced from web `design.md`)

| Token / role | Value | Source |
|---|---|---|
| `theme.palette.primary.main` | `#2F5DA8` | Inbox module `primary.main`; "Active State Rule" |
| `theme.palette.error.main` (web) | `#D64541` | **Owner-approved** — the existing web-sourced Alert `error` severity icon/text color (alerts.md) was explicitly approved by the design-system owner as the general web `error.main` role token. Previously `[TODO]`; resolved as of this decision. |
| Active / selected / focused state color | `#2F5DA8` | "Active State Rule" — single source of truth for active states |
| Border / outline color | `#C8CCD2` | Border section |
| Indication background / text | `#E0245E` / `#FFFFFF` | Indication section |
| Applied-filter chip bg / icon / text | `#EEF0F3` / `#B5BAC1` / `#000000` | Applied filter section |
| Chip (unassigned) bg / icon | `#FEF3C7` / `#A16207` | Chip tokens |
| Chip (location, department) icon | `#4B5563` | Chip tokens |
| Sorting button default (icon/text) | `#B5BAC1` | Button > sorting |
| Sorting button active (icon/text) | `#2E5BA6` | Button > sorting |
| Tab default (icon/text) | `#64748B` | Tabs-rule |
| Tab active — category A / B / C / D | `#2E5BA6` / `#C0392B` / `#1F6FEB` / `#8E44AD` | Active-switchable-tab-color |
| Alert `error` (lightweight bg/icon/text) | `#FDEDED` / `#D64541` / `#5F2120` | alert-lightweight |
| Alert `warning` (lightweight bg/icon/text) | `#FFF4E5` / `#F5A524` / `#663C00` | alert-lightweight |
| Alert `info` (lightweight bg/icon/text) | `#E5F6FD` / `#2196F3` / `#014361` | alert-lightweight |
| Alert `success` (lightweight bg/icon/text) | `#EDF7ED` / `#43A047` / `#1E4620` | alert-lightweight |
| Alert `error` / `warning` / `info` (filled bg) | `#FF5252` / `#FB8C00` / `#2196F3` | alert-filled |
| Category bg — category A / B / C / D | `#2E5BA6` / `#C0392B` / `#1F6FEB` / `#F57C00` (with 11/15/10/12% opacity) | category-backgroundcolor |

## Resolved configuration values (non-color)

| Rule | Value | Source |
|---|---|---|
| Font family | `Inter` (300/400/500/600/700) | Typography |
| Type scale (px) | 32, 24, 20, 18, 16, 14, 12, 11 | Typography |
| Spacing grid | multiples of 4px (chips/tags 2px) | Spacing & Layout |
| Border radius | `8px` (see representation rule below) | Border |
| Touch target — web | `48px` | web `design.md` Accessibility / Button |
| Touch target — mobile | `40px` | mobile `design.md` (owner correction) |
| Breakpoints — web | xs 0–599 · sm 600–904 · md 905–1239 · lg 1240–1439 · xl 1440+ | web `design.md` |
| Breakpoints — mobile | xs 320–479 · sm 480–599 · md 600–767 · lg 768–1023 · xl 1024+ | mobile `design.md` |
| Contrast thresholds | text ≥ 4.5:1 · large text / UI ≥ 3:1 | WCAG 2.1 AA |

## Elevation — web (from `web design.md`)

MUI `elevation` prop range **0–24**. Levels as documented in web `design.md`; do not
invent additional mappings. *Source: web `design.md` "Elevation & Shadows".*
Platform-labeled **web** (mobile `design.md` documents its own elevation guidance
separately; not merged here).

| Level | dp | Component examples |
|---|---|---|
| 0 | 0dp | Background, flat surfaces |
| 1 | 1dp | Cards (resting), text fields |
| 2 | 3dp | Cards (raised), search bar |
| 3 | 6dp | FAB (resting), snackbar |
| 4 | 8dp | Bottom navigation, menus |
| 5 | 12dp | FAB (pressed), dialogs |
| 6 | 16dp | Modals, drawers |
| 8 | 24dp | Navigation drawers |

## Resolved role palette — mobile (from `mobile design.md`)

Platform-labeled **mobile** semantic role values. **Do not promote to web/global** —
the web `design.md` does not define these role hexes.

| Role | Mobile light | Source |
|---|---|---|
| `error.main` | `#D64541` | mobile `design.md` (Primary Palette) |
| `warning.main` | `#F5A524` | mobile `design.md` |
| `success.main` | `#43A047` | mobile `design.md` |
| `info.main` | `#2196F3` | mobile `design.md` |

## Resolved surfaces — mobile light (from `mobile design.md`)

Platform-labeled **mobile light-mode**. Web surface values remain **[TODO]** (the
web `design.md` names the tokens but defines no concrete hex).

| Role | Mobile light | Source |
|---|---|---|
| `background.default` | `#FFFFFF` | mobile `design.md` (Surface & Background) |
| `background.paper` | `#F5F5F5` | mobile `design.md` |
| `text.primary` | `#212121` | mobile `design.md` |
| `divider` / outline | `#C8CCD2` | mobile `design.md` |

## Mobile dark-mode palette — PLATFORM_SPECIFIC (mobile only)

Recorded as **mobile dark mode**; **not** the web dark theme (web dark mode is
undefined — see [TODO] below).

| Role | Mobile dark | Source |
|---|---|---|
| `error.main` | `#FF5252` | mobile `design.md` |
| `warning.main` | `#FB8C00` | mobile `design.md` |
| `success.main` | `#66BB6A` | mobile `design.md` |
| `info.main` | `#64B5F6` | mobile `design.md` |
| `background.default` | `#121212` | mobile `design.md` |
| `background.paper` | `#1E1E1E` | mobile `design.md` |
| `text.primary` | `#FFFFFF` | mobile `design.md` |
| `divider` / outline | `#3C3C3C` | mobile `design.md` |

## [TODO / source required]

Do **not** invent these — each needs the design-system owner or a MUI theme file:

- **`theme.palette.secondary.main`** — **[CONFLICT]:** web `design.md` implies
  `#2F5DA8` (secondary outline-button); mobile `design.md` uses `#F57C00`.
  *Needs:* the owner's canonical secondary value.
- **Web role palette** (`warning/success/info.main`) and **web surfaces**
  (`background.default/paper`, `text.primary`, `divider`) — web `design.md` pins
  only *alert-specific* hexes and token names, not web role/surface hexes.
  *Needs:* a web theme source. (Mobile role/surface values above are resolved.
  `error.main` is now resolved for web — see the Resolved tokens table above —
  the owner has not yet approved the same treatment for `warning/success/info.main`,
  so those remain `[TODO]`; do not extend this decision to them without a
  separate owner approval.)
- **Web dark-mode values** — undefined in web source. (Mobile dark mode is
  resolved above as platform-specific.)
- **`theme.spacing` factor** — the docs confirm a **4px grid** as a design rule,
  but do **not** define the MUI `theme.spacing` multiplier/base. UNKNOWN.
- **`theme.shape.borderRadius` base** — the docs confirm **8px** as a design
  value, but do **not** define it as the MUI `theme.shape.borderRadius` base
  (see radius-representation rule). UNKNOWN.

## Contrast-check note (for Review)

Review can compute contrast **only when both foreground and background resolve to
a confirmed hex above**. When either side is a **[TODO]** token, contrast is not
objectively computable — Review must skip that specific check and note it, not
guess a value. Hardcoded hex is still flagged separately as a token-usage
violation regardless of its contrast. Where both colors resolve, contrast may be
computed with MUI's `getContrastRatio(fg, bg)` (see
`../knowledge/mui-reference.md`).

## Border-radius representation (E2E issue #1)

The org radius is **8px**. MUI's `theme.shape.borderRadius` default is `4`, and
`sx={{ borderRadius: n }}` multiplies that base (`n × shape.borderRadius`). A
bare multiplier is therefore ambiguous unless the base is known. Rule:

- **Generation MUST express radius as an explicit 8px**, one of:
  - `sx={{ borderRadius: '8px' }}` (explicit unit — unambiguous), or
  - rely on the theme when `theme.shape.borderRadius` is confirmed `8`, then
    `borderRadius: 1` = 8px. Until the theme value is confirmed **[TODO — org
    theme file]**, prefer the explicit `'8px'` form and do not use a bare
    numeric multiplier for radius.
- **Review resolves radius deterministically:** PASS if the value is an explicit
  `8px` (any unit form resolving to 8px). If it is a bare multiplier
  (`borderRadius: 2`) whose base (`theme.shape.borderRadius`) is unconfirmed,
  raise a **major** finding "radius not pinned to 8px" (not a pass, not a
  blocker) until the theme radius base is confirmed.

## MUI-provided states (E2E issue #2)

Some states are supplied by MUI automatically and need no explicit code:
**`focus`** (`.Mui-focusVisible`), **`active`/pressed** (ButtonBase ripple),
**`hover`** (web), and **`disabled`** (`.Mui-disabled`). Deterministic rule so
Generation and Review cannot disagree:

- These MUI-auto states count as **implemented by default** and Generation
  **still lists them** in `states_implemented` (so the manifest is a complete
  record). Marker convention: append `(mui-auto)`, e.g.
  `focus (mui-auto)`, `active (mui-auto)`.
- Generation MUST NOT use `disableRipple`/`disableFocusRipple` on interactive
  components — doing so removes MUI's `:focus-visible`/active styling and voids
  the auto guarantee. If it does, those states are **not** satisfied and must be
  authored explicitly.
- **Review:** a required state present as either an explicit implementation or a
  `(mui-auto)` entry = satisfied — UNLESS `disableRipple`/`disableFocusRipple`
  is set on that component, in which case `focus`/`active` marked `(mui-auto)`
  is a **blocker** (claimed-but-voided).
- States that are NEVER mui-auto and must always be authored/handled explicitly:
  `error`, `loading`, `selected`, `checked`, `unchecked`, `indeterminate`,
  `open`, `success`, `empty`, `with-close`.

## MUI framework defaults (for detecting un-overridden defaults)

These are **MUI's default palette values, NOT the org's brand values** (full
table + source in `../knowledge/mui-reference.md`). If generated code renders a
role at one of these exact hexes, the org theme override is likely missing — a
compliance signal, not an approved value:

| Role | MUI default `main` |
|---|---|
| primary | `#1976d2` |
| secondary | `#9c27b0` |
| error | `#d32f2f` |
| warning | `#ed6c02` |
| info | `#0288d1` |
| success | `#2e7d32` |

The org's confirmed `primary.main` is `#2F5DA8` in this example (above); seeing `#1976d2`
instead means the MUI default leaked through.
