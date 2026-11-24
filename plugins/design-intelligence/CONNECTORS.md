# Connectors

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool the user connects in that category. Plugins are **tool-agnostic** — skills and agents describe workflows in terms of categories (design tool, component library docs, work-item tracker) rather than a hardcoded product. The `.mcp.json` in this plugin's root pre-configures the specific MCP servers below, but any MCP server in a category works — `.mcp.json` is a convenience default, not a hard requirement.

## `.mcp.json` — pre-configured servers

This plugin ships a root-level `.mcp.json` with three servers, each launched with `npx` and pinned to an exact package version:

```json
{
  "mcpServers": {
    "figma": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-remote@0.16.7", "https://mcp.figma.com/mcp"]
    },
    "mui-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mui/mcp@0.1.10"]
    },
    "ado": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@azure-devops/mcp@2.11.0", "${ADO_ORG}", "--authentication", "interactive"]
    }
  }
}
```

- **`figma`** — Figma's hosted endpoint (`https://mcp.figma.com/mcp`) via the mcp-remote bridge (`mcp-remote@0.16.7`). You sign in to Figma in the browser on first use. If your client connects to Figma's endpoint directly (an HTTP server entry or a Figma connector), you can use that instead; the skills only need the Figma MCP tools to be present.
- **`mui-mcp`** — MUI's documentation server. The docs-lookup tools (`useMuiDocs` / `fetchDocs`) need no key. The code-generation tool (`generateReactCode`) needs an `MUI_RECIPES_API_KEY` in the environment that launches the server; never put the key in this file.
- **`ado`** — Microsoft's official Azure DevOps MCP server (`@azure-devops/mcp@2.11.0`). Your organization name comes from the **`ADO_ORG`** environment variable (the short org name, as in `https://dev.azure.com/<org>`); nothing org-specific is hardcoded. Authentication is your own interactive sign-in. Set the variable before starting Claude Code, for example `export ADO_ORG=contoso` (macOS/Linux) or `setx ADO_ORG contoso` (Windows, then open a new terminal).
- **Knowledge Base MCP** — no server is pre-configured. `~~knowledge base` below remains a category placeholder until you connect your organization's knowledge-base MCP server; add its config the same way (pinned `npx` package, org values through `${ENV_VAR}`).

### Windows

On native Windows (not WSL), some clients cannot launch `npx` directly. If a server fails to start with an "executable not found" error, wrap the launcher in `cmd /c` in your local copy of `.mcp.json`:

```json
"command": "cmd",
"args": ["/c", "npx", "-y", "@mui/mcp@0.1.10"]
```

Keep the same pinned package and arguments; only the launcher changes. macOS, Linux and WSL use the file as shipped.

## Use your own MCP server instead

If you prefer one server of each kind shared across all your plugins, register them once at user scope. Your org name then lives only in your own `~/.claude.json`, never in a repo:

```bash
claude mcp add --scope user figma -- npx -y mcp-remote@0.16.7 https://mcp.figma.com/mcp
```

```bash
claude mcp add --scope user mui-mcp -- npx -y @mui/mcp@0.1.10
```

```bash
claude mcp add --scope user ado -- npx -y @azure-devops/mcp@2.11.0 <your-org> --authentication interactive
```

Keep these exact server names (`figma`, `mui-mcp`, `ado`) so the skills and the steward agent recognise the tools. When both your server and the bundled one exist, Claude Code connects once.

## Tool names

The same tool shows up under a different prefix depending on where its server comes from:

| Server | Bundled with this plugin | Your own user-scope server | claude.ai connector |
|---|---|---|---|
| Figma | `mcp__plugin_design-intelligence_figma__<tool>` | `mcp__figma__<tool>` | `mcp__Figma__<tool>` |
| MUI | `mcp__plugin_design-intelligence_mui-mcp__<tool>` | `mcp__mui-mcp__<tool>` | — |
| Azure DevOps | `mcp__plugin_design-intelligence_ado__<tool>` | `mcp__ado__<tool>` | — |

Examples below use one prefix; the availability check accepts any of them.

## Connectors for this plugin

| Category | Placeholder | Included servers | Other options |
|----------|-------------|-------------------|----------------|
| Design tool | `~~design tool` | Figma (pre-configured in `.mcp.json`) | Sketch, Adobe XD, Framer |
| Component library docs | `~~component library` | MUI (pre-configured in `.mcp.json`) | Chakra UI, Ant Design |
| Work item tracker | `~~work tracker` | Azure DevOps (pre-configured in `.mcp.json`, org from `ADO_ORG`) | Jira, Linear, GitHub Issues |
| Org design knowledge base | `~~knowledge base` | None pre-configured — connect your own | Confluence, Notion, internal wiki MCPs |

The org's design-system **values** (palette, typography, icons, required states) are not a connector: they come from the local, git-ignored overlay described in `_shared/config/org-design-system.md`, which the skills load in their Step 0.

## Availability check (required before use)

Before any skill or agent uses a connector, it must confirm the corresponding MCP tools are actually reachable in the current session rather than assuming availability from this file or `.mcp.json` alone — a declared server can still be disconnected at runtime:

- **Figma** (`~~design tool`) → Figma MCP tools (e.g. `get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs`, `get_libraries`, `use_figma`, `create_new_file`, under any Figma prefix in the table above). Routes to the Figma-analysis/Figma-screen skills (`figma-design-analysis`, `figma-screen-generation`), never used directly by the Steward except to execute a skill's explicit instructions.
- **MUI** (`~~component library`) → MUI MCP tools (`useMuiDocs` / `fetchDocs` / `generateReactCode` under `mcp__plugin_design-intelligence_mui-mcp__` or `mcp__mui-mcp__` — verify the live tool names in the current session rather than assuming the namespace) or the plugin's own `_shared/knowledge/mui-reference.md` when no live MUI MCP is connected. Routes to MUI-implementation workflows (`design-system-generation` code path).
- **Azure DevOps** (`~~work tracker`) → ADO MCP tools (the 2.11.0 read tools `wit_work_item`, `wit_query`, `repo_pull_request` under `mcp__plugin_design-intelligence_ado__` or `mcp__ado__`). Routes to Azure DevOps workflows — pulling ticket/PR/work-item context into whichever skill runs first. Read-only: the plugin never writes to the tracker.
- **Knowledge Base** (`~~knowledge base`) → Knowledge Base MCP tools (exact tool names depend on whichever server is connected, e.g. a `search`/`get_article`/`get_doc`-style tool under that server's `mcp__<server>__*` namespace). Routes directly to general design-knowledge questions — colors, typography, spacing, components, MUI usage conventions, accessibility, brand rules, guidelines — never to a skill (see the Steward's "General design-knowledge questions" section). Treat as unavailable until a real server is connected.

If a required connector's tools are not present in the current tool list, the requesting skill/agent must say so explicitly (e.g. "ADO MCP is not connected — cannot pull the work item context", or "Knowledge Base MCP is not connected — cannot answer from the org knowledge base") rather than fabricating a result. It must never invent ticket contents, Figma node data, MUI API details, or organization design-knowledge answers when the corresponding connector is unavailable.
