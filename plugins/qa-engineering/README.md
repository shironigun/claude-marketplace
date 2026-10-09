# qa-engineering

The **single AI QA engineering plugin** — one orchestrator for the whole QA loop. Bring it a story and it
analyzes it, authors and approves test cases, publishes them to a Test Plan/Suite, builds and generates
API + UI automation, and turns a failing run into a filed bug — **keeping you in control at every tracker
write** (nothing is created or filed until you confirm a preview). It also **teaches** and **reviews** a
Playwright + TypeScript framework. The brick-by-brick framework **build** is one of its workflows.

The plugin is **product-agnostic**: it ships no product data, no URLs, no org names and no credentials. Your
product/tracker specifics live in a git-ignored `house-profile.json`; the target system's address and a test
account live in a `.env` in your own framework folder. Neither is ever committed.

## What it does — the QA loop

| Ask | Engine |
|---|---|
| "Analyze this story" (an ADO work-item id) | `story-intelligence` (read-only → understanding + gaps) |
| "Analyze this module to test it" (codebase → QA) | `code-intelligence` (read-only → understanding + gaps + review from the code) |
| "Create test cases" | `author-api-cases` / `author-ui-cases` (+ an explicit approval gate) |
| "Push these to ADO" | `ado-publish` (gated: pick plan/suite → dry-run → confirm) |
| "Automate these cases" | `automation-engine` (approved / ADO cases → framework specs) |
| "Run the suite / smoke / these tests" / "did it pass?" | `run-suite` (runs the kit's **own** scripts → the real result → writes failures) |
| "Turn this red run into a bug" | `failure-to-bug` (investigate an API/UI failure → gated file) |
| "Build a framework brick by brick" | `scan-and-confirm` → `kit-builder` (the build path below) |
| "Teach me automation" / "review my framework" | `automation-tutor` / `framework-reviewer` |

All threaded through **`qa-context`** (story ⇄ case ⇄ script ⇄ defect) and driven by your house-profile.

## The build path (one workflow, phase by phase)

At each phase the build says what it will do, asks you (with a recommended option and the reason), acts,
verifies, and reports before moving on. It never assumes a value you have not confirmed.

| Phase | What gets built |
|---|---|
| 0 | Scan and confirm: the module's endpoints, flows, hosts and auth, written to `flow-map.json` |
| 1 | Foundation: the scaffold from `template/`, config, auth, `verify:setup` |
| 2 | Module API suite: contract and endpoint specs, run green twice |
| 3 | Module UI suite: page objects and a smoke spec (skipped if no web app URL is set) |
| 4 | ADO integration: Test Cases (gated via `ado-publish`), script-to-case links, bugs (gated via `failure-to-bug`; drafts if not signed in) |
| 5 | CI pipelines, local tools, docs, and a final secret scan |

## Requirements

- **Self-contained — no external plugin dependency.** The whole loop runs on the plugin's own native
  engines (`story-intelligence`, `code-intelligence`, `author-api-cases`, `author-ui-cases`, `ado-publish`,
  `automation-engine`, `run-suite`, `failure-to-bug`, plus `file-to-tracker` — the thin author→publish
  router) and the build skills (`scan-and-confirm`, `kit-builder`) with the tutor/reviewer agents. Nothing
  else needs to be installed.
- The product-specific sibling plugins in the marketplace are **inspiration only**. They are
  never required, and the kit builds and runs without them.
- Node 20 or later, git, and network access to the system under test.

## How to launch

From the folder that will hold your framework (ideally on a branch of your own):

- Invoke the **`qa-orchestrator`** agent (`qa-engineering:qa-orchestrator`) and say what you want —
  "analyze story #1234", "create test cases for this", "push these to ADO", "automate these cases",
  "turn this red run into a bug", or "build a test framework brick by brick". It routes to the engine that
  owns the work and gates every tracker write.
- Or invoke a skill directly (for example the **`kit-builder`** skill for the brick-by-brick build, which
  runs the same phase state machine).

For a build, the orchestrator starts by looking at the folder to see which phase is next, and asks you to
confirm before it does anything.

## Where to read more

- `docs/exercise.md` — the workshop runbook: checklist, the exercise flow, rubric, troubleshooting.
- `docs/phases.md` — every phase in full: questions, recommended answers, inputs, outputs, checks.
- `.mcp.json` — the two MCP servers the kit ships (Playwright and Azure DevOps), both version-pinned.
- `docs/reuse.md`, `docs/script-generation.md`, `docs/ado-integration.md`,
  `docs/ci-and-tools.md` — the supporting guides each phase follows.

## MCP servers and sign-in

The plugin's `.mcp.json` starts two servers when the plugin is enabled. Nothing in the plugin
carries a secret.

- **Playwright MCP** needs no credentials.
- **Azure DevOps MCP** signs in **interactively in the browser** (no token or PAT, ever). It reads
  your organization **name** from the `ADO_ORG` environment variable.

`ADO_ORG` must be set in **the shell that launches Claude Code**: export it there (or set it in
Claude Code's settings `env`), then restart the session so `.mcp.json` re-reads it. **A `.env`
file does not work for this**: Claude Code does not read `.env` when it expands `${VAR}` in
`.mcp.json`. The framework's own `.env` is only for the framework's code (base URLs, test
credentials) and is never read by the MCP servers.

If ADO is not signed in, phase 4 degrades to local drafts and the build carries on.

### Windows vs macOS/Linux

The shipped `.mcp.json` uses the Windows launcher (`cmd /c npx ...`). On macOS or Linux, replace
each server's `command` and `args` so `npx` is called directly:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.83"]
    },
    "ado": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@azure-devops/mcp@2.10.0", "${ADO_ORG}", "--authentication", "interactive"]
    }
  }
}
```

Keep the versions in step with `.mcp.json` when you bump them.
