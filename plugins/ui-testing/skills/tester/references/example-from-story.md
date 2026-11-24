# Worked Example: User Story → Test Cases

A concrete model showing the full workflow: read the story, plan coverage, write cases. The story, modules, names and ids are fictional and illustrative.

---

## Source Story

**Title:** #1001 — Contacts: Auto-assign contact to agent based on source

**Description:**
When a new contact is created in the Contacts module, the system should automatically assign it to an agent based on the contact's source. Each contact source can be mapped to a specific agent in Settings. If no mapping exists for a source, the contact is left unassigned.

**Acceptance Criteria:**
1. A contact source can be mapped to an agent in Settings → Contacts → Source Mapping.
2. When a contact is created with a mapped source, it is automatically assigned to the mapped agent.
3. When a contact is created with an unmapped source, it remains unassigned.
4. If the mapped agent is inactive/deleted, the contact is left unassigned and an admin notification is sent.
5. Only users with the Admin role can create or edit source mappings.

---

## Coverage Plan

- Happy path: Create a source mapping, then create a contact with that source → auto-assigned to the mapped agent.
- AC #1 (create mapping): Admin creates a source mapping in Settings.
- AC #2 (auto-assign): Contact created with a mapped source → assigned to correct agent.
- AC #3 (unmapped source): Contact created with an unmapped source → remains unassigned.
- AC #4 (inactive agent): Mapped agent is deleted → contact unassigned + admin notification sent.
- AC #5 - Permission (Admin can map): Admin user can access Source Mapping settings.
- AC #5 - Permission (non-Admin blocked): Agent role cannot access Source Mapping settings.
- Edge case: Source mapping exists but contact is created without a source → contact is unassigned.

---

## Test Cases

### Contacts - Source Mapping - Verify that an Admin can create a source-to-agent mapping in Settings.

```
Preconditions: Client ID: 10001 | Environment: QA | Logged in as a user with Admin role

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Contacts tab | Contacts settings tab is displayed |
| 4 | Click the Source Mapping option | Source Mapping settings section opens |
| 5 | Click the Add Mapping button | Add Mapping form opens |
| 6 | Click the Source dropdown | Dropdown expands showing the list of available contact sources |
| 7 | Click the desired contact source option | The contact source is selected |
| 8 | Click the Agent dropdown | Dropdown expands showing the list of active agents |
| 9 | Click the desired agent option | The agent is selected |
| 10 | Click the SAVE button | The mapping is saved and appears in the Source Mapping list |
| 11 | Verify that the source-to-agent mapping was created successfully | The new mapping is visible in the list showing the correct source and agent |
```
Actual Result:

---

### Contacts - Auto-Assign - Verify that a contact is automatically assigned to the mapped agent when created with a mapped source.

```
Preconditions: Client ID: 10001 | Environment: QA | A source mapping exists for source "Website" → Agent: John Smith

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Contacts module | Contacts module opens and the contact list is displayed |
| 3 | Click the Add Contact button | Add Contact form opens |
| 4 | Enter the contact's name in the Name field | Text appears in the Name field |
| 5 | Click the Source dropdown | Dropdown expands showing the list of contact sources |
| 6 | Click the "Website" option | "Website" is selected as the contact source |
| 7 | Complete any other required fields | Required fields are filled |
| 8 | Click the SAVE button | The contact is saved and appears in the contact list |
| 9 | Click the newly created contact to open it | The contact detail view opens |
| 10 | Verify that the contact was automatically assigned to the mapped agent | The Assigned To field shows "John Smith" without any manual assignment |
```
Actual Result:

---

### Contacts - Auto-Assign - Verify that a contact remains unassigned when created with an unmapped source.

```
Preconditions: Client ID: 10001 | Environment: QA | The contact source "Referral" has no agent mapping configured

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Contacts module | Contacts module opens and the contact list is displayed |
| 3 | Click the Add Contact button | Add Contact form opens |
| 4 | Enter the contact's name in the Name field | Text appears in the Name field |
| 5 | Click the Source dropdown | Dropdown expands showing the list of contact sources |
| 6 | Click the "Referral" option | "Referral" is selected as the contact source |
| 7 | Complete any other required fields | Required fields are filled |
| 8 | Click the SAVE button | The contact is saved and appears in the contact list |
| 9 | Click the newly created contact to open it | The contact detail view opens |
| 10 | Verify that the contact remains unassigned | The Assigned To field is empty and no agent is assigned |
```
Actual Result:

---

### Contacts - Auto-Assign - Verify that a contact is left unassigned and an admin notification is sent when the mapped agent is inactive.

```
Preconditions: Client ID: 10001 | Environment: QA | A source mapping exists for source "Website" → Agent: Jane Doe; Jane Doe's account has been deactivated

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Contacts module | Contacts module opens and the contact list is displayed |
| 3 | Click the Add Contact button | Add Contact form opens |
| 4 | Enter the contact's name in the Name field | Text appears in the Name field |
| 5 | Click the Source dropdown | Dropdown expands showing the list of contact sources |
| 6 | Click the "Website" option | "Website" is selected as the contact source |
| 7 | Complete any other required fields | Required fields are filled |
| 8 | Click the SAVE button | The contact is saved |
| 9 | Click the newly created contact to open it | The contact detail view opens |
| 10 | Verify that the contact is unassigned | The Assigned To field is empty |
| 11 | Navigate to the Admin notification area or check the admin's notification inbox | The admin notification inbox opens |
| 12 | Verify that an admin notification was sent indicating the mapped agent is inactive | A notification is present stating that the auto-assignment failed because the mapped agent is inactive |
```
Actual Result:

---

### Contacts - Source Mapping - Verify that a user with the Admin role can access Source Mapping settings.

```
Preconditions: Client ID: 10001 | Environment: QA | Logged in as a user with Admin role

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Contacts tab | Contacts settings tab is displayed |
| 4 | Verify that the Source Mapping option is visible and accessible | The Source Mapping option is displayed in the Contacts settings and the Admin can click and open it |
```
Actual Result:

---

### Contacts - Source Mapping - Verify that a user without the Admin role is unable to access Source Mapping settings.

```
Preconditions: Client ID: 10001 | Environment: QA | Logged in as a user with Agent role (non-Admin)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Contacts tab | Contacts settings tab is displayed |
| 4 | Verify that the Source Mapping option is not visible or accessible | The Source Mapping option is either hidden or displays an access-denied message; the Agent cannot open or modify source mappings |
```
Actual Result:

---

### Contacts - Auto-Assign - Verify that a contact created without a source remains unassigned.

```
Preconditions: Client ID: 10001 | Environment: QA | Source mappings exist for other sources but the Source field is left empty

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to the application | User is logged in and the dashboard loads |
| 2 | Navigate to the Contacts module | Contacts module opens and the contact list is displayed |
| 3 | Click the Add Contact button | Add Contact form opens |
| 4 | Enter the contact's name in the Name field | Text appears in the Name field |
| 5 | Leave the Source field empty | No source is selected |
| 6 | Complete any other required fields | Required fields are filled |
| 7 | Click the SAVE button | The contact is saved and appears in the contact list |
| 8 | Click the newly created contact to open it | The contact detail view opens |
| 9 | Verify that the contact is unassigned when no source is provided | The Assigned To field is empty and no agent is assigned |
```
Actual Result:

---

## What to notice

- **Coverage plan first**: list the cases before writing a single step. This keeps you from missing an axis.
- **Title precision**: each title names one specific outcome. Not "Verify that auto-assign works" — "Verify that a contact is automatically assigned to the mapped agent when created with a mapped source."
- **AC → multiple cases**: AC #5 (Admin only) produced two cases — one confirming Admin access, one confirming non-Admin is blocked. One AC, two cases.
- **AC #4 edge**: The inactive agent case needed 12 steps because two things must be verified: unassignment AND notification. They couldn't be collapsed.
- **Granularity**: selecting from a dropdown is always two steps — click the dropdown (it expands), click the option (it selects). Never one step.
- **Preconditions carry the data state**: the test steps don't need to set up Jane Doe's deactivation — that goes in Preconditions.
- **Actual Result**: blank every time. Filled at execution.
