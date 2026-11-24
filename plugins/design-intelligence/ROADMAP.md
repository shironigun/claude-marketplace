# design-intelligence roadmap

Planned capabilities, not yet built. Each item lists what it adds and where earlier work can be reused.

## TODO: create a component library from an existing codebase

Today design-intelligence **enforces** a design system it is given (or discovers on first run). This item
lets it **build one** from a product's own code, then keep the code honest against it.

What it adds, in delivery order:

1. **Measure the real UI.** Read the codebase statically and record every style value in px, each
   component's reach (who imports it), its atomic level, duplicate families (the same component defined
   twice, identical files, repeated style blocks, competing status-to-colour maps), cross-module imports,
   unused components, and off-scale or raw values.
2. **Propose a standard.** Combine that measurement with a design canon (Atomic Design, Laws of UX,
   Nielsen/NN/g, Refactoring UI, WCAG 2.2) while keeping the product's own theme (brand colours, typefaces).
   Every open choice becomes a decision card the owner settles; no value is invented (`UNKNOWN` goes to a
   card).
3. **Publish the library.** An AI-readable spec in the product repo, generated Storybook stories, and a
   Figma component library (through the Figma connector), all from one source of truth in the repo.
   Library components are added alongside existing code, never replacing call sites on their own.
4. **Audit any time.** Group findings into families; the owner decides per family: fix now, plan it, or
   leave as is. Decisions persist, so a re-audit shows only what is new, regressed or still open.

How it fits the plugin: steps 1-2 extend Step 0 Discovery (which already reads the theme, design docs,
Storybook and icons) and write their results into the local overlay; step 3 extends
`design-system-generation` and `figma-screen-generation`; step 4 extends `design-system-review`.
Additive by default: only new files, plus dev-only package changes with approval.

**Reusable earlier work.** A standalone prototype of step 1 (a React + MUI static-analysis engine with
`detect` and `inventory` commands, JSON Schemas for the config and the inventory registry, a fixture app
with planted problems, and 233 passing tests), plus its full design spec and build plan, lives in this
repository's history. Restore it for reference with:

```bash
git checkout c511426 -- plugins/design-studio docs/superpowers
```
