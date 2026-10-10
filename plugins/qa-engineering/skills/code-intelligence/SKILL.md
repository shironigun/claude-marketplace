---
name: code-intelligence
description: Native read-only engine of the qa-engineering — the mirror of story-intelligence for CODE. Given a module or code path (not a tracker story), read the code (reusing the confirmed flow-map when scan-and-confirm already ran), and produce a requirement understanding, a gaps/concerns list, and a QA review brief + test strategy — every claim labeled Confirmed / Inferred / Assumption / Gap-or-Question, and never inventing a requirement. Product-neutral; the module name and any product specifics come from the code + the house-profile, never hard-coded. Reads code only — contains no write to code, framework or tracker. Use whenever the user wants to "analyze this module to test it", "review this code / this module", "get me ready to test this module", "what should I test in <module/path>", "raise gaps on this code", "codebase → QA", or gives a bare module path / code area with intent to TEST it. It writes the module + review slices of qa-context and ends at the gaps gate — it does NOT author test cases (hand off to author-api-cases / author-ui-cases), does NOT scan-to-build (that is scan-and-confirm → kit-builder), and writes NOTHING to code or the tracker.
---

# Code Intelligence — understand the module from its code, surface the gaps, brief the QA

Before a single test case is written against an existing module, read the *code* the way a senior QA
reads a story: work out what the module really does and why, find the holes a tester would fall into,
and hand the QA a review brief they can act on. This is the **codebase → QA** direction — the exact
mirror of `story-intelligence`, which starts from a tracker story. Where that engine reads a work-item
graph, this one reads a module's code; both produce the same labeled understanding + gaps + QA review
and end at the same gate. This engine helps QA **understand the module**, not mechanically turn code
into cases. It reads and reasons; it authors nothing and files nothing.

This is a native engine of the `qa-engineering` plugin, routed to by the `qa-orchestrator` on an
"analyze this module **to test it**" intent. One skill covers both the analysis and the QA review. It
stops at the gaps gate and hands a clean `qa-context` forward — the authoring engines build on it.

> **READ-ONLY.** This engine performs **no write** to product code, to the framework, or to the
> tracker — it never creates, edits, scaffolds, comments, links, or files anything. Every operation it
> runs against the code is a read (Grep / Glob / Read, and the read-only flow-map). The only thing it
> writes is its own analysis into the local `qa-context.json` (see (f)) — a session-state write at the
> framework root, not a code or tracker write. If a task here feels like it needs a write, it is out of
> scope: surface it to the QA instead.

> **Complements `scan-and-confirm`, does not duplicate it.** `scan-and-confirm` interactively confirms
> a module's flows **to build a framework** (its output is `.env` + `flow-map.json` for `kit-builder`).
> `code-intelligence` read-only-analyses a module **for QA understanding + authoring** (its output is
> the `module` + `review` slices for `author-*`). When a confirmed `flow-map.json` already exists, this
> engine **builds on it** instead of re-deriving the surface — see (a).

> **Product-neutral by rule.** The examples below (Orders, widgets, a User role) are generic
> placeholders. The real module name, domain nouns and product areas come from the code under test and
> the QA's git-ignored **house-profile** (`knowledge/orchestration/house-profile.md`), read at run time
> — never hard-coded here. No real company, product, board, URL, account or credential belongs in this
> skill or in anything it writes to a committed file.

## Where the specifics come from (read, never hard-code)

Read product specifics from the house-profile slots before you reason about the code; if the profile is
absent, fall back to what the code itself names and **say the slot the QA should fill** — do not reach
for a remembered real value.

| What you need | House-profile slot | If blank |
|---|---|---|
| Product domain nouns (to name the module as the team names it) | `product.name`, `product.domainNouns` | Use the nouns the code uses (controller/route/component names); say so |
| Which integrations / external systems the product has (DMS, partners) | the profile's integration conventions | Name only the dependencies the code shows; flag the rest as a gap |
| Roles / permission model the product uses | the profile's role conventions | Use the roles the code's auth checks name; flag unknowns as gaps |
| Where the module's code lives (repo path, API vs UI) | `product.repoPaths` (or given by the QA) | Ask for the path; do not guess a repo location |

The module is "whatever the QA points at" — a path, an area of the repo, or a module name that maps to
code. The *flow* (gather the code context → understand → find gaps → brief) is identical whether the
code is an API backend, a UI frontend, or both.

## (a) Gather the code context — READ-ONLY

Build the fullest picture of the module the code allows, in this order. **Use only read operations**
(Grep / Glob / Read, and the read-only `flow-map.json`). Never a write.

| Step | What to pull | How |
|---|---|---|
| 1 | **Reuse a confirmed flow-map if one exists.** If `scan-and-confirm` already ran (a `flow-map.json` at the framework root and/or a `module` slice in `qa-context`), read it and build on it — the module, hosts, endpoints and **QA-confirmed flows** are a far better starting point than a cold re-scan. Do **not** re-derive what the QA already confirmed. | Read `flow-map.json`; read the `module` slice via `qa-context` |
| 2 | **The module's surface** — for an API: controllers / route files / handlers (routes, methods, route templates, status codes), request/response DTOs, validation attributes. For a UI: screens/components, the flows between them, form fields, states (loading/empty/error), and the client calls they make. | Glob the module path; Grep for route/handler/component definitions; Read the key files |
| 3 | **Inputs & validation** — every input the module accepts (fields, params, bodies) and the validation the code actually enforces (required, format, length, allowed values) — distinct from validation a story might *imply* but the code omits. | Read the DTOs / validators / form schemas |
| 4 | **Auth / roles** — which routes or actions carry an auth/role/policy check, and which do not. A route with no check is itself a finding. | Grep for the auth/role/policy annotations the code uses |
| 5 | **Cross-module dependencies** — what this module **calls** (other modules' services, shared helpers, external/DMS/partner APIs) and what **calls it**. The QA reuse and regression surface lives here. | Grep for imports / service calls crossing the module boundary |

Rules for the gather:

- **Read-only, always.** Every operation above reads; none mutates. This engine references **no**
  create / edit / scaffold / add / link / comment / file operation of any kind.
- **Reuse before re-derive.** A confirmed `flow-map.json` is QA-validated truth about the flows; prefer
  it over anything you infer cold from the code. Note where the current code appears to have drifted
  from the confirmed map as a **Gap-or-Question**, not as a silent correction.
- **Record what you could not read** (a called dependency whose source you don't have, a dynamic route
  you can't resolve statically, an unreadable generated file) as a **Gap-or-Question** — never fill it
  with a guess.
- **Label every source.** Each fact you carry forward names where it came from (`file:line`, a route
  template, a flow-map flow). No source means it is not Confirmed — see the labels in (d).

## (b) Requirement understanding (from the code)

From the gathered context, state — concisely, each claim labeled:

- **What the module does & (where derivable) why** — the behaviour the code implements; the
  user/business reason only where the code, comments, or flow-map make it clear (otherwise an
  Inferred/Assumption/Gap — the *intent* behind code is exactly what code alone often can't confirm).
- **Expected behaviour** — what the module does in observable terms (endpoints and their responses;
  screens and their state transitions).
- **Affected modules / features** — the product areas this covers, in the team's domain nouns.
- **Integrations / APIs / external systems** — every service, API, or external/partner system (e.g. a
  DMS the house-profile names) this module calls or is called by, from step-5 evidence.
- **Existing behaviour at risk** — what the cross-module dependencies mean this module could break, or
  be broken by (the regression surface).

> **The intent gap is the whole point.** Code tells you what the system *does*; it rarely tells you what
> it is *meant* to do, which business rule is deliberate vs accidental, or what the expected error is.
> Those are the highest-value gaps this engine surfaces — label them honestly rather than inventing the
> rule.

## (c) QA concerns — scan the full checklist

Walk the concern taxonomy in `story-intelligence/references/concern-taxonomy.md` (reused, not
duplicated) and surface what applies **to this module**, read from the code. Cover, at minimum:

- **Ambiguities** — behaviour the code implements two ways, or a value whose meaning the code leaves
  unclear (what a status/flag actually means).
- **Missing requirements / validation / error handling** — inputs with **no** validation in the code;
  error/empty/failure paths the code doesn't handle; success that isn't observable.
- **Permissions / security** — routes/actions with no auth/role check; a lower-privilege caller able to
  reach an action by API even if a UI hides it; data a role shouldn't see; tenant/account isolation.
- **Integration** — the contract at each boundary the module calls; what the module does when a
  dependency is slow, down, partial, or errors.
- **Regression** — the existing flows that share code, state, or a screen with this module (the step-5
  dependency surface).
- **Mobile / responsive** — where the module has a UI and the product has a mobile/responsive surface.
- **Edge cases** — boundaries, empties, maxima, concurrency, duplicates, time zones the code does or
  doesn't handle.
- **Data / state** — state machine transitions the code allows/forbids; soft vs hard delete; defaults;
  stale/cached state; idempotency.
- **Backward-compatibility** — older clients of a changed contract; saved/in-flight data.
- **Risks the module introduces** — new failure modes, hot-path queries, new external calls.

## (d) Label EVERY claim — and never invent a requirement

Every statement in the output carries exactly one label. This labeling is **load-bearing**: it is how
QA knows what the code *proves* versus what still needs the story / AC / product owner.

| Label | Means | Example |
|---|---|---|
| **Confirmed** | Seen directly in the code (a route, a validator, a status, a flow-map flow) — with a source | "`DELETE /orders/{id}` sets status to `cancelled`, not a row delete. *(Confirmed — OrdersController:88)*" |
| **Inferred** | Reasoned from the code, not stated outright | "This reuses the Orders permission filter. *(Inferred — the `[Authorize(Orders)]` attribute on the controller)*" |
| **Assumption** | A silence in the code you filled to proceed — must be validated | "Assuming the 30-day window is a business rule, not a leftover constant. *(Assumption — a literal `30` in the handler, no comment)*" |
| **Gap-or-Question** | Something the code **cannot** tell you — needs the story / BA / Dev before testing is safe | "What is the intended error when the downstream DMS times out? The code has no catch. *(Gap-or-Question)*" |

> **Never invent a requirement.** Code shows behaviour, not intent. If the code doesn't prove it and you
> can't source it, it is an **Assumption** or a **Gap-or-Question** — never a Confirmed requirement. Do
> not promote a convenient reading of a literal or a silent catch into a spec. A blank stays a labeled
> gap; it is surfaced, not silently resolved.

## (e) QA review brief + test strategy

Produce the brief in the format of `story-intelligence/references/review-brief-format.md` (reused, not
duplicated). Its sections — Understanding / Scope / Risks / Questions-&-Gaps / Regression impact /
Test strategy — apply unchanged; here they are grounded in **code evidence** rather than AC. In
particular:

- **Scope** — what the module's code covers, what it explicitly does not, and what is unclear (a gap).
- **Risks** — the highest-risk areas to break, ordered; each with why (the cross-module surface from
  step 5 usually tops this).
- **Questions / Gaps** — the numbered Gap-or-Question items, led by **what is not testable from code
  alone** (the intended business rules, expected errors, the permission matrix) — these need the story
  or the product owner.
- **Test strategy** — which test types apply **and why**, grounded in what the code shows: functional,
  regression, API, UI, integration, permissions, validation, negative, cross-browser, mobile,
  DMS/external-integration, performance. Name the ones that do **not** apply and why.

This brief exists to help QA **think** about the module — it is not a test-case list. It does not
enumerate click steps or request matrices (that is the authoring engines' job).

## (f) Write the `module` + `review` slices of `qa-context`

Per `knowledge/orchestration/qa-context.md`, write this engine's output into `qa-context.json` at the
framework root (**read and write it from the file** — never rely on a chat block that a compaction may
drop). Write **only** this engine's slices, additively; never clobber another engine's slice.

- **`module`** = `{ name, mapRef, findings[] }` — the module name (as the product names it), `mapRef`
  pointing at `flow-map.json` when one exists (never duplicate the map into the context), and
  `findings[]` = the labeled QA understanding + concerns from (b)-(d). If `scan-and-confirm` already
  wrote a `module` slice, **extend** it (add the QA findings) rather than overwrite its scan result.
- **`review`** = `{ verdict, risks[], coverageGaps[] }` — because this one engine also produces the QA
  review, write the companion review slice from the brief: the testability verdict, the ordered risks,
  and the coverage gaps the brief raised.

These are the **same slice shapes `story-intelligence` writes** — `review`, plus a `module`
understanding where that engine writes `story` — so the authoring engines pick up a code-analyzed
module as their qa-context analysis input the same way they pick up a story-analyzed one.

> **Honest caveat on traceability.** The `cases` slice currently anchors the traceability thread on
> `tracesStory` (the work-item id, left `null` when authoring did not come from a story) — there is
> **no module trace field yet**. So a case authored from a module here is informed by this analysis but
> traces back only through `tracesStory` (`null` for a module), not through a first-class module id.
> Treat **case → module traceback as a known gap on the `cases` contract** (a future `tracesModule` or
> equivalent) — it is not something this engine can set, and this engine does not claim the back-link
> exists. The `module` understanding feeds authoring; closing the back-link is follow-up on the `cases`
> slice, out of scope here.

Nothing product-specific, secret or real-URL goes into the context.

> Note on scope: writing the `module`/`review` slices is a **context-state write at the framework root
> — not a code or tracker write.** The READ-ONLY rule is about product code, the framework and the
> tracker; it does not forbid saving your own analysis to the local session-state file.

## (g) End at the gate — do not auto-advance

Stop here and surface the gate, verbatim in spirit:

> **"I found N gaps/questions — most need the story/AC or the product owner (code can't confirm intent).
> Resolve those first, or proceed to author cases on the stated assumptions?"**

List the N Gap-or-Question items (lead with the ones code can't answer) and the Assumptions you would
proceed on. **Do not** auto-advance to test-case generation. Case authoring is a separate engine
(`author-api-cases` / `author-ui-cases`), reached only after the QA chooses to resolve the gaps or to
proceed on the stated assumptions.

## Rules

1. **Read-only.** Only reads (code via Grep/Glob/Read, the flow-map). No edit, scaffold, create, add,
   link, comment, or file operation appears anywhere in this engine. The sole write is the local
   `qa-context` slice.
2. **Never invent a requirement.** Code shows behaviour, not intent ⇒ unstated intent is an Assumption
   or a Gap-or-Question, never a Confirmed requirement.
3. **Label every claim** — Confirmed / Inferred / Assumption / Gap-or-Question, each with its source
   (`file:line`, route, or flow-map flow).
4. **Reuse before re-derive.** Build on a confirmed `flow-map.json` / `module` slice when present;
   complement `scan-and-confirm`, don't repeat it.
5. **Read the specifics from the house-profile**; degrade to what the code names and say the blank slot
   when it is absent. No hard-coded project, product, role or URL.
6. **Follow the dependencies**, not just the module node — what it calls and what calls it (the reuse +
   regression surface).
7. **Write the `module` + `review` slices from the file**, additively; extend a prior scan rather than
   clobbering it.
8. **End at the gaps gate**; never auto-advance to case generation.
9. **Product-neutral and secret-free** — generic examples only; no real company/product/board/URL/
   account/credential.

## Reference files

- `references/code-reading-guide.md` — how to read a module's code for QA (what to Grep/Glob/Read for
  an API vs a UI module, how to reuse the flow-map, and how to label a claim from code evidence).
- Reuses `story-intelligence/references/concern-taxonomy.md` (the concern checklist, (c)) and
  `story-intelligence/references/review-brief-format.md` (the brief format, (e)) **by pointer** — the
  taxonomy and brief shape are identical; only the evidence source (code, not AC) differs.

## Done when

- [ ] The module's code context was gathered **read-only** (surface, inputs/validation, auth/roles,
      cross-module deps), **reusing a confirmed `flow-map.json`/`module` slice** when present; nothing
      was written to code, the framework, or the tracker
- [ ] The specifics (domain nouns, integrations, roles, repo path) were read from the **house-profile**
      or named from the code, not hard-coded
- [ ] Requirement understanding + the concern checklist were produced, **every claim labeled** Confirmed
      / Inferred / Assumption / Gap-or-Question with its source, and **no requirement was invented**
      (unproven intent surfaced as a gap)
- [ ] A QA review brief + test strategy was produced in the reused reference format
- [ ] The `module` + `review` slices of `qa-context` were written **from the file**, additively
      (extending, not clobbering, any prior `scan-and-confirm` scan)
- [ ] The engine **ended at the gaps gate** and did not auto-advance to case generation
- [ ] Nothing product-specific, secret or real-URL appears in the skill or in what it committed

Next: on the QA's go-ahead at the gate, hand off to `author-api-cases` / `author-ui-cases` to turn the
understood, gap-resolved module into test cases — they read the `module`/`review` slices this engine
wrote, the same way they read the `story`/`review` slices from `story-intelligence`.
