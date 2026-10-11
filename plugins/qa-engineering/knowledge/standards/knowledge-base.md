# Knowledge Base — the product's features, as testable knowledge

> A persistent, human-readable map of what the product already does — discovered **frontend-first**, written
> once per module, and read by the analysis + authoring engines so their output is grounded in the real
> product instead of re-derived from raw code every time.

## Purpose
A framework tells you *how* to test; the **Knowledge Base** tells you *what there is to test*. It is a set of
markdown files, one per product module, that record each feature's purpose, flows, exact UI/API messages,
business rules, and how behavior changes by variant — plus a central file of atomic, testable rules and a thin
code map. It is both a **living feature reference** a QA (and the next QA) can read, and the **grounding prior**
the AI engines read before they analyze a story or a module. Without it, every analysis starts from zero and
story coverage is a guess; with it, analysis is anchored to documented behavior and the rules are already the
unit of "what to test".

This is the kit's own artifact standard (not a code block). It is generated **into the QA's own framework
repo** and is **committable team knowledge there** — it is never shipped in the plugin, and it holds product
specifics, so it does not belong in any public/shared plugin content.

## When to use it (and when NOT)
- **Create it** the first time a QA runs the loop on a product (the scaffold + stubs), and **deepen** a
  module's entry when you are about to analyze, build, or test that module.
- **Read it** (the engines do) before analyzing a story or a module, before authoring cases, and when scoping
  automation to the files that back a feature.
- **Not** a design doc, a tutorial, or a methodology essay — it is an operational map of *this product*. Keep
  it behavioral and evidence-backed.
- **Not** a replacement for `flow-map.json` (the machine handoff for the build) or `system-map.json` (the
  variant axis) — it layers *on top* of them. `flow-map` stays the structured build input; the KB is the human
  + grounding layer, and it *cites* the variant axis rather than redefining it.

## Where it lives
At the framework root, under `knowledge-base/`:

```
knowledge-base/
├── README.md         index + mindmap + which engine reads which file first
├── CONVENTIONS.md    slug rules, evidence-tag grammar, FE/BE separation, lazy-depth legend
├── RULES.md          one anchored, testable rule per heading (the case backbone)
├── modules/<slug>.md behavior brief per module (product + QA view)
└── atlas/<slug>.md   thin code map per module (FE/BE globs + FE↔BE link table)
```

- **Committable, not git-ignored.** Unlike `.env`, `qa-context.json` and `house-profile.json` (which hold
  secrets or ephemeral state and stay git-ignored), the KB is durable product knowledge the team shares — the
  template `.gitignore` deliberately does **not** ignore `knowledge-base/`.
- **Never in the plugin.** The KB holds product specifics (real routes, messages, module names). It is
  generated into the QA's repo only; nothing from it is ever written into the plugin or any shared content.

## Frontend-first module discovery (load-bearing)
**Modules are what users see, not how controllers are grouped.** Discover the module taxonomy from the
product's **frontend** first:

1. Read the SPA's **route table / router config / nav / lazy-imports** — each top-level route/area is a
   candidate module (`/orders`, `/customers`, `/widgets`). This is the taxonomy the product, its QAs, and its
   users actually name.
2. For each screen under a route, extract its **API calls** deterministically (fetch / Axios / RTK Query /
   service wrappers): method + path template + the request/response fields the UI uses.
3. **Resolve** those calls into backend handlers (controllers/actions) to get the API behind each feature.
4. **Frontend and backend globs are always kept separate** (`frontend_path_*` vs `backend_path_*`), so scoped
   work can prefer UI files for a UI story and controllers for an API story without cross-contaminating.

**Fallback:** for an **API-only** product (no frontend), group by backend route prefix instead, and say the
taxonomy came from the backend. Record which source was used.

**Why frontend-first:** a product's real surface is its routes; one screen often spans several controllers, so
backend grouping fragments a user-visible feature across modules and misses the names people use. Leading with
the frontend keeps the module map aligned with how the product is understood and tested.

## The format, file by file

### `modules/<slug>.md` — product + QA brief
```markdown
# <Module Name>
**Purpose:** one sentence.
**Slug:** <slug>   **Do not confuse with:** <lookalike slugs>
**Atlas:** [atlas/<slug>.md](../atlas/<slug>.md)

> Route(s): /<route>
> Touches: [Other Module](other.md) · [Integration](../atlas/...)   (cross-module/product links)
> Key rules: [rule-anchor](../RULES.md#rule-anchor) · ...

## Keyword pack (disambiguation)
### Exclusive (phrases that resolve ONLY here; prefer multi-word, product-specific)
### Shared/ambiguous (words that appear in several modules; never resolve a module alone)
### Reject (if the query is dominated by these, it belongs to <other slug>)
### Negative examples ("query -> correct slug" lines proving lookalikes don't collide)

## Flows
### Flow: <name>
- **Trigger:** how it starts.
- **Steps:** action -> expected (numbered).
- **Rules:** [rule-anchor](../RULES.md#rule-anchor)
- **Breaks:** exact error/empty strings.
- **UI anchors:** semantic only (role + name / label / text), never CSS/nth/XPath.
- **API behind it:** METHOD path (summary; detail in the atlas).
- **Negative / edge:** the failure paths worth a case.

## States        (the state machine(s), if any)
## Variants      (which flows/rules change by the system-map variant axis, each citing the branch)
## Gaps          ([UNCLEAR: ...] / [TODO: confirm ...]: what code alone cannot settle)
```

### `RULES.md` — the testable backbone
```markdown
# Business Rules
One rule per ## anchor (the heading is the anchor slug), grouped by module.

## <module>
## <rule-anchor>
**Title** (see [Module](modules/<slug>.md)) - Condition → Result (exact message/status when known).
```
Every rule is a **unit a case can trace to** (`cases.items[].tracesRule` → this anchor). Cover auth,
validation, **variant**, permission, money/credit, and destructive-action rules — the high-value negatives.

### `atlas/<slug>.md` — thin code map (v1)
```markdown
# Atlas: <Module Name>
---
routes: [/<route>]
frontend_path_includes: ["**/<Module>/**", "**/<slug>*.tsx"]
frontend_path_excludes: ["**/<Lookalike>/**"]
api_prefixes: [/api/<Module>]
backend_path_includes: ["**/<Module>Controller*", "**/<Module>/**/*.cs"]
backend_path_excludes: ["**/<Lookalike>*"]
features:
  - id: create
    frontend_paths: ["**/<Module>/**/Add*"]
    backend_paths: ["**/<Module>Controller*"]
    apis: ["POST /api/<Module>"]
---

## Route map          (route -> component path -> feature ids)
## Frontend <-> Backend links   (feature | FE entry (route/component) | API calls | BE files)
```
**Deferred to a later SP (not v1):** the full impact / regression packs and change-impact heuristics. The v1
atlas is just the FE/BE globs + the route map + the link table — enough to scope reuse-inspection and route a
UI vs API story to the right files.

## Evidence rails (never invent)
- **Code wins** for technical facts: method, path, DTO field, status code, exact message, auth attribute.
- **Existing docs/help pages are cited vocabulary**, not code truth — use them for module names and flow
  wording; if a doc and the code disagree, keep the code and record `[UNCLEAR: doc says X; code does Y]`.
- **Never invent** an endpoint, route, message, field, or permission. If it is not in the code (or a cited
  doc), write `[UNCLEAR: ...]`, `[ASSUMED: ...]`, or `[TODO: confirm ...]`.
- **Prefer exact strings** copied from code (labels, toasts, validation messages, route paths, methods).
- **No em/en dashes** in prose (comma, colon, hyphen, or parentheses).

This is the same Confirmed/Inferred/Assumption/Gap discipline the analysis engines already use — the KB is
where that labeling is written down and kept.

## Lazy depth model
A module's KB has one of three depths, tracked on `catalog.modules[].kb`:

| Depth | What exists | Written by |
|---|---|---|
| `absent` | no entry yet | — |
| `stub` | `modules/<slug>.md` skeleton: Purpose + Route + keyword-pack placeholder | `scan-and-confirm` (first `/qa`) |
| `deep` | full module brief + trimmed atlas + RULES patch, coverage-self-audited | `kb-builder` (on demand) |

**Generate lazily.** First `/qa` scaffolds `knowledge-base/` and writes a **stub per discovered module** (fast,
whole-app breadth). A module is **deepened** only when it is about to be analyzed, built, or tested — which
matches the kit's "structure once, expand module by module" model and keeps token cost proportional to what
you are working on. Never thin-out a shallow whole-tree deep pass.

## How the loop consumes it
- **`scan-and-confirm`** — frontend-first discovery; seeds `catalog`; scaffolds `knowledge-base/` + the stubs.
- **`kb-builder`** — deep-generates one module (the investigation protocol + coverage self-audit).
- **`story-intelligence` / `code-intelligence`** — read `modules/<slug>.md` + its RULES anchors to **ground**
  analysis; if the module is a `stub`, offer to deepen it first. (Reading markdown is the retrieval — no search
  index needed; the engine reads the file.)
- **`author-api-cases` / `author-ui-cases`** — seed cases from the module's **RULES anchors** (each rule → at
  least one case) and set `cases.items[].tracesRule`.
- **`automation-engine` / `kit-builder`** — use the atlas **FE/BE globs + link table** to scope which
  services/components/controllers back a feature (reuse-inspection), so generation reuses the right blocks.

So the traceability thread gains a first link: **rule ⇄ case ⇄ script ⇄ bug** (see `qa-context.md`).

## Anti-patterns
- **Grouping modules by backend controllers** when a frontend exists — it fragments a user-visible feature and
  loses the names people use. Lead with the routes.
- **A mixed path-glob list** (FE and BE together) — always separate, or scoped discovery can't prefer UI vs
  API files.
- **Inventing a message, route, or rule** to fill a gap — write `[UNCLEAR]` instead. A confident wrong fact in
  the KB poisons every analysis that reads it.
- **Deep-generating the whole app up front** — expensive and stale on day two. Scaffold broad, deepen lazily.
- **Folding two lookalike modules** because they share a word (orders vs order-templates, customers vs
  customer-groups) — keep them separate slugs; the keyword pack is what prevents the confusion.
- **Writing the KB into the plugin or a shared location** — it is product-specific; it lives in the QA's repo
  only.

## Related standards
- `variants-and-user-types.md` — the variant axis the KB's `Variants` section and variant RULES cite.
- `cross-module-reuse.md` — the atlas link table is what tells a cross-module test which blocks to reuse.
- `test-levels.md` — a RULES anchor usually maps to one level's case (contract/endpoint/workflow or UI).
- `knowledge/orchestration/qa-context.md` — the `catalog.kb` status, the `tracesRule` link, and the thread.
