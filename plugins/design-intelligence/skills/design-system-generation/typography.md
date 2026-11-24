# Typography (Generation knowledge)

> **Illustrative example values.** This bundled copy is the template and a worked
> example, not any real organization's design system. The org's own copy lives in
> the local overlay `.claude/design-intelligence/generation/typography.md`, which the
> skills read instead of this file when it exists (see
> `../../_shared/config/org-design-system.md`).

Design-system typography Generation uses to build UI. Org-specific values only;
MUI framework mechanics live in `_shared/knowledge/mui-reference.md`. Sources:
web `design.md`, mobile `design.md`.

## Font family

```
fontFamily: '"Inter", "Helvetica", "Arial", sans-serif'
```
Inter is the org font in this example (neutral sans-serif). *Source: web + mobile `design.md`.*
MUI's default is Roboto — the theme MUST override `typography.fontFamily`;
Roboto in output signals a missing override.

## Font weights

| Token | Value | Usage |
|---|---|---|
| Light | 300 | Large display text, hero subtitles |
| Regular | 400 | Body text, descriptions |
| Medium | 500 | Labels, tab text, input values |
| SemiBold | 600 | Subheadings, card titles, emphasis (custom token) |
| Bold | 700 | Primary headings, CTAs, key data |

*Source: web `design.md`. Note `fontWeightSemiBold: 600` is a custom token beyond
MUI's standard light/regular/medium/bold.*

## Type scale (org)

Org scale by size (px). `line-height: auto`, `letter-spacing: 0`,
`paragraph-spacing: 0` unless noted. *Source: web `design.md` typography block.*

| Size | Weights available | Typical usage |
|---|---|---|
| 32 | semibold, bold | Display / main screen title |
| 24 | semibold, bold | Title / section header |
| 20 | regular, medium, semibold, bold | Subtitle |
| 18 | semibold, bold | Heading |
| 16 | regular, medium, semibold, bold | Large base / body-large, subheading |
| 14 | regular, medium, bold | Small base / body |
| 12 | regular, medium, semibold, bold | Extra-small base / caption |
| 11 | regular, semibold, bold | Chip text |

**Line-height — PLATFORM_SPECIFIC (not a conflict).** Web and mobile define
line-height differently *by platform*, so apply per platform — do not reconcile
to one global value:

- **Web:** `line-height: auto`. *Source: web `design.md`.* (Web defines no
  numeric per-variant line-heights — do not invent them.)
- **Mobile:** explicit per-variant line-heights. *Source: mobile `design.md`
  type scale:* Display Large 32/40 · Display Medium 28/36 · Headline Large 24/32
  · Headline Medium 20/28 · Headline Small 18/26 · Body Large 16/24 · Body
  Medium 14/20 · Label Large 14/20 (px size / line-height).

## Usage rules

- Use `<Typography variant="...">`, never raw `<h1>`/`<p>`. *(web do's & don'ts)*
- Map to a **defined scale entry**; do not set arbitrary `fontSize`/`fontWeight`
  via `sx` for headings — pick the size+weight from the scale above.
- Buttons: `textTransform: 'none'` (org rule; overrides MUI's `uppercase`
  default). *Source: web `design.md`.*
- Use `fontWeight` tokens (500/600/700) for emphasis, not `<b>`/`<strong>`.

## Mapping to MUI variants  `[TODO — org theme file]`

The org scale (32/24/20/18/16/14/12/11 with a 600 weight) does not map 1:1 to
MUI's default variant sizes (`mui-reference.md`). Generation should target the
org sizes; the authoritative `createTheme({ typography })` that binds org sizes
to MUI variants is **[TODO]** — needs the project theme file. Until then,
Generation may set the size explicitly and log a `design_decision`.
