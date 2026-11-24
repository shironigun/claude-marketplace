# Bug field reference (delivery board)

The standard Azure DevOps fields below are the same in every org. Org-specific custom fields are **not**
listed here: they are discovered from the org's Bug type into `fields.bug` of the workspace profile
(see `workspace-profile.md`). All examples are illustrative and use fictional placeholder values.

## Field table

| Field | Reference name | Typical value | Notes |
|-------|---------------|---------------|-------|
| Type | `System.WorkItemType` | `workItemTypes.bug` (usually `Bug`) | |
| Area path | `System.AreaPath` | `boards.delivery.areaPath` | confirm if user names another board |
| Iteration | `System.IterationPath` | per sprint | optional; let ADO default if unknown |
| Parent | hierarchy link | the **User Story** the bug was found against | |
| Severity | `Microsoft.VSTS.Common.Severity` | the typical value in `fields.bug` (commonly `3 - Medium`) | one step higher for higher impact; extremes are rare |
| Priority | `Microsoft.VSTS.Common.Priority` | the typical value in `fields.bug`; `2` if none observed | |
| Value area | `Microsoft.VSTS.Common.ValueArea` | the typical value in `fields.bug` (commonly `Business`) | |
| Org custom fields | from `fields.bug` | each field's `typical` value | e.g. a QA-owner field → `identity.email`; a found-with field → its typical value such as `Manual Test` |
| Repro | `Microsoft.VSTS.TCM.ReproSteps` | HTML (see below) | |
| Acceptance | `Microsoft.VSTS.Common.AcceptanceCriteria` | "I know this bug is resolved when:" | |
| Sys info | `Microsoft.VSTS.TCM.SystemInfo` | tenant/partner id (`variantIdParam`) / Username / Password | creds, not in repro; never stored in the profile |
| Tags | `System.Tags` | per the Bug tag habit recorded in discovery (often none) | add a module tag only on request |

**Do NOT set Defect-only fields on a Bug.** Any field observed on Defects (`fields.defect`) but not on
Bugs (`fields.bug`) is Defect-only — typically the production defect taxonomy (category, affected
partner and similar). Those belong to `defector`.

## Illustrative repro example (PARTNER-A QA, 500 error)

```html
<ul><li>Go to <b>PARTNER-A QA </b>environment. </li><li>Navigate to Contacts module. </li><li>Update/create a contact. </li></ul>
<div><b>OBSERVATION:</b></div>
<div><br></div>
<div><ul><li>Getting Timeout 500 response error. </li></ul></div>
<div><img src="…/attachments/<attachment-id>?fileName=image.png" alt=Image></div>
```
Paired SystemInfo: `tenantId = 10001 / username = <username> / password = <password>`

## Illustrative repro example (QA, blank screen)

```html
<div><ul><li>Go to the QA PARTNER-B client I have mentioned in the System Info section. </li><li>Open the <b>Inbox</b> module. </li></ul>
<div><b>OBSERVATION:</b></div></div>
<div><ul><li>As soon as we click on Inbox, the screen goes blank. </li></ul>
<div><img src="…/attachments/<attachment-id>?fileName=1.gif" alt=1.gif></div></div>
```

## Illustrative acceptance criteria examples

```html
<div>I know this issue is resolved when: </div><div><ul><li>User can easily get suggestions for address based on the value they have entered in the address field. </li></ul></div>
```
```html
<div>I know this is done when: </div><div><ul><li>Unread conversations only appear in the All &amp; Unread filter listing. </li></ul></div>
```

## Illustrative title examples

- `EMAIL Automations are not working on QA environment`
- `Unable to CREATE/UPDATE contacts on PARTNER-A QA environment.`
- `PDF Preview/Icon is not displayed in MMS campaign PREVIEW screen`
- `Able to add email without any type for PARTNER-A contacts`
- `Contact created from PARTNER-B is showing incorrect created date on STAGING`
- `Screen stuck on loading when user opts out against a test EMAIL campaign`
- `Unread conversation appears in Archived results`

## Resolve/close (when asked to verify)

The filer often verifies and closes their own QA bugs. Use `update_work_item` with `state` + a reason the
Bug type allows (commonly `Fixed and verified`, `Verified` or `Fixed`; check the observed values) only
when the user asks to resolve/close.
