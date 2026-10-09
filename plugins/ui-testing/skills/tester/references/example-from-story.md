# Worked Example: User Story → Test Cases

A concrete model showing the full workflow: read the story, plan coverage, write cases.

---

## Source Story

**Title:** #123456 — Leads: Auto-assign lead to salesperson based on source

**Description:**
When a new lead is created in the Leads module, the system should automatically assign it to a salesperson based on the lead's source. Each lead source can be mapped to a specific salesperson in Settings. If no mapping exists for a source, the lead is left unassigned.

**Acceptance Criteria:**
1. A lead source can be mapped to a salesperson in Settings → Leads → Source Mapping.
2. When a lead is created with a mapped source, it is automatically assigned to the mapped salesperson.
3. When a lead is created with an unmapped source, it remains unassigned.
4. If the mapped salesperson is inactive/deleted, the lead is left unassigned and an admin notification is sent.
5. Only users with the Admin role can create or edit source mappings.

---

## Coverage Plan

- Happy path: Create a source mapping, then create a lead with that source → auto-assigned to the mapped salesperson.
- AC #1 (create mapping): Admin creates a source mapping in Settings.
- AC #2 (auto-assign): Lead created with a mapped source → assigned to correct salesperson.
- AC #3 (unmapped source): Lead created with an unmapped source → remains unassigned.
- AC #4 (inactive salesperson): Mapped salesperson is deleted → lead unassigned + admin notification sent.
- AC #5 - Permission (Admin can map): Admin user can access Source Mapping settings.
- AC #5 - Permission (non-Admin blocked): Salesperson role cannot access Source Mapping settings.
- Edge case: Source mapping exists but lead is created without a source → lead is unassigned.

---

## Test Cases

### Leads - Source Mapping - Verify that an Admin can create a source-to-salesperson mapping in Settings.

```
Preconditions: Client ID: 99204001 | Environment: QA | Logged in as a user with Admin role

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Leads tab | Leads settings tab is displayed |
| 4 | Click the Source Mapping option | Source Mapping settings section opens |
| 5 | Click the Add Mapping button | Add Mapping form opens |
| 6 | Click the Source dropdown | Dropdown expands showing the list of available lead sources |
| 7 | Click the desired lead source option | The lead source is selected |
| 8 | Click the Salesperson dropdown | Dropdown expands showing the list of active salespersons |
| 9 | Click the desired salesperson option | The salesperson is selected |
| 10 | Click the SAVE button | The mapping is saved and appears in the Source Mapping list |
| 11 | Verify that the source-to-salesperson mapping was created successfully | The new mapping is visible in the list showing the correct source and salesperson |
```
Actual Result:

---

### Leads - Auto-Assign - Verify that a lead is automatically assigned to the mapped salesperson when created with a mapped source.

```
Preconditions: Client ID: 99204001 | Environment: QA | A source mapping exists for source "Website" → Salesperson: John Smith

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to the Leads module | Leads module opens and the lead list is displayed |
| 3 | Click the Add Lead button | Add Lead form opens |
| 4 | Enter the lead's name in the Name field | Text appears in the Name field |
| 5 | Click the Source dropdown | Dropdown expands showing the list of lead sources |
| 6 | Click the "Website" option | "Website" is selected as the lead source |
| 7 | Complete any other required fields | Required fields are filled |
| 8 | Click the SAVE button | The lead is saved and appears in the lead list |
| 9 | Click the newly created lead to open it | The lead detail view opens |
| 10 | Verify that the lead was automatically assigned to the mapped salesperson | The Assigned To field shows "John Smith" without any manual assignment |
```
Actual Result:

---

### Leads - Auto-Assign - Verify that a lead remains unassigned when created with an unmapped source.

```
Preconditions: Client ID: 99204001 | Environment: QA | The lead source "Walk-In" has no salesperson mapping configured

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to the Leads module | Leads module opens and the lead list is displayed |
| 3 | Click the Add Lead button | Add Lead form opens |
| 4 | Enter the lead's name in the Name field | Text appears in the Name field |
| 5 | Click the Source dropdown | Dropdown expands showing the list of lead sources |
| 6 | Click the "Walk-In" option | "Walk-In" is selected as the lead source |
| 7 | Complete any other required fields | Required fields are filled |
| 8 | Click the SAVE button | The lead is saved and appears in the lead list |
| 9 | Click the newly created lead to open it | The lead detail view opens |
| 10 | Verify that the lead remains unassigned | The Assigned To field is empty and no salesperson is assigned |
```
Actual Result:

---

### Leads - Auto-Assign - Verify that a lead is left unassigned and an admin notification is sent when the mapped salesperson is inactive.

```
Preconditions: Client ID: 99204001 | Environment: QA | A source mapping exists for source "Website" → Salesperson: Jane Doe; Jane Doe's account has been deactivated

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to the Leads module | Leads module opens and the lead list is displayed |
| 3 | Click the Add Lead button | Add Lead form opens |
| 4 | Enter the lead's name in the Name field | Text appears in the Name field |
| 5 | Click the Source dropdown | Dropdown expands showing the list of lead sources |
| 6 | Click the "Website" option | "Website" is selected as the lead source |
| 7 | Complete any other required fields | Required fields are filled |
| 8 | Click the SAVE button | The lead is saved |
| 9 | Click the newly created lead to open it | The lead detail view opens |
| 10 | Verify that the lead is unassigned | The Assigned To field is empty |
| 11 | Navigate to the Admin notification area or check the admin's notification inbox | The admin notification inbox opens |
| 12 | Verify that an admin notification was sent indicating the mapped salesperson is inactive | A notification is present stating that the auto-assignment failed because the mapped salesperson is inactive |
```
Actual Result:

---

### Leads - Source Mapping - Verify that a user with the Admin role can access Source Mapping settings.

```
Preconditions: Client ID: 99204001 | Environment: QA | Logged in as a user with Admin role

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Leads tab | Leads settings tab is displayed |
| 4 | Verify that the Source Mapping option is visible and accessible | The Source Mapping option is displayed in the Leads settings and the Admin can click and open it |
```
Actual Result:

---

### Leads - Source Mapping - Verify that a user without the Admin role is unable to access Source Mapping settings.

```
Preconditions: Client ID: 99204001 | Environment: QA | Logged in as a user with Salesperson role (non-Admin)

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to Settings | Settings page opens |
| 3 | Move to the Leads tab | Leads settings tab is displayed |
| 4 | Verify that the Source Mapping option is not visible or accessible | The Source Mapping option is either hidden or displays an access-denied message; the Salesperson cannot open or modify source mappings |
```
Actual Result:

---

### Leads - Auto-Assign - Verify that a lead created without a source remains unassigned.

```
Preconditions: Client ID: 99204001 | Environment: QA | Source mappings exist for other sources but the Source field is left empty

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Login to Acme CRM | User is logged in and the dashboard loads |
| 2 | Navigate to the Leads module | Leads module opens and the lead list is displayed |
| 3 | Click the Add Lead button | Add Lead form opens |
| 4 | Enter the lead's name in the Name field | Text appears in the Name field |
| 5 | Leave the Source field empty | No source is selected |
| 6 | Complete any other required fields | Required fields are filled |
| 7 | Click the SAVE button | The lead is saved and appears in the lead list |
| 8 | Click the newly created lead to open it | The lead detail view opens |
| 9 | Verify that the lead is unassigned when no source is provided | The Assigned To field is empty and no salesperson is assigned |
```
Actual Result:

---

## What to notice

- **Coverage plan first**: list the cases before writing a single step. This keeps you from missing an axis.
- **Title precision**: each title names one specific outcome. Not "Verify that auto-assign works" — "Verify that a lead is automatically assigned to the mapped salesperson when created with a mapped source."
- **AC → multiple cases**: AC #5 (Admin only) produced two cases — one confirming Admin access, one confirming non-Admin is blocked. One AC, two cases.
- **AC #4 edge**: The inactive salesperson case needed 12 steps because two things must be verified: unassignment AND notification. They couldn't be collapsed.
- **Granularity**: selecting from a dropdown is always two steps — click the dropdown (it expands), click the option (it selects). Never one step.
- **Preconditions carry the data state**: the test steps don't need to set up Jane Doe's deactivation — that goes in Preconditions.
- **Actual Result**: blank every time. Filled at execution.
