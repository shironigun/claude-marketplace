---
name: bugger
description: File a Bug work item against a User Story or regression on the Acme CRM "Agile Project" Azure DevOps project, in the team's QA house style. Use this skill WHENEVER the user wants to log, file, raise, draft, create, or write up a BUG found while testing a story or during regression on QA/Staging — e.g. "file a bug for story 123456", "log this regression", "raise a bug on the QA environment", "write up this issue I found testing", or pastes a defect description and asks to turn it into a Bug. This is the bug-filing counterpart to the `buggy` test-case skill. For production/live-client issues use `defector` (Defect) instead; for posting a comment on an existing ticket use `commentor`.
---

# Acme CRM Bug Filing (against stories / regression)

File a **Bug** the way the QA analyst (QA→BA on Acme CRM) files them: a sharp negative-state title, environment-first repro bullets, a bolded `OBSERVATION` of the actual behaviour, a screenshot, and a "I know this is resolved when:" acceptance line — then create it as a **Bug** work item in Azure DevOps and link it to the source Story.

This is the bug-filing sibling of the `buggy` test-case skill: same voice, same spec docs-first rule, same identity and auth rules. The difference is the output is a **Bug**, not a Test Case.

## Context you can assume (from project memory)

- **Org:** acme-org · **Project:** Agile Project (GUID `00000000-0000-0000-0000-000000000000`)
- **Board / area path:** `Agile Project\CRM Team` — the QA/feature-testing board where regression and story bugs live. (SWAT is for production defects — that's `defector`.)
- **Author / QA identity:** the QA analyst (`qa@example.com`). Never a "QA"-prefixed display name.
- **Auth:** this plugin **bundles** the `azure-devops` MCP (Azure Identity / `az login`, no PAT or token); use its `mcp__azure-devops__*` tools — never the Cowork OAuth ADO plugin.
- **spec docs knowledgebase:** behaviour/flow docs at `docs/specs`. Read the relevant `modules\*.md` + `RULES.md` before analysing the ticket. Verify any `[UNCLEAR]`/`[ASSUMED]` flags before asserting behaviour.

## Workflow

1. **Read the source.** If a Story/work-item ID is given, pull it (`mcp__azure-devops__get_work_item`, expand `all`). Extract the feature touched, the client/environment, and the acceptance criteria the bug violates.
2. **Read the spec docs module** the bug touches (+ its `RULES.md` anchors) so the bug names the correct expected behaviour. If a rule is `[UNCLEAR]`/`[ASSUMED]`, flag it rather than asserting.
3. **Gather repro facts:** environment (QA/Staging + which DMS — DMS-B/DMS-C/DMS-E/DMS-A), client ID + credentials, the exact steps, and the actual (broken) result. Ask the user for anything missing — especially the screenshot/GIF and credentials.
4. **Draft the Bug** (title + repro + acceptance) in the format below and **show the user for approval before creating anything.**
5. **Create the Bug** work item (see "Creating in ADO").
6. **Link it to the source Story** as a child (parent = the Story).
7. **Report the new Bug ID and URL.**

## Title — the team's house style

Declarative bug **statement** (not imperative, not "Verify that…"). State what is broken, name the module/screen, and end with the environment.

- Frames to use: `<thing> not working`, `<thing> is/are not <verb>ing` (loading, syncing, populating, persisting, saving), `Unable to <verb>`, `<thing> is not <correct>`, `Error <doing X>`, `App crashed on <action>`, and `Able to <do invalid thing>` for should-not-be-allowed cases.
- **ALL-CAPS the domain keywords**: states and entities (`CLOSED`, `OPEN`, `EMAIL`, `MMS`, `PDF`, `CSV`, `FB`), DMS names (`DMS-B`, `DMS-C`, `DMS-E`, `DMS-A`, `ACME`), environments (`QA`, `STAGING`, `PRODUCTION`).
- **Name the module/screen**, using breadcrumb arrows when nested: `Settings > EMAIL`, `Notification panel > Task detail`.
- **End with the environment**: `… on QA environment.`, `… on STAGING & QA`, `… on DMS-B QA environment.`
- Include the bracketed **client ID** when client-specific: `Sosebees Outdoor Power and Repair [11928]`.

Real examples:
- `EMAIL Automations are not working on QA environment`
- `Unable to CREATE/UPDATE customers on DMS-B QA environment.`
- `PDF Preview/Icon is not displayed in MMS broadcast PREVIEW screen`
- `Able to add email without any type for DMS-B customers`
- `Customer created from DMS-C is showing incorrect created date on STAGING`

## Repro Steps — the anatomy (field: `Microsoft.VSTS.TCM.ReproSteps`, HTML)

A `<ul>` of **environment-first** bullet steps, key UI terms **bolded**, then a bold **`OBSERVATION:`** header with a second `<ul>` describing the actual broken result, then the screenshot/GIF.

```html
<ul>
  <li>Go to <b>DMS-B QA</b> environment.</li>
  <li>Navigate to the <b>Customer</b> module.</li>
  <li>Update/create a customer.</li>
</ul>
<div><b>OBSERVATION:</b></div>
<div><ul><li>Getting Timeout 500 response error.</li></ul></div>
<div><img src="PASTE_ATTACHMENT_URL?fileName=1.gif" alt=1.gif></div>
```

- First step is always the environment ("Go to QA environment…" / "Go to <b>DMS-B QA</b>…"). If creds are needed, reference them: "Go to the QA client I have mentioned in the System Info section."
- Use `OBSERVATION:` (he also uses `FINDINGS` for deeper investigations) for the actual result — not an "Actual:" label.
- A screenshot or GIF is near-universal; his recurring filenames are `1.gif` (screen recording) and `image.png` (still). If the user hasn't supplied one, leave the `<img>` placeholder and tell them to attach it.

## Other fields

Put **credentials/test data** in `Microsoft.VSTS.TCM.SystemInfo` (not in repro):
```
DmsDealerId: 999888444
Username: admin
Password: <password>
```

Put **acceptance criteria** in `Microsoft.VSTS.Common.AcceptanceCriteria`, always phrased "I know this bug is resolved when:":
```html
<div>I know this bug is resolved when:</div>
<div><ul><li>User can create/update a customer without any 500 error on DMS-B QA.</li></ul></div>
```

Field defaults for a **Bug** (see `references/ado-bug-fields.md` for the full table):

| Field | Value |
|-------|-------|
| `workItemType` | `Bug` |
| `areaPath` | `Agile Project\CRM Team` (confirm if the user names another) |
| `Microsoft.VSTS.Common.Severity` | `3 - Medium` default · `2 - Medium` for higher impact |
| `priority` | `2` |
| `Microsoft.VSTS.Common.ValueArea` | `Business` |
| `Custom.QA` | `qa@example.com` |
| `Custom.FoundWith` | `Manual Test` |
| `assignedTo` | the dev who owns the area, or leave unset / per the user |

Do **not** set the Defect-only taxonomy (`Custom.DefectType1`, `Custom.DMS`, `Custom.Hosted`, `Custom.DataSyncIssue`) on a Bug. CRM Team bugs are usually untagged; add a module tag only if the user asks.

## Creating in ADO

```
mcp__azure-devops__create_work_item
  workItemType: "Bug"
  title: "<title per house style>"
  projectId: "Agile Project"
  areaPath: "Agile Project\\CRM Team"
  priority: 2
  additionalFields:
    "Microsoft.VSTS.TCM.ReproSteps": "<repro HTML>"
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<acceptance HTML>"
    "Microsoft.VSTS.TCM.SystemInfo": "<creds block, if any>"
    "Microsoft.VSTS.Common.Severity": "3 - Medium"
    "Microsoft.VSTS.Common.ValueArea": "Business"
    "Custom.QA": "qa@example.com"
    "Custom.FoundWith": "Manual Test"
```

Then parent it to the Story it was found against:
```
mcp__azure-devops__manage_work_item_link
  operation: "add"
  relationType: "System.LinkTypes.Hierarchy-Reverse"   # this Bug's parent = the Story
  sourceWorkItemId: <new Bug ID>
  targetWorkItemId: <Story ID>
```

## Voice rules

- Declarative and specific — name the exact field/button/error string the way the UI shows it.
- Environment-first repro, one atomic action per bullet, bold the UI terms.
- `OBSERVATION:` states the actual broken behaviour; the fix bar lives in "I know this is resolved when:".
- No ceremony, no emojis, no hedging. Match the terse phrasing (minor source typos in quoted UI strings are fine; don't invent them).

## Hard rules

- **Always show the draft and get approval before creating** — creation is a real write.
- **Always create as the QA analyst**, never a "QA"-prefixed display name.
- If the issue was found on **production / live clients**, this is a **Defect** — use `defector`, not this skill.
