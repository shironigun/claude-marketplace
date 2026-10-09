---
name: author-ui-cases
description: Native skill of the qa-engineering — review a user story, feature description, or acceptance criteria as a senior SQA analyst and write click-by-click UI test cases in a rigorous, behavior-driven house style, every step atomic, every step with an explicit expected result. Product-neutral and tracker-agnostic (ADO / Jira / any), grounded in the kit's framework standards. Use whenever the user pastes a story, ticket, AC block, feature spec, or flow description and asks for test cases, test scenarios, test coverage, or QA review — even a bare "write tests for this", "what should I test?", "break this story into test cases", or "give me QA coverage for this AC". Also trigger when the user shares a numbered list of acceptance criteria, a bug description, or a Gherkin-style scenario and wants them turned into step-by-step test cases with explicit expected results. Authors cases only; to file them as work items hand off to file-to-tracker.
---

# UI Test Cases — Senior SQA Analyst

Write UI test cases the way a rigorous senior SQA analyst writes them: behavior-driven, action-by-action granularity, every step with an explicit expected result, no ceremony. Given a user story or feature description, extract the behavior, scope the full coverage, and write every case in the house format below.

This is a native skill of the `qa-engineering`. It follows the kit's framework standards (the `framework-standards` skill and `knowledge/standards/`), so the cases it authors line up with how the kit structures and runs tests — these UI cases map onto the kit's standard test levels (smoke / regression / e2e).

It consumes the shared authoring core — `knowledge/authoring/house-style.md` — for the coverage discipline, the title/step/voice rules (resolved from the house-profile `caseAuthoring` slot, with the neutral default shown below), the qa-context `cases` output contract, and the **approval seam**. This skill adds the **UI domain layer**: click-by-click granularity and the UI verb patterns.

This skill **authors** cases and records them in `qa-context`; it does not write to any tracker. When the user wants them created as Test Case work items, the gated **`ado-publish`** skill files the approved set. For request/response coverage instead of click-by-click UI, use the `author-api-cases` skill.

> The example module/feature names below (Deals, Settings, Messenger, Customers, Roles, etc.) are illustrative only. Use whatever modules and features exist in the product under test. The **house format below is the neutral default — the house-profile `caseAuthoring` slot may override the title convention, tags, step shape and voice**; the domain is always the user's.

## Phase 1: Read and analyze (UI-flavored)

Follow the core's four-phase discipline and coverage axes (`knowledge/authoring/house-style.md` §"The
coverage discipline") — the core owns the list; read it off the screens and flows this story touches. For a
UI story, extract: the **Module + Feature** (the first two title segments); **each acceptance criterion** (a
seed — usually a pass case *and* a fail/boundary case); and the core's **business-rule / edge / negative /
permission / cross-flow** axes. Rules and edges are where the real coverage lives.

Think: "What are all the ways this can work? All the ways it can break? What must the system enforce?" — a
case for every answer.

## Phase 2: Plan coverage

List the cases before drafting steps (show the plan to the QA when scope is ambiguous). Proceed without
asking when scope is clear; ask one focused question only for a genuine ambiguity (which environment, role,
data state).

```
Coverage plan:
- Happy path: <one-line>
- AC #1 (pass) + AC #1 (boundary/fail)
- Business rule — <rule>: <pass> + <enforcement>
- Edge / Negative / Permission — <role>: can / cannot / Cross-flow: <module>
```

## Phase 3: Write the cases (UI format)

The house **format** — the title convention, the Preconditions line, the `# / Action / Expected Result`
table, and the blank `Actual Result:` — is owned by the core (`house-style.md` §"The house format") and
resolved from the `caseAuthoring` profile slot. It is **not** restated here, so there is one source of truth.
What is UI-specific:

- **UI titles** (neutral default convention `[Module] - [Feature] - Verify that <behavior>.`), e.g.:
  - `Deals - Pipeline - Verify that user is able to switch to the newly created pipeline.`
  - `Settings - Roles - Verify that a user without the Admin role cannot access pipeline settings.`
  - `Messenger - Channel - Verify that user is unable to send a message after the messaging window closes.`
- The UI granularity rule below (every click/navigation/field entry is its own row).

## Voice and style — UI specialization

The shared voice rules live in the core (`knowledge/authoring/house-style.md`): imperative third-person declarative, exact labels verbatim, a concrete expected result per row, one assertion per row, end on the `Verify that <title behavior>` row, no hedging, no ceremony. **The UI-specific rule on top of those:**

- **Childlike granularity — the most important UI rule.** Every single click, navigation, and field entry is its own step. "Navigate to Settings → Deals tab → Add Pipeline" is three steps, not one. A 10-action flow has 10 rows. Never collapse two actions into one step. If you catch yourself writing "Navigate to X and click Y," split it.

Read `references/format-and-voice.md` for the extended granularity guide, common mistakes, and step verb patterns.

## Coverage Checklist

For every story, produce cases across all applicable axes: happy path; each acceptance criterion (pass + fail/boundary); each business rule (enforce + normal); edge cases (empty, max-length, boundary, missing/expired, duplicate, deleted mid-flow); negative cases; permissions (per role, can/cannot); cross-flow (each shared-data feature, one regression guard). Skip an axis only when it genuinely does not apply. If in doubt, include it.

## After drafting — record in qa-context + the approval seam

Per the core's output contract (`knowledge/authoring/house-style.md`):

1. Write the `cases` slice to `qa-context.json` (framework root, from the file): `items[]` (each `{ title, level, tags[], tracesStory, adoCaseId: null }`, `level` = `smoke`/`regression`/`e2e`), plus `mdPath`, `coverage`, with **`approved: false`**.
2. Present all cases and ask a **single** gate: **"Approve this exact set to lock it for publishing? Reply *approve* to lock it, or tell me what to add, cut, or change."** Adjust before finalizing.
3. Set **`approved: true` only on an explicit *approve*** (or unmistakable equivalent); a change request or a bare "ok" is not approval; never infer it from "ok"/silence/drafting. **Any change to the set resets `approved` to `false`.**
4. Once approved, the gated **`ado-publish`** skill files them to a Test Plan/Suite; if an authored case later fails during execution, `failure-to-bug` drafts the bug.

## Reference files

- `references/format-and-voice.md` — full format rules, granularity guide, common mistakes, step verb patterns
- `references/example-from-story.md` — worked example: user story → coverage plan → full test cases
