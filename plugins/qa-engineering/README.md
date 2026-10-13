# qa-engineering

The **single AI QA engineering plugin** — one orchestrator for the whole QA loop. Bring it a story and it
analyzes it, authors and approves test cases, publishes them to a Test Plan/Suite, builds and generates
API + UI automation, and turns a failing run into a filed bug — **keeping you in control at every tracker
write** (nothing is created or filed until you confirm a preview). It also **teaches** and **reviews** a
Playwright + TypeScript framework. The brick-by-brick framework **build** is one of its workflows.

The plugin is **product-agnostic**: it ships no product data, no URLs, no org names and no credentials. Your
product/tracker specifics live in a git-ignored `house-profile.json`; the target system's address and a test
account live in a `.env` in your own framework folder. Neither is ever committed.

## Commands — start with one

A handful of commands, and you really only need the first. **`/qa` is your front door and home base**: the
first time, it sets you up, reads your codebase, shows your modules, and builds your first one step by step;
after that it shows your **status board** — where you are and what's next. The rest are smart shortcuts. **Every
command takes optional text to steer it** (`/qa test payments`, `/build API only`, `/run yesterday's failures`,
`/learn start at fixtures`).

| Command | What it does |
|---|---|
| ⭐ `/qa [anything]` | **Start here.** First run: set you up → read the codebase → pick a module → build the structure, then that module, step by step. Later: your home base — the status board + what's next. Routes anything you type. |
| `/build [context]` | Build the framework, or **add another module** to it. Structure is built once; then one module at a time, resuming where you left off. |
| `/test <id or module>` | Test one thing end to end — understand → cases → publish → automate → run → bugs, pausing for your OK. Auto-detects a story vs a module. |
| `/analyze <id or module>` | Just understand it first (read-only): what to test + the gaps. |
| `/run [scope]` | Run tests, see the real result, turn failures into bugs. |
| `/learn [topic]` | Learn automation — a guided, best-sequence course that saves your progress. |
| `/learn-extension [topic]` | Master the Playwright **VS Code extension** end to end — install & discover, run/debug in the editor, Record & Pick-locator, codegen→page-object refactor, Trace Viewer. Hands-on, saves progress. |
| `/status [section]` | Your status board (read-only): what's built, the last run, course progress, and what's next. |
| `/resume` | Pick up where you left off — build, test, or learning. |

Commands are namespaced `qa-engineering:` (e.g. `/qa-engineering:qa`). The gated steps (writing cases,
publishing, filing bugs) happen *inside* `/test`, `/build` and `/qa` — just say what you want, e.g. "push my
cases", and `/qa` routes it. You can always talk to the orchestrator in your own words instead.

## Live status pane (optional — needs the mods runtime)

On a Claude Code build with the **mods runtime** (≈2.1.293+, terminal or desktop Code tab), the plugin opens a
live **`QA status` pane** that renders the status board and refreshes as `qa-context` changes — the same board
as `/status`, but always-on beside your work. It auto-opens, and **`/qa-status`** reopens it. Read-only and
honest (shows only what the slices actually hold).

### ⚠ Requirement — read this before you install

The pane is a hooks **mod** (`hooks/register.tsx`), a format only the **mods runtime (≈2.1.293+)** loads. This
has a hard, **confirmed** consequence:

> **On any engine without the mods runtime, the ENTIRE plugin fails to load** — not just the pane. `claude plugin
> list` shows `✘ failed to load` / `Error: Hook load failed`, and the plugin's **skills, commands, and agents
> all become unavailable on that engine.** This affects the **standalone `claude` CLI, `claude -p` / CI, and any
> Claude Code older than the mods runtime.** (Mods-capable *interactive* engines — the desktop Code tab on a
> current build — load the whole plugin fine, pane included.)

So use this plugin on a **current, mods-capable Claude Code**. **If you need it on an engine without the mods
runtime (CLI, headless/CI, older versions), delete the `hooks/` folder** — the pane is the only thing that
depends on it, and everything else (all skills, commands, agents, and the in-chat `/status` board) then loads
normally everywhere.

The in-chat **`/status`** command renders the same board with no mods runtime and works everywhere (including
headless `-p`) — it is the portable equivalent of the pane.

## Works for your product kind (not just web apps)

The first thing `/qa` confirms is the **product kind**, which decides how much of the loop automates:

| Product kind | What the plugin does |
|---|---|
| **`web`** (default) | the full loop — analyze → cases → publish → **generate + run Playwright** → bug |
| **`api`** | the full loop against the API surface |
| **`desktop`** — a legacy/thick client (VB.NET, Delphi, WinForms/WPF) the plugin **can't** UI-automate | the same loop **minus automation**: analyze → **Knowledge Base** → author **manual** cases → **publish to ADO** → you test by hand → **file bugs** (from what you describe). Modules are discovered from the app's **forms/windows/menus**, and its atlas maps **screen → code-behind → service**. |
| **`mixed`** — a desktop UI over a backend API | **API** surface automated; **desktop UI** manual |

So a QA on a legacy desktop product still gets story analysis, the feature Knowledge Base/atlas, test-case
authoring, ADO Test Plans/Suites and bug boards — everything except Playwright automation (desktop UI
automation is out of scope today). The **web/route path is unchanged**.

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
| 0 | Scan and confirm (**frontend-first**): discover modules from the app's routes/nav, confirm the chosen module's endpoints, flows, hosts and auth → `flow-map.json`; on first run, **scaffold a Knowledge Base** (`knowledge-base/` with a stub per module) |
| 1 | Foundation: the scaffold from `template/`, config, auth, `verify:setup` — and, when a browser UI is in scope (`WEB_APP_URL` set), the **UI toolchain setup** (gated: install + verify the Playwright browsers and the VS Code extension, wire `.vscode/`; skipped for API-only/desktop/mixed) |
| 2 | Module API suite: contract and endpoint specs, run green twice |
| 3 | Module UI suite: page objects and a smoke spec (skipped if no web app URL is set) |
| 4 | ADO integration: Test Cases (gated via `ado-publish`), script-to-case links, bugs (gated via `failure-to-bug`; drafts if not signed in) |
| 5 | CI pipelines, local tools, docs, and a final secret scan |

## Knowledge Base — the product's features, as testable knowledge

The first time you run `/qa` on a product, the plugin builds a **Knowledge Base** in your framework repo under
`knowledge-base/` — a per-module behavior brief (`modules/<slug>.md`), a central file of atomic testable rules
(`RULES.md`), and a thin code map (`atlas/<slug>.md`). Modules are discovered **frontend-first** (from the
app's routes/nav, as users name them, not from backend controllers). It is generated **lazily**: a thin stub
per module up front, deepened module by module (`kb-builder`) as you analyze, build, or test each one.

The KB is what makes analysis *grounded* — `story-intelligence` and `code-intelligence` read it before they
reason, the authoring engines seed cases from its RULES anchors (so the thread runs **rule → case → script →
bug**), and automation reuse is scoped by the atlas globs. It is **durable team knowledge: committed in your
own repo** (not git-ignored like `.env`/`house-profile.json`), and it is **never** shipped in the plugin.
Format and rules: `knowledge/standards/knowledge-base.md`.

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

- **Easiest:** just run **`/qa`** — the first time it sets you up and builds your first module; after that it's
  your home base. Or use a shortcut (`/build`, `/test <id or module>`, `/run`, `/learn`) — see **Commands** above.
- Or invoke the **`qa-orchestrator`** agent (`qa-engineering:qa-orchestrator`) and say what you want in your
  own words — "analyze story #1234", "create test cases for this", "push these to ADO", "automate these
  cases", "turn this red run into a bug", or "build a test framework brick by brick". It routes to the engine
  that owns the work and gates every tracker write.
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

**Tracker support.** **Azure DevOps is the supported tracker today** — the only workflows that need it are
the two *tracker writes*: publishing approved cases to a Test Plan/Suite (`ado-publish`) and filing a bug
(`failure-to-bug`). **Everything else is tracker-independent** — analyze, build, generate, run, teach,
review, and authoring/approving cases all work with no tracker at all, and the two write steps **draft
locally** when ADO is absent. So a QA on **Jira / GitHub Issues / Linear** gets the whole loop today, with
the publish/file steps as local drafts; native support for other trackers is a **planned** future (the
`house-profile` already carries a `tracker.kind` seam for it).

### Platforms (the shipped config is cross-platform)

The shipped `.mcp.json` calls `npx` **directly**, so it starts out of the box on **macOS, Linux and WSL**
(where most QAs are). On **Windows**, if a server fails to start with an `npx`/ENOENT error, wrap each
command with the Windows launcher:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@0.0.83"]
    },
    "ado": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@azure-devops/mcp@2.10.0", "${ADO_ORG}", "--authentication", "interactive"]
    }
  }
}
```

Keep the versions in step with `.mcp.json` when you bump them.
