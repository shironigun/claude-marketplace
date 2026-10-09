---
name: commentor
description: Write and post a comment on an Azure DevOps work item on the Acme CRM "Agile Project" project, in the team's voice. Use this skill WHENEVER the user wants to comment on, reply to, post an update on, add an RCA/finding to, CC people on, or leave a note on a ticket/bug/defect/story — e.g. "comment on 123456", "post a status update on this ticket", "add the root cause to the defect", "CC the dev team and say it's verified", or "reply on that bug that it's fixed". For creating a new Bug use `bugger`; for a new production Defect use `defector`.
---

# Acme CRM Work-Item Commenting

Write a work-item comment the way the QA analyst does: structured, headed, with a bulleted root-cause when relevant, explicit verification language, and a trailing `CC:` of @mentions — then post it to the work item's discussion (`System.History`).

## Context you can assume (from project memory)

- **Org:** acme-org · **Project:** Agile Project (GUID `00000000-0000-0000-0000-000000000000`)
- **Author identity:** the QA analyst (`qa@example.com`, GUID `11111111-1111-1111-1111-111111111111`). Never a "QA"-prefixed display name.
- **Auth:** this plugin **bundles** the `azure-devops` MCP (Azure Identity / `az login`, no PAT or token); use its `mcp__azure-devops__*` tools.
- A comment is posted by writing HTML to the **`System.History`** field via `update_work_item` (each write adds one discussion comment).

## Workflow

1. **Pull the work item** (`mcp__azure-devops__get_work_item`, expand `all`) to ground the comment in the actual state, assignee, type, and existing discussion. Note the AssignedTo/CreatedBy **identity GUIDs** — you'll reuse them for @mentions.
2. **Pick the comment shape** for the intent (status update / RCA / finding / hand-off / escalation — templates in `references/comment-templates.md`).
3. **Draft the comment** in the team's voice and **show it to the user for approval before posting.**
4. **Post it** (see "Posting in ADO").
5. **Confirm** it was added.

## Voice & structure (this is what reads as the team's)

- **Headed and structured.** Use bold labels: `Bug Details:`, `Status:`, `FINDINGS`, `CC:`. Lay out a root cause as a `<ul>`/`<ol>` of concrete steps, not a paragraph of prose.
- **Name the specifics.** Exact config keys, URLs, client IDs, branch names, and error codes (`401`, `500`) — e.g. "the `IdentityServerUrl` in the configs was updated to https://… , so the token issuer changed and Acme CRM got a 401 Unauthorized."
- **Explicit verification language** when closing the loop: "verified the fix through QA testing", "Tested and resolved." End status comments with a `Status:` line.
- **CC the right people** with @mentions as a trailing `CC:` line (dev owner + cross-team stakeholders). On cross-system issues (DMS-E/DMS-A feeds, SSO/DMS-D) adopt the process-escalation tone: state who owns what and the approved process.
- No emojis, no greetings, no sign-off pleasantries. Terse and information-dense.

The house phrasing, to match:
> **Bug Details:** This bug has been inspected. The issue happened because, during the DMS-D QA deployment, the `IdentityServerUrl` in the configs was updated to "…". Due to this, the token issuer changed and Acme CRM was getting a 401 Unauthorized error. We have now corrected it, redeployed, and verified the fix through QA testing.
> **Status:** Tested and resolved.
> **CC:** @Hassan Iftikhar @Richard Pineault @Muhammad Ahmad

## @Mentions

ADO mentions are an HTML anchor carrying the person's identity GUID:

```html
<a href="#" data-vss-mention="version:2.0,11111111-1111-1111-1111-111111111111">@the QA analyst</a>
```

- Get GUIDs from the work item's `AssignedTo`/`CreatedBy`/`Custom.QA` fields (step 1) or from `mcp__azure-devops__get_me` for the QA analyst.
- If you don't have a person's GUID, **ask the user** or fall back to plain `@Name` text and tell the user that name won't hard-link without the GUID. Don't invent a GUID.

## Posting in ADO

```
mcp__azure-devops__update_work_item
  workItemId: <id>
  additionalFields:
    "System.History": "<comment HTML>"
```

Writing `System.History` appends a discussion comment (it does not overwrite prior comments). Keep the HTML to the patterns above: `<div>` blocks, `<b>` labels, `<ul>`/`<ol>` for steps, mention anchors in the `CC:` line.

## Hard rules

- **Always show the draft and get approval before posting** — it's a real write that notifies @mentioned people.
- **Always post as the QA analyst**, never a "QA"-prefixed display name.
- Don't change state/assignee/other fields unless the user asks — this skill writes the comment only.
- See `references/comment-templates.md` for ready shapes: status/verification, RCA, finding/investigation, hand-off, and cross-team escalation.
