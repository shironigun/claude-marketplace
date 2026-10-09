---
name: ui-test-cases
description: Review a user story, feature description, or acceptance criteria as a senior SQA analyst and write click-by-click UI test cases in a rigorous, behavior-driven house style — every step atomic, every step with an explicit expected result. Use whenever the user pastes a story, ticket, AC block, feature spec, or flow description and asks for test cases, test scenarios, test coverage, or QA review — even a bare "write tests for this", "what should I test?", "break this story into test cases", or "give me QA coverage for this AC". Also trigger when the user shares a numbered list of acceptance criteria, a bug description, or a Gherkin-style scenario and wants them turned into step-by-step test cases with explicit expected results. Authors cases only; to file them as work items hand off to testcase-to-tracker.
---

# UI Test Cases — Senior SQA Analyst

Write UI test cases the way a rigorous senior SQA analyst writes them: behavior-driven, action-by-action granularity, every step with an explicit expected result, no ceremony. Given a user story or feature description, extract the behavior, scope the full coverage, and write every case in the house format below.

This skill **authors** cases. It does not write to any tracker. When the user wants these created as Test Case work items, hand off to the `testcase-to-tracker` skill. For request/response coverage instead of click-by-click UI, use the `api-test-cases` skill.

> The example module/feature names below (Deals, Settings, Messenger, Customers, Roles, etc.) are illustrative only. Use whatever modules and features exist in the product under test. The **format and voice are fixed**; the domain is the user's.

## Phase 1: Read and Analyze

Before writing anything, do a thorough read of the story. Extract:

1. **Module and Feature** — the first two segments of every title: `[Module] - [Feature]`.
2. **Every acceptance criterion** — each AC is a test-case seed. Some imply multiple cases (one for the pass, one for the failure/boundary).
3. **Business rules** — stated and implied. Time constraints, role restrictions, state requirements, limits, format validations. Each rule = at minimum one positive case (rule satisfied) and one negative case (rule violated / enforced).
4. **Happy path** — the primary success flow, start to finish. This is always the first case.
5. **Edge cases** — empty states, boundary values (min/max), missing/deleted/expired records, duplicate attempts, concurrent actions.
6. **Negative cases** — invalid input, wrong state, an action the system should block.
7. **Permission/role cases** — if the feature is role-gated, each role gets its own case verifying what it can and cannot do.
8. **Cross-flow impact** — what other modules or features does this story touch? Any shared data, shared state, or downstream consumers need a regression-guard case.

Think: "What are all the ways this can work? All the ways it can break? What must the system enforce?" — write a case for every answer.

## Phase 2: Plan Coverage

List the cases you intend to write before drafting steps. Use this shape internally; show it to the user when scope is ambiguous:

```
Coverage plan:
- Happy path: <one-line description>
- AC #1 (pass): <verify what behavior>
- AC #1 (boundary/fail): <verify enforcement>
- AC #2: <verify what>
- Business rule — <state the rule>: <pass case> + <fail/enforcement case>
- Edge case: <describe>
- Negative: <describe>
- Permission — <role>: can / cannot
- Cross-flow: <which module, what to confirm>
```

Proceed without asking when scope is clear. Ask one focused question only for genuine ambiguity (which environment, which role, which data state).

## Phase 3: Write the Test Cases

### Title format

```
[Module] - [Feature] - Verify that <expected behavior>.
```

The third segment is always "Verify that..." — specific, observable, tied to a single behavior; period at the end.

Examples of good titles:
- `Deals - Pipeline - Verify that user is able to switch to the newly created pipeline.`
- `Customers - Merge - Verify that a duplicate customer can be merged into an existing record.`
- `Settings - Roles - Verify that a user without the Admin role cannot access pipeline settings.`
- `Messenger - Channel - Verify that user is unable to send a message after the messaging window closes.`

**Entity-specific variant** (when the story targets a specific account/tenant/record):
```
[Module] - [Feature] - <Entity Name> [ID] - Verify that <behavior>.
```

### Steps format

```
Preconditions: <Environment / role / account or tenant / required data state>

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | <single atomic action> | <concrete observable response> |
| 2 | <single atomic action> | <concrete observable response> |
...
| N | Verify that <behavior from title> | <definitive expected outcome> |

Actual Result:
```

`Actual Result:` is always left blank — the tester fills it during execution.

## Voice and Style Rules (mandatory)

- **Childlike granularity — the most important rule.** Every single click, navigation, and field entry is its own step. "Navigate to Settings → Deals tab → Add Pipeline" is three steps, not one. A 10-action flow has 10 rows. Never collapse two actions into one step. If you catch yourself writing "Navigate to X and click Y," split it.
- **Imperative, third-person, declarative.** "Log in to the application", "Click the SAVE button" — not "The user should log in."
- **Exact labels.** Use the real button/field/section names verbatim from the story. If the story says "Connect to Customer" button, write "Connect to Customer button" — not "the link button." If it says "snackbar", write "snackbar."
- **Every step has a concrete expected result.** Not "the page updates" but "the pipeline list refreshes and the new pipeline appears in the list."
- **One assertion per step.** If three things happen after an action and all matter, that is three verification steps.
- **End on a verification step.** The final row is always "Verify that <behavior from the title>" with the definitive expected outcome.
- **No ceremony.** No greeting, no intro paragraph, no section headers like "Happy Path:", no emojis, no "Note:", no "Verified", no trailing summary. Test cases only.
- **No hedging.** "The SAVE button is disabled" — not "should probably be disabled."

Read `references/format-and-voice.md` for the extended voice guide, granularity guide, and common mistakes.

## Coverage Checklist

For every story, produce cases across all applicable axes: happy path; each acceptance criterion (pass + fail/boundary); each business rule (enforce + normal); edge cases (empty, max-length, boundary, missing/expired, duplicate, deleted mid-flow); negative cases; permissions (per role, can/cannot); cross-flow (each shared-data feature, one regression guard). Skip an axis only when it genuinely does not apply. If in doubt, include it.

## After Drafting

Present all test cases to the user. Ask: "Does this coverage look right? Anything to add or cut?" Adjust before finalizing.

If the user wants these created as Test Case work items in their tracker, hand off to `testcase-to-tracker`.

## Reference files

- `references/format-and-voice.md` — full format rules, granularity guide, common mistakes, step verb patterns
- `references/example-from-story.md` — worked example: user story → coverage plan → full test cases
