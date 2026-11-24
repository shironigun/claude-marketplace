# Privacy

The plugins in this marketplace collect no data, send nothing to the marketplace owner, and contain no
analytics or telemetry. They run inside your own Claude Code session.

Some plugins connect to MCP servers so Claude can read or write in tools you already use. Those
connections go straight from your machine to the provider, under your own sign-in, and each provider's
privacy policy applies:

| Server | Provider policy |
|---|---|
| Azure DevOps (`@azure-devops/mcp`) | [Microsoft Privacy Statement](https://privacy.microsoft.com/privacystatement) |
| Figma (`https://mcp.figma.com/mcp`) | [Figma Privacy Policy](https://www.figma.com/legal/privacy/) |
| MUI docs (`@mui/mcp`) | [MUI Privacy Policy](https://mui.com/legal/privacy/) |
| Playwright (`@playwright/mcp`) | Runs locally; it only reaches the sites your tests open |

Organisation-specific settings the plugins discover (workspace profile, design-system overlay, house
profile) are saved only in your own project, git-ignored, and never leave your machine through the plugins.
