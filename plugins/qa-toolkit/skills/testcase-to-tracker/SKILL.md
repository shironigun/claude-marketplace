---
name: testcase-to-tracker
description: Author test cases from a ticket in a rigorous senior-SQA house style and file them as Test Case work items in the user's issue tracker (Azure DevOps, Jira, or any other), then link each back to the source ticket. Use whenever the user wants to write, draft, generate, or create test cases for a ticket, story, defect, or bug AND get them into their tracker — or mentions a work item ID together with testing, a Test Plan/Suite, test steps, expected/actual results, or QA verification. Trigger even on a bare "write tests for #123456 and add them", "I need test cases for this story in the tracker", or when they paste a ticket description and ask to turn it into filed test cases. For authoring cases without filing, use ui-test-cases (UI) or api-test-cases (API); this skill is the filing counterpart.
---

# Test Case -> Tracker

Write test cases in the house style — precise, behavior-driven, no ceremony — then create them as Test Case work items in the user's tracker and link them to the source ticket. This skill owns the filing workflow; the authoring style is identical to `ui-test-cases` / `api-test-cases`.

`~~tracker` below means whatever issue/work-item system the user connects (Azure DevOps, Jira, Linear, etc.). Read `references/tracker-field-mapping.md` for how to render the house step table in the specific tracker before creating anything.

## What you can and cannot assume

- The **product, modules, environments, roles, accounts, project, and tracker are the user's** — never hardcode them. If the target project/board, area/path, plan/suite, or default assignee is not given and it matters for creation, ask once.
- If the user has flow/spec/requirements docs, treat them as the source of truth for behavior — read the relevant part before writing. If not, work from the ticket plus the user's answers.

## The workflow

1. **Read the ticket.** Pull the work item from `~~tracker` (by ID) or have the user paste it. Extract: the environment/account, the feature touched, expected vs actual behavior, and any acceptance criteria.
2. **Scope the behavior.** If docs exist, follow them and collect every cited business rule. If not, ask the user for the flow or work from the ticket + domain knowledge.
3. **Draft the test cases** in the format below. Cover happy path, every business rule, every edge case, and negative/permission cases. Rules and edges are where the real coverage lives.
4. **Show the user the drafts for approval** before creating anything in the tracker.
5. **Create each as a Test Case work item** in `~~tracker` (see "Creating in the tracker").
6. **Link each to the source ticket.**
7. **Tell the user the new work-item IDs** and any manual follow-up the tracker requires (e.g., adding cases to a Test Suite/Plan, if that step is not available via the connector).

## Test case format

**Title:** ALWAYS `[Module] - [Feature] - Verify that <expected behavior>.`

The third segment is phrased as "Verify that..." describing the specific behavior under test. Mirror an entity-bracket convention when the ticket is entity-specific: `[Module] - [Feature] - <Entity Name> [ID] - Verify that ...`.

Examples:
- `Deals - Pipeline - Verify that user is able to switch to the newly created pipeline.`
- `Messenger - Channel - Verify that user is unable to send a message after the messaging window closes.`
- `Customers - Merge - Verify that a duplicate customer can be merged into an existing record.`

**Steps — childlike granularity is mandatory.** Every single click, navigation, and field entry is its own step. Never collapse "Navigate to Settings -> Deals tab -> Add Pipeline" into one step — that is three steps. Assume the tester knows nothing and must be guided action-by-action. A 10-action flow has 10 steps. The final step is always the verification step.

**Every step has its own explicit Expected Result.** No step is left without one. State exactly what the system shows or does in response to that one action.

Use this exact shape:

```
Preconditions: Environment: <QA/Staging/Production> | Role: <role> | <any setup state>

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Deals tab | Deals settings tab is displayed |
| 4 | Click the Add Pipeline button | Add Pipeline form/drawer opens |
| 5 | Add at least one department | Department is added to the pipeline |
| 6 | Click the SAVE button | Pipeline is saved and appears in the pipeline list |
| 7 | Navigate to the Deals module | Deals module opens |
| 8 | Click the "Select Pipeline" dropdown | Dropdown expands showing the list of pipelines |
| 9 | Click the newly created pipeline option | Pipeline is selected |
| 10 | Verify that the user switched to the pipeline successfully | The selected pipeline's stages load and the active pipeline reflects the new selection |

Actual Result:
```

**Actual Result:** leave a labeled blank line for the tester to fill during execution — never pre-fill it at authoring time.

## Voice rules

- Imperative, third-person, declarative. Not "You should..." or "We will...".
- Exact labels — the real button/field/section names verbatim from the ticket.
- Childlike granularity — every click and navigation is its own step; never bundle actions.
- Every step has a concrete expected result; one assertion per step.
- End on a "Verify that <title behavior>" step.
- No ceremony, no emojis, no hedging ("is disabled", not "should probably be disabled").

## Coverage checklist

For any ticket, produce cases across these axes — skip one only if it genuinely does not apply: happy path; each business rule (enforce + normal); edge cases (empty, max length, expired, duplicate, deleted/merged); negative cases (invalid input, wrong state, disallowed action); permissions (per role); cross-flow impact (each connected flow that shares data or state).

## Creating in the tracker

The house step table does not map identically to every tracker. **Before creating, read `references/tracker-field-mapping.md`** for the tracker in use — it covers Azure DevOps (the native Test Case Steps XML), Jira (Xray/Zephyr step tables or a formatted description), and a generic fallback (steps in the description as an HTML/Markdown table).

General procedure, tracker-agnostic:

1. Create each test case as a work item of the tracker's Test Case type (or the closest available type). Set title per the format above, the area/project/board the source ticket lives in, and the assignee if the user specified one.
2. Put the steps into the tracker's native step field if it has one; otherwise render the step table into the description. Follow the mapping reference for exact field names and markup.
3. Carry over relevant tags/labels from the source ticket.
4. Link the new case to the source ticket using the tracker's "tests"/"tested by"/"relates to" relation; if a specific relation is unavailable, fall back to a generic "related" link and tell the user which relation was used.

**Always get the user's approval before creating** — creation is a real write. If a step or field is rejected by the tracker, fall back to putting the full step table in the description and tell the user, rather than failing the whole creation.

## Honest limits

- Some trackers do not expose Test Suite/Test Plan membership through their connector/API. If so, create the cases, report the new IDs, and tell the user to add them to the suite/plan in the tracker UI.
- This skill authors and files; it does not execute test runs or record pass/fail outcomes.

## Reference files

- `references/tracker-field-mapping.md` — how to render the house step table and links per tracker (Azure DevOps, Jira, generic)
- `references/example-testcases.md` — a worked example: ticket -> derived cases in full house style
