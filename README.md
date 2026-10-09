# shironigun / claude-marketplace

A [Claude Code](https://code.claude.com/docs/en/plugins/overview) **plugin marketplace** — a curated set of
QA- and release-engineering plugins (skills, agents, and MCP servers) you can install into Claude Code in
the terminal, the Claude desktop app, or the VS Code extension.

The flagship is **[qa-engineering](#qa-engineering--the-flagship)**: one AI orchestrator for the whole QA
loop — analyze a story → author & approve test cases → publish them to a Test Plan/Suite → generate API + UI
automation → turn a failing run into a filed bug — with **a human gate at every tracker write**.

> **Marketplace name:** `shironigun` · **Source:** `shironigun/claude-marketplace` (this repo)
> When you install a plugin you refer to it as **`<plugin>@shironigun`** (the `@` uses the marketplace's
> registered name, not the GitHub path).

---

## Quick start

```bash
# 1. Add this marketplace (clones the repo into Claude Code)
claude plugin marketplace add shironigun/claude-marketplace

# 2. Install a plugin — e.g. the flagship
claude plugin install qa-engineering@shironigun

# 3. Start (or restart) a Claude Code session, then use it
#    In a session, its skills appear as /qa-engineering:<skill>
```

New skills/agents load at the start of a session. If you installed mid-session, run `/reload-plugins` or
start a new session.

---

## Install

### A. Claude Code CLI (terminal)

```bash
# add the marketplace (pin a branch/tag with shironigun/claude-marketplace#<ref> if you want)
claude plugin marketplace add shironigun/claude-marketplace

# install one or more plugins (default scope: user — just you, on this machine)
claude plugin install qa-engineering@shironigun
claude plugin install qa-toolkit@shironigun

# verify
claude plugin marketplace list          # shows "shironigun"
claude plugin list                       # shows installed plugins + enabled status
claude plugin details qa-engineering@shironigun   # lists its skills, agents, MCP servers
```

Manage them:

```bash
claude plugin disable qa-engineering@shironigun
claude plugin enable  qa-engineering@shironigun
claude plugin update  qa-engineering@shironigun     # after: claude plugin marketplace update shironigun
claude plugin uninstall qa-engineering@shironigun
claude plugin marketplace remove shironigun          # removes the marketplace + its installed plugins
```

**Scope:** add `--scope project` to an install to write the enable entry into the repo's committed
`.claude/settings.json` (so collaborators can install it too); `--scope local` keeps it to this repo for
just you. Default is `--scope user`.

**In a running session** the same operations are available as slash commands:

```
/plugin marketplace add shironigun/claude-marketplace
/plugin install qa-engineering@shironigun
/reload-plugins
/plugin                    # opens the panel: Discover · Installed · Marketplaces · Errors
```

`/plugin install …` opens the plugin's details and asks you to pick a scope (user / project / local) before
it installs.

### B. Claude desktop app (Code tab)

The desktop plugin browser installs **from marketplaces you've already added**, so add this marketplace once
from a terminal (step A above) — there is no documented GUI form for *adding* a marketplace. Then, in a
**local** session (not a cloud session):

1. Click the **+** button next to the prompt box → **Plugins**.
2. **Add plugin** → pick `qa-engineering` (or any plugin) from the list → choose a scope (your account /
   this project / local-only).
3. Manage or remove later via **+** → **Plugins** → **Manage plugins**.
4. If new skills don't show up, type `/reload-plugins` in the prompt box, or start a new session.

> Plugins are not available in cloud or WSL sessions; use a native local session. (In the **VS Code**
> extension you can do everything from the prompt box: type `/plugins` → **Marketplaces** tab to add this
> marketplace, then the **Plugins** tab to install.)

### C. From a local clone (offline / development)

```bash
git clone https://github.com/shironigun/claude-marketplace.git
claude plugin marketplace add ./claude-marketplace      # a folder containing .claude-plugin/marketplace.json
claude plugin install qa-engineering@shironigun
```

A local-path marketplace is read in place (not copied). After you `git pull`, run `/reload-plugins` or start
a new session. Don't add both the GitHub copy and a local copy at once — both register as `shironigun`;
remove one first (`claude plugin marketplace remove shironigun`).

---

## The plugins

| Plugin | Category | What it does |
|---|---|---|
| **[qa-engineering](#qa-engineering--the-flagship)** | testing | The whole QA loop in one orchestrator — story → cases → publish → automate → bug — human-gated; also teaches & reviews a framework. **Product-neutral.** |
| [qa-toolkit](#qa-toolkit) | testing | Generic QA building blocks: author API/UI test cases, convert failures to bugs, push to your tracker. |
| [api-testing](#api-testing) | testing | API test-case authoring + Playwright/TypeScript script generation + bug triage. |
| [ui-testing](#ui-testing) | testing | UI test-case authoring (ADO) + runnable Playwright UI script generation. |
| [crm-bug-suite](#crm-bug-suite) | bug-tracking | Files Bugs/Defects and ticket comments on a specific ADO project in a house style. |
| [release-notes-suite](#release-notes-suite) | release-management | Two-stage release pipeline: harvest the engineering inventory → write audience-facing release notes. |

> Several plugins (`api-testing`, `ui-testing`, `crm-bug-suite`, `release-notes-suite`) are tailored to
> a specific product and Azure DevOps project; `qa-toolkit` and **`qa-engineering`** are product-neutral and
> work against whatever tracker/app you point them at. Install only what you need.

### Requirements (MCP servers) — all self-contained, no secrets

Every plugin is self-contained. Most work the moment they install — they produce test cases, scripts, notes,
or drafts **in the session** with no external dependency: `qa-toolkit`, `release-notes-suite`, and
`api-testing`.

The three plugins that **write to Azure DevOps** each **bundle their own ADO MCP server** (in the plugin's
`.mcp.json`) — **no PAT or token is committed or required**, and there's no manual MCP config:

- **`crm-bug-suite`** (files Bugs/Defects/comments) and **`ui-testing`** (its `buggy` skill creates
  Test Cases) bundle the `azure-devops` MCP with **Azure Identity** auth → just run **`az login`** once.
- **`qa-engineering`** ships the official Azure DevOps + Playwright MCP servers with **interactive** sign-in
  → just set **`ADO_ORG`** in the shell that launches Claude Code.

No tokens live anywhere in this repo. Auth is your `az login` session or an interactive browser sign-in.
(Each ADO plugin defaults to the `acme-org` org; change `AZURE_DEVOPS_ORG_URL` in its `.mcp.json`
for another org. The bundled servers use a Windows `cmd /c npx` launcher — each README has the one-line
macOS/Linux swap.)

### qa-engineering — the flagship

**One orchestrator for the entire QA loop**, keeping you in control at every tracker write. You bring intent
and context; it routes to the engine that owns the work:

| You say… | It runs |
|---|---|
| "Analyze story #1234" | **story-intelligence** — reads the ADO work-item graph → understanding + open gaps (read-only) |
| "Create test cases" | **author-api-cases / author-ui-cases** — house-style cases + an explicit approval gate |
| "Push these to ADO" | **ado-publish** — pick Test Plan/Suite → dry-run → **confirm** → create + add-to-suite + link |
| "Automate these cases" | **automation-engine** — approved/ADO cases → Playwright + TS specs, reusing the framework standards |
| "Turn this red run into a bug" | **failure-to-bug** — investigate an API/UI failure (trace/screenshot) → classify → **gated** bug file |
| "Build a framework brick by brick" | **scan-and-confirm → kit-builder** — a guided API+UI framework build, phase by phase |
| "Teach me automation" / "review my framework" | **automation-tutor** / **framework-reviewer** |

- **Human-gated:** nothing is created or filed in your tracker until you confirm a preview — it never
  auto-pushes cases or bugs.
- **Product-neutral & self-contained:** ships no product data; your tracker, product, voice, auth and URLs
  live in a git-ignored `house-profile.json` + `.env` in your own framework folder.
- **Ships two MCP servers** (Playwright + Azure DevOps), version-pinned; both sign in locally, no tokens in
  the repo.

Start it by invoking the **`qa-orchestrator`** agent and saying what you want, or invoke a skill directly
(e.g. `kit-builder` for the build). See `plugins/qa-engineering/README.md` and
`plugins/qa-engineering/docs/` for the full map, and
`plugins/qa-engineering/docs/enhancement/end-to-end-rehearsal.md` for a trace of the whole loop.

### qa-toolkit

Product-neutral QA building blocks: generate API and UI test cases, convert test failures into bugs, and
push them to your tracker. The lightweight, à-la-carte alternative to `qa-engineering`'s full orchestration.

### api-testing

`api-tester` authors contract / endpoint / workflow API cases and generates runnable Playwright + TypeScript
specs (forward from cases, or reverse from existing specs); `api-bugger` triages a failed API test and drafts
a review-ready bug. (Tuned to a specific product's conventions.)

### ui-testing

`buggy` writes ADO Test Case work items in a house style; `tester` authors UI cases and generates runnable
Playwright + TypeScript UI specs (forward and reverse). (Tuned to a specific product.)

### crm-bug-suite

Files **Bugs** (against stories / regression) and **Defects** (production) and writes ticket comments on a
specific "Agile Project" Azure DevOps project, in a defined QA house style.

### release-notes-suite

A two-stage release pipeline: **harvester** builds the complete engineering release inventory (every shipped
story/defect across boards, plus non-ticketed PR/commit deployments); **releaser** turns that inventory (or a
technical draft) into audience-facing release notes, with brand variants.

---

## After install — how it loads

- **Skills & commands** appear as `/<plugin>:<skill>` in a session. `claude plugin details <plugin>@shironigun`
  lists everything a plugin provides.
- **Agents** become available for Claude to delegate to; **hooks** run at their lifecycle events; **MCP
  servers** from an enabled plugin start automatically and show in `/mcp` (their tools are named
  `mcp__plugin_<plugin>_<server>__<tool>`). Toggle a server off in `/mcp` without uninstalling.
- Changes apply at **session start** or after **`/reload-plugins`** (MCP-server changes apply on the next
  session).
- **Where things live** (user scope, `~` = your home dir): enable state in `~/.claude/settings.json`; the
  marketplace clone in `~/.claude/plugins/marketplaces/shironigun/`; installed copies in
  `~/.claude/plugins/cache/shironigun/<plugin>/…`.
- **Updates** are not automatic for a third-party marketplace: run `claude plugin marketplace update shironigun`
  then `claude plugin update <plugin>@shironigun`, or enable auto-update in `/plugin` → Marketplaces →
  `shironigun`.

## Trust & safety

Plugins run with **your** privileges — hooks, MCP servers, and any `bin/` on the Bash PATH. Install only
plugins you trust. Before installing, you can read a plugin's `.mcp.json`, `hooks/`, and `bin/` in this repo.
The plugins here keep **no secrets in the repo**: Azure DevOps signs in interactively (set `ADO_ORG` in the
shell that launches Claude Code), and framework credentials live in your own git-ignored `.env`. See the
[plugin security docs](https://code.claude.com/docs/en/plugins/security).

## Contributing a plugin

1. Create `plugins/<your-plugin>/`.
2. Add `.claude-plugin/plugin.json` (`name`, `version`, `description`, `author`).
3. Add your skills / agents / commands / `.mcp.json` under the plugin directory, plus a short `README.md`.
4. Add one entry to `.claude-plugin/marketplace.json` (`name`, `description`, `source`, `category`).
5. Keep it **product-neutral and secret-free** where possible; put any product/tracker specifics behind a
   git-ignored config file, never in committed files.
6. Open a PR into `main`.

## Docs

- Per-plugin: `plugins/<plugin>/README.md` and `plugins/<plugin>/docs/`.
- Claude Code plugins: [overview](https://code.claude.com/docs/en/plugins/overview) ·
  [install](https://code.claude.com/docs/en/plugins/install) ·
  [CLI reference](https://code.claude.com/docs/en/plugins/cli-reference) ·
  [marketplaces](https://code.claude.com/docs/en/plugins/create-marketplace)
