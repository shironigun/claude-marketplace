# SP13 — Code-intelligence: the codebase → QA direction (spec)

Status: in progress (2026-10-09). Phase 3 (gap-closure). Depends on SP5 (qa-context), SP6 (`story-intelligence`
— the mirror this follows), SP8 (the authoring engines it feeds), and complements `scan-and-confirm` (the
build-oriented module scan). **Closes the "mirror codebase → QA" direction the roadmap advertises but never
wired as a standalone flow.**

## 1. Why
The roadmap promises *"the mirror **codebase → QA** direction"* and the original ask was *"create ADO test
cases from analyzing the codebase, with QA review."* But "analyze this module" only routes to
`scan-and-confirm`, which produces a **flow-map for the build** — it does **not** author a QA understanding,
gaps, or review. There is **no code analog to `story-intelligence`**, and a module only becomes cases
*inside* a full brick-by-brick build. SP13 adds the read-only analyzer so a module (not just a tracker story)
can be understood, gap-checked, and handed to the authoring engines — without committing to a framework build.

## 2. Goal
A **read-only** engine that, given a **module / code path**, produces a requirement understanding + a
gaps/concerns list + a QA review brief + test strategy — **every claim labeled Confirmed / Inferred /
Assumption / Gap-or-Question**, never inventing a requirement — writes the `module` + `review` slices of
qa-context, ends at the gaps gate, and hands off to the authoring engines. It is the exact mirror of
`story-intelligence` (tracker story → understanding) for **code**.

## 3. Deliverable — `skills/code-intelligence/SKILL.md`
Triggers: "analyze this module to test it", "review this code / this module", "get me ready to test this
module", "what should I test in `<module/path>`", "raise gaps on this code", "codebase → QA", or a bare
module path / code area given with intent to test. Product-neutral; the module name + any product specifics
come from the code + the house-profile, never hard-coded.

**The flow (in order), mirroring `story-intelligence`:**
1. **Gather the code context (read-only).** If `flow-map.json` already exists (scan-and-confirm ran), read the
   `module` slice / map and build on it — do **not** re-scan. Otherwise read the module's code directly
   (Grep/Glob/Read): endpoints + methods + request/response shapes (API), screens/components + flows + states
   (UI), inputs, validation, auth/roles, and **cross-module dependencies** (what this module calls).
2. **Produce the requirement understanding** — what the module does and the behaviours it implements, each
   labeled **Confirmed** (seen in the code) / **Inferred** / **Assumption** / **Gap-or-Question** (can't be
   determined from code — surface it, e.g. the intended business rule, the expected error, the permission
   matrix).
3. **Produce gaps + QA review** — risks, edge cases, negative/permission/cross-flow coverage, and what is
   **not testable from code alone** (needs the story/AC/product owner). Reuse the shared concern taxonomy and
   review-brief format from `story-intelligence`'s references (point at them; do not duplicate).
4. **Write the `module` + `review` slices** — `module` = `{ name, mapRef, findings[] }` (findings = the QA
   understanding + per-item label), `review` = `{ verdict, risks[], coverageGaps[] }` (the same shapes the
   authoring engines already read). **End at the gaps gate** — surface the open questions; invent nothing.
5. **Hand off** to `author-api-cases` / `author-ui-cases`, which already read `module` + `review` to author
   cases. SP13 does **not** author cases, publish, generate scripts, run, or file — and **writes nothing to
   the tracker or the codebase**.

**Safety rules (stated in the skill):**
- **Read-only by rule** — like `story-intelligence`, it only reads (code + optional flow-map); zero writes to
  code, tracker, or framework. Every claim carries its Confirmed/Inferred/Assumption/Gap label; it never
  invents a requirement a reader could mistake for fact.
- **Complements, does not duplicate, `scan-and-confirm`** — scan-and-confirm interactively confirms flows for
  a *build*; code-intelligence read-only-analyses a module for *QA understanding + authoring*. It reuses the
  flow-map / `module` scan when present rather than re-deriving it.
- **Product-neutral + secret-free.**

**References** (`skills/code-intelligence/references/`): `code-reading-guide.md` (how to read a module's code
for QA — endpoints/flows/states/deps, and how to label a claim from code evidence). Reuses
`story-intelligence/references/{concern-taxonomy.md, review-brief-format.md}` by pointer.

## 4. Wiring
- `qa-orchestrator` routing: split the "analyze this module" intent — **"analyze/review this module *to test
  it*" / "codebase → QA" / "get me ready to test this module" → `code-intelligence`** (read-only → feeds
  author-*); **"scan this module to *build* a framework" → `scan-and-confirm` → `kit-builder`** (unchanged).
  Update the "create test cases (+ a story, a review, **or a module**)" row so a module routes through
  `code-intelligence` first (module + review), then the authoring engines — making that claim real.
- `qa-context.md`: the `module` + `review` slices' "written by" gains **`code-intelligence`** (alongside
  `scan-and-confirm` for `module`, `story-intelligence` for `review`).

## 5. Out of scope
Authoring cases (SP6–8) · building a framework (scan-and-confirm → kit-builder) · publishing (SP7) ·
automation (SP9) · running (SP12) · bugs (SP10). SP13 analyses a module and hands off; it writes no code,
no tracker item, and no cases.

**Known gap (follow-up, not owned by SP13): case → module traceback.** The `cases` slice anchors the
traceability thread on `tracesStory` (the work-item id, `null` when authoring did not come from a story);
there is no module trace field. So a case authored from a module here is informed by the `module`/`review`
analysis but does not yet carry a first-class back-link to the module (and `ado-publish`, which links a
published case to its `tracesStory`, creates a module-sourced case unlinked). SP13 states this caveat
honestly rather than claiming the back-link exists. Closing it is a change to the **`cases` contract** (add
a `tracesModule`/equivalent and have `author-*` + `ado-publish` honor it) — a separate sub-project.

## 6. Acceptance criteria
1. `code-intelligence` analyses a module **read-only** (reusing the flow-map when present), produces a
   requirement understanding + gaps + QA review with **every claim labeled** Confirmed/Inferred/Assumption/
   Gap, and **ends at the gaps gate** (invents nothing).
2. It **writes the `module` + `review` slices** (shapes the authoring engines already consume) and hands off
   to `author-api-cases` / `author-ui-cases`; it writes nothing to code or the tracker.
3. It **reuses** `scan-and-confirm` (flow-map) and `story-intelligence`'s shared references rather than
   duplicating them; product-neutral + secret-free; committed + pushed to `dev`.
4. `qa-orchestrator` routes a "analyze this module to test it / codebase → QA" intent to `code-intelligence`,
   making the "create cases from a module" + "codebase → QA" claims real.
5. **Independent adversarial review passes** — truly read-only, fail-safe labeling (no invented requirements),
   correct slice contracts, real reuse of scan-and-confirm + story-intelligence refs, neutral.

## 7. Logistics
Repo `claude-marketplace`, branch `dev`. Conventional commits scoped `qa-engineering`. Secret + product scan
before every push. Full independent review (read-only is the key risk, like SP6).
