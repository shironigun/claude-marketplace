---
name: kb-builder
description: Native engine of the qa-engineering — deep-generate one module's Knowledge Base entry (a behavior brief + testable RULES + a thin code atlas) from the product code, surface-first, so the analysis and authoring engines are grounded in documented behavior instead of re-deriving it. Given a module (a route/screen/area/slug), it reads the product repo READ-ONLY, runs the investigation protocol (map the surface — web screens under a route OR a desktop app's forms/windows/menus — trace its calls, resolve them into backend handlers or code-behind/business-logic, cross-check contracts, extract rules, build disambiguation keyword packs, mark variant behavior), confirms the discovered surface with the QA, then WRITES only the knowledge-base/ files in the QA's own repo (modules/<slug>.md + atlas/<slug>.md + a RULES.md patch) and runs a coverage self-audit. Product-neutral; the module/routes/messages come from the code, never hard-coded. Use whenever the user wants to "deepen the KB for <module>", "build the knowledge base for this module", "document this module's features/rules", "generate the module brief", or when scan-and-confirm/story-/code-intelligence finds a module whose KB is still a stub and the QA opts to deepen it. It generates product KNOWLEDGE into the QA's repo; it does NOT author test cases (author-api-cases / author-ui-cases), scan-to-build (scan-and-confirm → kit-builder), analyze-only (code-intelligence), or write to the tracker.
---

# KB Builder — one module, deep, from the frontend in

A module's Knowledge Base entry is the product's behavior written down as testable knowledge: what each
feature does, its flows and exact messages, the business rules, how it varies by variant, and the thin code
map that ties a feature to the files behind it. `kb-builder` produces that entry for **one module at a time, at
depth**, discovered **surface-first** (the module is what users see — web routes **or** desktop forms/menus — not how controllers are grouped). It
reads the product read-only and writes only the `knowledge-base/` files in the QA's own repo.

This is a native engine of the `qa-engineering` plugin. It produces the artifact defined by
**`knowledge/standards/knowledge-base.md`** — read that for the exact file format; this skill owns the
*method* (the investigation protocol, the emit, the self-audit, the confirm gate), not a second copy of the
format.

> **READ-ONLY against the product; writes only the KB.** Every operation against the product repo is a read
> (Grep / Glob / Read, the read-only flow-map). The **only** thing this engine writes is the
> `knowledge-base/` files (and the `catalog.kb` status in `qa-context`). It never edits product code, never
> scaffolds a framework, and never writes to the tracker. The KB it writes lives in the **QA's own repo**
> (committable team knowledge) and **never** in the plugin.

> **One module, at depth.** Exhaust the requested module; do not thin a shallow whole-tree pass across the
> app. Breadth is `scan-and-confirm`'s job (it scaffolds a stub per module on first `/qa`); **depth** is this
> engine's job, run lazily when a module is about to be analyzed, built, or tested.

> **Reuse, don't re-derive.** Read the product the way `code-intelligence` does — reuse
> `skills/code-intelligence/references/code-reading-guide.md` (how to Grep/Glob/Read an API vs a UI module,
> how to reuse a confirmed `flow-map.json`, how to label a claim from evidence) and
> `skills/story-intelligence/references/concern-taxonomy.md` (the concern checklist that seeds RULES) **by
> pointer**. This engine adds the KB-specific sequencing + emit, not a parallel code reader.

> **Product-neutral by rule.** Examples (Orders, Widgets, Customers vs Customer Groups) are generic
> placeholders. The real module name, routes, messages, field names and rules come from the **code under
> test** and the QA's git-ignored **house-profile** (`knowledge/orchestration/house-profile.md`), read at run
> time. No real company, product, route, message, URL, account or secret belongs in this skill. The generated
> KB (which does hold product specifics) is written to the QA's repo only.

## Where the specifics come from (read, never hard-code)
Read product specifics from the house-profile before reasoning about the code; if a slot is blank, use what
the code itself names and **say the slot the QA should fill** — never a remembered real value. Use the same
slots `code-intelligence` lists (`product.name`, `product.domainNouns`, integration/role conventions,
`product.repoPaths`) and the **variant axis** from `system-map.json` (`variants-and-user-types.md`).

## Inputs
- **The module** — a route, an area of the repo, or a slug the QA points at (the module `scan-and-confirm`
  discovered surface-first and seeded into `catalog`). If `catalog` already lists it as a `stub`, deepen that
  stub; if it is `absent`, create the entry.
- **A confirmed `flow-map.json` / `module` slice**, when `scan-and-confirm` or `code-intelligence` already
  ran — reuse the confirmed surface instead of a cold re-scan.
- **`system-map.json`** — the variant axis, so the module's variant behavior is cited, not invented.

## The investigation protocol (execute in order; do not skip)
Run against **this module only**, surface-first, every operation read-only. (This is the KB analogue of
`code-intelligence`'s gather, sequenced to produce the KB; use its code-reading guide for the *how*.) Steps
A-C below are written for a **`web`** product; for a **`desktop`** product use the desktop variant in the box
beneath them. **D-H are identical for every product kind.**

**A. Map the frontend surface.** From the SPA's route table / router config / nav / lazy-imports, find this
module's route(s) and every screen, drawer, modal, tab, and empty/error state under them. This is the module's
user-visible surface and the source of its name.

**B. Trace the frontend deeply.** For each screen: the component tree, hooks, state/stores/queries, form
fields and validators, and **every HTTP call** (fetch / Axios / RTK Query / service wrapper) with its method,
path template, and the request/response fields the UI uses. Capture **semantic UI anchors** (role + name /
label / text) only — never CSS/nth/XPath; if an anchor is unstable, write `[TODO: needs a stable anchor]`.

**C. Resolve calls into the backend.** For each FE call, find the controller/action it hits: auth/role
attributes, model binding, validation, branching (including variant branches), status codes, error payloads.
Follow into services only as far as behavior a test must know. For an **API-only** product with no frontend,
start from the backend routes instead and say the taxonomy came from the backend.

> **Desktop variant of A-C** (`productKind: desktop` — a VB.NET / Delphi / WinForms / WPF thick client, no HTTP
> surface):
> - **A (desktop).** Map the module's **forms / windows / menu area** — the screens, dialogs, tabs, and
>   empty/error states the user sees. This is the surface and the source of the module's name.
> - **B (desktop).** For each screen, read the **code-behind / event handlers** (button clicks, menu commands,
>   form load, validators) and the **controls** the user touches. Capture UI anchors as the control's
>   **label / name** (the `Save` button, the `Email` field), not a web locator.
> - **C (desktop).** Resolve each handler into the **business-logic / data-access** it calls (service methods,
>   repositories, SQL) — auth/permission checks, validation, branching (incl. variant branches), and the error
>   dialogs / message boxes it raises. Follow into services only as far as a test must know. (For a `mixed`
>   product, also resolve any backend-API calls as in web step C.)

**D. Cross-check contracts.** FE request/response assumptions vs BE reality (for `desktop`: the screen's
assumptions vs what the handler/service actually does). A mismatch is a high-value **Gap** (fuel for negative
cases and bug-finding) — record it, do not smooth it over.

**E. Extract rules.** Every **Condition → Result** with its exact user/API message becomes a `RULES.md`
anchor. Walk the concern taxonomy (reused) to make sure auth, validation, permission, variant, money/credit,
and destructive-action rules are all captured — these are the high-value negatives a story analysis will lean
on.

**F. Build keyword packs + disambiguation traps.** For this module vs every lookalike, write the exclusive /
shared-ambiguous / reject keywords and negative-query examples (per the standard). Apply the same rigor to
every lookalike pair you find (Orders vs Order-Templates, Customers vs Customer-Groups): a shared word alone
must never resolve a module.

**G. Mark variant behavior.** Where the module branches on the `system-map` variant axis (grep
`== <Enum>.<Value>`, `switch (type)`, a role/tier/flag gate near a render), record it in the module's
`Variants` section and as a variant `RULES` anchor, **citing the `file:line` branch**. If there is no branch,
the module is variant-agnostic — say so.

**H. Label every claim.** Confirmed (seen in code, with a source) / Inferred / Assumption / `[UNCLEAR: …]` /
`[TODO: confirm …]` — the same labeling `code-intelligence` uses. Code shows behavior, not intent; never
promote a convenient reading of a literal or a silent catch into a Confirmed rule.

## Confirm the surface — GATE (before deep-writing)
Present the discovered surface to the QA before writing the deep files: the module's routes/screens, the
feature list, the FE→BE call map, and the candidate RULES. Ask:

> **"This is the surface I found for `<module>` — routes, features, and the rules I'd record. Deepen the KB
> from this, or correct what I misread first?"**

The QA confirms or corrects (the code can be read, but only the QA knows which flows matter and what is
intended). Record a correction; do not argue with it. Only after this confirmation does the engine write the
deep files. (The stub already exists from `scan-and-confirm`; this gate guards the jump to `deep`.)

## Emit — write the KB files (the only writes)
Write, to the **`knowledge-base/` format in `knowledge/standards/knowledge-base.md`** (do not restate the
skeleton here — follow the standard):

1. **`modules/<slug>.md`** — Purpose · Route(s) · Touches · Key rules (links into RULES) · Keyword pack ·
   Flows (Trigger / Steps / Rules / Breaks / UI anchors / API-behind-it / Negative) · States · Variants
   (cited) · Gaps. Replace the stub in place.
2. **`atlas/<slug>.md`** — the trimmed v1: YAML frontmatter (routes, separate `frontend_path_*` /
   `backend_path_*` globs, `api_prefixes`, `features[]`), a route map, and the **FE↔BE link table** (feature →
   route/component → API calls → handler files). No impact/regression packs in v1.
3. **`RULES.md` patch** — append this module's rules as `## anchor` entries (one Condition → Result each, exact
   message), grouped under the module; link each back to `modules/<slug>.md`. **Never clobber** another
   module's rules — append/extend only.

Keep FE and BE globs separate; prefer exact strings copied from code; no em/en dashes; a blank is a labeled
gap, never an invented fact.

## Coverage self-audit (before reporting done)
Over the files just written, verify — and fix before finishing:
- [ ] Every route in the route map has a Flow / Screens entry.
- [ ] Every FE API call appears in the FE↔BE link table or is marked external/`[TODO]`.
- [ ] Every feature has at least one Flow and at least one RULES anchor (or an explicit "no rule" note).
- [ ] Keyword packs present; this module's **exclusive** keywords do not collide with a sibling's exclusive set.
- [ ] YAML globs match the prose path lists; FE and BE globs are separate.
- [ ] Variant branches are cited (`file:line`); or the module is stated variant-agnostic.
- [ ] Every claim is labeled; no invented endpoint/message/rule; no em/en dashes.

Report the audit result honestly; a failed item is fixed, not glossed.

## Update state (qa-context)
Per `knowledge/orchestration/qa-context.md`, write **from the file**, additively:
- Set this module's **`catalog.modules[].kb = "deep"`** (it was `stub`/`absent`).
- If `code-intelligence` later grounds analysis on this module, it reads these files; the RULES anchors become
  the seed for `author-*` cases (`cases.items[].tracesRule`).

(The `knowledge-base/` files on disk are the source of truth for KB content; `catalog.kb` only tracks depth.)

## Rules (state and obey)
1. **Read-only against the product; write only the KB.** No edit to product code, no framework scaffold, no
   tracker write. The sole writes are the `knowledge-base/` files + the `catalog.kb` status.
2. **Frontend-first.** Discover the module from routes/nav first; resolve to the backend; keep FE and BE globs
   separate. Backend fallback only for an API-only product, stated.
3. **One module at depth.** Exhaust the requested module; never thin a whole-tree pass.
4. **Never invent.** Code wins for technical facts; docs are cited vocabulary; unknowns are `[UNCLEAR]` /
   `[ASSUMED]` / `[TODO: confirm]`. Label every claim.
5. **Confirm the surface before deep-writing.** The QA validates the discovered surface at the gate.
6. **Reuse, don't duplicate.** Read the code via `code-intelligence`'s guide; seed rules from the shared
   concern taxonomy; follow the KB format from the standard — all by pointer.
7. **The KB is the QA's repo's, committable there, never the plugin's.** Product specifics stay out of the
   plugin and any shared content.
8. **Product-neutral + secret-free** in this skill; generic examples only.

## Reference files
- `knowledge/standards/knowledge-base.md` — the KB artifact format (the single source for the file skeletons).
- `skills/code-intelligence/references/code-reading-guide.md` — how to read an API vs UI module (reused).
- `skills/story-intelligence/references/concern-taxonomy.md` — the concern checklist that seeds RULES (reused).
- `knowledge/standards/variants-and-user-types.md` — the variant axis the module's Variants section cites.

## Done when
- [ ] The module was discovered **surface-first** (web routes / desktop forms / api-prefix — stated), reusing a
      confirmed flow-map when present; every product operation was read-only.
- [ ] The investigation protocol A–H ran over **this module at depth**; every claim is labeled; nothing
      invented.
- [ ] The QA **confirmed the surface** at the gate before any deep file was written.
- [ ] `modules/<slug>.md` + `atlas/<slug>.md` + a `RULES.md` patch were written to the **KB format**, FE/BE
      globs separate, variant behavior cited; the stub is now `deep`.
- [ ] The **coverage self-audit** passed (or its failures were fixed), reported honestly.
- [ ] `catalog.modules[].kb` was set to `deep` **from the file**, additively; no other slice was clobbered.
- [ ] The KB landed in the **QA's repo** only; nothing product-specific, secret or real-URL is in this skill.

Next: `code-intelligence` / `story-intelligence` read this entry to ground analysis; `author-*` turn its RULES
anchors into cases carrying `tracesRule`; `automation-engine` uses the atlas globs to scope reuse.
