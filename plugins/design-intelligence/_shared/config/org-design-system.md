# Org design system: the local overlay (shared source of truth)

The plugin ships the **method** (skills, contracts, rules) plus an **illustrative
example design system** so every file has a worked shape to follow. The values in the
bundled knowledge/config files are fictional examples, not any real organization's.
Your organization's real design system is supplied at run time from a **local,
git-ignored overlay** in the project you work in. Nothing org-specific is ever
written back into the plugin's own files.

## Overlay location and layout

```text
<project root>/.claude/design-intelligence/      # git-ignored, never committed
  sources.md                     # where the org design system lives (see below)
  config/token-resolution.md     # overrides _shared/config/token-resolution.md
  config/required-states.md      # overrides _shared/config/required-states.md
  knowledge/icons.md             # overrides _shared/knowledge/icons.md
  knowledge/icons.json           # overrides _shared/knowledge/icons.json
  generation/typography.md       # overrides skills/design-system-generation/typography.md
  generation/colors.md           # overrides skills/design-system-generation/colors.md
  generation/alerts.md           # overrides skills/design-system-generation/alerts.md
  generation/component-guidelines.md  # overrides skills/design-system-generation/component-guidelines.md
  conflict-aliases.json          # optional: known conflict clusters for impact analysis
  runs/                          # run records written by capabilities/documentation/gen_docs.py
```

Each overlay file keeps the **same headings, tables, tags and rules** as the bundled
file it overrides; only the values and source citations are the org's own.
`manifest-schema.md` and `mui-reference.md` are organization-neutral and are not
overlaid.

`sources.md` records, in plain lines, where the org's design system comes from, for
example: the web and mobile `design.md` files (path or knowledge-base location), the
Figma component library (file key + page name), the Figma `Icons` component (file key
+ node id), and the MUI theme file in the codebase. Skills read it to cite sources;
they never guess a source that is not listed.

## Discovery (first run, read-only)

Find the org's design system without being told where it is. Read only; never edit a
source. Record every source found in `sources.md`.

**In the codebase (current project, and its repos if a tracker is connected)**
- **Theme:** search for `createTheme(`, `ThemeProvider`, `extendTheme(`, `palette:`,
  `typography:`, `shape:`, `spacing:` and theme/token files (`theme.ts`, `tokens.*`,
  `*.tokens.json`, `tailwind.config.*`, CSS custom properties in global styles).
  These give colors, type scale, spacing and radius → `generation/colors.md`,
  `generation/typography.md`, `config/token-resolution.md`.
- **Design docs:** search for `design.md`, `*-design.md`, `DESIGN*.md`, a `design-system/`
  or `docs/design/` folder, Storybook stories (`*.stories.*`) and a component library
  folder. These give rules, states, do's and don'ts → `config/required-states.md`,
  `generation/component-guidelines.md`, `generation/alerts.md`.
- **Icons:** collect the icon imports actually used (`@mui/icons-material/*`, an icon
  map or registry file) → `knowledge/icons.md` / `icons.json`.
- **Figma links:** collect `figma.com/design/` and `figma.com/file/` links from the
  code, docs, READMEs and connected work items; they point to the component library
  and the `Icons` component.

**In Figma (when the Figma connector is available)**
- From the links found (or the file the user's current request names), read the
  component library and the `Icons` component: component names, variants/states and
  the icon list with their names → `knowledge/icons.*`, `config/required-states.md`.
- Read variables/styles for tokens when the file publishes them; codebase theme
  values win over Figma when both exist and disagree, and the disagreement is
  recorded as `[CONFLICT]` for the user to settle.

**Only when a source is still missing**, ask for that one source (for example, "I found
your theme and icons but no design rules doc: is there one?"). Never ask for what
discovery already found.

Re-run discovery for a single file when the user says the design system changed, or
when a skill finds the overlay file it needs is missing.

## Resolution rule

Wherever a skill, the agent, or another config file names one of the overridable
files above, it means the **resolved copy**:

1. the overlay copy, when it exists;
2. otherwise the bundled copy, whose values are **examples only**.

A value taken from a bundled example is never the org's confirmed value. It may be
used only when the user has explicitly chosen to run on the bundled example (step 4
below), and every such use is logged as an `assumption`.

## Step 0: load the org design system (every skill that reads org values)

1. Look for `.claude/design-intelligence/` in the project root (read-only).
2. **Overlay present:** use the overlay copy of every file it contains. If a file the
   current skill needs is missing from the overlay, run Discovery for that file only;
   ask the user only if Discovery finds no source (or for permission to use the bundled
   example for that file, per step 4).
3. **Overlay missing (first run): build it automatically.** Do not ask the user where
   things are before looking. Run **Discovery** (below, read-only), draft every overlay
   file from what it finds, then show one summary: each value's source, plus the short
   list of gaps it could not fill. Ask only about those gaps. Write the overlay **only
   after the user approves**, and in the same approval add `.claude/design-intelligence/`
   to the project's `.gitignore` if it is not already ignored. Unresolved values stay
   `[TODO / source required]`; contradictions between sources stay `[CONFLICT]`.
4. **Demo / trial run:** if the user explicitly chooses to run on the bundled example
   instead, proceed and record the assumption
   `"design system: bundled illustrative example, not the org's"` in the output.
5. Confirm the resolved sources in one line (overlay path, or "bundled example"),
   then continue with the skill's own workflow unchanged.

On a set-up project (overlay filled with the org's real files) this step is a single
read, and every skill produces exactly what it would produce reading those files
directly. On a new project the overlay is built once by Discovery, confirmed once,
and reused from then on.

## Rules

- Never write org values, Figma file keys, node ids, or run records into the plugin's
  own folder; they belong in the overlay.
- Never invent a value to fill a gap in the overlay; `[TODO]` and `[CONFLICT]` rules
  apply to overlay values exactly as they do to the bundled files.
- `design-system-review` still reads only the `_shared/config` files (resolved
  copies) and never Generation's knowledge files, overlay or bundled.
