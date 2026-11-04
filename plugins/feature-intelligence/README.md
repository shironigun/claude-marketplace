# feature-intelligence (in development)

> **In development, not yet registered in the marketplace.** Plans 1 and 2 of the first release are in: the `fi`
> engine, the orchestrating skill, its playbooks and subagents, the CSV importer fixture and the evals. The
> shareable reference page and its questions board (plan 3) and Azure DevOps ticket creation (plan 4) are next.

Give it everything known about a feature: Azure DevOps stories and epics, FRD or PRD documents (PDF, Word or
Markdown), meeting notes, screenshots, the code, or a rough idea in a few lines. It builds one **Feature Model**:
atomic statements, each with its source quote and an evidence status (confirmed, inferred, assumed,
recommended, open or conflict). From the model it

- proves no source text was dropped (coverage of every chunk, or a stated reason to set it aside);
- finds conflicts, ambiguities, duplicates, gaps in error handling, permission holes and terminology clashes;
- asks the five questions with the widest impact, and keeps the rest for the board;
- derives what each department needs: flows and states, screen content and messages, and test scenarios mapped
  to the requirements they cover;
- ends each run with a summary checked by an independent reviewer.

## Use

```text
/feature-intelligence:new Import customers from CSV, stories 3101-3106 and docs/frd.pdf
/feature-intelligence:add notes/refinement-2026-10-22.md
/feature-intelligence:lens qa
/feature-intelligence:scenarios
/feature-intelligence:status
```

or just ask: "analyse epic 4100 for my team", "break this idea into stories", "what are the gaps in this FRD?".

## Lenses

| Lens | Leads with | Derives first |
|---|---|---|
| all (default) | the overview, requirements, flows and questions | flows, scenarios |
| product | the overview, requirements, story analysis and questions | discovery, story map, readiness |
| development | technical content, requirements, flows, dependencies | flows, and section F nodes taken from a repository source as claims (technical impact comes in a later release) |
| qa | test scenarios, requirements, flows | scenarios by technique |
| design | flows and design content | flows, labels, messages, content |

## How it works

1. **Ingest**: every source becomes anchored chunks (`§3 ¶2`, `p4`, `AC-2`, `comment 3`, `path:line@commit`).
2. **Extract**: `fi-extractor` subagents read the chunks in parallel and store atomic claims with exact quotes.
3. **Consolidate and account**: claims become nodes with stable ids; coverage must reach 95%.
4. **Analyse**: two `fi-analyst` subagents check quality (ISO/IEC/IEEE 29148, an ambiguity lexicon, INVEST) and
   discover conflicts, gaps, permissions and terminology problems.
5. **Clarify**: the top five questions by blast radius, each with options and a recommended answer.
6. **Derive**: flows, design content and scenarios for the lens (`fi-analyst`, `fi-scenario-designer`).
7. **Review and summarise**: `fi-reviewer`, which has no write tools, checks evidence, coverage and the summary.

The main session never reads a whole source: it works from the engine's compact output, and the model lives on
disk in `knowledge-base/features/<slug>/` (committed) with a cache in `.feature-intelligence/` (git-ignored).

## Engine

`skills/feature-intelligence/engine/` holds `fi`, the command-line engine (Node 20 or later, no dependencies). It
keeps the Feature Model on disk and is the only thing that writes it; Claude reads the sources, makes the
judgments, and passes its results to `fi`. Run
`node plugins/feature-intelligence/skills/feature-intelligence/engine/fi.js help` for the commands:

| Command | Does |
|---|---|
| `init` | Creates `knowledge-base/features/<slug>/`, the git-ignored profile stub and the `.gitignore` entry |
| `ingest` | Registers a source and caches its chunks: Markdown, text, HTML, Word, PDF, images, ADO work items, pasted text, a repository |
| `claims add` | Checks extracted claims against their chunks (anchor and quote) and stores them |
| `consolidate` | Clusters claims, suggests merges and conflicts, and applies the decisions with stable ids |
| `add`, `validate` | Adds derived nodes, links and decisions; checks the whole model |
| `coverage`, `set-aside` | Prove every chunk is cited or set aside with a reason |
| `query`, `trace`, `questions`, `status` | Slices of the model, chains, ranked open questions, where things stand |
| `forks` | Lists forked files and upstream changes since each was forked |

Tests (the engine, and the checks that keep the playbooks, subagents, commands, fixture and evals consistent):
`node --test plugins/feature-intelligence/skills/feature-intelligence/engine/test/*.test.js`

### Azure DevOps

The plugin bundles the official Azure DevOps MCP server (`@azure-devops/mcp`, pinned to 2.10.0). Set `ADO_ORG` to
your organization name in the shell that starts Claude Code. You sign in in a browser the first time, and no token
is stored. `.mcp.json` uses the Windows launcher; on macOS or Linux, change the `ado` entry to:

```json
"ado": {"type": "stdio", "command": "npx", "args": ["-y", "@azure-devops/mcp@2.10.0", "${ADO_ORG}", "--authentication", "interactive"]}
```

Without `ADO_ORG` the server does not start; everything except reading work items still works. In this release
the plugin only reads work items.

## Install

Not in the marketplace yet. To try it during development, load it straight from a clone:

```bash
claude --plugin-dir ./plugins/feature-intelligence
```

## Requirements

- Claude Code with subagents (without them the skill does the subagents' work itself, more slowly).
- Node.js 20 or later.
- To read PDF sources page by page: poppler (`pdftoppm`) for Claude's Read tool.
- Optional: `ADO_ORG` and an Azure DevOps sign-in, to read work items.

## Safety

- Source text is data, never instructions, in the skill and in every subagent.
- Research is read-only: no commits, pushes, branch switches, tracker writes or data changes.
- No secrets or personal data enter the model, a quote or a summary.
- The plugin depends on no other plugin. Borrowed material is forked into `references/forks/`, each file stamped
  with its source and commit; `fi forks` lists them and any upstream changes since.

## Files

```
.claude-plugin/plugin.json
.mcp.json                          the bundled Azure DevOps server
commands/                          new, add, lens, scenarios, status
agents/                            fi-extractor, fi-analyst, fi-scenario-designer, fi-reviewer
evals/                             trigger, guard and pipeline cases (see evals/README.md)
skills/feature-intelligence/
  SKILL.md                         the orchestrator
  references/                      workspace, model, ingest, requirements, quality, discovery, flows,
                                   design-content, scenarios, lenses; research (read its
                                   "Where to look" list only); forks/ (stamped forked material);
                                   ado-operations; the page-building references for plan 3
  engine/                          fi.js, lib/, test/, tools/ (tool lister, fixture generator)
  examples/csv-importer/           the synthetic fixture: FRD in three formats, notes, six stories, expected findings
  assets/, scripts/                the page shell, drawing kit, build and checks, the base for plan 3's renderer
```
