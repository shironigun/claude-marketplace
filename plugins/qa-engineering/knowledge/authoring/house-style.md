# Authoring house-style — the shared core

The one source of truth for **how the `qa-engineering` writes a test case**: the coverage discipline, the
title/steps/voice rules, how those resolve from the team's **house-profile**, and how an authored set lands
in `qa-context` so the gated publish path (`ado-publish`) can pick it up. Both authoring engines —
`author-api-cases` (request/response) and `author-ui-cases` (click-by-click) — consume this core instead of
each restating the style. They add only their **domain** layer (API levels; UI click granularity).

> **Product-neutral by rule.** Every module/feature/field name used as an illustration here (Orders, Deals,
> widgets, Settings) is a generic placeholder. The real domain, the team's exact title convention, tags,
> step shape and voice come from the git-ignored **house-profile** `caseAuthoring` slot
> (`knowledge/orchestration/house-profile.md`), read at run time — never hard-coded. Nothing product-,
> org- or identity-specific belongs in this file.

## Where the style comes from (read the profile, fall back to the neutral default)

The authoring voice is a **profile slot**, not a constant. Read `caseAuthoring` from `house-profile.json`;
for any sub-field it does not supply, use the neutral default below **and say the default is in use** when a
team would plausibly have its own. Never reach for a remembered real convention.

| What | `caseAuthoring` sub-field | Neutral default (used when the slot is blank) |
|---|---|---|
| Title convention | `titleConvention` | `[Module] - [Feature] - Verify that <behavior>.` |
| Step/expected shape | `stepFormat` | A `# / Action / Expected Result` table, one atomic action per row |
| Tags | `tags` | none beyond the case's own domain tags (`@api` / `@ui`) |
| Tone | `voice` | behavior-driven, imperative third-person, one explicit expected result per step |

The **domain** (modules, features, endpoints, fields, roles) is always the user's — taken from the story,
the spec, or the code under test, never invented. "The convention is a slot; the domain is the user's."

## The coverage discipline (every case set, both domains)

Authoring is four phases. Do them in order; do not skip to writing steps.

1. **Read & analyze.** Extract the Module + Feature (the first two title segments), every acceptance
   criterion (each a seed — often a pass case *and* a fail/boundary case), every business rule (stated and
   implied), the happy path, the edges, the negatives, the permission/role cases, and the cross-flow impact
   (what shared data or downstream consumer this touches).
2. **Plan coverage.** List the cases you intend to write **before** drafting steps. Show the plan to the QA
   when scope is ambiguous; proceed without asking when it is clear. Ask one focused question only for a
   genuine ambiguity (which environment, role, or data state).
3. **Write the cases** in the resolved house format (below).
4. **Present for approval** (the seam — see "Landing in qa-context").

### Coverage axes (produce a case for each that applies)
happy path · each acceptance criterion (pass + fail/boundary) · each business rule (enforced + normal) ·
edge cases (empty, min/max boundary, missing/expired/deleted, duplicate, concurrent) · negative cases
(invalid input, wrong state, a blocked action) · permissions (per role: can / cannot) · cross-flow (one
regression guard per shared-state dependency). Skip an axis only when it genuinely does not apply; when in
doubt, include it. **Rules and edges are where the real coverage lives.**

## The house format (neutral default; overridden by the profile)

### Title
```
[Module] - [Feature] - Verify that <expected behavior>.
```
The third segment is always `Verify that …` — specific, observable, tied to a **single** behavior; period at
the end. Entity-specific variant when the story targets one account/tenant/record:
`[Module] - [Feature] - <Entity Name> [ID] - Verify that <behavior>.`

### Preconditions
A single line stating everything the tester sets up before step 1 — environment, role/user type,
account/tenant/record context, required data state, any flags:
`Preconditions: Environment: <env> | Role: <role> | <any other state>`

### Steps
```
| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | <single atomic action> | <concrete, observable response> |
| … | … | … |
| N | Verify that <behavior from title> | <definitive expected outcome> |

Actual Result:
```
- IDs start at 1 and increment by 1.
- **One atomic action per row**, **one assertion per row** — if two things happen and both matter, that is
  two rows. (Each domain sharpens what "atomic" means: a click vs. one HTTP request / one assertion.)
- **End on a `Verify that <behavior from title>` row** with the definitive outcome.
- **`Actual Result:` is always left blank** — the tester fills it at execution time; never pre-fill it.

## Voice rules (mandatory, both domains)
- **Imperative, third-person, declarative.** "Click the SAVE button", "Send a POST request" — not "the user
  should…".
- **Exact strings verbatim.** Real button/field/section labels, real method/path/field/header/enum/status/
  schema names — exactly as the story or spec gives them. Not "the link button", not "an error".
- **Every row has a concrete expected result.** "The pipeline list refreshes and the new pipeline appears",
  not "the page updates"; "Status code is 401", not "responds correctly".
- **No hedging.** "The Send button is disabled", never "should probably be disabled".
- **No ceremony.** No greeting, no intro paragraph, no `Happy Path:` headers, no emojis, no `Note:`, no
  trailing summary. Test cases only — start at the first title, end after the last `Actual Result:`.

## Landing in qa-context — the output contract + approval seam

Authoring does not end at a chat dump: it **writes the `cases` slice** of `qa-context.json` (at the framework
root, from the file — see `knowledge/orchestration/qa-context.md`) so the publish and automation engines can
find the exact set. Write, additively:

- `cases.items[]` — each `{ title, level, tags[], tracesStory, adoCaseId: null }`. `level` is the domain
  level (API: `contract`/`endpoint`/`workflow`; UI: `smoke`/`regression`/`e2e`). `tracesStory` is the source
  work-item id when authoring came from a story (else `null`). `adoCaseId` is left `null` at authoring and
  stamped by `ado-publish` once the case is created in the tracker.
- `cases.mdPath` — where the human-readable `.md` was written. `cases.coverage` — a short coverage note.
- `cases.approved` — **the approval seam.**

### The approval seam (fail-safe — mirrors ado-publish's gate 2)
- While drafting, write the slice with **`approved: false`** (or leave it absent — both mean *not approved*).
- After presenting the cases, ask a **single, unambiguous** gate (one question, not three bundled):
  > **"Approve this exact set to lock it for publishing? Reply *approve* to lock it, or tell me what to add,
  > cut, or change."**
- Set **`approved: true` only on an explicit sign-off** — *approve* (or an unmistakable equivalent: "yes,
  these are good", "ship these"). Anything that requests a change, or a bare "ok"/"yes" to a bundled
  question, is **not** approval; **never** infer approval from "ok", silence, a follow-up question, or the
  mere act of drafting. Say out loud when you set it.
- **Any change to the set resets `approved` to `false`** — a re-approval is required after an edit.

This is the one bit that lets `ado-publish` fire: it refuses to publish until `cases.approved === true`.
Authoring approval (here) and the publish confirm (ado-publish gate 2) are **two distinct, explicit human
acts** — approving the cases is not permission to write them to the tracker.

## What this core does NOT do
It does not file to any tracker (that is `ado-publish`, gated), does not generate automation code (the
automation engine), and does not draft bugs (`failure-to-bug`). It authors cases and records them, approved
or not, in `qa-context`.

## The two domain layers (what each engine adds on top)
- **`author-ui-cases`** — click-by-click granularity (every click/navigation/field-entry is its own row),
  the UI verb patterns, and UI levels (smoke/regression/e2e). See its `references/format-and-voice.md` for
  the granularity guide and common mistakes.
- **`author-api-cases`** — the three levels (Contract / Endpoint / Workflow), the endpoint negative matrix
  (401/403/400·422/404/409/…), request+assertion atomicity, and id-capture + teardown for workflows.
