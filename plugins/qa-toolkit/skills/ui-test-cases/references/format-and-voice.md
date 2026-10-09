# Format and Voice Reference

The complete guide to the house test-case style. Read this before writing.

## Title

```
[Module] - [Feature] - Verify that <behavior>.
```

- Module = top-level area of the product (e.g., Deals, Messenger, Customers, Settings, Leads).
- Feature = specific sub-area or capability (e.g., Pipeline, Channel, Merge, Roles, Import).
- "Verify that" segment = one specific observable outcome. Describes exactly what should be true.
- Period at the end. Always.
- For entity-specific cases: `[Module] - [Feature] - <Entity Name> [ID] - Verify that ...`

## Preconditions

State everything the tester needs to set up before step 1:
- Environment (e.g., QA / Staging / Production)
- Role / user type (e.g., "Logged in as a Salesperson role")
- Account / tenant / record context (e.g., "Test account 12345")
- Required data state (e.g., "A conversation exists with last inbound > 24h ago")
- Any feature flags or configuration requirements

Format: `Preconditions: Environment: QA | Role: <role> | <any other state>`

## Steps table

| # | Action | Expected Result |
|---|--------|-----------------|

Rules:
- Step IDs start at 1 and increment by 1.
- **Action column**: a single, atomic action. One click. One navigation. One field entry. One button press.
- **Expected Result column**: what the system does or shows in response to that exact action. Concrete and specific.
- **Last row**: always "Verify that <behavior from title>" -> the definitive expected outcome.

## Actual Result

Always include `Actual Result:` as a blank labeled line after the table. The tester records it during execution. Never pre-fill it at authoring time.

---

## Granularity guide

This is where most test-case writers get it wrong. The reference standard:

| Collapsed (wrong) | Correct (split) |
|---|---|
| Navigate to Settings and go to the Deals tab | Step 1: Navigate to Settings -> Settings page opens. Step 2: Move to the Deals tab -> Deals settings tab is displayed. |
| Open the messenger and find the conversation | Step 1: Navigate to the Messenger module -> Messenger opens and conversation list is displayed. Step 2: Locate the conversation with <condition> -> The conversation is visible in the list. Step 3: Click the conversation to open it -> The conversation thread opens. |
| Fill in the form and save | Step 1: Enter the name in the Name field -> Text appears in the Name field. Step 2: Enter the email in the Email field -> Text appears in the Email field. Step 3: Click the SAVE button -> Form submits and <result>. |

The test is: can you point at any single step and ask "what specifically did the tester do?" If the answer could be two things, split it.

---

## Common mistakes

**Bundling navigations**
Wrong: `Navigate to Settings > Deals > Add Pipeline | Pipeline form opens`
Right:
- `Navigate to Settings | Settings page opens`
- `Move to the Deals tab | Deals settings tab is displayed`
- `Click the Add Pipeline button | Add Pipeline form opens`

**Vague expected results**
Wrong: `The system responds correctly`
Wrong: `The page updates`
Wrong: `An error is shown`
Right: `The error message "Required field" appears below the Name field`
Right: `The pipeline list refreshes and the newly created pipeline appears at the top`
Right: `The SAVE button becomes disabled`

**Hedging**
Wrong: `The user should be redirected to the dashboard`
Wrong: `A success message may appear`
Right: `The user is redirected to the dashboard`
Right: `A success snackbar reading "Pipeline saved" appears at the bottom of the screen`

**Missing last verification step**
Wrong: Ending on a system action like "The record is saved"
Right: Last step is always "Verify that <behavior from title>" -> definitive outcome

**Generic titles**
Wrong: `Deals - Pipeline - Verify that the feature works`
Wrong: `Settings - Verify that the user can update settings`
Right: `Deals - Pipeline - Verify that user is able to switch to the newly created pipeline.`
Right: `Settings - Roles - Verify that a user without the Admin role is unable to access the pipeline settings.`

**Using "should" in expected results**
Wrong: `The Send button should be disabled`
Right: `The Send button is disabled`

**Ceremony**
Wrong: Opening with "Here are the test cases for this story:"
Wrong: Closing with "Let me know if you need any changes!"
Right: Start with the first title. End after the last `Actual Result:` line.

---

## Step verb patterns

Use these consistent patterns (not alternatives — pick the one that matches the action):

| Action type | Verb to use |
|---|---|
| Opening the application | Log in to the application |
| Navigating to a module | Navigate to the [Module] module |
| Switching to a sub-tab | Move to the [Tab] tab |
| Clicking a button | Click the [Label] button |
| Clicking a link/option | Click the [Label] option / Click the [Label] link |
| Opening a dropdown | Click the [Label] dropdown |
| Selecting a dropdown item | Click the [Item] option |
| Entering text | Enter "[value]" in the [Field] field |
| Selecting a checkbox | Check the [Label] checkbox |
| Locating a record | Locate the [record description] |
| Hovering | Hover over the [element] |
| Scrolling | Scroll down to the [section/element] |
| Final verification | Verify that <behavior from title> |
