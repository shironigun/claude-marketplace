# Bug field reference (CRM Team)

Derived from the team's actual Bugs on `Agile Project\CRM Team`.

## Field table

| Field | Reference name | Typical value | Notes |
|-------|---------------|---------------|-------|
| Type | `System.WorkItemType` | `Bug` | |
| Area path | `System.AreaPath` | `Agile Project\CRM Team` | confirm if user names another board |
| Iteration | `System.IterationPath` | per OEM/sprint (e.g. `Agile Project\Acme CRM\Requirements`, `…\Husqvarna`, `…\Ariens`) | optional; let ADO default if unknown |
| Parent | hierarchy link | the **User Story** the bug was found against | recurring story buckets: `123456`, `123456` |
| Severity | `Microsoft.VSTS.Common.Severity` | `3 - Medium` (default), `2 - Medium` (higher impact) | `1 - High`/`4 - Low` rare |
| Priority | `Microsoft.VSTS.Common.Priority` | `2` | almost always 2 |
| Value area | `Microsoft.VSTS.Common.ValueArea` | `Business` | |
| QA owner | `Custom.QA` | the QA analyst | always himself |
| Found with | `Custom.FoundWith` | `Manual Test` | |
| Repro | `Microsoft.VSTS.TCM.ReproSteps` | HTML (see below) | |
| Acceptance | `Microsoft.VSTS.Common.AcceptanceCriteria` | "I know this bug is resolved when:" | |
| Sys info | `Microsoft.VSTS.TCM.SystemInfo` | `DmsDealerId / Username / Password` | creds, not in repro |
| Tags | `System.Tags` | usually none | add a module tag only on request |

**Do NOT set on a Bug:** `Custom.DefectType1`, `Custom.DMS`, `Custom.Hosted`, `Custom.DataSyncIssue` — those are Defect-only.

## Verbatim repro example (Bug 123456, DMS-B QA, 500 error)

```html
<ul><li>Go to <b>DMS-B QA </b>environment. </li><li>Navigate to Customer module. </li><li>Update/create a customer. </li></ul>
<div><b>OBSERVATION:</b></div>
<div><br></div>
<div><ul><li>Getting Timeout 500 response error. </li></ul></div>
<div><img src="…/attachments/5c6c3db3-…?fileName=image.png" alt=Image></div>
```
Paired SystemInfo: `dmsDealerId = 999888444 / username = admin / password = <pwd>`

## Verbatim repro example (Bug 123456, QA, blank screen)

```html
<div><ul><li>Go to QA DMS-A client I have mentioned in the System Info section. </li><li>Go to Messenger environment. </li></ul>
<div><b>OBSERVATION:</b></div></div>
<div><ul><li>As soon as we click on messenger, the screen goes blank. </li></ul>
<div><img src="…/attachments/a52e9d37-…?fileName=1.gif" alt=1.gif></div></div>
```

## Verbatim acceptance criteria examples

```html
<div>I know this issue is resolved when: </div><div><ul><li>User can easily get suggestions for address based on the value they have entered in the address field. </li></ul></div>
```
```html
<div>I know this is done when: </div><div><ul><li>Unread conversations only appear in the All &amp; Unread filter listing. </li></ul></div>
```

## Title examples (verbatim)

- `EMAIL Automations are not working on QA environment`
- `Unable to CREATE/UPDATE customers on DMS-B QA environment.`
- `PDF Preview/Icon is not displayed in MMS broadcast PREVIEW screen`
- `Able to add email without any type for DMS-B customers`
- `Customer created from DMS-C is showing incorrect created date on STAGING`
- `Screen stuck on loading when user opts out against a test email broadcast`
- `Unread conversation appears in Archived results`

## Resolve/close (when asked to verify)

the QA analyst often verifies and closes his own QA bugs. Resolve/close reasons used: `Fixed and verified`, `Verified`, `Fixed`. Use `update_work_item` with `state` + the matching reason only when the user asks to resolve/close.
