# Worked Example: Ticket → Test Cases

A concrete model to match. The reference standard for title format, step granularity, and per-step expected results.

All product names, modules, rules, client ids and ticket numbers below are fictional and illustrative. At run time, use the real module names (`product.modules`), client id format (`clientIdFormat`) and environments from the workspace profile.

## Reference standard (the gold standard to match)

**Title:** `[Module] - [Feature] - Verify that <behavior>`
**Steps:** every atomic action is its own row; every row has an explicit expected result; the last row is the "Verify that..." check.

### Inbox - Queues - Verify that user is able to switch to the newly created queue.

```
Preconditions: Client ID: 10001 | Environment: QA

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Inbox tab | Inbox settings tab is displayed |
| 4 | Click on the Add Queue button | Add Queue form opens |
| 5 | Add at least one team member | Team member is added to the queue |
| 6 | Save the queue by clicking the SAVE button | Queue is saved and appears in the queue list |
| 7 | Navigate to the Inbox module | Inbox module opens |
| 8 | Click the "Select Queue" dropdown | Dropdown expands showing the list of queues |
| 9 | Click the newly created queue option | Queue is selected |
| 10 | Verify that the user switched to the queue successfully | The selected queue's conversations load and the active queue reflects the new selection |
```
Actual Result:

Notice: 10 discrete actions = 10 steps. Navigating to Settings, moving to the Inbox tab, and clicking Add Queue are **three separate steps**, never collapsed. Each has its own expected result.

---

## Example: defect ticket -> derived cases

**Source ticket #1001 - Unable to send message in chat conversation after 24 hours**
Module: Inbox / Feature: Chat
Rule (from the rules file): *Chat messages are only sendable within 24h of the contact's last inbound message; after that a Follow-up template is required.*

### Inbox - Chat - Verify that user is able to send a message within the 24-hour window.

```
Preconditions: Client ID: 10001 | Environment: QA | A chat conversation exists with a contact inbound message received < 24h ago

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Inbox module | Inbox opens and the conversation list is displayed |
| 3 | Locate the chat conversation with an inbound message less than 24 hours old | The conversation is visible in the list |
| 4 | Click the conversation to open it | The conversation thread opens and the message input field is enabled |
| 5 | Type a message in the input field | The typed text appears in the input field |
| 6 | Click the Send button | The message is sent and appears in the thread with a sent timestamp |
| 7 | Verify that the message was delivered within the 24-hour window | The message shows as sent/delivered in the conversation thread |
```
Actual Result:

### Inbox - Chat - Verify that user is unable to send a standard message after the 24-hour window.

```
Preconditions: Client ID: 10001 | Environment: QA | A chat conversation whose last contact inbound message is > 24h old

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Inbox module | Inbox opens and the conversation list is displayed |
| 3 | Locate the chat conversation with last inbound message older than 24 hours | The conversation is visible in the list |
| 4 | Click the conversation to open it | The conversation thread opens |
| 5 | Type a message in the input field | The typed text appears in the input field |
| 6 | Click the Send button | The message is not sent; the system indicates a Follow-up template is required to message outside the 24-hour window |
| 7 | Verify that the standard message was blocked | No standard message is delivered and the 24-hour restriction is enforced |
```
Actual Result:

### Inbox - Chat - Verify that user is able to send a message after 24 hours using a Follow-up template.

```
Preconditions: Client ID: 10001 | Environment: QA | Chat conversation with last inbound > 24h ago

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Inbox module | Inbox opens and the conversation list is displayed |
| 3 | Locate and open the chat conversation with last inbound older than 24 hours | The conversation thread opens |
| 4 | Select the Follow-up template option | The Follow-up template is applied to the outgoing message |
| 5 | Type a message in the input field | The typed text appears in the input field |
| 6 | Click the Send button | The message is sent and appears in the thread |
| 7 | Verify that the message was delivered using the Follow-up template | The message shows as sent/delivered outside the 24-hour window |
```
Actual Result:

### Inbox - Email - Verify that an email conversation is not affected by the chat 24-hour rule.

```
Preconditions: Client ID: 10001 | Environment: QA | An email (non-chat) conversation older than 24h

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Inbox module | Inbox opens and the conversation list is displayed |
| 3 | Locate and open an email conversation older than 24 hours | The conversation thread opens and the message input field is enabled |
| 4 | Type a message in the input field | The typed text appears in the input field |
| 5 | Click the Send button | The message is sent normally; the 24-hour restriction does not apply to email |
| 6 | Verify that the email sent without restriction | The message shows as sent/delivered with no Follow-up template requirement |
```
Actual Result:

---

## What to notice

- **Title format**: `[Module] - [Feature] - Verify that <behavior>.` every time.
- **One rule -> multiple cases**: the 24h rule produced a happy path, an enforcement case, a recovery path, and a cross-flow guard (email). That spread is the coverage.
- **Childlike granularity**: opening a conversation = locate it (one step) + click it (next step). Typing and sending are separate steps. Nothing assumed.
- **Every step has a concrete expected result** - never blank, never bundled.
- **Ends on a "Verify that..." step** restating the title's behavior.
- **Exact labels**: "Send button", "Follow-up template", "Inbox module" - verbatim.
- **Cross-flow case** (email) came from following the Touches link from Chat -> Inbox Email. Always check those links for impact cases.
