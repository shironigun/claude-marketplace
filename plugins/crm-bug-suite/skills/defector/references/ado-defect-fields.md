# Defect field reference (SUPPORT)

Derived from the team's actual Defects on `Example Project\SUPPORT`.

## Bug vs Defect — the deciding split

| Dimension | **Bug** (`bugger`) | **Defect** (this skill) |
|---|---|---|
| Where found | QA / Staging, testing a story or regression | **Production / live clients** |
| Area path | `Example Project\Delivery Team` | `Example Project\SUPPORT` (Kanban `Inbox → Done`) |
| Parent | linked to a **User Story** | usually **standalone**, no parent |
| Severity | set (`3 - Medium`) + `ValueArea = Business` | often unset; set `2 - Medium`/`1 - High` for impact |
| Defect taxonomy | not set | `DefectType1=Web`, `PARTNER=PARTNER-A`, `Hosted=N/A`, `DataSyncIssue` |
| Tags | usually none | `By QA Team` + module + `QA` |
| Post-fix | — | `Client.ReleaseNote` (branch) + `Custom.ExampleRootCause` |
| Common to both | `Custom.ExampleOwner = the QA analyst`, `Custom.ExampleFoundWith = Manual Test`, `Priority = 2`, repro anatomy, "I know this is resolved when:" | |

## Field table

| Field | Reference name | Value |
|-------|---------------|-------|
| Type | `System.WorkItemType` | `Defect` |
| Area path | `System.AreaPath` | `Example Project\SUPPORT` |
| Priority | `Microsoft.VSTS.Common.Priority` | `2` |
| Severity | `Microsoft.VSTS.Common.Severity` | usually unset; `2 - Medium` / `1 - High` for high impact |
| QA owner | `Custom.ExampleOwner` | the QA analyst |
| Found with | `Custom.ExampleFoundWith` | `Manual Test` |
| Defect type | `Custom.ExampleType` | `Web` |
| PARTNER | `Custom.ExamplePartner` | `PARTNER-A` (or the PARTNER involved) |
| Hosted | `Custom.ExampleHosting` | `N/A` |
| Data sync | `Custom.ExampleSync` | `false` (set `true` for PARTNER↔APP sync issues) |
| Repro | `Microsoft.VSTS.TCM.ReproSteps` | HTML |
| Acceptance | `Microsoft.VSTS.Common.AcceptanceCriteria` | "I know this defect is resolved when:" |
| Sys info | `Microsoft.VSTS.TCM.SystemInfo` | creds block |
| Tags | `System.Tags` | `By QA Team; QA; <Module>` |
| Release note (post-fix) | `Client.ReleaseNote` | `<id>_<version>_<date>` e.g. `151089_3.4.0_06_March` |
| Root cause (post-fix) | `Custom.ExampleRootCause` | short dev RCA |

## Verbatim repro example (Defect 123456, production crash)

```html
<ul><li>Login to the production environment. </li><li>Navigate to <b>Settings &gt; EMAIL.</b> </li><li>Upload any attachment from local storage. </li><li>Click on the upload button. </li></ul>
<div><b>Observation:</b></div>
<div><ul><li>The app crashed on uploading any attachment. </li></ul>
<div><img src="…/attachments/429c7119-…?fileName=1.gif" alt=1.gif></div></div>
```

## Verbatim repro example (Defect 123456, multiple live clients)

```html
<div>I have checked on multiple live clients and for some of them, the EQUIPMENT &amp; PARTS LOCATOR is not working. </div>
<div>For reference, check the following clients: </div>
<ul><li>SOHAR'S ALL SEASON MOWER SERVICE, INC. [10098004] </li></ul>
<div><img src="…/attachments/6cff4d08-…?fileName=1.gif" alt=1.gif></div>
```

## FINDINGS variant (Defect 123456, SSO investigation)

For auth/SSO/API investigations he uses a bold `FINDINGS` header with a numbered `<ol>` of investigation notes and pastes the API payload/JSON response inline. Example finding lines:
> 1. PARTNER-D is able to generate the auth token (attachment #1). 2. The product is not handling the SSO efficiently. 3. PARTNER-A dev pointed out there are 2 users with Admin username — needs checking (payload below).

## Verbatim post-fix RootCauseDetails examples

- "There was a circular dependency on updating the email content in case of file upload which causes the application to run out of memory and crash the application."
- "there was issue with email place holder"

## Title examples (verbatim, production)

- `App crashed on uploading attachment in Settings > EMAIL on Production environment.`
- `Parts & Equipment locator not working for all clients on production`
- `Download ORDERS module results is not working on production.`
- `SSO not working in the product through PARTNER-A WebView on Production test client.`
- `CLOSED invoices are syncing as OPEN form PARTNER-B to APP`  ← data-sync defect → set `DataSyncIssue: true`
