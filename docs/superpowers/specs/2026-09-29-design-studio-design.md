# design-studio — plugin design spec

| | |
|---|---|
| Date | 2026-09-29 |
| Status | Draft for owner review |
| Owner | the QA analyst |
| Plugin home | `claude-marketplace/plugins/design-studio` (plugin #6 in this marketplace) |
| Pilot | The first real product the plugin runs on (React + MUI). Everything about that product — its brief, evidence and results — lives in the product's own repo, never in this plugin |
| Scope of this spec | The whole plugin's architecture, with **sub-project 1** specified in full. Sub-projects 2–6 are outlined so their seams are fixed now |

---

## 1. Summary

`design-studio` is a Claude Code plugin that runs on any product codebase and gives it a
**design standard that both people and AI can build from, pixel by pixel**.

It does four things, in this order of delivery:

1. **Measures** the product's real UI: every style value in px, every component's reach, its atomic
   level, duplicate families, and which modules are the best references.
2. **Builds a normative standard** from that measurement plus a design canon (Atomic Design,
   Don't Make Me Think, The Design of Everyday Things, Laws of UX, Nielsen/NN/g, Refactoring UI,
   WCAG 2.2). The standard keeps the product's **own theme** (brand colours, typefaces) and applies
   best practice to structure, spacing, states, accessibility and copy. The owner decides every
   open choice through **library decision cards**.
3. **Publishes the standard** as an AI-readable spec in the product repo, a Storybook library
   (sub-project 1), a Figma library (sub-project 2) and a Claude Design library (sub-project 3).
4. **Audits** existing code against the standard, any time. Findings are grouped into families,
   and the owner decides per family: **Fix now / Plan it / Leave as is**. Decisions persist, so
   re-audits show only what is new, regressed or still open.

The plugin never changes existing screens on its own. Library components are added alongside
existing code; switching call sites to them is an audit decision.

---

## 2. Goals and non-goals

### 2.1 Goals (whole plugin)

- G1. Work on any product codebase. Product knowledge lives in the product repo; the plugin stays
  generic. The first adapter is React + MUI.
- G2. Produce a spec precise enough that any AI tool (Claude, Copilot, Cursor, …) can implement UI
  to it without guessing: exact px values, full state matrices, anatomy, content rules, a11y
  contracts.
- G3. Keep one source of truth. Tokens, contracts, patterns and rules live in the product repo;
  Storybook, Figma and Claude Design are generated from them, never the other way round.
- G4. Make the design canon executable: every principle becomes a rule with an ID, a check kind, a
  threshold and a citation, shared by the linter, reviewer, audit, drift check, Storybook docs,
  Figma annotations and Claude Design guidelines.
- G5. Keep the owner in control: advisory by default, explicit decisions, recorded reasons,
  repeatable audits.
- G6. Offer research on demand: answer design questions from primary sources with citations, and
  propose new rules for the owner to accept.
- G7. Trigger naturally: skills that activate from plain requests, slash commands, light hooks,
  and (sub-project 6) a drift check when UI is deployed.

### 2.2 Non-goals (whole plugin)

- Replacing the design-intelligence plugin or Storybook's official Claude plugin. `design-studio`
  coexists with both; the user picks.
- Rebranding. The standard never changes brand colours or typefaces unless the owner decides to
  (for example, to fix a contrast failure).
- Automatic code changes to existing screens without an owner decision.
- Pixel-perfect *visual* parity with Figma screenshots as a source of truth. Code and tokens are
  the source; screenshots are never a source for numbers.

### 2.3 Sub-project 1 scope (this build)

In: the plugin skeleton and marketplace entry; the canon as data; JSON Schemas; the engine
scripts; the React + MUI adapter; seven skills (`init`, `inventory`, `standard`, `storybook`,
`audit`, `review`, `research`); five agents; two hooks; the self-test fixture and evals; the
pilot on the first real product (see §13).

Out (later sub-projects): Figma library (2), Claude Design library (3), conform (4),
prototypes and new-feature designs incl. `build-ui` (5), deploy-triggered drift (6), non-MUI
adapters, hosted Storybook with CI gating.

---

## 3. Design principles

These are the decisions that shape everything else. Each came out of the research phase.

| # | Principle | Why |
|---|---|---|
| P1 | **Generic in the plugin, specific in the product repo.** Canon, schemas, engine and adapters ship in the plugin. Profile, standard, decisions and audit history live in `design-system/` in the product repo, versioned with the code. | Prior art failed both ways: a project-local skill was git-ignored so teammates never had it, and a separate knowledge folder was lost entirely. |
| P2 | **Scripts measure, AI judges.** Counting, unit conversion, clustering, coverage, contrast and diffing are deterministic Node scripts. AI is used for tie-breaks, recommendations, walkthrough reviews and research. | Numbers must be identical run to run, or audits and ratchets are meaningless. |
| P3 | **The builder never judges its own work.** One reviewer role gives every verdict (new UI, conform fixes, drift). | Proven in design-intelligence (real FAIL → PASS loops). |
| P4 | **Canon is data.** One rule catalog with stable IDs is read by every consumer. | Keeps lint messages, Storybook do/don't blocks, Figma annotations and audit findings saying the same thing. |
| P5 | **Measure → normalize → ratify → emit.** Every token carries a `status` (`measured`, `normative`, `deviation`, `deprecated`) and provenance (file:line, uses, canon rule IDs, decision reference). | Makes the standard normative *and* auditable: you can always see why a value is what it is. |
| P6 | **Theme first, then shared components, then call sites.** Findings are grouped by where the fix goes. | Research showed a handful of theme defaults (density, casing, heading weights, AA status colours) remove thousands of call-site findings. |
| P7 | **Promote before inventing.** Library components are seeded from the best existing implementations, chosen with a scorecard, not by recency. | Newest modules were often the least disciplined; extraction without adoption had already failed several times. |
| P8 | **Decide once per family.** Findings cluster into families ("20 local status-chip copies") so the owner makes one decision, not twenty. | Keeps audits usable on a large codebase. |
| P9 | **Evidence tags, no silent skips.** Every claim is `CONFIRMED`, `INFERRED`, `UNKNOWN` or `CONFLICT`; a check that could not run is reported `UNVERIFIED`. Conflicts are recorded with both sides, never silently resolved. | Absorbed from design-intelligence; prevents invented values. |
| P10 | **Additive by default.** Sub-project 1 writes only new files (`design-system/`, `.storybook/`, the root marker, stories, new library components) and dev-only package changes — plus, only with explicit approval, one pointer line in the product's `CLAUDE.md`. Routing and auth files are out of scope unless the owner says otherwise. | Protects the product while the standard is young. |
| P11 | **Rule semantics are framework-neutral; checks are adapter-specific.** | Lets Tailwind, Vue or Angular adapters be added without touching the canon. |
| P12 | **Paraphrase only.** The canon cites and paraphrases its sources; no copyrighted text is reproduced (at most one short quote per source). | This marketplace is public. |

---

## 4. Architecture

### 4.1 Plugin anatomy

```
plugins/design-studio/
  .claude-plugin/plugin.json          name, version, description, author, keywords (house style: terse)
  README.md                           what it does, install, quick start, relationship to other plugins
  CONNECTORS.md                       optional connectors per sub-project (Figma MCP, ADO) and how they're checked
  skills/
    init/SKILL.md (+ references/)
    inventory/SKILL.md (+ references/)
    standard/SKILL.md (+ references/)
    storybook/SKILL.md (+ references/)
    audit/SKILL.md (+ references/)
    review/SKILL.md (+ references/)
    research/SKILL.md (+ references/)
  agents/
    ds-orchestrator.md                routes a request to the right skill sequence; never measures or builds itself
    ds-scanner.md                     runs the engine read-only and interprets results
    ds-researcher.md                  web research on primary sources; proposes rules
    ds-builder.md                     writes library components, stories, generated files
    ds-reviewer.md                    the single judge; has no write tools
  hooks/hooks.json                    SessionStart pointer; PostToolUse fast lint (see §9.3)
  canon/
    rules/<area>.rules.yaml           ~250–300 rules, stable IDs, paraphrased
    conflicts.yaml                    house picks where sources disagree
    gates/page-gates.yaml             page-level gates (trunk test, one h1, one primary per region, …)
    sources.md                        full citation list with verification tags
  schemas/                            JSON Schema (draft 2020-12) for every file type in §5
  engine/
    src/                              TypeScript sources (see §7)
    dist/                             bundled, dependency-free .mjs entry points committed to the plugin
    test/                             unit tests (node:test)
  adapters/
    react-mui/                        stack detection, value extraction, theme reader, emitters, lint map, story templates
  templates/
    design-system/                    skeleton for a product's design-system/ folder
    storybook/                        main/preview/preview-head templates, decorators, MDX foundations pages
  fixtures/
    mini-crm/                         small React + MUI app with planted violations (self-test)
  evals/                              skill eval cases (see §12)
```

Skills are invocable both by natural language and as slash commands: `/design-studio:init`,
`/design-studio:inventory`, `/design-studio:standard`, `/design-studio:storybook`,
`/design-studio:audit`, `/design-studio:review`, `/design-studio:research`.

**Runtime dependencies.** The engine ships as bundled `.mjs` files so nothing is installed at run
time. Node ≥ 20 is required. Where a step needs the product's own packages (resolving the runtime
theme, building Storybook), the adapter uses the product's installed `node_modules`; if they are
missing, the step reports `UNVERIFIED` with the install command rather than failing silently.

### 4.2 Product repo footprint

One `design-system/` folder per app, at the app root (a monorepo gets one per app). The config file
tells the engine where everything is. A tiny root marker lets hooks find the configs without
searching the tree.

```
<repo-root>/
  .design-studio.json                 root marker: { "apps": ["web-app/src/target-crm"] } — read by hooks
<app-root>/
  design-system/
    design-studio.config.json         machine config (§5.6)
    AGENTS.md                         generated front door for any AI tool (§6.3.4)
    README.md                         generated human overview + how to consume
    profile/                          product knowledge (owner-curated)
      product.md                      who uses it, their jobs, environment, devices, min width
      personas.md                     role-specific needs
      glossary.yaml                   one term per concept; banned synonyms
      domain-patterns.md              recurring domain problems and the pattern used
      house-picks.yaml                approved thresholds that override canon defaults
    tokens/                           DTCG 2025.10 (§5.2)
      primitive/*.tokens.json
      semantic/*.tokens.json
      density/{compact,comfortable}.tokens.json
      component/*.tokens.json
      design-system.resolver.json     theme × density modifiers
    components/<id>.contract.yaml     component contracts (§5.3)
    patterns/<id>.pattern.yaml        patterns and screen templates (§5.4)
    rules/
      overrides.yaml                  product thresholds / severities / disabled rules, each with a reason
      proposed/                       rules proposed by research, awaiting owner approval
    decisions/
      library.yaml                    library decision cards and outcomes (§5.9)
      discrepancies.yaml              the audit decision register (§5.9)
    inventory/                        latest inventory: registry.json, samples.jsonl, report.md
    audit/
      baseline.json                   frozen findings used by ratchet mode
      runs/<YYYY-MM-DD-HHmm>/         findings.json, report.md, diff.json
    generated/                        never hand-edited; regenerated by `standard`
      mui-theme.ts                    proposed MUI theme (brand + approved corrections)
      tokens.css                      CSS custom properties
      eslint.design-studio.mjs        flat-config rule pack for the product
    storybook/                        decorators, mocks, fixtures, generated Foundations MDX
  .storybook/                         main.ts, preview.tsx, preview-head.html (generated from templates)
  <library home>/<component>/         new library components + co-located *.stories.tsx
```

`<library home>` is the product's existing shared component folder (configurable). Stories sit next
to their components with explicit titles by atomic level (`'Atoms/StatusChip'`), so the Storybook
tree follows Atomic Design regardless of how the product's folders are organised.

### 4.3 Roles

| Agent | Can write | Job |
|---|---|---|
| `ds-orchestrator` | no | Understands the request, checks prerequisites (config present, deps installed, connectors available), runs skills in order, relays outputs between them. Never measures, builds or judges. |
| `ds-scanner` | only `design-system/inventory/`, `design-system/audit/` | Runs the engine, interprets results, breaks classifier ties (flagged as `INFERRED`). |
| `ds-researcher` | only `design-system/rules/proposed/` | Researches primary sources (NN/g, lawsofux.com, W3C/WAI-ARIA APG, MUI docs, Storybook docs); answers with citations; drafts rules in the canon schema. |
| `ds-builder` | `design-system/`, `.storybook/`, library home, stories, `package.json` dev deps/scripts | Writes tokens, contracts, generated files, library components and stories. Never judges. |
| `ds-reviewer` | no | The single judge. Returns PASS/FAIL with findings in the six-field format (§5.8). |

---

## 5. Data model

Every file type has a JSON Schema in `schemas/`. YAML is used where people review files in PRs
(contracts, patterns, rules, decisions); JSON where tools exchange data.

### 5.1 Canon rule (`canon/rules/*.rules.yaml`)

```yaml
- id: NNG-ICN-01                       # <SOURCE>-<AREA>-<NN>; stable forever; renames keep `aka`
  aka: [NORM-SIG-03]                   # IDs merged into this one during consolidation
  statement: Icon-only controls have an accessible name and a visible label or tooltip.
  rationale: Unlabelled icons are ambiguous; recognition beats recall.
  sources:
    - { title: "Icon Usability", publisher: NN/g, url: https://www.nngroup.com/articles/icon-usability/, verified: V }
  levels: [atom, molecule]             # token | atom | molecule | organism | template | page | process
  appliesTo: ["component:IconButton"]  # adapter resolves to concrete selectors
  check:
    kind: STATIC                       # STATIC | TOKEN | RENDER | PERF | VISUAL | JUDGE | PROCESS
    how: "IconButton has aria-label AND (Tooltip title OR visible text)"
  threshold: null
  thresholdOrigin: null                # source | wcag | nngroup | proposed
  severity: major                      # blocker | major | minor | advice  (Nielsen 4/3/2/1)
  fixLocation: call-site               # theme | shared-component | call-site | process
  autofix: suggest                     # none | suggest | deterministic
  exceptions: ["close X and search magnifier still need an accessible name"]
  scope: general                       # general | product (product rules live in the product repo)
```

Rules are consolidated from the research lenses into one catalog: overlapping rules are merged
under one ID with `aka`. Accessibility floors (WCAG 2.2 AA) are `blocker`. Taste rules (for example
Refactoring UI hierarchy) are `major` or `advice`.

`canon/conflicts.yaml` records each place the sources disagree (for example target size: WCAG AA
24 px vs NN/g 1 cm vs AAA 44 px; confirmation dialogs vs undo; toast placement) with the house pick
and the reason. Products can override a pick in `house-picks.yaml` with their own reason.

### 5.2 Tokens (`tokens/**/*.tokens.json`)

W3C Design Tokens Community Group format **2025.10** (Format, Color and Resolver modules). The
resolver's modifiers carry **theme** (light / dark) and **density** (compact / comfortable). Three
tiers: primitive → semantic → component. Components never reference primitives directly.

Plugin metadata lives under one vendor key, `$extensions["org.design-studio"]`:

| Field | Meaning |
|---|---|
| `tier` | `primitive` · `semantic` · `component` |
| `status` | `measured` · `normative` · `deviation` (needs `reason` and `expires`) · `deprecated` |
| `provenance.measured` | `[{file, line, uses}]` where the value was found |
| `provenance.canon` | rule IDs that justify or corrected the value |
| `provenance.decision` | reference to a library decision card |
| `a11y` | `{pairsWith[], minContrast}` for foreground/background pairs |
| `targets` | per-emitter names: `mui` (theme path), `css` (custom property), `figma` (`{collection, kind: variable|style, scopes[], codeSyntax}`), `claudeDesign` (token name) |
| `usage` | `{do[], dont[]}` short, each linked to a rule ID |

Emitters translate: MUI theme (MUI implements Material **2**; Material 3 is used as reasoning only,
never as emitted names), CSS custom properties, Figma variables and styles (composites such as
typography and shadow become styles, since Figma variables only hold primitives), and Claude
Design's list-shaped `tokens.json` (`{tokens:[{name,value,usage}]}`, which does not accept the DTCG
map shape).

### 5.3 Component contract (`components/<id>.contract.yaml`)

The contract follows the EightShapes specification anatomy. It is what makes pixel-exact AI
implementation possible. Part names must be identical in code slots, Storybook and Figma layers.

| Key | Content |
|---|---|
| `id`, `name`, `level`, `purpose`, `status`, `version` | identity; `purpose` starts with the user job |
| `implementation` | `kind` (`theme` = configure a library primitive via theme; `wrapper` = new component; `composite`), `file`, `export`, `storybookId`, later `figma` |
| `seed` | the existing implementation it was promoted from, with the scorecard that chose it |
| `replaces` | local copies and ad-hoc usages it consolidates, with a value map for migration |
| `anatomy` | ordered parts: `{part, required, element, tokens{attr: tokenRef}}` |
| `props` | name, type, values, default, required, forbidden values, Storybook control, later Figma property |
| `variants` | axes, valid combinations, default |
| `states` | canonical vocabulary: default, hover, focus-visible, pressed, selected, disabled (with reason), read-only, loading, error, empty, overflow — each with its visual delta and token, or `n/a` with a reason. Presence states distinguish not-rendered / hidden / disabled |
| `density` | per mode: sizes, paddings, gaps (token refs) and minimum hit area |
| `layout` | layer-by-layer redlines: direction, alignment, padding per side, gap, sizing on both axes, max width |
| `content` | casing, max length, truncation, wrapping, number and date formats |
| `behavior` | events → state changes, keyboard, motion token |
| `accessibility` | role, accessible name, keyboard contract, focus, contrast pairs, target size, announcements |
| `tokens` | component-tier tokens this component owns |
| `guidance` | use / don't use, do / don't, each linked to a rule ID |
| `acceptance` | machine-checkable assertions: `R` (rendered, computed style / axe / hit area), `S` (static), `D` (design-tool, later) |
| `related`, `history` | siblings; semver history |

Acceptance assertions are generated into Storybook play tests, so "pixel by pixel" is verified by
computed values (height, padding, gap, font size, line height, contrast), not by eye.

### 5.4 Pattern and template (`patterns/<id>.pattern.yaml`)

One schema, two kinds: `pattern` (a reusable solution to a user job at organism scale) and
`template` (a page-level arrangement of regions).

Keys: `id`, `name`, `kind`, `userJob`, `primaryAction`, `whenToUse`, `whenNotToUse`, `density`,
`regions` (ordered; each with landmark role, width rule, allowed contracts, emphasis, appears-when),
`responsive` (per window size class), `states` (loading, empty-first-use, empty-filtered,
empty-gated, error, partial, permission, stale, unsaved changes), `urlState` (what persists in the
URL), `embedding` (behaviour without the app shell), `behaviors`, `content`, `keyboard`,
`accessibility`, `tokens`, `acceptance`, `exemplars`.

### 5.5 Layout rule (`rules/` in canon or product)

Keys: `id`, `title`, `statement` (one testable sentence), `rationale` (rule IDs), `scope`,
`parameters` (tokens per density), `constraints` (formal relations, for example
`sectionGap >= 2 * fieldGap`), `detection` (mode + how + tool), `severity`, `exceptions`, `examples`
(pass / fail with values), `autofix` (deterministic map or `suggest`), `baseline` (measured counts).

### 5.6 Product config (`design-system/design-studio.config.json`)

```json
{
  "product": "Example App",
  "appRoot": ".",
  "adapter": "react-mui",
  "sources": ["src/**/*.{ts,tsx}"],
  "exclude": ["**/*.test.*", "**/__mocks__/**"],
  "legacy": [],
  "libraryHome": "src/components/shared",
  "themeEntry": "src/theme/index.ts",
  "providersEntry": "src/app.tsx",
  "modules": { "roots": ["src/components"], "shared": ["src/components/shared"] },
  "locales": ["en_us"],
  "density": { "default": "compact" },
  "enforcement": "advisory",
  "protectedPaths": ["src/routes/**"],
  "storybook": { "port": 6006, "enableManifests": true, "enableMcp": true }
}
```

`enforcement` is `advisory` (report only) or `ratchet` (new findings fail `review`; baseline
findings don't). `protectedPaths` are never edited by any skill. The values above are examples; the
pilot's real values are set by `init`.

`modules.roots` are folders whose immediate sub-folders are feature modules; `modules.shared` are
shared-component folders (the library home is normally one of them). Both drive reach, duplication
and scorecard grouping.

### 5.7 Inventory registry (`inventory/registry.json`)

Top level: `schemaVersion`, `engine` (the engine version that wrote it), `app` (product, app root,
adapter), `inputs` (number of source files and one hash over everything the run read: the
effective config, the sources, the tsconfig/jsconfig files and the theme entry), `theme` (the
spacing and radius units used, and whether they were read from the theme file or are library
defaults), then the sections below.

Per component: `id`, `name`, `file`, `line`, `loc`, `exportNames`, `module`, `shared`, `level` +
`levelReason` + `confidence` + `evidence` (`CONFIRMED`/`INFERRED`), `smells`, `layer`
(`core`/`recipe`/`snowflake`), `logic` (`presentational`/`smart`), `wraps` (library primitives),
`uses` (in-house components it renders), `importers` (files, modules; barrel-aware),
`promotionCandidate`, `families` (keys of the duplicate families it belongs to), `quality` (raw vs
theme style values inside it) and `signals` (data and the data hooks or API imports behind it
(`dataHooks`), slots, region, primary actions, page area, domain props, styled target). Detected
states and accessibility flags are added by the audit.
Per module: scorecard (files, LOC, components, style samples (`samples`), raw values per kLOC,
token discipline, i18n coverage, test ratio, last commit). Also: duplicate `families`, a library
`primitives` census (count and `variant`/`size`/`color` values), `metrics` and `parseErrors`. Plus `samples.jsonl`:
one line per style value with `{file, line, ctx (unit context), kind, property, raw, cls, px,
element, conditional, responsive, selector}`.

### 5.8 Finding and family

A **finding** uses the six-field format: `what`, `where` (file:line), `rule` (ID), `evidence`
(value found vs expected, with evidence tag), `severity`, `fix` (location + suggested change).
Plus `reach` (files/modules affected by fixing it at its fix location) and `checkKind`.

A **family** groups findings with the same rule and the same fix. It has a **stable key** so
re-audits can match it: `<ruleId>@<fixLocation>:<target>` (for example
`DUP-01@shared-component:status-chip` or `SPC-SCALE-01@call-site:module/customer-groups`).

### 5.9 Decisions

**Library decision card** (`decisions/library.yaml`) — one per open choice in the standard:

```yaml
- id: LD-COLOR-SECONDARY
  topic: color
  question: The secondary colour is the same hue as error. Change it?
  evidence: { measured: "...", conflicts: [...], rules: [NORM-MAP-02, NNG-STA-04] }
  options:
    - { key: keep,   label: Keep as is,           impact: "..." }
    - { key: change, label: Use a non-red accent, impact: "..." , coverage: null }
  recommendation: change
  status: open                          # open | decided | deferred
  decision: { choice: null, by: null, on: null, note: null }
```

Cards carry coverage where it applies ("this spacing scale matches 82% of today's values").
Accessibility floors are pre-selected; declining one records a `deviation` with a reason and a
re-review date.

**Discrepancy decision register** (`decisions/discrepancies.yaml`) — one entry per family:

```yaml
- family: DUP-01@shared-component:status-chip
  rules: [DUP-01, RUI-S-03]
  sites: 20
  severity: major
  fixLocation: shared-component
  decision: plan                        # fix-now | plan | leave
  reason: "Migrate with the next redesign of that module"
  reReviewOn: 2027-01-15                # required for `leave`
  ticket: null                          # optional work-item reference when `plan` is exported
  by: <owner name>
  on: 2026-10-02
```

### 5.10 Audit run

`audit/runs/<stamp>/findings.json` (all findings with family keys), `report.md` (human report,
grouped theme → shared component → call site, then by severity × reach), and `diff.json` against
the previous run and the register: `new`, `regressed`, `resolved`, `open` (decided `plan`,
unchanged), `accepted` (decided `leave`, not yet due), `due` (`leave` past its re-review date).
`baseline.json` is the frozen set used by ratchet mode.

---

## 6. Workflow (skills)

Each skill states its prerequisites, runs, writes only its own outputs, and ends with a short
report of what it did, what it assumed, and what needs a decision.

### 6.1 `init`

- **Purpose:** set up `design-system/` in a product and capture the product profile.
- **Steps:** detect the stack (framework, UI library and version, styling mechanisms, theme entry,
  provider tree, router, i18n and locales, test runner, Node version, shared folders, route files);
  write `design-studio.config.json`; scaffold `design-system/` from the template; interview the
  owner briefly for the profile (who uses it, their jobs, devices and minimum width, accessibility
  commitment, locales in scope, legacy areas to exclude); import existing product knowledge if found
  (for example user context, house rules or design notes from an existing project-level skill or
  docs folder), reconciled against the plugin canon.
- **Optional, with approval:** add one line to the product's `CLAUDE.md` pointing at
  `design-system/AGENTS.md`.
- **Output:** config, profile, empty standard folders. Nothing else in the repo changes.

### 6.2 `inventory` (read-only)

A 12-step interface inventory, automated:

1. Detect the stack (from config).
2. Parse every source file (TSX AST).
3. Build the import graph, resolving barrels and re-exports, with where-used lineage per
   component (importing files and modules).
4. Extract every style value with its **unit context** and convert to px (for example, in MUI `sx`
   a spacing number is multiplied by the theme spacing unit, a `borderRadius` number by the theme
   radius, and in `style={{}}` a number is px).
5. Count library primitive usage and props (for example `size="small"` share per primitive).
6. Detect families: same component name exported from several modules (file-private helpers do
   not count); identical and near-identical files; repeated style blocks; status-to-colour maps;
   imports that reach into another feature's folder; shared components with no consumers; code
   comments admitting a copy.
7. Classify each component's atomic level with deterministic, first-match rules (route? fetches
   data? takes slot props? owns a page region? how many primitives or in-house components does it
   render?), then enforce parent level ≥ child level (a template or page child raises its parent
   to organism, not to template or page); the scanner breaks remaining ties and marks them
   `INFERRED`; the owner can override with a reason.
8. Record ownership (core / recipe / snowflake) and logic type (presentational / smart).
9. Resolve the runtime theme (adapter theme reader) and diff it against measured usage.
10. Score modules (token discipline, i18n, tests, a11y density) to pick golden references per
    dimension.
11. Write `registry.json`, `samples.jsonl` and `report.md`.
12. Make the run repeatable: same inputs → byte-identical JSON.

### 6.3 `standard` — propose → decide → emit

#### 6.3.1 Propose

- **Scales with coverage.** Cluster measured values into candidate scales for spacing, radius,
  type sizes, font weights, elevation, z-index, breakpoints, drawer/panel widths. Report each scale's
  coverage of today's code and the outliers.
- **Semantic tokens from the product's theme.** Keep brand primitives; map roles (text, surface,
  border, status soft/solid, focus, state layers). Run the contrast matrix on every declared pair,
  against every background the product uses; pairs that fail WCAG floors get a corrected proposal.
- **Theme defaults.** Density `defaultProps`, button casing, heading weights and similar settings
  that remove call-site repetition.
- **Component families to build.** From the inventory: the families with the most duplication and
  reach, each with a seed chosen by scorecard.
- **Templates.** Screen templates discovered by clustering repeated layouts, with their region
  sizes.

#### 6.3.2 Decide

Every choice not dictated by a canon floor becomes a **library decision card** (§5.9), batched by
topic (colour, type, spacing and density, shape and elevation, components, templates, content). The
skill presents a batch, records the owner's choices, and continues. Cards can be deferred; deferred
cards keep the measured value with `status: measured`.

#### 6.3.3 Emit

- Tokens (DTCG, validated), resolver.
- Contracts for the chosen families, templates, layout rules, product rule overrides.
- `generated/mui-theme.ts` — the proposed theme. Wiring the app to it is itself a library decision,
  because some corrections are visible on every screen.
- `generated/tokens.css`, `generated/eslint.design-studio.mjs`.
- `AGENTS.md` and `README.md`.

#### 6.3.4 `AGENTS.md` (the front door)

Generated, concise, and tool-neutral. It tells any AI:

- where tokens and contracts are, and that raw colours, font sizes and off-scale spacing are not
  allowed;
- a lookup table: need → library component → import path → when not to use it;
- which template to start a screen from and its required states;
- accessibility floors and content rules (casing, button verbs, glossary);
- how to check work (`/design-studio:review`, the lint pack, Storybook tests).

### 6.4 `storybook`

- **Harness.** Generate `.storybook/` for the adapter (Storybook 10.6+, `@storybook/react-vite`
  for React). Mirror the app's provider tree from `providersEntry` using a fresh store factory
  (never the app's singleton), a query client, the product theme, date and i18n providers, the
  notification provider and a memory router. Use MSW (`msw-storybook-addon` v3 API) for data. In
  `viteFinal`, drop dev-server-only plugins and proxies. Isolate the environment so no real keys are
  bundled. Copy fonts and global CSS from `index.html` into `preview-head.html` for pixel parity.
  Detect and work around harness blockers (barrels that re-export the whole app, HTTP interceptors
  that reload on 401, providers that throw when absent) inside the harness, without editing app
  code.
- **Foundations pages.** Generated MDX for colour, type, spacing, radius, elevation, density and
  motion, from tokens.
- **Which theme Storybook renders.** Stories render with the *proposed* standard theme
  (`generated/mui-theme.ts`), because the library documents the standard. A toolbar switch renders
  the same story with the app's current theme, so the owner can see exactly what adopting the
  standard would change. The app itself keeps its current theme until the owner decides otherwise.
- **Library components.** For each chosen family: `ds-builder` creates the component in the library
  home from its seed, conformed to its contract; stories are generated from the contract (variants ×
  states × density, plus long-content and overflow); acceptance assertions become play tests;
  `ds-reviewer` judges; the loop repeats until PASS. The seed stays where it is; switching its
  callers (and the other copies in its family) to the library component is an audit family for the
  owner to decide.
- **Templates.** Page-level stories with a mocked app shell.
- **Quality gates.** The a11y addon set to fail on violations, with axe's target-size rule enabled;
  interaction tests via the Vitest addon in their own project (so they don't inherit the product's
  unit-test mocks); Storybook's component manifests and MCP server switched on so coding agents can
  query the library (both are experimental in Storybook and treated as optional).
- **Package changes.** Dev dependencies and `storybook` / `build-storybook` scripts only.

### 6.5 `audit` (any time)

- Runs every check kind that can run: `STATIC` (rule pack over source), `TOKEN` (contrast, scale
  membership), `RENDER` (Storybook tests where stories exist; Playwright + axe on pages later),
  `JUDGE` (reviewer walkthroughs of top tasks using profile personas). Checks that can't run are
  `UNVERIFIED`.
- Groups findings into families with stable keys, orders them theme → shared component → call
  site, then severity × reach, and separates duplicates before scoring so nothing is counted twice.
- Presents families for decision: **Fix now** (queued for conform), **Plan it** (optionally drafted
  as work items in the owner's tracker, on request, in the owner's story style: what and how it's
  verified, never how to build it), **Leave as is** (reason + re-review date required). Writes the
  register.
- Re-audits diff against the previous run and the register (§5.10). In ratchet mode, it also
  refreshes the baseline when the owner approves.

### 6.6 `review`

- **Input:** a diff, a set of files, a story, a template, or a screen.
- **Runs:** static rules on changed lines, rendered checks on affected stories, the page gates for
  screens, and a judge rubric with persona lenses from the profile.
- **Output:** PASS / FAIL with six-field findings and rule IDs. In `ratchet` mode, only findings
  not in the baseline fail.
- Runs in `ds-reviewer`, which has no write tools (P3).

### 6.7 `research`

- **Input:** a design question ("bulk actions in data tables?", "should errors ever be toasts?").
- **Does:** checks the canon first; if not covered or if asked, `ds-researcher` searches primary
  sources and answers with citations and a confidence level.
- **Output:** the answer; if the answer is a reusable rule, a proposal in the rule schema written to
  `rules/proposed/`. Proposals become product rules only when the owner approves them. The canon in
  the plugin is updated only through a plugin release.

---

## 7. Engine

Authored in TypeScript under `engine/src`, bundled to `engine/dist/*.mjs`. Every command takes
`--config <path>`, writes JSON, and exits non-zero only on real errors.

| Module | Responsibility |
|---|---|
| `detect` | stack detection → config proposal |
| `scan` | AST parse; style values with unit context → `samples.jsonl` |
| `graph` | barrel-aware import graph and reach |
| `classify` | deterministic atomic classifier; tie list for the scanner |
| `families` | duplicate and look-alike detection (§6.2 step 6) |
| `scorecard` | module quality scores |
| `theme` | adapter-driven runtime theme resolution |
| `scales` | clustering and coverage per proposed scale |
| `contrast` | contrast matrix over token pairs and backgrounds |
| `tokens` | DTCG read / validate / resolve (own implementation, conformance-tested) |
| `emit` | MUI theme, CSS variables, AGENTS.md, README, Foundations MDX, story skeletons, ESLint flat config |
| `rules` | canon loader and product-override merge |
| `check` | static rule runner; token checks |
| `audit` | family grouping, fix location, ordering, diff against runs and register, report rendering |
| `validate` | JSON Schema validation for every file type |
| `hooks` | the two hook entry points (§9.3) |

Performance targets: full scan of a ~1,200-file app in under 2 minutes; the post-edit hook under
1 second per file.

---

## 8. Adapters

An adapter tells the engine how a stack expresses UI. `react-mui` is the first one. It provides:

- **Detection:** package versions, styling mechanisms in use (`sx`, `styled`, tss-react
  `makeStyles`, `style={{}}`, CSS files).
- **Value extraction and unit rules:** spacing multipliers, the `borderRadius` multiplier in `sx`,
  shorthands, responsive objects, theme callbacks.
- **Theme reader:** bundles the product's theme entry with the product's own toolchain and evaluates
  it to get the resolved theme object.
- **Component map:** library component → rendered DOM element, so accessibility lint rules can see
  through the library (research showed plain jsx-a11y sees under a quarter of the real issues
  otherwise); plus custom rules for what jsx-a11y cannot see (icon-only buttons, clickable
  non-interactive elements, placeholder-only fields, disabled without a reason, more than one
  contained button per action region, error toasts, raw colour and font-size literals).
- **Emitters:** MUI theme (`palette`, `typography`, `shape`, `spacing`, `shadows`, `components.*`
  default props and style overrides per density), story templates.
- **Framework facts** regenerated from the installed library's typings (for example MUI v7 prefers
  `slots` / `slotProps` over deprecated props), never from memory.

---

## 9. Triggers

### 9.1 Natural language

Skill descriptions are written for auto-activation on requests such as "audit the UI", "what's our
dialog padding?", "build the component library", "set up a design system here". Where another
installed plugin also covers a request (design-intelligence, Storybook's plugin), the user's
explicit choice wins; the SessionStart pointer makes the standard visible when a repo has one.

### 9.2 Slash commands

`/design-studio:init | inventory | standard | storybook | audit | review | research`.

### 9.3 Hooks

| Event | Behaviour | Budget |
|---|---|---|
| `SessionStart` | If the repo root has a `.design-studio.json` marker, add a short note per app: the standard's location, open library decisions, last audit date and its new/regressed counts. Otherwise do nothing. | < 300 ms |
| `PostToolUse` (Edit / Write on UI source files) | Map the edited file to its app via the root marker; run the static rule pack on that file only; report findings that are not in the baseline back to Claude as context so it corrects as it writes. Never blocks the edit. Does nothing outside a configured app. | < 1 s |

Hook failures are swallowed (exit 0 with no output) so a broken hook never disrupts work.

### 9.4 On deploy (sub-project 6)

Outlined in §14.6.

---

## 10. Canon content plan

- **Sources:** Atomic Design (Frost) and his later design-system writing; Don't Make Me Think and
  Rocket Surgery Made Easy (Krug); The Design of Everyday Things (Norman); Laws of UX (Yablonski);
  Nielsen's 10 heuristics and NN/g articles; Refactoring UI (Wathan & Schoger); Material Design 3
  (reasoning only); W3C DTCG 2025.10; EightShapes component specification guidance (Curtis); Design
  Systems (Kholmatova); WCAG 2.2 AA and WAI-ARIA APG; Inclusive Components (Pickering).
- **Consolidation:** the research lenses produced ~480 candidate rules with overlapping IDs. They
  are merged into ~250–300 rules with `aka` links, stable IDs and one schema.
- **Verification tags:** `V` (verified against the primary source), `S` (secondary source),
  `U` (unverified; excluded from `blocker` severity).
- **Conflicts:** ~30 recorded disagreements with a house pick each (§5.1).
- **Page gates:** trunk test (0–6), page name matches nav label, one `h1`, one primary action per
  region, verb-first button labels with generic labels banned, skip link, heading order.
- **Copyright:** paraphrase only; at most one short quote per source.

---

## 11. Error handling and safety

- **Write boundaries.** Each agent's writable paths are fixed (§4.3). `protectedPaths` are never
  edited. Sub-project 1 changes only new files plus dev-only package changes.
- **No invented values.** A value without evidence is `UNKNOWN` and goes to a decision card.
- **Unrunnable checks** are `UNVERIFIED` with the reason and the fix (for example, "install
  dependencies", "no stories yet"), never silently skipped.
- **Idempotence.** Re-running any skill with unchanged inputs changes nothing. Generated files carry
  a header saying they are generated and by which command.
- **Schema validation** on every read and write; an invalid file stops the step with the path and
  the error.
- **Conflicts** between sources (theme vs docs, code vs an old design file) are recorded as
  `CONFLICT` with both sides; the owner decides.
- **Secrets.** Storybook builds use an isolated environment with no real keys; the harness refuses
  to bundle variables that look like secrets.
- **Large repos.** Scans stream results; memory stays bounded; the report states exactly what was
  scanned and what was excluded (no silent caps).
- **Other plugins.** Never edits another plugin's files or config.

---

## 12. Testing

- **Unit tests** for every engine module (`node:test`), including the unit-context conversions,
  classifier rules, family detection, clustering, contrast and DTCG resolution.
- **Fixture app** (`fixtures/mini-crm`): a small React + MUI app with planted problems — unlabelled
  icon buttons, raw hex colours, off-scale spacing, placeholder-only fields, duplicated status chips,
  a dead shared component, a barrel that re-exports the app, an error toast that auto-hides.
  Golden outputs for `inventory` and `audit` are committed; tests require 100% of planted problems
  found and byte-identical output across two runs.
- **Skill evals** (`evals/`): `init` detects the stack correctly; `standard` produces schema-valid
  tokens and contracts; `storybook` builds and its a11y tests pass on the fixture; `audit` finds the
  planted families and a re-audit with no changes reports zero new; `review` fails a bad diff and
  passes a good one; `research` returns citations.
- **Pilot acceptance** on the first real product (§13.3).

---

## 13. Sub-project 1 deliverables

### 13.1 Plugin

Everything in §4.1 for the seven skills, five agents, two hooks, canon, schemas, engine, react-mui
adapter, templates, fixture and evals; README and CONNECTORS; a marketplace entry in
`.claude-plugin/marketplace.json`.

### 13.2 Pilot on the first product

Run in the product's repo on a dedicated pilot branch created from the team's integration branch
(the integration branch itself is never changed). If the pilot branch is refreshed from the
integration branch later and that touches routing, routing is re-verified as the product's own
CLAUDE.md requires.

1. `init` — config and profile (seeded from any product knowledge that already exists).
2. `inventory` — full registry and report.
3. `standard` — decision cards presented in batches; tokens, rule overrides, contracts for the first
   ten component families (chosen from the inventory's highest duplication × reach, seeded from the
   best existing implementations) and one screen template (the product's most-copied layout).
4. `storybook` — harness, Foundations, the ten families with full state matrices, the template.
5. `audit` — first report and decision register.

### 13.3 Acceptance criteria

- Two consecutive `inventory` runs produce byte-identical JSON.
- A sample of 30 audit findings is at least 90% true positives on manual check.
- `npm run storybook` starts locally; every library story passes its a11y and acceptance tests.
- All tokens and contracts validate against the schemas.
- A re-audit with no code changes reports zero `new` and zero `regressed`.
- The pilot branch's diff against its base contains only: `design-system/`,
  `.storybook/`, the root marker, new library component folders with stories, dev-dependency /
  script changes in `package.json` and the lockfile, and — if approved — one pointer line in
  `CLAUDE.md`.
- A non-dashboard route still loads on the pilot branch (product CLAUDE.md rule).
- Hooks do nothing in a repo without a config, and stay within their time budgets in the pilot.

---

## 14. Roadmap (sub-projects 2–6)

Each gets its own spec → plan → build cycle. Key constraints known today:

### 14.1 Sub-project 2 — Figma library

Render target only: `render(spec, ledger) → file`. Via the official Figma MCP's `use_figma` (Plugin
API scripts; ~50k-character scripts, ~20 KB responses, mutations run sequentially). The plugin ships
its own versioned script library (inspect, collections and modes, batched variables, text and
effect styles, icon components from SVG, contract-driven component builder with variant grid and
property wiring, documentation pages, read-only drift dump, cleanup by ledger id). A committed
`figma/ledger.json` maps spec ids to Figma node ids and keys for idempotent re-runs. Requires a Full
seat on a paid plan with enough variable modes for theme × density; Code Connect needs an
Organization/Enterprise plan and a manual library publish in Figma first. Preflight checks all of
this and refuses to run when the determinism checklist fails.

### 14.2 Sub-project 3 — Claude Design library

Export the standard into a Claude Design design-system: list-shaped `tokens.json`, `README.md` brand
book with usage rules naming tokens, per-component `README.md` guidelines and `preview.html` cards
(`@dsCard` first line), a single classic `bundle.js` exposing the components (React 18 by default in
that runtime, so the bundle must be built for it), fonts as files, assets uploaded. Revisions are
incremental, file by file; the index is written last.

### 14.3 Sub-project 4 — Conform

Apply "Fix now" decisions, Pareto-ordered: theme fixes first, then shared components, then call
sites ranked by usage × weighted violations. Deterministic codemods where the map is unambiguous
(for example hex → token, off-scale px → nearest scale value); suggestions where it isn't. Every
change goes through `review`. "Do the least you can do": tokens, then component swaps, then layout
only with evidence.

### 14.4 Sub-project 5 — Prototypes and feature designs

`build-ui` (absorbing the best of existing requirements-to-UI processes: tiering, the who-and-job
brief, IA rules, states, the review checklist) builds a feature from a story or brief either as **real code** in the
product or in a **sandbox** app that imports the product's theme and library, chosen at run time.
Also: new screens in Figma and Claude Design composed from library parts. Includes a lightweight
usability test kit (3 users, scenarios, debrief template).

### 14.5 Sub-project 6 — Deploy drift

Triggered when UI is deployed to any environment. For products on Azure DevOps with classic release
pipelines, the insertion point is a service hook on "release deployment completed" → incoming
webhook → a separate drift pipeline, so no release definition is edited. Claude Code runs headless
(`claude --bare -p`, read-only tools, spend cap); posting reports, PR comments and work items happens
in plain scripts outside the agent. Detects UI changes by path diff and UI-library version bumps;
caches by file content so the same change isn't re-analysed per environment; reports only new drift
against the baseline. GitHub Actions and GitLab templates ship as adapters. Figma is read through its
REST API with a token; the Claude Design library needs an export-to-repo step before CI can read it.

---

## 15. Decisions

### 15.1 Made (with the owner, 2026-09-29)

- Separate plugin; absorbs what it needs from existing design plugins and project-level design
  skills; the user chooses which plugin to use.
- Name `design-studio`; lives in this marketplace; installable team-wide.
- The standard keeps the product's theme and applies best practice; the audit is advisory and
  repeatable with Fix now / Plan it / Leave as is per family.
- Storybook is the human view of the code library; the AI-readable spec is the source of truth.
- Build order: foundation + code library → Figma → Claude Design → conform → prototypes and
  feature designs → deploy drift.
- Triggers: natural language, slash commands, hooks, and deploy-triggered drift.
- Architecture (§4), workflow (§6) and triggers/roadmap (§9, §14) approved in review.

### 15.2 Product decisions are made at run time, not here

The research surfaced about 100 product-level questions for the pilot (colour roles, contrast
corrections, density, minimum type size, casing, which of several duplicate modules is canonical,
table approach, toast and confirmation policy, navigation grouping, …). They are intentionally not
answered in this spec: they are the library decision cards and discrepancy decisions the plugin
presents when it runs.

### 15.3 Open (non-blocking)

- None blocking sub-project 1.

---

## 16. References

Primary sources are listed in `canon/sources.md` when built. The research evidence behind this spec
(fifteen reports covering the codebase, prior design assets, the canon and tooling) is kept in the
pilot product's private repository.
