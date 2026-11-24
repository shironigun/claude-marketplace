---
name: defector
description: >-
  Files a production Defect work item in Azure DevOps on the team's support board, in a QA house style
  (declarative title, production-first repro, OBSERVATION/FINDINGS block, "I know this is resolved when"
  acceptance line) with the org's Defect-only taxonomy fields filled. Use this skill WHENEVER the user
  wants to log, file, raise, draft, or create a DEFECT found on PRODUCTION / live clients, e.g. "log a
  production defect", "file a defect for this live issue", "raise a support defect", "customers are
  seeing X on prod, log it", or pastes a production issue and asks to turn it into a Defect. For issues
  found while testing a story or in regression on QA/Staging use `bugger` (Bug) instead; for posting a
  comment on an existing ticket use `commentor`.
---

# Production Defect Filing

File a **Defect** the way an experienced QA analyst files production issues: a sharp negative-state title, production-first repro bullets ("Login to the production environment" / "checked on multiple live clients [ID]"), a bolded `OBSERVATION`/`FINDINGS` block, a screenshot, and a "I know this is resolved when:" acceptance line — then create it as a **Defect** work item on the **support board** with the production defect-taxonomy fields populated.

Defector is the production sibling of `bugger`: same voice and repro anatomy, but a different work-item type, board, and field set. The deciding test: **was it found on production / a live client?** → Defect (this skill). Found in QA/Staging against a story or in regression? → Bug (`bugger`).

## Step 0 — Workspace profile

Read `references/workspace-profile.md`, then load `.claude/workspace-profile.json` from the user's project. This skill needs:
`tracker.*`, `boards.support`, `workItemTypes.defect`, `fields.defect` and `fields.bug` (to know which fields are Defect-only), `identity`, `environments`, `variants`, `product.modules`, `specDocs` (optional), `clientIdFormat` and `variantIdParam` (optional).
If any are missing, run discovery for those keys only, confirm with the user, save, then continue. Every org fact below comes from the profile; nothing is assumed.

- **Tracker:** `tracker.org` / `tracker.project` (`tracker.projectId` when a GUID is needed).
- **Board / area path:** the support board (`boards.support.areaPath`) — where production defects live.
- **Author / QA identity:** `identity.displayName` / `identity.email` — asked during discovery, never guessed. Never substitute a shared, service or differently named account.
- **Auth:** this plugin **bundles** the `azure-devops` MCP (Azure Identity / `az login`, no PAT or token); use its `mcp__azure-devops__*` tools only.
- **Spec docs:** if the team keeps behaviour/flow docs (`specDocs.path`, rules in `specDocs.rulesFile`), read the relevant module doc + the rules file before analysing the issue. Verify any `[UNCLEAR]`/`[ASSUMED]` flags. If `specDocs` is empty, rely on what the user and the live behaviour show.

## Workflow

1. **Gather the production facts:** which live client(s) + client ID (`clientIdFormat`), which integration partner (`variants.values`) if one is involved, the exact steps to reproduce on prod, the actual broken result, and screenshots/GIF. Ask for credentials if a specific prod test client is involved.
2. **Read the spec doc module** the defect touches (+ the rules file) to name the correct expected behaviour. Flag `[UNCLEAR]`/`[ASSUMED]` rather than asserting.
3. **Decide if it's an integration sync issue** (data flowing wrongly between the product and an integration partner). If the org's Defect type has a field that flags this (found in `fields.defect`), set it accordingly.
4. **Draft the Defect** (title + repro + acceptance + the Defect-only field values) and **show the user for approval before creating.**
5. **Create the Defect** work item (see "Creating in ADO").
6. Production defects are usually **standalone** (no Story parent). Link to a related ticket only if the user names one.
7. **Report the new Defect ID and URL.**

## Title — same house style as bugger

Declarative negative-state statement; ALL-CAPS the domain keywords (`CLOSED`, `EMAIL`, `MMS`, `PDF`, integration partner names from `variants.values` such as `PARTNER-A`, `PRODUCTION`); name the module/screen (`product.modules`); end with the environment (here: production/live). Include the bracketed client ID when client-specific, in the `clientIdFormat` pattern.

Illustrative production examples (fictional):
- `App crashed on uploading attachment in Settings > EMAIL on Production environment.`
- `Location search not working for all clients on production`
- `Download ORDERS module results is not working on production.`
- `SSO not working in the Product through PARTNER-A WebView on Production test client.`
- `CLOSED invoices are syncing as OPEN from PARTNER-B to Product`

## Repro Steps — the anatomy (field: `Microsoft.VSTS.TCM.ReproSteps`, HTML)

Production-first `<ul>` bullets, key UI terms **bolded**, then a bold **`OBSERVATION:`** (or **`FINDINGS`** for deeper investigations) header, then the screenshot/GIF.

```html
<ul>
  <li>Login to the production environment.</li>
  <li>Navigate to <b>Settings &gt; EMAIL.</b></li>
  <li>Upload any attachment from local storage.</li>
  <li>Click on the upload button.</li>
</ul>
<div><b>OBSERVATION:</b></div>
<div><ul><li>The app crashed on uploading any attachment.</li></ul></div>
<div><img src="PASTE_ATTACHMENT_URL?fileName=1.gif" alt=1.gif></div>
```

Multi-client variant (narrative + client list):
```html
<div>I have checked on multiple live clients and for some of them, the LOCATION SEARCH is not working.</div>
<div>For reference, check the following clients:</div>
<ul><li>Contoso Outdoor [10001]</li></ul>
<div><img src="PASTE_ATTACHMENT_URL?fileName=1.gif" alt=1.gif></div>
```

- First step names **production / the live client**. Use `FINDINGS` with a numbered `<ol>` when documenting an investigation (e.g. SSO/auth/API issues), and you may paste the relevant API payload/JSON response inline.
- Screenshot/GIF near-universal (a common convention is `1.gif` for a recording, `image.png` for a still). Leave the `<img>` placeholder and tell the user to attach if not supplied.

## Other fields

Credentials/test data → `Microsoft.VSTS.TCM.SystemInfo` (tenant/partner id labelled with `variantIdParam` if the profile has one, then Username / Password). Credentials are asked for at run time and never stored in the profile.

Acceptance criteria → `Microsoft.VSTS.Common.AcceptanceCriteria`, phrased "I know this defect is resolved when:".

Field defaults for a **Defect** (full table in `references/ado-defect-fields.md`):

| Field | Value |
|-------|-------|
| `workItemType` | `workItemTypes.defect` (usually `Defect`) |
| `areaPath` | `boards.support.areaPath` |
| `priority` | the typical value in `fields.defect`; `2` if none observed |
| `Microsoft.VSTS.Common.Severity` | as observed in `fields.defect` — often left unset; set a higher value for high-impact prod issues |
| Fields shared with Bugs | every field populated on Defects that also appears in `fields.bug` (e.g. a QA-owner field set to `identity.email`, a found-with field set to its typical value) |
| **Defect-only taxonomy** | every field in `fields.defect` that is not in `fields.bug` — **must be filled**, choosing the value that fits this defect from the field's observed `values[]`, defaulting to `typical` (e.g. the affected integration partner, a sync-issue flag set true only for integration sync issues) |
| Tags | the Defect tag habit recorded in discovery (commonly a filing-team tag + a module tag such as `Settings` or `Campaigns`) |

Fields that discovery shows are only filled **after** the fix (for example a root-cause or release-branch field) are filled by dev / at verification — leave them blank at creation.

## Creating in ADO

```
mcp__azure-devops__create_work_item
  workItemType: "<workItemTypes.defect>"
  title: "<title per house style>"
  projectId: "<tracker.project>"
  areaPath: "<boards.support.areaPath>"
  priority: 2
  additionalFields:
    "Microsoft.VSTS.TCM.ReproSteps": "<repro HTML>"
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<acceptance HTML>"
    "Microsoft.VSTS.TCM.SystemInfo": "<creds block, if any>"
    "<each field from fields.defect, e.g. Custom.Example>": "<the value chosen for this defect>"
    "System.Tags": "<tags per the observed Defect habit>"
```

Use resolved profile values in the call, never the key names.

## Voice rules

Identical to `bugger`: declarative, exact UI/error strings, production-first repro, `OBSERVATION:`/`FINDINGS`, "I know this is resolved when:" fix bar, no ceremony, no hedging.

## Hard rules

- **Always show the draft and get approval before creating** — creation is a real write.
- **Always file as `identity`** from the workspace profile (asked during discovery, never guessed).
- **Always fill the Defect-only taxonomy fields** on a Defect; leave post-fix fields blank.
- If the issue was found in **QA/Staging against a story or in regression**, it's a **Bug** — use `bugger`, not this skill.
