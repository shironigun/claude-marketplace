# SP2 — Automation Tutor (spec)

Status: in progress (2026-10-08). Part of the [Enhancement Program](./README.md). Depends on SP1
(Framework Standards core). Teaches **from** the SP1 standards — never duplicates them.

## 1. Goal
Let a **manual QA with zero automation background** learn automation and Playwright, progressively and at
an adjustable depth, and get any specific topic explained on demand — all product-neutral and grounded in
official docs. The tutor **teaches the SP1 standards** (and official docs); it does not restate their content
in a second place.

## 2. Deliverables

### 2a. `automation-tutor` agent (`agents/automation-tutor.md`)
The teaching brain. Three modes, picked from what the QA asks:
- **Guided curriculum** — walk the learning path in order, track where the QA is, keep them on track,
  "what's next", pick up where they left off.
- **On-demand topic** — explain any Playwright/automation topic the QA names.
- **Decision help** — "when should I use X vs Y" → route through SP1's `framework-standards` decision
  guidance (do NOT re-implement it here).
Always: product-neutral, depth-adjustable (§2d), cite official docs, teach the standard (invoke
`framework-standards` / read `knowledge/standards/`), check understanding, never invent an "official"
practice. It invokes the skills below via the Skill tool; it does not itself scaffold framework code
(that is SP3's builder).

### 2b. `teach-automation` skill (`skills/teach-automation/SKILL.md`)
Owns the **curriculum** and the **pedagogy**:
- Walks `knowledge/curriculum/learning-path.md` (the ordered ~35 topics), respecting prerequisites and
  progression; supports "start from the beginning", "what's next", "jump to <topic>", "where was I".
- Teaches each topic **by pulling its mapped SP1 standard + official docs** and explaining at the chosen
  depth. It does not duplicate standard content.
- Applies the depth levels (§2d) and checks understanding before advancing.

### 2c. `playwright-topic` skill (`skills/playwright-topic/SKILL.md`)
The **on-demand explainer** for any Playwright/automation topic (iframes, fixtures, downloads, popups,
tabs, dynamic elements, flaky tests, auth, API-vs-UI, test data, cross-module reuse, …). Explains via the
template: *what it is · why apps use it · how Playwright handles it · the relevant Playwright concepts ·
recommended approach · code example(s) · common mistakes · best practices · when to use it (and not) ·
official Playwright docs.* Depth-adjustable; product-neutral; links official docs; defers to the matching
SP1 standard where one exists.

### 2d. Depth levels (defined once, used by both skills)
- **L1 Quick** — the concept in 2–3 minutes.
- **L2 Practical** — concept + example + when to use it.
- **L3 Deep** — underlying concepts, architecture, trade-offs, examples, anti-patterns, implementation.
- **L4 Expert** — internals, design decisions, alternatives, scalability, failure modes, framework-arch
  implications.
Default to **L2**. The QA can say "go deeper" / "keep it high level" / "explain like I'm completely new",
and the tutor **adjusts depth on the same topic without restarting it**. "Explain like I'm new" = L1 with
plain language + an analogy.

### 2e. `knowledge/curriculum/learning-path.md`
The ordered ~35-topic path (from the spec §5): automation basics → framework concept → Playwright/TS
fundamentals → test runner/structure → locators → assertions → POM → components → fixtures → API
automation → API client → services → builders → test data → auth → config/env → schemas → matchers →
isolation → cleanup → cross-module reuse → test levels → smoke/regression/e2e → contract/endpoint/workflow
→ parallelism → flaky tests → debugging → reporting → CI/CD → maintenance → architecture/scalability.
Each entry is a **thin index row**: learning goal (one line) · prerequisites · mapped SP1 standard(s) ·
official-doc link(s) · a "you could build this with the kit" hook (ties to SP3). The teaching depth lives
in the standards + the skill's pedagogy, not re-written here.

### 2f. Orchestrator wiring (light)
Update `agents/kit-orchestrator.md` so it routes a "I want to learn / teach me / explain …" intent to
`automation-tutor`, and a "build / scaffold / continue the framework" intent to the build phases — the
teach↔build split. Keep it minimal; the full interleaved §22 UX matures across SP3/SP4.

## 3. Out of scope (later SPs)
Generators/scaffolding, isolation/reuse enforcement in generation, Allure wiring, terminal toolkit, VS
Code extension configuration (SP3); reviewer + reuse-guardian (SP4). SP2 only teaches; it builds no
framework code.

## 4. Acceptance criteria
1. `automation-tutor` agent + `teach-automation` + `playwright-topic` skills exist, product-neutral, and
   **consume the SP1 standards (no duplication)** — each teaching topic points at a standard and/or an
   official-doc URL rather than restating it.
2. `knowledge/curriculum/learning-path.md` covers the ~35 topics in a progressive order, each mapped to a
   standard + official doc + prerequisites.
3. The 4 depth levels are defined once and both skills apply them; dynamic "go deeper"/"keep it high
   level" adjusts the same topic without restarting.
4. `playwright-topic` explains an arbitrary topic via the full template, citing official docs.
5. `kit-orchestrator` routes teach vs build.
6. Product-neutral + secret-free (scan); committed and pushed to `dev`.

## 5. Logistics
Repo `claude-marketplace`, branch `dev`. Commit per chunk; push (user-authorized); secret + product-name scan
before every push. No PR. Conventional commits scoped `qa-engineering`.
