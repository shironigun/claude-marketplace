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
   current skill needs is missing from the overlay, name it to the user and ask for
   its source (or permission to use the bundled example for that file only, per
   step 4) before continuing.
3. **Overlay missing (first run):** tell the user the bundled design system is an
   illustrative example, and ask where their org's design system lives (`design.md`
   files, a knowledge base, the Figma library and `Icons` component, the theme
   file). Then offer to create the overlay: copy the bundled templates, fill them
   from the sources the user named (read-only reading of those sources; unresolved
   values stay `[TODO / source required]`, contradictions stay `[CONFLICT]`), show
   the draft, and write it **only after the user approves**. In the same approval,
   propose adding `.claude/design-intelligence/` to the project's `.gitignore` if it
   is not already ignored.
4. **Demo / trial run:** if the user explicitly chooses to run on the bundled example
   instead, proceed and record the assumption
   `"design system: bundled illustrative example, not the org's"` in the output.
5. Confirm the resolved sources in one line (overlay path, or "bundled example"),
   then continue with the skill's own workflow unchanged.

On a set-up project (overlay filled with the org's real files) this step is a single
read, and every skill produces exactly what it would produce reading those files
directly.

## Rules

- Never write org values, Figma file keys, node ids, or run records into the plugin's
  own folder; they belong in the overlay.
- Never invent a value to fill a gap in the overlay; `[TODO]` and `[CONFLICT]` rules
  apply to overlay values exactly as they do to the bundled files.
- `design-system-review` still reads only the `_shared/config` files (resolved
  copies) and never Generation's knowledge files, overlay or bundled.
