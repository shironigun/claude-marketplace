---
name: bugger
description: >-
  Files a Bug work item in Azure DevOps against a User Story or a regression, in a QA house style
  (declarative title, environment-first repro, OBSERVATION block, "I know this is resolved when"
  acceptance line), then links it to the source Story. Use this skill WHENEVER the user wants to log,
  file, raise, draft, create, or write up a BUG found while testing a story or during regression on
  QA/Staging, e.g. "file a bug for story 1001", "log this regression", "raise a bug on the QA
  environment", "write up this issue I found testing", or pastes an issue description and asks to turn
  it into a Bug. For production/live-client issues use `defector` (Defect) instead; for posting a
  comment on an existing ticket use `commentor`.
---

# Bug Filing (against stories / regression)

File a **Bug** the way an experienced QA analyst files them: a sharp negative-state title, environment-first repro bullets, a bolded `OBSERVATION` of the actual behaviour, a screenshot, and a "I know this is resolved when:" acceptance line — then create it as a **Bug** work item in Azure DevOps and link it to the source Story.

## Step 0 — Workspace profile

Read `references/workspace-profile.md`, then load `.claude/workspace-profile.json` from the user's project. This skill needs:
`tracker.*`, `boards.delivery`, `workItemTypes.bug`, `fields.bug` and `fields.defect` (to know which fields are Defect-only), `identity`, `environments`, `variants`, `product.modules`, `specDocs` (optional), `clientIdFormat` and `variantIdParam` (optional).
If any are missing, run discovery for those keys only, confirm with the user, save, then continue. Every org fact below comes from the profile; nothing is assumed.

- **Tracker:** `tracker.org` / `tracker.project` (`tracker.projectId` when a GUID is needed).
- **Board / area path:** the delivery board (`boards.delivery.areaPath`) — where story and regression bugs live. Production defects belong on the support board (`boards.support.areaPath`); that's `defector`.
- **Author / QA identity:** `identity.displayName` / `identity.email` — asked during discovery, never guessed. Never substitute a shared, service or differently named account.
- **Auth / tools:** this plugin **bundles** the official Azure DevOps MCP server (`ado`, `@azure-devops/mcp` 2.11.0): the org short name comes from the `ADO_ORG` environment variable and sign-in happens in the browser on first use (no PAT or token). Tools are named here by their bare name; they appear as `mcp__plugin_bug-suite_ado__<tool>`, or `mcp__ado__<tool>` if the user registered their own `ado` server. Use only tools from an `@azure-devops/mcp` server. When several installed plugins bundle that same server, Claude Code runs one copy, so the prefix can be another plugin's (for example `mcp__plugin_ui-testing_ado__<tool>`); those tools are identical.
- **Spec docs:** if the team keeps behaviour/flow docs (`specDocs.path`, rules in `specDocs.rulesFile`), read the relevant module doc + the rules file before analysing the ticket. Verify any `[UNCLEAR]`/`[ASSUMED]` flags before asserting behaviour. If `specDocs` is empty, rely on the Story's acceptance criteria.

## Workflow

1. **Read the source.** If a Story/work-item ID is given, pull it (the Azure DevOps server's `wit_work_item` tool, action `get`, `expand: "All"`). Extract the feature touched, the client/environment, and the acceptance criteria the bug violates.
2. **Read the spec doc module** the bug touches (+ its rules-file anchors) so the bug names the correct expected behaviour. If a rule is `[UNCLEAR]`/`[ASSUMED]`, flag it rather than asserting.
3. **Gather repro facts:** environment (one of `environments`, plus which integration partner from `variants.values` when relevant), client ID + credentials, the exact steps, and the actual (broken) result. Ask the user for anything missing — especially the screenshot/GIF and credentials.
4. **Draft the Bug** (title + repro + acceptance) in the format below and **show the user for approval before creating anything.**
5. **Create the Bug** work item (see "Creating in ADO").
6. **Link it to the source Story** as a child (parent = the Story).
7. **Report the new Bug ID and URL.**

## Title — the house style

Declarative bug **statement** (not imperative, not "Verify that…"). State what is broken, name the module/screen, and end with the environment.

- Frames to use: `<thing> not working`, `<thing> is/are not <verb>ing` (loading, syncing, populating, persisting, saving), `Unable to <verb>`, `<thing> is not <correct>`, `Error <doing X>`, `App crashed on <action>`, and `Able to <do invalid thing>` for should-not-be-allowed cases.
- **ALL-CAPS the domain keywords**: states and entities (`CLOSED`, `OPEN`, `EMAIL`, `MMS`, `PDF`, `CSV`), integration partner names (`variants.values`, e.g. `PARTNER-A`) and the product's short name if the team writes it in caps, environments (`QA`, `STAGING`, `PRODUCTION`).
- **Name the module/screen** (`product.modules`), using breadcrumb arrows when nested: `Settings > EMAIL`, `Notification panel > Task detail`.
- **End with the environment**: `… on QA environment.`, `… on STAGING & QA`, `… on PARTNER-A QA environment.`
- Include the bracketed **client ID** when client-specific, in the `clientIdFormat` pattern: `Contoso Outdoor [10001]`.

Illustrative examples (fictional):
- `EMAIL Automations are not working on QA environment`
- `Unable to CREATE/UPDATE contacts on PARTNER-A QA environment.`
- `PDF Preview/Icon is not displayed in MMS campaign PREVIEW screen`
- `Able to add email without any type for PARTNER-A contacts`
- `Contact created from PARTNER-B is showing incorrect created date on STAGING`

## Repro Steps — the anatomy (field: `Microsoft.VSTS.TCM.ReproSteps`, HTML)

A `<ul>` of **environment-first** bullet steps, key UI terms **bolded**, then a bold **`OBSERVATION:`** header with a second `<ul>` describing the actual broken result, then the screenshot/GIF.

```html
<ul>
  <li>Go to <b>PARTNER-A QA</b> environment.</li>
  <li>Navigate to the <b>Contacts</b> module.</li>
  <li>Update/create a contact.</li>
</ul>
<div><b>OBSERVATION:</b></div>
<div><ul><li>Getting Timeout 500 response error.</li></ul></div>
<div><img src="PASTE_ATTACHMENT_URL?fileName=1.gif" alt=1.gif></div>
```

- First step is always the environment ("Go to QA environment…" / "Go to <b>PARTNER-A QA</b>…"). If creds are needed, reference them: "Go to the QA client I have mentioned in the System Info section."
- Use `OBSERVATION:` (or `FINDINGS` for deeper investigations) for the actual result — not an "Actual:" label.
- A screenshot or GIF is near-universal; a common convention is `1.gif` (screen recording) and `image.png` (still). If the user hasn't supplied one, leave the `<img>` placeholder and tell them to attach it.

## Other fields

Put **credentials/test data** in `Microsoft.VSTS.TCM.SystemInfo` (not in repro). Label the tenant/partner id with `variantIdParam` if the profile has one. Credentials are asked for at run time and never stored in the profile:
```
TenantId: 10001
Username: <username>
Password: <password>
```

Put **acceptance criteria** in `Microsoft.VSTS.Common.AcceptanceCriteria`, always phrased "I know this bug is resolved when:":
```html
<div>I know this bug is resolved when:</div>
<div><ul><li>User can create/update a contact without any 500 error on PARTNER-A QA.</li></ul></div>
```

Field defaults for a **Bug** (see `references/ado-bug-fields.md` for the full table):

| Field | Value |
|-------|-------|
| `workItemType` | `workItemTypes.bug` (usually `Bug`) |
| `areaPath` | `boards.delivery.areaPath` (confirm if the user names another) |
| `Microsoft.VSTS.Common.Severity` | the typical value in `fields.bug` (commonly the mid value, e.g. `3 - Medium`); one step higher for higher impact |
| `priority` | the typical value in `fields.bug`; `2` if none was observed |
| `Microsoft.VSTS.Common.ValueArea` | the typical value in `fields.bug` (commonly `Business`) |
| Org custom fields | every field populated on Bugs per `fields.bug` (e.g. a QA-owner field set to `identity.email`, a found-with field set to its typical value) |
| `assignedTo` | the dev who owns the area, or leave unset / per the user |

**Do not set the Defect-only fields on a Bug.** A field observed on Defects (`fields.defect`) but not on Bugs (`fields.bug`) is Defect-only — typically the production defect taxonomy (category, affected partner, and similar). Follow the Bug tag habit recorded in discovery; if Bugs on the delivery board are usually untagged, add a module tag only if the user asks.

## Creating in ADO

Use the Azure DevOps server's `wit_work_item_write` tool, action `create`. Every field goes in `fields` as
`{ name, value, format }`; values are strings, and the HTML fields carry `format: "Html"` so they are
stored exactly as drafted:

```
wit_work_item_write
  action: "create"
  project: "<tracker.project>"
  workItemType: "<workItemTypes.bug>"
  fields:
    - { name: "System.Title", value: "<title per house style>" }
    - { name: "System.AreaPath", value: "<boards.delivery.areaPath>" }
    - { name: "Microsoft.VSTS.Common.Priority", value: "2" }
    - { name: "Microsoft.VSTS.TCM.ReproSteps", value: "<repro HTML>", format: "Html" }
    - { name: "Microsoft.VSTS.Common.AcceptanceCriteria", value: "<acceptance HTML>", format: "Html" }
    - { name: "Microsoft.VSTS.TCM.SystemInfo", value: "<creds block, if any>", format: "Html" }
    - { name: "Microsoft.VSTS.Common.Severity", value: "3 - Medium" }
    - { name: "Microsoft.VSTS.Common.ValueArea", value: "Business" }
    - { name: "<each Bug field from fields.bug, e.g. Custom.Example>", value: "<its typical value, or identity.email for a QA-owner field>" }
```

Use resolved profile values in the call, never the key names. Add `System.AssignedTo` the same way when
an assignee is set.

Then parent it to the Story it was found against with the `wit_work_item_link_write` tool:
```
wit_work_item_link_write
  action: "link"
  project: "<tracker.project>"
  updates:
    - { id: <new Bug ID>, linkToId: <Story ID>, type: "parent" }   # System.LinkTypes.Hierarchy-Reverse: this Bug's parent = the Story
```

## Voice rules

- Declarative and specific — name the exact field/button/error string the way the UI shows it.
- Environment-first repro, one atomic action per bullet, bold the UI terms.
- `OBSERVATION:` states the actual broken behaviour; the fix bar lives in "I know this is resolved when:".
- No ceremony, no emojis, no hedging. Match the terse phrasing (minor source typos in quoted UI strings are fine; don't invent them).

## Hard rules

- **Always show the draft and get approval before creating** — creation is a real write.
- **Always file as `identity`** from the workspace profile (asked during discovery, never guessed).
- **Never set Defect-only fields on a Bug.**
- If the issue was found on **production / live clients**, this is a **Defect** — use `defector`, not this skill.
