# Defect field reference (support board)

The standard Azure DevOps fields below are the same in every org. The Defect type and its custom fields
are org-specific: they are discovered from the org's Defect type into `fields.defect` of the workspace
profile (see `workspace-profile.md`), with each field's typical value and observed value set. All
examples are illustrative and use fictional placeholder values.

## Bug vs Defect — the deciding split

| Dimension | **Bug** (`bugger`) | **Defect** (this skill) |
|---|---|---|
| Where found | QA / Staging, testing a story or regression | **Production / live clients** |
| Area path | `boards.delivery.areaPath` | `boards.support.areaPath` |
| Parent | linked to a **User Story** | usually **standalone**, no parent |
| Severity | set (typical value in `fields.bug`) + `ValueArea` | often unset; set a higher value for impact |
| Defect-only taxonomy | **never set** | **always filled** — every field in `fields.defect` not in `fields.bug` |
| Tags | per the Bug tag habit (often none) | per the Defect tag habit (commonly filing-team tag + module) |
| Post-fix | — | root-cause / release fields, filled after the fix |
| Common to both | fields present in both `fields.bug` and `fields.defect` (e.g. QA owner = `identity.email`), `Priority`, repro anatomy, "I know this is resolved when:" | |

**The rule:** a field observed only on Defects is Defect-only. It must be filled on every Defect and must
never be set on a Bug.

## Field table

| Field | Reference name | Value |
|-------|---------------|-------|
| Type | `System.WorkItemType` | `workItemTypes.defect` (usually `Defect`) |
| Area path | `System.AreaPath` | `boards.support.areaPath` |
| Priority | `Microsoft.VSTS.Common.Priority` | the typical value in `fields.defect`; `2` if none observed |
| Severity | `Microsoft.VSTS.Common.Severity` | as observed; often unset, a higher value for high impact |
| Shared org fields | from `fields.defect` ∩ `fields.bug` | each field's `typical` value (QA-owner field → `identity.email`) |
| Defect-only taxonomy | from `fields.defect` minus `fields.bug` | the value from the field's observed `values[]` that fits this defect, defaulting to `typical` |
| Repro | `Microsoft.VSTS.TCM.ReproSteps` | HTML |
| Acceptance | `Microsoft.VSTS.Common.AcceptanceCriteria` | "I know this defect is resolved when:" |
| Sys info | `Microsoft.VSTS.TCM.SystemInfo` | creds block (never stored in the profile) |
| Tags | `System.Tags` | per the observed Defect tag habit, e.g. `<filing-team tag>; <Module>` |
| Post-fix fields | from `fields.defect` | only filled after the fix (e.g. a root-cause or release-branch field) — leave blank at creation |

How to pick a taxonomy value, by field shape (illustrative; your org's names and values come from discovery):

| Shape of the field | How to fill it |
|---|---|
| Category / defect type (picklist) | the category matching where it broke (e.g. `Web`, `Mobile`, `API`) |
| Affected integration partner (picklist of `variants.values`) | the partner involved (e.g. `PARTNER-A`), or the typical value when none is involved |
| Yes/no flag for integration sync issues | `true` only when data flows wrongly between the product and a partner; otherwise `false` |
| Any other Defect-only picklist | the observed value that fits; if unsure, the `typical` value, and say so in the draft |

## Illustrative repro example (production crash)

```html
<ul><li>Login to the production environment. </li><li>Navigate to <b>Settings &gt; EMAIL.</b> </li><li>Upload any attachment from local storage. </li><li>Click on the upload button. </li></ul>
<div><b>Observation:</b></div>
<div><ul><li>The app crashed on uploading any attachment. </li></ul>
<div><img src="…/attachments/<attachment-id>?fileName=1.gif" alt=1.gif></div></div>
```

## Illustrative repro example (multiple live clients)

```html
<div>I have checked on multiple live clients and for some of them, the LOCATION SEARCH is not working. </div>
<div>For reference, check the following clients: </div>
<ul><li>Contoso Outdoor [10001] </li></ul>
<div><img src="…/attachments/<attachment-id>?fileName=1.gif" alt=1.gif></div>
```

## FINDINGS variant (SSO investigation)

For auth/SSO/API investigations, use a bold `FINDINGS` header with a numbered `<ol>` of investigation notes and paste the API payload/JSON response inline. Illustrative finding lines:
> 1. PARTNER-C is able to generate the auth token (attachment #1). 2. The product is not handling the SSO response correctly. 3. The PARTNER-A team pointed out there are 2 users with the Admin username — needs checking (payload below).

## Illustrative post-fix root-cause examples

- "There was a circular dependency on updating the email content in case of file upload which causes the application to run out of memory and crash the application."
- "There was an issue with the email placeholder."

## Illustrative title examples (production)

- `App crashed on uploading attachment in Settings > EMAIL on Production environment.`
- `Location search not working for all clients on production`
- `Download ORDERS module results is not working on production.`
- `SSO not working in the Product through PARTNER-A WebView on Production test client.`
- `CLOSED invoices are syncing as OPEN from PARTNER-B to Product`  ← integration sync defect → set the sync-issue flag if the org has one
