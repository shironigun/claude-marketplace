# Code-reading guide — reading a module's code for QA, and labeling from evidence

How `code-intelligence` reads a module's **code** into a QA understanding — the code analog of
`story-intelligence` reading a work-item graph. This reference says *what to read and how to label it*;
it **points** at the shared concern checklist and brief format rather than restating them:

- the concern categories to scan → `story-intelligence/references/concern-taxonomy.md`
- the brief sections + worked example → `story-intelligence/references/review-brief-format.md`

> Product-neutral: `orders`, `widgets`, a `User` role, `OrdersController` are placeholders. Read the
> real module's names from the code and the house-profile — never hard-code a product here.

## 0. Reuse the confirmed flow-map first

If `scan-and-confirm` already ran, a `flow-map.json` sits at the framework root and a `module` slice
sits in `qa-context`. **Read them before you read code.** They give you, already QA-confirmed: the
module name, the hosts, the in-scope `endpoints` (`method` + `path` + `purpose`), and the `flows`
(ordered steps). That is a validated spine — reuse it. Read code to **add** what the map doesn't carry
(validation rules, auth checks, error handling, cross-module calls) and to **check** whether the code
still matches the confirmed flows. A divergence between the code and the confirmed map is a
**Gap-or-Question**, not a silent correction.

Only cold-read the whole surface (sections 1-2 below) when there is **no** confirmed map.

## 1. Read an API module

| Read for | Grep / Glob / Read target | What it gives QA |
|---|---|---|
| **Routes & methods** | controllers / route files / handler registrations (`*Controller`, router/route tables, URL confs) | the real endpoints, verbs, route templates, and the status codes each handler returns |
| **Request / response shape** | the DTOs / view-models / serializers the handlers bind | required fields, types, what comes back — the contract to test |
| **Validation** | validation attributes / validator classes / schema guards on the inputs | the validation the code **actually enforces** (vs what a story only implies) |
| **Auth / roles** | auth / role / policy annotations on the routes (`[Authorize]`, guards, middleware, policy attributes) | which routes are protected and which are **not** — an unprotected route is a finding |
| **Status & errors** | the handler bodies: returns, thrown errors, try/catch | the error paths the code handles — and the ones it silently doesn't |
| **Cross-module calls** | imports / service injections that cross the module boundary; calls to external/DMS/partner clients | the integration + regression surface (section 4) |

## 2. Read a UI module

| Read for | Grep / Glob / Read target | What it gives QA |
|---|---|---|
| **Screens & components** | the module's components / pages / routes | the screens in scope and how the user moves between them |
| **Flows & states** | the component state + conditionals (loading / empty / error / success branches) | the states to test — especially the empty and error states a happy-path demo skips |
| **Form fields & validation** | the forms and their field-level validation / schema | inputs, required-ness, client-side rules (and where server rules differ) |
| **Client calls** | the API client calls the components make | which API endpoints the UI depends on (ties UI coverage back to the API module) |
| **Permissions in the UI** | role-gated rendering (a control shown/hidden by role) | where the UI hides a control — then ask whether the **API** enforces it too (a classic gap) |

## 3. Label a claim from code evidence

Every line you carry forward gets exactly one label (full table in the skill, (d)). The code-specific
rule of thumb:

| You saw in the code… | Label | Why |
|---|---|---|
| A route, a validator, a status code, a state transition, a confirmed flow-map flow | **Confirmed** | the code (or the QA-confirmed map) proves the behaviour — cite the `file:line` / route / flow |
| A pattern that strongly implies a rule but isn't spelled out (an attribute on a base class, a shared filter) | **Inferred** | reasoned from the code, not stated — cite what you reasoned from |
| A bare literal, a magic number, a silent `catch`, a default with no comment | **Assumption** | the code does it, but **why** is unproven — you're assuming intent; must be validated |
| No code at all for an expected behaviour (no error handling, no permission check, an intent the code can't show) | **Gap-or-Question** | code can't confirm intent — needs the story / BA / Dev |

> **The intent gap.** Code shows *what happens*, almost never *what is meant to happen*. A `30`-day
> literal, a status string, a silent catch — the code is the "what"; the business rule is the "why",
> and the why is the gap. Surfacing those honestly (as Assumption / Gap, never Confirmed) is the
> highest-value thing this engine does. **Never invent the rule to fill the blank.**

## 4. Follow the dependencies — the reuse + regression surface

The single most QA-relevant thing code gives you that a story often doesn't: **what this module touches
and what touches it.** Grep for calls crossing the module boundary, both directions:

- **What this module calls** — another module's service, a shared helper, an external/DMS/partner API.
  Each is an integration point (test the contract + the failure behaviour) *and* a reuse signal (the
  authored tests should reuse that module's setup, not re-implement it — see
  `knowledge/standards/cross-module-reuse.md`).
- **What calls this module** — other features that depend on it. Changing or testing this module ripples
  to them: that is the **regression surface** for the brief's *Regression impact* section.

Record each crossing with its `file:line`. A dependency whose source you can't read is a
**Gap-or-Question**, not an assumption.

## 5. Map the findings onto the slices

The analysis writes the **same slice shapes the authoring engines already read** — so a code-analyzed
module reaches `author-*` exactly as a story-analyzed one does:

| What you produced | `qa-context` slice/field |
|---|---|
| Module name + `flow-map.json` pointer | `module.name`, `module.mapRef` |
| Labeled understanding + concerns (b)-(d) | `module.findings[]` |
| Testability verdict | `review.verdict` |
| Ordered risks | `review.risks[]` |
| Regression impact / coverage holes | `review.coverageGaps[]` |

If `scan-and-confirm` already wrote a `module` slice, **extend** its `findings[]` with the QA analysis —
don't overwrite the scan. **Traceability caveat:** a case authored from a module currently traces via
`tracesStory` (`null` for a module) — the `cases` contract has no module trace field yet — so the module
understanding feeds authoring, but **case → module traceback is a known gap** to close on the `cases`
slice (a future `tracesModule` / equivalent), not a back-link this analysis can set.

## 6. What this guide does NOT do

- It does **not** author cases, request matrices, or click steps — that is `author-api-cases` /
  `author-ui-cases`.
- It does **not** scaffold, generate, or run anything — that is `kit-builder` / `automation-engine` /
  `run-suite`.
- It does **not** confirm flows interactively or collect `.env` — that is `scan-and-confirm`.
- It writes **nothing** to product code or the tracker; the only write is the local `qa-context` slice.
