# Design Intelligence — Skill Architecture Map (Final Classification)

Planning document. Classifies every proposed item with a strict rule set, so we
build only genuine skills. **Nothing here is built beyond the two frozen P0
skills** — this is the approved plan we execute one skill at a time.

## Classification rule

- **EXISTING** — already built; reuse, never duplicate.
- **NEW SKILL** — an executable/reusable capability with its own workflow,
  inputs, outputs, and decision-making. Only this category becomes a `SKILL.md`.
- **KNOWLEDGE** — reference material another skill consumes; no workflow.
- **REVIEW DIMENSION** — a check that lives inside `design-system-review`; not an
  independent workflow.
- **DUPLICATE** — already covered by an existing skill; do not create.
- **FUTURE/DEFERRED** — real later, not now.

Frozen and unchanged: **design-system-generation**, **design-system-review**.

## Group evaluations (skill vs knowledge)

**MUI group → all KNOWLEDGE.** `mui-core`, `mui-version`, `mui-components`,
`mui-styling`, `mui-theming`, `mui-accessibility` describe how the framework
behaves — they have no workflow, inputs, or outputs of their own; Generation and
Review *consume* them. They already live in `_shared/knowledge/mui-reference.md`.
Making them seven skills would be seven reference docs masquerading as
capabilities. `mui-motion` is FUTURE knowledge. **Net: 0 skills, 1 existing
knowledge file (extend in place if a gap appears).**

**Design System group → all KNOWLEDGE.** `design-system-foundations`,
`-patterns`, `-rules`, `responsive-design-system` are principles/tokens/rules —
reference, not workflows. They already exist in Generation's knowledge
(`typography.md`, `colors.md`, `alerts.md`, `component-guidelines.md`) and
`_shared/config/*`. Enforcement is done by Review; authoring by Generation.
**Net: 0 new skills.**

**visual-comparison → NEW SKILL, FUTURE-DEFERRED (P1).** Genuinely different from
`design-system-review`, not a Review dimension:
- **Oracle:** a *specific reference design/frame* — NOT the design-system rulebook
  or the original intent. (A build can be Review-PASS yet diverge from the frame.)
- **Inputs:** a rendered implementation/screenshot + the specific Figma reference
  frame, plus optional `figma-design-analysis` evidence.
- **Workflow:** render/capture → obtain reference → align → compare → produce
  fidelity deltas.
- **Output:** a visual/structural **delta report** — it must **NOT** produce a
  design-system compliance PASS/FAIL.
- **Authority boundary:** `design-system-review` remains the sole authority for
  compliance, accessibility, responsive/state quality, and final PASS/FAIL;
  visual-comparison only supplies deltas Review may consume as evidence.
- **Dependencies:** Figma MCP + rendering/screenshot/image-comparison tooling
  (which Review does not use).
- **Status:** DEFERRED until that tooling is available and we're ready to measure
  reference fidelity. Remains LAST in the creation order.

**Accessibility group → KNOWLEDGE + a permanent REVIEW DIMENSION.**
`accessibility-foundations` = WCAG reference (KNOWLEDGE). **`accessibility-review`
= REVIEW DIMENSION (FINAL)** — it stays inside `design-system-review`, which
already checks contrast, touch targets, aria, and focus against the same shared
rulebook. It is **not** split into a standalone `accessibility-review/SKILL.md`:
doing so has no independent workflow/input/output, would duplicate a11y logic,
and would risk contract drift with Review. Standalone accessibility auditing is
**deferred to the future `accessibility-testing` capability**, which would
require a genuinely different input/workflow/tooling (arbitrary external
artifacts or rendered-page/runtime testing) — not a re-slice of Review.
**Net: 0 skills; a11y remains a Review dimension.**

## Final classification table

| Item | Classification | Responsibility | Dependencies | Decision |
|---|---|---|---|---|
| design-system-generation | EXISTING | Build compliant UI from intent/Figma | `_shared`, gen knowledge | KEEP (frozen) |
| design-system-review | EXISTING | Evaluate UI vs system + intent | `_shared` | KEEP (frozen) |
| component library builder | EXTERNAL | Build one reusable component | MUI Figma | REUSE an external tool if available (not shipped in this plugin) |
| **figma-design-analysis** | **NEW SKILL** | Read-only: extract structure/tokens/components/states from a Figma file | Figma MCP | CREATE (P1) — own workflow (input: Figma URL; output: structured extraction) |
| **figma-to-code** | **NEW SKILL** | Adapter: turn a Figma frame into the input Generation builds from | Figma MCP, figma-design-analysis, Generation | CREATE (P1) — delegates building to Generation |
| figma-design-generation | DUPLICATE | = Generation with Figma input | Generation | FOLD (input mode) |
| figma-ui-design | DUPLICATE/FUTURE | Author UI in Figma (code→design) | Generation, Figma MCP | DEFER (future authoring) |
| figma-design-system | KNOWLEDGE | "DS in Figma" = building the system (Phase 0) | design.md | KNOWLEDGE |
| figma-design-rules | KNOWLEDGE | Rules for Figma usage | design.md | KNOWLEDGE (gen knowledge) |
| figma-prototyping | FUTURE | Interactive prototypes | Figma MCP | DEFER |
| figma-motion | FUTURE | Motion in Figma | Figma MCP | DEFER |
| visual-comparison | NEW SKILL / FUTURE-DEFERRED (P1) | Measure fidelity of a rendered build vs a specific reference frame → delta report (NO compliance verdict) | Figma MCP, rendering/screenshot + image-comparison tooling; optional figma-design-analysis | CREATE LAST — genuinely different oracle (specific reference, not the rulebook/intent); deferred until rendering/screenshot tooling is available |
| mui-core | KNOWLEDGE | Core concepts | mui-reference.md | KNOWLEDGE (exists) |
| mui-version | KNOWLEDGE | v7 pin / v7-vs-v9 | mui-reference.md | KNOWLEDGE (exists) |
| mui-components | KNOWLEDGE | Component API/variants/props | mui-reference.md | KNOWLEDGE (exists) |
| mui-styling | KNOWLEDGE | sx/styling mechanics | mui-reference.md | KNOWLEDGE (extend if gap) |
| mui-theming | KNOWLEDGE | createTheme/palette/typography | mui-reference.md, [TODO theme] | KNOWLEDGE (blocked on org theme) |
| mui-accessibility | KNOWLEDGE | MUI a11y mechanisms | mui-reference.md | KNOWLEDGE (exists) |
| mui-motion | FUTURE | MUI transitions/animation | mui-reference.md | DEFER |
| design-system-foundations | KNOWLEDGE | Principles, tokens | colors/typography.md | KNOWLEDGE (exists) |
| design-system-patterns | KNOWLEDGE | Composition patterns | component-guidelines.md | KNOWLEDGE (exists) |
| design-system-rules | KNOWLEDGE | Enforceable rules | `_shared/config` | KNOWLEDGE (exists) |
| responsive-design-system | KNOWLEDGE | Breakpoints/responsive rules | `_shared/config` | KNOWLEDGE (exists) |
| accessibility-foundations | KNOWLEDGE | WCAG standards | mui-reference.md, design.md | KNOWLEDGE |
| accessibility-review | REVIEW DIMENSION (FINAL) | a11y checks (contrast, touch target, aria, focus) | `_shared`, WCAG | KEEP in Review — do NOT split; standalone auditing → future accessibility-testing |
| accessibility-testing | FUTURE | Automated a11y tooling | tooling | DEFER |
| design-system-validation | DUPLICATE | = design-system-review | Review | FOLD |
| visual-design-review | REVIEW DIMENSION | Visual hierarchy | Review | KEEP in Review |
| ux-review | REVIEW DIMENSION | UX consistency | Review | KEEP in Review |
| interaction-review | REVIEW DIMENSION | Interaction/behavior | Review | KEEP in Review |
| state-review | REVIEW DIMENSION | Required-states check | Review, required-states.md | KEEP in Review |
| responsive-review | REVIEW DIMENSION | Responsive check | Review | KEEP in Review |

## Tally

- **EXISTING skills:** 2 frozen (+ an optional external component builder, not shipped here).
- **NEW skills:** 2 (`figma-design-analysis`, `figma-to-code`) — both built.
  `visual-comparison` is a NEW SKILL but FUTURE-DEFERRED (P1), built last.
  `accessibility-review` is NOT a skill (REVIEW DIMENSION, final).
- **KNOWLEDGE modules:** ~13 (all MUI, all Design System, a11y-foundations,
  figma-design-rules, figma-design-system) — most already exist in `_shared` /
  gen knowledge; extend in place, do not create as skills.
- **REVIEW DIMENSIONS (stay in Review):** visual, ux, interaction, state,
  responsive, + accessibility (until standalone is needed) = 6.
- **DUPLICATES rejected:** figma-design-generation, design-system-validation.
- **FUTURE/DEFERRED:** figma-ui-design, figma-prototyping, figma-motion,
  mui-motion, accessibility-testing.

## Recommended creation order

1. **Knowledge gap check** — confirm `mui-reference.md` + `_shared/config` +
   gen knowledge cover the KNOWLEDGE items; extend files in place only if a real
   gap appears. **No new skills.**
2. **figma-design-analysis** (NEW) — read-only, no dependency on other new
   skills; feeds Generation and Review. Build first.
3. **figma-to-code** (NEW) — depends on #2 + Generation; thin adapter, must
   delegate building to Generation.
4. **visual-comparison** (P1, FUTURE-DEFERRED) — **LAST** among planned new
   skills; deferred until rendering/screenshot + image-comparison tooling is
   available and we're ready to measure reference fidelity. Needs a rendered
   build to compare.
5. **FUTURE** — accessibility-testing (the only path to standalone a11y
   auditing), figma-ui-design, figma-prototyping, figma-motion, mui-motion.

   *Note: `accessibility-review` is not in this order — it is a permanent Review
   dimension, not a skill.*

## Guardrails

- Only NEW SKILL items get a `SKILL.md`. KNOWLEDGE extends existing files;
  REVIEW DIMENSIONs stay inside `design-system-review`.
- New skills reference org values (`_shared/config`, gen knowledge) and MUI facts
  (`mui-reference.md`); never copy, never duplicate Generation/Review.
- No new skill resolves `[TODO]`/`[CONFLICT]` without the authoritative org theme.
- Frozen P0 skills unchanged.
