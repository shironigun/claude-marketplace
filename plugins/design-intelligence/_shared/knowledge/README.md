# Shared Knowledge — Index

Pointer index to the authoritative design-system sources. This file does **not**
duplicate their content — both Generation and Review read the originals. `config/`
holds the distilled, machine-referable rules; this folder points to the full
source material behind them.

The org's own sources are named in the local overlay's
`.claude/design-intelligence/sources.md` (see `../config/org-design-system.md`).
The plugin never ships an organization's file names, Figma file keys or node ids.

## Sources

| Source | What it provides | Where it comes from |
|---|---|---|
| Web `design.md` | Colors/tokens, typography, spacing, elevation, components, WCAG rules, do's & don'ts (web touch target) | The org's web design spec, located via `sources.md` |
| Mobile `design.md` | Mobile-adapted rules, component states, breakpoints, mobile touch target | The org's mobile design spec, located via `sources.md` |
| Figma component library | Authoritative component + state matrix (e.g. Input field: Default/Hover/Active/Error) | The org's Figma library file + page, located via `sources.md` |
| MUI reference (`mui-reference.md`) | Palette/theming/breakpoints/a11y framework facts, from the MUI MCP | Bundled (organization-neutral) |
| MUI component API / typography / spacing / shape | Component variants/props, type scale, spacing, radius defaults | Bundled, partially captured — see `mui-reference.md` [TODO] |
| **Icon mapping (`icons.md` + `icons.json`)** | **Authoritative app/Figma icon name → approved Google/MUI icon-name mapping, extracted from the org's `Icons` component. The single source of truth for icon names — read by analysis, figma-to-code, generation, and review.** | The overlay's `knowledge/icons.md` + `icons.json`; the bundled copies are a short illustrative example |

## Distilled rules live in `config/`

- `config/org-design-system.md` — where the org's values come from (local overlay,
  resolution rule, Step 0).
- `config/manifest-schema.md` — the Generation manifest structure.
- `config/required-states.md` — required states per component.
- `config/token-resolution.md` — token → value mapping + contrast inputs.

## Framework knowledge lives in `knowledge/`

- `knowledge/mui-reference.md` — authoritative MUI framework facts (palette,
  theming, breakpoints, a11y), kept separate from org-specific values.

## Generation's own design-system knowledge (not in `_shared`)

Org-specific *implementation* knowledge lives in the Generation skill folder, not
here (`_shared` holds only the cross-skill contract). For reference:
`skills/design-system-generation/{typography,colors,alerts,component-guidelines}.md`
(overridden by the overlay's `generation/` copies).
Review does not read these — it evaluates against `_shared/config` + the original
request.

## Open extraction

- **Full component/state matrix** from the Figma library is only partially
  captured. Completing it resolves the `[TODO]` component entries in
  `required-states.md`.
- **MUI theme palette file** is needed to resolve the `[TODO]` palette roles in
  `token-resolution.md`.
