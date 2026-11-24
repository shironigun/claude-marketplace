# Colors (Generation knowledge)

> **Illustrative example values.** This bundled copy is the template and a worked
> example, not any real organization's design system. The org's own copy lives in
> the local overlay `.claude/design-intelligence/generation/colors.md`, which the
> skills read instead of this file when it exists (see
> `../../_shared/config/org-design-system.md`).

Semantic colors and palette-usage rules Generation applies. Org values only;
MUI defaults live in `_shared/knowledge/mui-reference.md`; the machine-checkable
token→value map Review shares is `_shared/config/token-resolution.md` (this file
must stay consistent with it). Sources: web + mobile `design.md`.

## Palette-usage rules (how to apply color)

- Apply semantic color via the **`color` prop / palette token**
  (`<Button color="error">`, `theme.palette.error.main`), never a raw hex in
  `sx`. *Source: web do's & don'ts ("never hardcode hex").*
- Muted text: `color="text.secondary"`, not `opacity`/`grey`.
- Never use raw literals (`#f44336`, `red`); always a token.
- Test light and dark after every change.

## Confirmed semantic values (org)

| Role / token | Value | Source |
|---|---|---|
| `primary.main` / active-selected-focused | `#2F5DA8` | web: Inbox-module primary + Active State Rule |
| `error.main` (web) | `#D64541` | **Owner-approved**: the web-sourced Alert `error` severity icon/text color (below) is now the general web `error.main` role token. Previously `[TODO]`. |
| Border / outline | `#C8CCD2` | web: Border |
| Indication bg / text | `#E0245E` / `#FFFFFF` | web: Indication |
| Applied-filter chip bg / icon / text | `#EEF0F3` / `#B5BAC1` / `#000000` | web: Applied filter |
| Chip unassigned bg / icon | `#FEF3C7` / `#A16207` | web: Chip |
| Chip location/department icon | `#4B5563` | web: Chip |
| Tab default (icon/text) | `#64748B` | web: Tabs-rule |
| Sorting button default / active | `#B5BAC1` / `#2E5BA6` | web: Button > sorting |

> **Active State Rule:** `#2F5DA8` is the single source of truth for all
> active / selected / focused states. *Source: web `design.md`.*

## Resolved role palette & surfaces — mobile (from `mobile design.md`)

Platform-labeled **mobile** values (full table + dark mode in
`../../_shared/config/token-resolution.md`). **Do not promote to web/global.**

| Token | Mobile light | Source |
|---|---|---|
| `error.main` | `#D64541` | mobile `design.md` |
| `warning.main` | `#F5A524` | mobile `design.md` |
| `success.main` | `#43A047` | mobile `design.md` |
| `info.main` | `#2196F3` | mobile `design.md` |
| `background.default` | `#FFFFFF` | mobile `design.md` |
| `background.paper` | `#F5F5F5` | mobile `design.md` |
| `text.primary` | `#212121` | mobile `design.md` |
| `divider` | `#C8CCD2` | mobile `design.md` |

Mobile **dark-mode** values are recorded as PLATFORM_SPECIFIC in
`token-resolution.md`.

## `[TODO / CONFLICT — still unresolved]`

Do not invent these — apply the token in code and let the theme resolve them:

- `secondary.main` — `[CONFLICT]` web implies `#2F5DA8` (secondary outline-button);
  mobile `design.md` uses `#F57C00`. Needs owner's canonical value.
- **Web** role palette (`warning/success/info.main`) and **web** surfaces
  (`background.default/paper`, `text.primary`, `divider`) — not defined as
  concrete hex in web source. (Mobile values above are resolved. `error.main`
  is now resolved for web — see "Confirmed semantic values" above — this
  approval does not extend to `warning/success/info.main`.)
- **Web** dark-mode values — undefined in web source.

## Rule for Generation

Always reference the semantic token in code (`color="error"`, `error.main`).
Even where the resolved hex is `[TODO]`, using the token is correct — the theme
supplies the value. Only log a `design_decision` if forced to deviate.
