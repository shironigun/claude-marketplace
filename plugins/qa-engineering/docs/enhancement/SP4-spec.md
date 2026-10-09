# SP4 — Reviewer + Reuse Guardian (spec)

Status: in progress (2026-10-08). The **final** sub-project of the [Enhancement Program](./README.md).
Depends on SP1 (Standards) + SP3 (generation + self-check). Adds the **independent** review gate the SP3
self-check is not.

## 1. Goal
After a build step, an **independent reviewer** inspects the generated/modified framework against the SP1
standards + official best-practices and **blocks progression** on hard-rule violations — catching what the
builder's own self-check misses. A **reuse-guardian** specializes in duplication + cross-module-reuse
violations. Review-only: they report and block; they never edit (fixing is the builder's job, on the next pass).

## 2. Deliverables

### 2a. `knowledge/review/review-rubric.md` (shared, DRY)
The review criteria in one place, so both agents (and anyone) gate against the same canon:
- A table of **dimensions** — architecture · POM usage · reusability/duplication · test isolation · test
  data · assertions · API/UI boundary · configuration/secrets · naming · flakiness · maintainability ·
  scalability · official best-practices — each with **what good looks like / what fails**, the **owning
  SP1 standard** it points at (not restated), and a **severity** (Blocking / Important / Minor).
- The **blocking hard rules** (progression stops): failure-hiding skips or `toContain(res.status())`
  status-lists; a test depending on another test's data / shared mutable state / ordering; cross-module
  logic duplicated instead of reused; secrets or product data committed; a POM built on brittle CSS/XPath
  where a role/label locator exists; `as any` / silenced types in generated specs.
- The **grep-gates** a reviewer can run (e.g. `toContain(res.status(`, `test.skip(`, `as any`,
  `#region auto-generated`) and the build-gates (`npm run typecheck`, `npm run lint`, `npm run verify`).

### 2b. `agents/framework-reviewer.md`
The broad review gate. Frontmatter `name: framework-reviewer`, trigger-rich `description` ("review my
framework / check this before I continue / is this generated code correct / review the module I just built
/ enforce the standards"), `tools: Read, Grep, Glob, Bash, Skill` (review-only — NO Write/Edit). Body: read
the changed/target files, run the grep-gates + typecheck/lint/verify, judge each rubric dimension against
`knowledge/standards/` (via `framework-standards`), **delegate the reuse dimension to `reuse-guardian`**,
and return a verdict — **Blocking findings stop progression**; Important/Minor are listed. Each finding:
file:line · the violated standard · why · the fix direction (it does not apply the fix). Product-neutral.

### 2c. `agents/reuse-guardian.md`
The DRY/cross-module specialist. Frontmatter `name: reuse-guardian`, trigger-rich `description` ("check for
duplication / am I reusing the customer module / is this DRY / did I re-implement another module's setup /
reuse-guardian"), `tools: Read, Grep, Glob, Bash, Skill` (review-only). Body: detect (1) a flow that
re-implements another module's create/setup instead of **reusing its service/POM/builder via merged
fixtures** (cites `cross-module-reuse.md`); (2) duplicated logic across specs/modules; (3) duplicated
selectors/actions across page objects (`page-objects.md`). Returns Blocking findings for real
cross-module-reuse violations, with the reuse it should have called. Invocable standalone or by the reviewer.

### 2d. Wire the review gate (light)
- `skills/kit-builder/SKILL.md` — after a phase's **self-check**, run `framework-reviewer`; **Blocking**
  findings stop the phase until addressed (the independent gate). Keep the phase machine.
- `agents/kit-orchestrator.md` — one line: a build phase ends with a reviewer gate; "review this" routes to
  `framework-reviewer`.
- `docs/verification.md` — note the two-tier model: generation self-check (builder) → independent review
  gate (framework-reviewer + reuse-guardian, blocking).

## 3. Acceptance criteria
1. `framework-reviewer` + `reuse-guardian` agents exist, product-neutral, review-only (no Write/Edit in
   tools), consume the SP1 standards + `review-rubric.md` (no duplication of standard bodies), and can run
   the grep-/build-gates (Bash).
2. `review-rubric.md` lists the dimensions × what-good/bad → owning standard × severity, and the blocking
   hard rules + the grep/build gates.
3. The reviewer delegates reuse to `reuse-guardian`; both can run standalone.
4. `kit-builder` runs the reviewer as a **blocking** gate after the self-check; `kit-orchestrator`/
   `verification.md` describe the two-tier model.
5. Product-neutral + secret-free (scan); committed + pushed to `dev`. Existing kit intact.
6. **Program complete:** the §22 UX exists end-to-end — orchestrator routes teach↔build, the tutor teaches,
   the builder generates-to-standard with a self-check, the reviewer + reuse-guardian gate.

## 4. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per chunk; push (user-authorized); secret + product scan before
every push. No PR. Conventional commits scoped `qa-engineering`.
