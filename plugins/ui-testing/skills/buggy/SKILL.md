---
name: buggy
description: >-
  Writes click-by-click UI test cases for a tracker ticket in a rigorous senior-QA house style and creates
  them as Test Case work items in Azure DevOps, linked to the source ticket. Use this skill whenever the
  user asks to write, draft, generate, or create test cases for a ticket, defect, bug, or user story, or
  mentions a work item ID together with testing, a Test Plan or Suite, test steps, expected/actual
  results, or QA verification. Trigger it even on a bare "write tests for #1001" or "I need test cases
  for this story", and when the user pastes a ticket description or flow doc and asks how to test it.
---

# Test Case Authoring

Write test cases the way a senior QA analyst writes them: precise, behavior-driven, no ceremony. Then create them as Test Case work items in Azure DevOps and link them to the source ticket.

## Step 0 — Workspace profile

Read `references/workspace-profile.md`, then load `.claude/workspace-profile.json` from the user's project. This skill needs:
`tracker.*`, `boards.delivery`, `boards.support`, `workItemTypes.testCase`, `identity`, `environments`, `clientIdFormat`, `product.name`, `product.modules`, and `specDocs` (optional).
If any are missing, run discovery for those keys only, confirm with the user, save, then continue. Every org fact below comes from the profile; nothing is assumed.

- **Tracker:** the org and project (`tracker.org`, `tracker.project`, `tracker.projectId`).
- **Boards:** the support board (`boards.support.areaPath`: production defects) and the delivery board (`boards.delivery.areaPath`: sprint/feature work).
- **Test Plan / Suite:** use `testPlan.planId` / `testPlan.suiteId` from the profile; if empty, ask the user once and offer to save them.
- **Author identity:** the filer (`identity.displayName`, `identity.email`). Asked, never guessed.
- **Flow docs** (if the team keeps them, at `specDocs.path`): a folder of linked Markdown, such as `README.md` (index/mindmap), the rules file (`specDocs.rulesFile`, e.g. `RULES.md`, the business-rule registry), `modules/*.md`, `integrations/*.md`. These are the source of truth for behavior; read the relevant module file, its linked neighbors and the cited rule anchors before writing.

## The workflow

1. **Read the ticket.** Pull the work item with `azure-devops:list_work_items` (WIQL by ID) or have the user paste it. Extract: the client/environment, the feature touched, expected vs actual behavior, and any acceptance criteria.
2. **Scope the behavior.** If flow docs exist, open the module the ticket touches, follow its `Touches:` links, and collect every cited rule from the rules file. If no docs, ask the user for the flow or work from the ticket + domain knowledge.
3. **Draft the test cases** in the format below. Cover happy path, every business rule, every edge case ("Breaks"), and negative/permission cases. The rules and edge cases are where the real coverage lives.
4. **Show the user the drafts for approval** before creating anything in ADO.
5. **Create each as a Test Case work item** (see "Creating in ADO").
6. **Link each to the source ticket.**
7. **Tell the user the new Test Case IDs** and remind them to add them to the target suite in the ADO Test Plans UI (Add existing test cases by ID). That step is manual.

## Test case format

Each test case is one work item. Title and steps follow the house style.

**Title:** ALWAYS `[Module] - [Feature] - Verify that <expected behavior>`

The third segment is phrased as "Verify that..." describing the specific behavior under test. Examples (illustrative; use the product's real module names from `product.modules`):
- `Inbox - Queues - Verify that user is able to switch to the newly created queue.`
- `Inbox - Chat - Verify that user is unable to send a message after the 24-hour window.`
- `Contacts - Merge - Verify that a chat contact can be merged into an existing PARTNER-A contact.`

Mirror the client-bracket convention (`clientIdFormat`) when the ticket is client-specific: `[Module] - [Feature] - Client Name [ID] - Verify that ...`, e.g. `Contoso Outdoor [10001]`.

**Steps: childlike granularity is mandatory.** Write every single click, navigation, and field entry as its own step. Never collapse "Navigate to Settings → Inbox tab → Add Queue" into one step; that's three steps. Assume the tester knows nothing and must be guided action-by-action. If a flow has 10 discrete actions, there are 10 steps. The final step is always the verification step ("Verify that ...").

**Every step has its own explicit Expected Result.** No step is left without one. The expected result states exactly what the system shows or does in response to that one action: the screen that loads, the button that appears, the field that becomes editable, the message that displays.

ALWAYS use this exact step shape:

```
Preconditions: Client ID: <id> | Environment: <one of environments, e.g. QA/Staging/Production> | <any setup state>

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Inbox tab | Inbox settings tab is displayed |
| 4 | Click on the Add Queue button | Add Queue form/drawer opens |
| 5 | Add at least one team member | Team member is added to the queue |
| 6 | Save the queue by clicking the SAVE button | Queue is saved and appears in the queue list |
| 7 | Navigate to the Inbox module | Inbox module opens |
| 8 | Click the "Select Queue" dropdown | Dropdown expands showing the list of queues |
| 9 | Click the newly created queue option | Queue is selected |
| 10 | Verify that the user switched to the queue successfully | The selected queue's conversations load and the active queue reflects the new selection |
```

Match the depth of the example above: one atomic action per row, each with a concrete expected result, ending on an explicit "Verify that ..." row. "Login to the application" may name the product instead (`product.name`).

**Actual Result:** leave a labeled line `Actual Result:` for the tester to fill during execution (actual results are recorded at run time, not at authoring time).

## Voice rules (this is what makes them read as the house style)

- **Imperative, third-person, declarative.** "Open the Inbox module", "Click the SAVE button". Not "You should..." or "We will...".
- **Exact labels.** Use the real names: "Link to Contact", "Channels column", "Select Queue dropdown", "@firstName merge tag", "snackbar". If the ticket names a field or button, use that string verbatim.
- **Childlike granularity.** Every click and navigation is its own step. Never bundle actions. A real test case for a 10-action flow has 10 rows. This is the single most important style trait; match the reference depth exactly.
- **Every step has an expected result.** No blank expected results, ever. Each row states the concrete observable response to that one action.
- **One assertion per step.** Don't bundle three checks into one expected result; split them so a failure points to one place.
- **End on a verification step.** The last row is always "Verify that <the behavior in the title>" with the definitive expected result.
- **No ceremony.** No greetings, no "Happy testing", no emojis, no "Verified ✅". Concise.
- **No hedging.** Expected results are definite ("the SAVE button is disabled"), never "should probably" or "might".

## Coverage checklist (derive cases from these)

For any ticket, produce cases across these axes; skip an axis only if it genuinely doesn't apply:

- **Happy path**: the primary success flow stated in the ticket.
- **Each business rule**: one case per rule in the relevant rules-file entries (e.g. "chat messages only sendable within 24h", "one chat channel per team", "auto-reply respects business hours").
- **Edge cases**: every "Breaks" item in the flow doc, plus boundaries (empty, max length, expired token, duplicate, deleted/merged records).
- **Negative cases**: invalid input, wrong state, action attempted when it shouldn't be allowed.
- **Permissions**: if the module is role-gated, verify each role sees/can-do the right thing.
- **Cross-flow impact**: for each `Touches:` link, a case that confirms the connected flow still behaves (e.g. a Payments change that must not break Inbox).

## Creating in ADO

Create each test case as a work item:

```
azure-devops:create_work_item
  workItemType: "Test Case"            # workItemTypes.testCase
  title: "<title per format above>"
  projectId: "<tracker.project>"
  areaPath: <boards.support.areaPath or boards.delivery.areaPath, matching the source ticket>
  assignedTo: "<identity.email>"       # unless told otherwise
  additionalFields:
    "Microsoft.VSTS.TCM.Steps": "<steps as HTML, see references/ado-steps-format.md>"
    "System.Tags": "<carry over relevant tags from the source ticket, e.g. QA; <feature tag>; <environment>>"
```

The Steps field uses a specific ADO XML/HTML format, not plain text or a Markdown table. **Read `references/ado-steps-format.md` before writing the Steps field**; getting the markup right is what makes steps render as proper test steps in ADO.

Then link to the source ticket:

```
azure-devops:manage_work_item_link
  operation: "add"
  relationType: "Microsoft.VSTS.Common.TestedBy-Reverse"   # test case tests the ticket
  sourceWorkItemId: <source ticket ID>
  targetWorkItemId: <new test case ID>
```

If that relation type is rejected, fall back to `System.LinkTypes.Related` and tell the user the link is "Related" rather than "Tested By".

## Hard limits (be honest about these)

- **Cannot add test cases to a Test Suite via API**: no suite tool is available. After creating the cases, the user adds them to the target suite manually in the Test Plans UI. Always state the new IDs so this is quick.
- **Cannot execute test runs or record pass/fail outcomes**: authoring only.
- **Always get approval before creating** work items in ADO; creation is a real write.

## Quick example

See `references/example-testcases.md` for a worked, illustrative example: a ticket → the test cases derived from it in full house style. Read it when you want a concrete model to match.
