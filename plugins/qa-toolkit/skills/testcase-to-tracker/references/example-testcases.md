# Worked Example: Ticket -> Test Cases

A concrete model to match — the reference standard for title format, step granularity, and per-step expected results. The domain (a CRM Messenger module) is an example; copy the structure, not the product.

## Reference standard

**Title:** `[Module] - [Feature] - Verify that <behavior>.`
**Steps:** every atomic action is its own row; every row has an explicit expected result; the last row is the "Verify that..." check.

### Deals - Pipeline - Verify that user is able to switch to the newly created pipeline.

```
Preconditions: Environment: QA

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Deals tab | Deals settings tab is displayed |
| 4 | Click the Add Pipeline button | Add Pipeline form opens |
| 5 | Add at least one department | Department is added to the pipeline |
| 6 | Click the SAVE button | Pipeline is saved and appears in the pipeline list |
| 7 | Navigate to the Deals module | Deals module opens |
| 8 | Click the "Select Pipeline" dropdown | Dropdown expands showing the list of pipelines |
| 9 | Click the newly created pipeline option | Pipeline is selected |
| 10 | Verify that the user switched to the pipeline successfully | The selected pipeline's stages load and the active pipeline reflects the new selection |
```
Actual Result:

Notice: 10 discrete actions = 10 steps. Navigating to Settings, moving to the Deals tab, and clicking Add Pipeline are three separate steps, never collapsed. Each has its own expected result.

---

## Example: defect ticket -> derived cases

**Source ticket #123456 - Unable to send message in a conversation after the messaging window closes**
Module: Messenger / Feature: Channel
Rule: *Messages are only sendable within 24h of the last customer inbound; after that a special agent tag is required.*

### Messenger - Channel - Verify that user is able to send a message within the messaging window.

```
Preconditions: Environment: QA | A conversation exists with a customer inbound message received < 24h ago

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Messenger module | Messenger opens and the conversation list is displayed |
| 3 | Locate the conversation with an inbound message less than 24 hours old | The conversation is visible in the list |
| 4 | Click the conversation to open it | The conversation thread opens and the message input field is enabled |
| 5 | Type a message in the input field | The typed text appears in the input field |
| 6 | Click the Send button | The message is sent and appears in the thread with a sent timestamp |
| 7 | Verify that the message was delivered within the messaging window | The message shows as sent/delivered in the conversation thread |
```
Actual Result:

### Messenger - Channel - Verify that user is unable to send a standard message after the messaging window closes.

```
Preconditions: Environment: QA | A conversation whose last customer inbound message is > 24h old

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Messenger module | Messenger opens and the conversation list is displayed |
| 3 | Locate the conversation with last inbound message older than 24 hours | The conversation is visible in the list |
| 4 | Click the conversation to open it | The conversation thread opens |
| 5 | Type a message in the input field | The typed text appears in the input field |
| 6 | Click the Send button | The message is not sent; the system indicates the special agent tag is required to message outside the window |
| 7 | Verify that the standard message was blocked | No standard message is delivered and the window restriction is enforced |
```
Actual Result:

### Messenger - SMS - Verify that an SMS conversation is not affected by the messaging-window rule.

```
Preconditions: Environment: QA | An SMS (different-channel) conversation older than 24h

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Log in to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Messenger module | Messenger opens and the conversation list is displayed |
| 3 | Locate and open an SMS conversation older than 24 hours | The conversation thread opens and the message input field is enabled |
| 4 | Type a message in the input field | The typed text appears in the input field |
| 5 | Click the Send button | The message is sent normally; the window restriction does not apply to SMS |
| 6 | Verify that the SMS sent without restriction | The message shows as sent/delivered with no special-tag requirement |
```
Actual Result:

---

## What to notice

- **Title format** every time: `[Module] - [Feature] - Verify that <behavior>.`
- **One rule -> multiple cases**: the window rule produced a happy path, an enforcement case, and a cross-flow guard (SMS). That spread is the coverage.
- **Childlike granularity**: opening a conversation = locate it (one step) + click it (next step). Typing and sending are separate steps.
- **Every step has a concrete expected result** — never blank, never bundled.
- **Ends on a "Verify that..." step** restating the title's behavior.
- **Cross-flow case** (SMS) came from following the impact link from the Channel rule to a different channel. Always check connected flows for impact cases.
