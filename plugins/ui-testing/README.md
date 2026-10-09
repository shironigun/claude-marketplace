# ui-testing

UI test-case authoring and Playwright + TypeScript UI-script generation for **Acme CRM**
(Acme), in the team's QA house style.

| Skill | What it does | Writes to ADO? |
|---|---|---|
| **buggy** | Writes click-by-click **UI Test Cases** for an Acme CRM ticket in the house style **and creates them as Test Case work items in Azure DevOps**, linked to the source ticket. | **Yes** (needs the MCP below) |
| **tester** | Reviews a story / AC as a senior SQA analyst and authors UI test cases (and generates/parses runnable Playwright + TypeScript UI specs, forward and reverse). Authoring + script generation only. | No — produces cases/scripts as output |

Trigger either by pasting a ticket / story / AC and asking for UI test cases or scripts — e.g.
"write tests for #123456", "break this story into UI test cases", "generate the Playwright spec for this".

## Setup — self-contained, zero-config, no secrets (only `buggy` needs it)

`buggy` **creates Test Case work items in Azure DevOps**, so the plugin **bundles** the `azure-devops` MCP
server (in its `.mcp.json`) and authenticates with **Azure Identity** — **no PAT or token lives in the repo
or is required**. (`tester` needs nothing — it only produces cases and script text.) Just once:

1. **`az login`** (Azure CLI) with an account that can create work items on the project.
2. Install the plugin (below) and start or reload the session — the `azure-devops` server starts
   automatically; confirm it in `/mcp`.

The org defaults to `https://dev.azure.com/your-org`; for a **different org**, edit
`AZURE_DEVOPS_ORG_URL` in the plugin's `.mcp.json`. On **macOS/Linux**, change that `.mcp.json`'s launcher
from `"command": "cmd", "args": ["/c", "npx", …]` to `"command": "npx"` with the args after `"/c"`.

> Nothing sensitive is committed — auth is your `az login` session (Azure Identity), never a PAT in a file.
> `buggy` always asks for your approval before creating work items — ADO creation is a real write.

## Install

```bash
claude plugin marketplace add shironigun/claude-marketplace
claude plugin install ui-testing@shironigun
```

Then run `az login` if you plan to use `buggy` (the bundled MCP handles the rest — see Setup above).

## Notes

- Tuned to Acme CRM's "Agile Project" ADO project and the team's house style (identity, area/board,
  title conventions) — retarget those in each skill's `references/` file for another project.
- Sibling plugins: **api-testing** (the request/response equivalent) and **crm-bug-suite** (filing
  Bugs/Defects). For the full product-neutral QA loop in one orchestrator, see **qa-engineering**.
