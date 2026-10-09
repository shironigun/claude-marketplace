# Acme CRM Bug Suite

Three skills for the Acme CRM **Agile Project** Azure DevOps project, modeled on the team's actual authoring patterns (analyzed across 400+ Bugs and 180+ Defects created).

| Skill | Files what | Board / type | Trigger examples |
|-------|-----------|--------------|------------------|
| **bugger** | A **Bug** found while testing a story or during regression (QA/Staging) | CRM Team · `Bug` | "file a bug for story 123456", "log this regression", "raise a bug on QA" |
| **defector** | A **Defect** found on **production**/live clients | SWAT · `Defect` | "log a production defect", "file a defect for the live issue", "SWAT defect" |
| **commentor** | A **comment** on any work item, in the team's voice | any | "comment on 123456", "post an update/RCA on this ticket", "CC the dev team" |

## How they relate to the existing skills

- **bugger** is the bug-filing counterpart to the existing **buggy** test-case skill. It reuses buggy's house style, spec docs-reading rule, ADO-write conventions, and identity rules — but its job is creating **Bug** work items, not Test Cases. buggy (test cases) and tester (QA review) are unchanged.
- **defector** is bugger's production sibling: same voice, different work-item type, board, and field taxonomy.
- **commentor** handles discussion/`System.History` updates on existing tickets.

## Conventions baked in (from pattern analysis)

- **Identity:** created/QA = the QA analyst (`qa@example.com`), never a "QA"-prefixed display name.
- **Auth:** the plugin **bundles** the `azure-devops` MCP (Azure Identity / `az login`, no PAT); it uses those `mcp__azure-devops__*` tools only.
- **spec docs first:** read the relevant `docs/specs\modules\*.md` + `RULES.md` before analysing a ticket.
- **Repro anatomy:** `<ul>` steps (environment first) → bold `OBSERVATION:` block → screenshot/GIF → "I know this is resolved when:" acceptance criteria.
- **Bug vs Defect field split, severity defaults, tags, and title conventions** are encoded in each skill's `references/` file.

## Setup — self-contained, zero-config, no secrets

The plugin **bundles** the `azure-devops` MCP server (in its `.mcp.json`) that `bugger`, `defector`, and
`commentor` use to write to Azure DevOps. It authenticates with **Azure Identity** — **no PAT or token lives
in the repo or is required**. Just once:

1. **`az login`** (Azure CLI) with an account that can create/update work items on the project.
2. Install the plugin (below) and start or reload the session — the `azure-devops` server starts
   automatically; confirm it in `/mcp`.

That's it. The org defaults to `https://dev.azure.com/your-org`; for a **different org**, edit
`AZURE_DEVOPS_ORG_URL` in the plugin's `.mcp.json`. On **macOS/Linux**, change that `.mcp.json`'s launcher
from `"command": "cmd", "args": ["/c", "npx", …]` to `"command": "npx"` with the args after `"/c"`.

> Nothing sensitive is committed — auth is your `az login` session (Azure Identity), never a PAT in a file.

## Install

```bash
claude plugin marketplace add shironigun/claude-marketplace
claude plugin install crm-bug-suite@shironigun
```

Then run `az login` (above). These skills are tuned to the "Agile Project" project and the team's house
style; retarget the area/board/identity conventions in each skill's `references/` file for another project.
