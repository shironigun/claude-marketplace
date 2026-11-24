# Alerts (Generation knowledge)

> **Illustrative example values.** This bundled copy is the template and a worked
> example, not any real organization's design system. The org's own copy lives in
> the local overlay `.claude/design-intelligence/generation/alerts.md`, which the
> skills read instead of this file when it exists (see
> `../../_shared/config/org-design-system.md`).

Alert/snackbar variants, severities, colors, and states Generation uses. Org
values only; MUI `Alert`/`Snackbar` API (props, `role="alert"`, v7 vs v9 syntax)
lives in `_shared/knowledge/mui-reference.md`. Source: web `design.md`
(Inbox module).

## Severities

`error` · `warning` · `info` · `success` — MUI `Alert severity=` values.

## Variants and colors (org, as documented in web `design.md`)

### Lightweight (subtle background)
| Severity | background | icon | text |
|---|---|---|---|
| error | `#FDEDED` | `#D64541` | `#5F2120` |
| warning | `#FFF4E5` | `#F5A524` | `#663C00` |
| info | `#E5F6FD` | `#2196F3` | `#014361` |
| success | `#EDF7ED` | `#43A047` | `#1E4620` |

### Outline (border emphasis)
| Severity | border | icon | text |
|---|---|---|---|
| error | `#FDEDED` `[TODO?]` | `#D64541` | `#000000` |
| warning | `#FFF4E5` `[TODO?]` | `#F5A524` | `#000000` |
| info | `#E5F6FD` `[TODO?]` | `#2196F3` | `#000000` |
| success | `#EDF7ED` `[TODO?]` | `#43A047` | `#000000` |

`[TODO?]` The web source lists the outline **border-color** as the same value as
the lightweight **background** (e.g. error border `#FDEDED`), which is a very
light fill — likely a source typo (a border usually uses the icon/severity hue).
Confirm intended outline border colors with the owner.

### Filled (solid)
| Severity | background | icon | text |
|---|---|---|---|
| error | `#FF5252` | `#FFFFFF` | `#FFFFFF` |
| warning | `#FB8C00` | `#FFFFFF` | `#FFFFFF` |
| info | `#2196F3` | `#FFFFFF` | `#FFFFFF` |
| success | `[CONFLICT]` | `#43A047` | `#43A048` |

`[CONFLICT]` Filled `success` in the web source has no clear background and mixes
`icon #43A047` / `text #43A048` (unlike the white-on-color pattern of the other
filled severities). Needs owner confirmation of the filled-success background and
icon/text colors.

## Mapping to MUI (v7.3.11)

- `variant`: org **lightweight → MUI `standard`**, **outline → MUI `outlined`**,
  **filled → MUI `filled`**. *(MUI variants: standard/filled/outlined — see
  mui-reference.md.)*
- Use `severity` for meaning; per-severity color/icon overrides via `iconMapping`
  or theme, not inline hex.
- Transient feedback: nest `<Alert>` inside `<Snackbar>` (Snackbar has no
  `severity`). Persistent inline message: `<Alert>` directly.

## States

- Dismissible via `onClose` (renders ✕); optional `action`; optional custom
  `icon`. Color must not be the only signal — keep the icon + text.
