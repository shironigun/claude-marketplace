# feature-intelligence: design

| | |
|---|---|
| **Date** | 2026-10-30 |
| **Status** | Approved design (proposal revision 3, decisions D1–D8 settled). Implementation not started. |
| **Owner** | Mahmood Ahmad |
| **Plugin home** | `plugins/feature-intelligence/`, forked from feature-explainer 0.1.0 at `76f8f9a`; baseline commit `a799d1c` |
| **Proposal** | Private artifact "Feature Intelligence", https://claude.ai/artifact/43c67G4JuaqcNRYFns82gt (revision 3) |
| **Pilot** | Synthetic feature: *Import customers from a CSV file* (no real data) |
| **Scope** | Whole plugin. Phase 1 (MVP) in detail; phases 2–4 in outline. |

## 1. Summary

feature-intelligence turns everything known about a software feature (a rough idea, Azure DevOps stories and
epics, FRD/PRD documents in PDF, Word or Markdown, meeting notes, screenshots, and the code) into one shared,
traceable **Feature Model**, and presents that model as a single **read-only reference artifact** that each
department reads through its own lens: product, development, QA, design and sales.

Every node in the model carries a source quote and an evidence status, so the reference separates what the
sources say from what was inferred, assumed or recommended. Coverage accounting proves that no part of any
source was silently dropped. One part of the artifact is interactive: a **questions and concerns board**
where any department flags a concern on any item and receives one official answer from the Claude session.

For a **new feature**, the work ends in Azure DevOps: Claude drafts the Epic → Feature → Story → Task tree
from the model, the user approves an exact preview, and the tree is created on the named board and sprint
with the named assignees; the reference then maps every requirement, flow and scenario to its ticket. For an
**existing feature**, the reference is the deliverable and no tickets are created.

The plugin depends on **no other plugin**. Everything it borrows (release-note skills from release-notes-suite;
the concern taxonomy, ADO read sequence, write gates, knowledge-base format and backend scanner from
qa-engineering) is forked in and stamped with its source and commit. It bundles its own Azure DevOps MCP
server. feature-explainer remains the small, concise explainer.

## 2. Goals and non-goals

### Goals

| ID | Goal |
|---|---|
| G1 | Turn any mix of sources into one Feature Model in which every node has provenance (source, anchor, quote) and an evidence status. |
| G2 | Prove completeness: every source chunk is used by a node or set aside with a stated reason, and coverage is reported. |
| G3 | Produce one read-only reference artifact per feature, with lenses for all, product, development, QA, design and sales. |
| G4 | Give the artifact a questions and concerns board: contributors flag, Claude answers once per flag from the session, decisions are logged. |
| G5 | For a new feature, draft the ADO hierarchy, preview it, create it after explicit approval (board, sprint, assignees), and map the model to the created IDs. |
| G6 | For an existing feature, build the reference from code and documents; no tickets. |
| G7 | Stay inside the context window on large inputs: subagents read sources, the model lives on disk, a CLI serves slices. |
| G8 | Keep the model true as sources change (phase 2): fingerprints, claim diffs, impact along links, re-derive only what changed. |
| G9 | Depend on no other plugin. Forked material is stamped and checkable. |
| G10 | Stay product-neutral and secret-free: product specifics live in a git-ignored profile. |

### Non-goals

| ID | Non-goal | Why |
|---|---|---|
| N1 | Test cases, test scripts, automation, test plans | The QA lens stops at test scenarios mapped to tickets. |
| N2 | Screen design, component inventories, accessibility audits | The design lens explains flows, labels, messages and content. |
| N3 | Discussion threads, or editing content in the page | The artifact is a reference; the board takes flags and official answers only. |
| N4 | Publishing release notes | Sales gets drafts only. |
| N5 | Calling another plugin's skills or reading another plugin's state | User rule: no dependencies. |
| N6 | Effort estimates | Only when the user asks, and then badged as assumed. |
| N7 | Trackers other than Azure DevOps (phases 1–3) | Phase 4. |
| N8 | Analysing a whole repository up front | The Atlas is built lazily (phase 3). |

### In and out of scope for phase 1

- **In:** model and engine; bundled ADO server; ingest of Markdown, text, HTML, PDF, Word, ADO and pasted
  text; extraction, consolidation, coverage; quality, story, gap and permission analysis; clarification;
  new-feature and existing-feature modes (existing features read from code on the fly); the reference with
  sections A–K and the product, development, QA and design lenses; the questions board; the ticket tree with
  creation and mapping; Markdown export; the reviewer; the forks those parts need; evals on the CSV fixture.
- **Out (later phases):** change sync and snapshots, the sales lens, PDF/Word/CSV/JSON exports and standard
  document outlines, ask-the-feature, the Feature Atlas, portfolio views, other trackers.

## 3. Principles

| ID | Principle | Why |
|---|---|---|
| P1 | **One model, many views.** Every section, lens and export is a projection of the Feature Model; nothing is authored twice. | Consistency, traceability, and re-rendering that costs no tokens. |
| P2 | **Scripts measure, AI judges.** Chunking, IDs, coverage, links, diffs and rendering are deterministic engine work; extraction, consolidation decisions and analysis are model work. | Reproducible bookkeeping; the model spends tokens only on judgment. |
| P3 | **Every node has a source.** `confirmed` and `conflict` nodes need provenance (source, anchor, quote of at most 40 words; a conflict keeps at least two quotes); `inferred`, `assumed` and `recommended` nodes need `derivedFrom`; an `open` node needs either, because a source can state an open point ("to be confirmed"). The engine rejects a node with neither. | Readers can verify any statement or see exactly what it rests on. |
| P4 | **Evidence status survives every format.** confirmed, inferred, assumed, recommended, open, conflict. An assumed or recommended node never renders as a requirement without its badge; the lint fails the build. | AI assumptions never pass as confirmed requirements. |
| P5 | **Nothing is silently dropped.** Every chunk is referenced by a node or set aside with a reason. | Proof against information loss. |
| P6 | **Ask by impact.** Questions are ranked by blast radius and asked five at a time; the rest go on the board. | Clarification without overload. |
| P7 | **Lazy depth.** Derivations run for the lenses that need them, on demand. | Token cost scales with need. |
| P8 | **Gated writes.** The only writes outside the workspace are ADO work items, after an explicit yes to an exact preview, and they are idempotent. | Safety and trust. |
| P9 | **The engine is the only writer of the model.** Subagents and the orchestrator write through `fi`, which validates every write. | Schema integrity and stable IDs. |
| P10 | **Self-contained.** No dependency on any other plugin; forks are stamped and checked. | User rule; installing this plugin alone is complete. |
| P11 | **An independent reviewer.** A subagent without write tools checks evidence, coverage and the lint before every publish and before every ticket creation, and can block. | A second pair of eyes that cannot quietly fix things. |
| P12 | **Product-neutral and secret-free.** The plugin ships no product data and no secrets; specifics live in a git-ignored profile. | Marketplace rule. |

## 4. Architecture

### 4.1 Plugin layout

```
plugins/feature-intelligence/
  .claude-plugin/plugin.json
  .mcp.json                        bundled @azure-devops/mcp, pinned; interactive sign-in via ADO_ORG; no token
  README.md
  commands/                        new  add  lens  scenarios  tickets  concerns  atlas  sync  ask  publish  export  status
  agents/
    fi-extractor.md                reads chunk batches, writes claims through fi
    fi-analyst.md                  quality, gaps, conflicts, duplicates over model slices
    fi-scenario-designer.md        test scenarios by technique, mapped to tickets
    fi-cartographer.md             module knowledge from code (phase 3)
    fi-reviewer.md                 no write tools; PASS or BLOCKED with findings
  skills/feature-intelligence/
    SKILL.md                       the orchestrator: intake, mode, lens, routing, gates, resume
    references/                    playbooks, loaded one at a time
      model.md  ingest.md  requirements.md  discovery.md  quality.md  flows.md  design-content.md
      scenarios.md  tickets.md  impact.md  sales-drafts.md  board.md  lenses.md  workspace.md
      forks/                       forked source material, each file stamped (section 9.4)
        qa-engineering/            concern taxonomy, review-brief test types, ADO read sequence,
                                   two-gate pattern, knowledge-base standard, kb-builder method
        release-notes-suite/       releaser SKILL and exemplars, harvester sweep (phase 2)
    engine/                        the fi CLI: Node 20+, zero dependencies
      fi.js  lib/*.js  test/*.test.js
    assets/                        shell.css and vzkit.js (inherited), workspace.js (client renderer)
    scripts/                       inherited build, lint, page-check, phone-copy, serve
    examples/csv-importer/         the fixture: sources, expected findings, expected model (section 10)
  evals/                           trigger, over-trigger, evidence honesty, coverage, findings, idempotency
```

The inherited `scripts/` (feature-explainer's build, lint and layout checks) become the renderer's base in
plan 3. `engine/` is new.

### 4.2 Footprint in the user's repository

Claude runs in the user's repository (or any folder they choose). The plugin writes only these paths:

```
knowledge-base/                              committed; format forked from qa-engineering
  features/<feature-slug>/
    workspace.json                           manifest
    sources.json                             source registry with fingerprints
    model/nodes.jsonl                        one node per line, sorted by id
    model/links.jsonl                        one link per line, sorted
    decisions.jsonl                          decision log
    tickets.json                             model id -> ADO work item id, type, rev, url, tag
    board-snapshot.json                      board state at the last publish
    snapshots/v<N>.json                      model at each published version (phase 2)
  modules/  atlas/  RULES.md                 Feature Atlas (phase 3)
.feature-intelligence/                       git-ignored
  profile.json                               product, tracker, story format, task defaults, board settings
  cache/<feature-slug>/chunks/<SRC>.jsonl    normalized source text
  cache/<feature-slug>/claims/<batch>.jsonl  extractor output awaiting consolidation
  render/<feature-slug>/                     built page, print view, exports
```

`fi init` adds `.feature-intelligence/` to `.gitignore`. Nothing is written anywhere else, and the plugin never
reads or writes `qa-context.json`, `house-profile.json` or any other plugin's state.

### 4.3 Roles and write rights

| Role | Kind | Reads | Writes |
|---|---|---|---|
| Orchestrator | the skill | manifest, profile, model slices through `fi` | model only through `fi`; ADO only in the tickets flow after gate 2; board answers through the artifact database |
| Extractor | subagent | assigned chunk batches | claims through `fi claims add` |
| Analyst | subagent | model slices | findings through `fi add` |
| Scenario designer | subagent | model slices | TS nodes and links through `fi add` |
| Cartographer | subagent, phase 3 | repository files | Atlas entries and freshness records through `fi` |
| Reviewer | subagent | everything | nothing; returns PASS or BLOCKED with findings |
| Engine | `fi` CLI | all workspace files | the only writer of model files |
| Readers | artifact viewers | the page | flags on the board (contributors only) |

### 4.4 The bundled Azure DevOps server

`.mcp.json` bundles the official `@azure-devops/mcp`, pinned to the version qa-engineering uses (2.10.0),
started with `${ADO_ORG}` and interactive sign-in, so no token is committed or required. Windows uses the
`cmd /c npx` launcher; the README gives the macOS/Linux form. The engine is a plain CLI and cannot call MCP
servers: Claude makes every ADO call and passes the data to `fi`.

Operations the playbooks use (exact names verified against the pinned version in plan 1):

| Purpose | Operations |
|---|---|
| Read a story with its context | get work item with relations; batch get linked items; list comments; list revisions |
| Find related items | WIQL query; work-item search |
| Read the process | get work item type (User Story or Product Backlog Item, field names) |
| Choose where | list project teams; list team iterations |
| Choose who | look up identities |
| Create the tree | create work item; add child work items; link work items; update work item |

## 5. Data model

### 5.1 Node

One JSON object per line in `model/nodes.jsonl`, sorted by `id`.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Type prefix plus sequence, for example `RULE-003`. Never reused. |
| `type` | enum | One of the types in 5.2. |
| `title` | string | Short name as users would say it. |
| `statement` | string | One atomic, testable sentence. |
| `status` | enum | Evidence status, 5.4. |
| `provenance` | array | `{src, anchor, quote, hash}`; `quote` at most 40 words. Required for `confirmed` and `conflict` nodes. A node confirmed by a decision cites the `DL` entry as its source. |
| `derivedFrom` | array | Node ids this node rests on. Required for `inferred`, `assumed` and `recommended` nodes, and for `open` nodes without provenance; an assumed node points at the question or finding it fills. |
| `confidence` | enum | `high`, `medium`, `low`; inferred nodes only. |
| `category` | string | Optional sub-kind: NFR quality category, finding kind, scenario technique, task discipline. |
| `lenses` | array | Relevance hints for lens ordering; never a filter of truth. |
| `ado` | object | Delivery nodes once created: `{id, type, rev, url}`. |
| `rev` | int | Increments on every change. |
| `updated` | date | ISO date of the last change. |
| `supersededBy` | string | Set when a re-run retires the node; the node stays in the file. |

Example, from the CSV importer fixture:

```json
{"id":"RULE-003","type":"RULE","title":"Row limit per file","statement":"An import file may contain at most 10,000 rows.","status":"conflict","provenance":[{"src":"SRC-1","anchor":"§3.2 ¶2","quote":"Files are limited to 10,000 rows.","hash":"9f2c…"},{"src":"SRC-4","anchor":"STORY-2104 AC-2","quote":"Uploads over 5,000 rows are rejected.","hash":"41ab…"}],"lenses":["product","qa","dev"],"rev":1,"updated":"2026-10-30"}
```

### 5.2 Node types

| Family | Types |
|---|---|
| Evidence | `SRC` source, `EXC` excerpt |
| Business | `GOAL`, `PRB` problem, `ACT` actor or role, `SCOPE` (in or out), `BR` business requirement, `MET` success metric |
| Requirements | `FR`, `NFR`, `RULE`, `CON` constraint, `ASM` assumption, `DEP` dependency |
| Delivery | `EPIC`, `FEATURE`, `STORY`, `TASK`, `AC` acceptance criterion, `UC` use case |
| Behavior | `WF` workflow, `STEP`, `DP` decision point, `STATE`, `TRANS` transition |
| Experience | `SCR` screen, `MSG` message (label, error, validation, success, empty-state copy), `CNT` content block |
| Technical | `API`, `ENT` entity, `INT` integration, `MOD` code module, `FLAG` feature flag |
| Quality | `TS` test scenario |
| Governance | `Q` question, `DL` decision, `FND` finding (ambiguity, conflict, duplicate, gap, drift), `RISK`, `REC` recommendation, `TERM` glossary term |

### 5.3 Links

One JSON object per line in `model/links.jsonl`: `{from, type, to, src?}`.

| Type | From → to | Meaning |
|---|---|---|
| `derives-from` | any → any | Built from these nodes |
| `refines` | FR → BR, AC → FR | More specific form of |
| `implements` | STORY → FR | The story delivers the requirement |
| `part-of` | STEP → WF, STORY → FEATURE, FEATURE → EPIC, TASK → STORY | Containment and hierarchy |
| `next` | STEP → STEP, DP → STEP | Order and branches in a flow |
| `governs` | RULE → STEP, RULE → SCR | A rule applies here |
| `shows` | SCR → MSG, SCR → CNT | Words on a screen |
| `calls`, `reads`, `writes` | STEP → API, API → ENT | Technical touchpoints |
| `realized-by` | FR, RULE → MOD | Where the code lives (from code reading or the Atlas) |
| `covers` | TS → AC, FR, RULE | A scenario tests this |
| `maps-to` | any → STORY, TASK | The ticket that carries this item |
| `depends-on` | any → DEP, STORY → STORY | Ordering and external needs |
| `conflicts-with`, `duplicates` | any → any | Findings between nodes |
| `blocks` | Q → any | The question blocks this node; basis of the blast radius |
| `answers` | DL → Q, DL → board flag | A decision settles a question or flag |
| `defines` | TERM → any | Terminology |

### 5.4 Evidence statuses

| Status | Meaning | From story-intelligence (forked mapping) |
|---|---|---|
| `confirmed` | Stated in a source with a quote, or decided by a named person in the decision log | Confirmed |
| `inferred` | Follows from confirmed nodes; `derivedFrom` shows how | Inferred |
| `assumed` | Fills a gap so work can continue; listed until confirmed | Assumption |
| `recommended` | The system's suggestion; never rendered as a requirement | (none) |
| `open` | A question nobody has answered | Gap or question |
| `conflict` | Sources disagree; every quote is kept | (Gap) |

### 5.5 Identifiers

`fi` assigns ids at consolidation. On a re-run, a new claim reuses an existing node's id when its source anchor
matches, otherwise when its normalized statement is near-identical (token overlap of at least 0.85); else it
gets a new id. Ids are never reused. A node whose claims disappear gets `supersededBy` instead of being
deleted, so links, the decision log and tickets keep resolving.

### 5.6 Source registry

`sources.json` holds one entry per source:

```json
{"id":"SRC-4","kind":"ado","origin":{"workItem":2104,"rev":7},"title":"Reject oversized files","fetchedAt":"2026-10-30T10:12:00Z","status":"ok","chunks":[{"id":"SRC-4#desc","anchor":"description","hash":"…"},{"id":"SRC-4#ac2","anchor":"AC-2","hash":"…"},{"id":"SRC-4#c3","anchor":"comment 3","hash":"…","setAside":"greeting only, no requirement content"}]}
```

`kind` is `ado`, `file` (Markdown, text, HTML, Word, PDF), `paste`, `url`, `screenshot` or `repo`. File origins
record path and SHA-256; pasted text records who pasted it and when. `status` is `ok` or `unreadable`. A chunk is
covered when a node's provenance cites it, or when it carries `setAside` with a reason. Entries in
`decisions.jsonl` act as sources too: `{id, question, answer, decidedBy, decidedAt, via}`, where `via` is
`session` or a board flag id.

### 5.7 Claim

Extractor output, one per line in `cache/<slug>/claims/<batch>.jsonl`, before consolidation:
`{chunk, type, title, statement, status, anchor, quote, terms[]}`. Claims are never summaries: one fact per claim.

### 5.8 Workspace manifest

```json
{"slug":"csv-customer-import","name":"Import customers from CSV","mode":"new","lensDefault":"all","version":3,"artifactUrl":"https://claude.ai/artifact/…","coverage":{"chunks":142,"covered":139,"setAside":3},"lastSync":"2026-10-30","boardLastReviewed":"2026-10-30T15:40:00Z","forks":"see references/forks"}
```

`mode` is `new` or `existing`. Only `new` workspaces have section K and a `tickets.json`.

### 5.9 Board flag

Stored in the artifact's own database (the `db` and `user` runtime capabilities), not in the repository.

| Field | Meaning |
|---|---|
| `id` | Flag id, `F-12` |
| `about` | Node id or section letter |
| `category` | `question`, `unclear`, `missing`, `risk`, `conflict`, `content`, `testability` |
| `text` | What the reader flagged |
| `raisedBy`, `raisedAt` | Platform user id and time |
| `status` | `open`, `answered`, `accepted-risk`, `duplicate`, `out-of-scope` |
| `answer`, `answeredAt`, `decision` | The one official answer, its time, and the `DL` id when a decision was made |
| `linkedFlag` | For a follow-up, the flag it continues |

Access rules: everyone with access reads; contributors create flags and edit only their own; only the owner
writes `answer` and `status` (Claude writes these as the user through the artifact-data tool). Plain viewers
cannot write; the platform does not allow it. Claude's own open questions are written to the board as flags
raised by the owner, category `question`. At every publish, `board-snapshot.json` stores the board so the
standalone HTML can show it read-only.

### 5.10 Ticket record

`tickets.json` maps model ids to created work items:
`{"STORY-0007": {"workItem": 18345, "type": "User Story", "rev": 1, "url": "https://dev.azure.com/…/18345", "tag": "fi:csv-customer-import"}}`.
It is written after each successful creation, before the next one starts.

### 5.11 Profile

`.feature-intelligence/profile.json`, git-ignored, forked from qa-engineering's house-profile contract and
extended:

```json
{
  "product": {"name": "Example CRM", "domainNouns": ["customer", "contact", "import"]},
  "tracker": {"kind": "ado", "org": "your-org", "project": "Agile Project", "team": "CRM Team",
              "areaPath": "Agile Project\\CRM Team", "iterationPath": "Agile Project\\Sprint 42"},
  "story": {"format": "As a <role>, I want <goal>, so that <benefit>", "acStyle": "given-when-then"},
  "tasks": {"disciplines": ["design-content", "frontend", "backend", "data", "qa"], "estimates": false},
  "board": {"categories": ["question", "unclear", "missing", "risk", "conflict", "content", "testability"]},
  "lenses": {"default": "all"}
}
```

Missing slots fall back to neutral defaults, and Claude names the missing slot rather than guessing.

## 6. Workflow

### 6.1 Intake

1. **Sources.** Whatever the user gives: work item ids, an epic id, files, pasted text, an idea, a repository.
2. **Mode.** `new` (requirements for something not built yet; ends in tickets) or `existing` (understand
   what is already built; reference only). Inferred from the request; asked once only if unclear.
3. **Lens.** Asked once unless the request names a department; default `all`. The lens never gates
   understanding: it sets order, depth and which derivations run first. Several lenses deepen several
   sections of the same workspace.
4. `fi init <slug>` creates the workspace and the git-ignored profile if missing.

### 6.2 Pipeline

| # | Stage | Who | Output |
|---|---|---|---|
| 1 | **Ingest.** Every source becomes chunks with stable anchors (page, section, paragraph, story field, comment) and a fingerprint (SHA-256 or ADO revision). ADO items are read with the forked story-intelligence sequence. Word files are unzipped and read by the engine; PDFs are read by Claude page by page. | `fi ingest`; Claude for ADO and PDF reads | `sources.json`, chunk cache |
| 2 | **Extract.** Chunk batches (about 15–25 pages of text each) go to `fi-extractor` subagents in parallel. Each writes atomic claims with quotes and returns only a count and any problems. | subagents | claims cache |
| 3 | **Consolidate.** `fi consolidate --propose` clusters similar claims; the orchestrator decides each cluster (merge, conflict, keep apart); `--apply` writes nodes and links with stable ids. Terms resolve against the glossary. | engine, then judgment, then engine | nodes, links |
| 4 | **Account.** Coverage per source. Chunks no node cites go back to an extractor once; what remains must be set aside with a reason or reported. | `fi coverage` | coverage figures |
| 5 | **Analyze.** Over the model, never the raw sources: ISO/IEC/IEEE 29148 quality, INVEST for stories, an ambiguity lexicon, the forked concern taxonomy, gaps by node type, conflicts, duplicates, the story map, dependencies, the role and permission matrix, terminology conflicts, readiness. | `fi-analyst` | FND, Q, RISK nodes |
| 6 | **Clarify.** `fi questions` ranks open questions by blast radius × severity. The top five are asked in the session; the rest go on the board. "Proceed on assumptions" marks dependents `assumed`. | orchestrator, the user | DL entries |
| 7 | **Derive.** What the lens needs: flows and states, design content, test scenarios, technical impact, risks and recommendations, and for `new` mode the ticket tree. | orchestrator, subagents | derived nodes |
| 8 | **Render.** `fi render workspace` builds the page from the model; the reviewer checks; Claude publishes or updates at the same URL. | engine, reviewer | the artifact |
| 9 | **Tickets** (`new` mode only). Section 6.5. | orchestrator, the user | ADO items, `tickets.json` |

The main session never reads a whole source. Subagents read; claims go to disk; the orchestrator works from
`fi query`, `fi trace` and `fi status` output.

### 6.3 Clarification and the board

- The session asks at most five questions at a time, highest blast radius first, each with options and a
  recommended answer. Answers become `DL` entries with who and when, and blocked nodes become `confirmed`.
- Every other open question is written to the board as a flag raised by the owner.
- Readers flag concerns on any node or section. A new flag does not wake a session. `/feature-intelligence:concerns`
  (and every `sync`) reads new flags, ranks them by blast radius, drafts an answer for each, and asks the user to
  approve, edit or reject each draft. Approved answers are written to the board; decisions go to the decision
  log; if content changed, the page is republished.
- One official answer per flag; no threads. A follow-up is a new flag with `linkedFlag`.

### 6.4 Existing-feature mode

Claude researches the code read-only, the way feature-explainer does today: search the repository, read other
branches with `git show` and `git grep`, read tickets and documents, and call live systems only when allowed.
Facts become claims with code anchors (`path:line@commit`) and flow through stages 3–8. No section K, no
tickets. In phase 3 the Feature Atlas makes this cheaper and persistent.

### 6.5 Ticket creation (new-feature mode)

1. **Read the process.** Get the project's work item types and fields, so a story becomes a User Story (Agile)
   or a Product Backlog Item (Scrum), and acceptance criteria go to the right field.
2. **Draft the tree.** Shape: an Epic when the work splits into two or more capability areas or the user calls
   it a major feature; otherwise a Feature at the top; a small change can be stories alone. Claude proposes the
   shape; the user decides it.
   - Epic: business goal, scope and non-goals.
   - Feature: one capability and its acceptance.
   - Story: the statement in the profile's format, description, acceptance criteria in the profile's style,
     business rules, dependencies, non-functional notes, and links to its model nodes.
   - Task: derived from what the story touches (design content, frontend, backend or API, data, and a QA task
     to run the mapped scenarios), each with what to do and when it is done. No estimates unless asked, and
     then badged `assumed`.
   - Unbacked lines carry the `assumed` badge into the preview.
3. **Reuse existing tickets.** Stories that were sources are linked under the new parents, not created again.
4. **Review.** `fi-reviewer` checks that every story traces to model nodes and that nothing assumed is unbadged.
5. **Gate 1, choose.** The user picks which items to create.
6. **Where and who.** Claude lists the real teams and iterations to pick from and never guesses a path. The user
   names assignees in plain words; Claude resolves them to ADO identities and asks when a name matches more than
   one person.
7. **Preview.** Every item, field, parent, area, iteration and assignee, rendered by `fi tickets plan`, with
   nothing written yet.
8. **Gate 2, explicit yes.** Nothing is created without it.
9. **Create, top-down.** Epic, then features, then stories, then tasks, each with parent links and the tag
   `fi:<slug>`. After each success, `fi tickets record` writes the id to `tickets.json` before the next call.
10. **Fail safe.** The first failure stops the run and reports what was created. The next run reads
    `tickets.json` and the tag (a WIQL query on the tag recovers ids even if the file is lost), updates what
    changed, and never creates a second copy.
11. **Map.** `fi tickets map` adds `ado` to delivery nodes and `maps-to` links from requirements, flows,
    content and scenarios; the page is republished with links into Azure DevOps.

### 6.6 Lenses and sections

| Section | Built from | Appears when |
|---|---|---|
| A Executive overview | GOAL, PRB, SCOPE, ACT, main FR clusters | always |
| B Requirements | BR, FR, NFR, RULE, CON, ASM, DEP | always |
| C Story analysis | EPIC, STORY, AC, story findings, story map | stories are among the sources |
| D Journeys and flows | WF, STEP, DP, STATE, TRANS | any behavior found |
| E Design content | SCR, MSG, CNT | screens or messages found, or the design lens is on |
| F Technical | API, ENT, INT, MOD, FLAG | technical content found, or a repository is connected |
| G QA scenarios | TS mapped to tickets and acceptance criteria | testable requirements exist |
| H Dependencies, risks and assumptions | DEP, RISK, ASM | always |
| I Questions and concerns | Q, conflicts, board flags with answers | always |
| J Recommendations | REC | any recommendation exists |
| K Ticket tree | EPIC, FEATURE, STORY, TASK with ADO ids | mode is `new` |
| L Release-note drafts | three drafts (phase 2) | the sales lens is on |

| Lens | Opens on | Deep by default | Derives on first run | Leaves out |
|---|---|---|---|---|
| all (default) | A | A, B, D, I | flows, scenarios | nothing; technical detail collapsed |
| product | A | A, B, C, I, K | discovery, story map, readiness, ticket tree | code, scenario detail |
| development | F | F, B, D, H, K | technical impact, tasks per story | release-note drafts |
| qa | G | G, B, D | scenarios by technique, mapped to tickets | test cases, scripts, automation |
| design | D | D, E | flows, labels, messages, content | APIs, storage, code, scenarios |
| sales (phase 2) | L | L, A | three release-note drafts | everything internal |

Each node renders once, in its home section; other sections link to it. Every lens lists its own department's
flags first on the board. Switching lens in the page is instant for content that exists; content not yet derived
says so and names the command that derives it.

### 6.7 Publishing

`fi render workspace` embeds the model as JSON and renders sections on demand in the page (lazy, filterable
long tables), so an epic-sized workspace stays around 1–2 MB. The reviewer runs before every publish. Pages are
private; updates go to the same URL after reading the current version. The page declares only the `db` and
`user` capabilities, for the board; without them it is a complete read-only document that shows the board
snapshot.

### 6.8 Sales drafts (phase 2)

Claude writes a technical draft from confirmed nodes only (capabilities, availability, limits; nothing assumed,
recommended or internal), then applies the forked releaser rules (suppression, voice, the editorial rules from
the user's release-note reviews) to produce three lengths: a short "What's New" blurb, the standard benefit-led
note, and a fuller feature announcement with set-up steps. For a feature that has already shipped, the forked
harvester sweep (shipped work items and pull requests) enriches the technical draft.

## 7. Engine

`fi` is a single Node 20+ CLI with zero dependencies (built-ins only: `fs`, `path`, `crypto`, `zlib`), tested
with `node:test`. Every command takes the feature slug, prints human-readable text by default and JSON with
`--json`, and exits 0 on success, 1 on a validation or threshold failure, and 2 on a usage error.

| Command | Does | Phase |
|---|---|---|
| `fi init <slug> --mode new\|existing` | Creates the workspace and manifest, the profile stub if missing, and the `.gitignore` entry | 1 |
| `fi ingest <slug> <file>` | Chunks Markdown, text, HTML and Word (unzips `.docx` itself and reads `word/document.xml`, headings become anchors); registers PDFs with hash and page count (pages are read by Claude; anchors are `p<N>`) | 1 |
| `fi ingest <slug> --ado <json>` / `--paste <file>` | Registers ADO items Claude fetched (fields, AC, comments, revision) or pasted text, as chunks | 1 |
| `fi claims add <slug> <file>` | Validates claims against the chunk registry and appends them | 1 |
| `fi consolidate <slug> --propose` / `--apply <decisions>` | Clusters similar claims; applies merge, conflict and keep-apart decisions; assigns stable ids (5.5) | 1 |
| `fi add <slug> <file>` | Adds derived nodes and links, validated | 1 |
| `fi validate <slug>` | Schema, dangling links, provenance (P3), status rules (P4), unique ids | 1 |
| `fi coverage <slug> [--min 0.95]` | Coverage per source; lists unaccounted chunks; fails below `--min` | 1 |
| `fi query <slug> [--type] [--status] [--text] [--section]` | Compact slices of the model | 1 |
| `fi trace <slug> <id>` | The upstream and downstream chain of one node | 1 |
| `fi questions <slug>` | Open questions ranked by blast radius × severity | 1 |
| `fi render <slug> workspace` / `md` | The page (model embedded as JSON) and Markdown | 1 |
| `fi lint <slug> --lens <lens>` | Evidence and lens rules, secret patterns; inherits feature-explainer's lint discipline | 1 |
| `fi status <slug>` | Manifest summary for resuming | 1 |
| `fi tickets plan` / `record` / `map <slug>` | Preview text; record one created id; add `ado` fields and `maps-to` links | 1 |
| `fi board snapshot <slug> <json>` | Stores the board state at publish | 1 |
| `fi forks` | Lists every forked file, its stamp, and upstream commits since the stamp | 1 |
| `fi impact <slug> <src\|id>`, `fi diff <slug> <vA> <vB>`, `fi snapshot <slug>` | Change propagation and comparison | 2 |
| `fi render <slug> print` / `docx` / `csv` / `json` | Print-ready HTML (saved as PDF in a browser), Word written by the engine, exports | 2 |
| `fi atlas scan` / `stale` | Structural index and freshness checks | 3 |

**Blast radius.** For a question Q: the set of nodes Q `blocks`, plus every node that transitively derives from,
refines, implements, covers, is part of, or maps to any of them, plus Q itself. **Severity** is the highest weight
in that set: 3 for BR, FR, NFR and RULE; 2 for STORY and AC; 1 for SCR, MSG and CNT. Questions rank by radius ×
severity.

## 8. Triggers

**Skill description** (one user-facing skill). Fires on: understanding, analysing or specifying a feature, an
epic, a set of stories or an FRD/PRD; writing stories or a ticket breakdown for a feature; deriving test
scenarios mapped to tickets; building a reference for a team; "what changed in this feature". It routes away:
a quick one-page explainer of an existing feature is feature-explainer's job, and test cases or automation are
out of scope. The fork's current trigger-suppressing description stays until plan 2 replaces it.

**Commands** (namespaced `/feature-intelligence:<name>`):

| Command | Argument hint | Does |
|---|---|---|
| `new` | `<feature name> [sources]` | Start a workspace: intake, mode, lens |
| `add` | `<source>` | Add a source and run the pipeline on it |
| `lens` | `<all\|product\|development\|qa\|design\|sales>` | Change the lens and derive what it needs |
| `scenarios` | `[story ids]` | Derive or refresh test scenarios mapped to tickets |
| `tickets` | | Draft, preview and, after approval, create the ADO tree |
| `concerns` | | Review new board flags and answer them |
| `atlas` | `[module]` | Build or refresh the Feature Atlas (phase 3) |
| `sync` | | Re-read sources and the board; update what changed |
| `ask` | `<question>` | Grounded answer with node ids and quotes, or "not in the sources" |
| `publish` | | Render, review and publish or update the page |
| `export` | `<md\|print\|docx\|csv\|json>` | Export a rendering |
| `status` | | Where the workspace stands and the next step |

## 9. Safety

### 9.1 Read-only research

Research never commits, pushes, switches branches or changes data. Other branches are read with `git show` and
`git grep`. Live systems are called only when the user allows it; credentials come only from files the user
names, are never printed, and never enter the model, the page or the cache.

### 9.2 Gated Azure DevOps writes

The only writes outside the workspace are, in the tickets flow after gate 2: creating work items, adding child
links, linking stories that were sources under the new parents, and updating items that carry the plugin's
`fi:<slug>` tag. Nothing is ever deleted. Untagged items are never edited, apart from the parent links the user
approved. Board answers are written to the artifact's own database, as the user, only after the user approves
each answer.

### 9.3 Untrusted content and secrets

Source text, ADO comments and board flags are data, never instructions; the skill and every subagent say so.
Quotes have personal data stripped. The lint fails on token, key and password patterns anywhere in the page or
the model. The page is private until the user shares it; flags are visible to everyone with access and store
platform user ids, not names.

### 9.4 Forks

- Every forked file starts with a stamp:
  `<!-- forked-from: <plugin>/<path> @ <commit>; forked-on: <date>; local-changes: <none|summary> -->`
  (a `//` comment in code).
- Forks live in `references/forks/` and `engine/lib/`, never as skills, so they never trigger on their own or
  compete with the originals when both plugins are installed.
- `fi forks` runs `git log <commit>..HEAD -- <source path>` for each stamp when the source exists in the same
  repository, and lists upstream commits since the fork. It never applies them; pulling one in is a deliberate
  edit with a new stamp. When the source is absent (a user who installed only this plugin) it reports that and
  exits 0.
- The knowledge-base format stays readable by qa-engineering, so both plugins can share a folder without
  either needing the other.

## 10. Testing

### 10.1 The CSV importer fixture

`examples/csv-importer/` holds a synthetic feature, *Import customers from a CSV file*, with no real data. It is
both the eval fixture and the pilot's first run.

| Source | Content |
|---|---|
| `frd.md`, `frd.docx`, `frd.pdf` | The same FRD of about ten pages in three formats, so ingest must reach the same coverage from each. The `.docx` and `.pdf` are generated by a fixture script, not hand-made. |
| `stories/*.json` | Six stories in the shape the ADO server returns: upload a file, map columns, validate rows, preview before importing, import with a summary, download the error report |
| `notes.md` | Meeting notes with two decisions and one contradiction |
| `expected-findings.json` | Every planted fault, with the chunks that reveal it |

Planted faults:

| Kind | Count | Examples |
|---|---|---|
| Conflicts | 3 | Row limit 10,000 in the FRD and 5,000 in a story; duplicates by email skipped (FRD) or updated (story); file size 5 MB (FRD) or 10 MB (notes) |
| Ambiguities | 5 | "large files should import quickly", "user-friendly error messages", "common date formats", "etc." in the accepted columns, notifications "as appropriate" |
| Duplicates | 2 | The email-format rule stated twice; "name is required" stated twice |
| Missing error behavior | 4 | A file that is not UTF-8; a row with more fields than headers; a failure halfway through an import; a dropped upload |
| Terminology | 1 | "customer" and "contact" used for the same thing |
| Permission gap | 1 | The FRD says admins import, a story mentions managers, and no rule covers managers |
| Missing content | 1 | No message for a file with zero valid rows |

### 10.2 Engine tests

`node:test` unit tests per command with golden files: chunking and anchors per format, Word unzip, claim
validation, consolidation and id stability across re-runs, coverage, validation rules, blast radius, ticket
record and map, render output, lint rules, fork stamps.

### 10.3 Evals

Using the marketplace's eval harness (prompt plus graders, as qa-engineering does):

| Eval | Pass when |
|---|---|
| Trigger | "analyze this epic for my team" and "break this CSV import idea into stories" start a workspace |
| Over-trigger | "a quick page explaining refunds" and "write test cases for story 123" do not |
| Evidence honesty | No `assumed` or `recommended` node renders in section B without its badge |
| Coverage | At least 95% on the fixture, with every unaccounted chunk listed |
| Findings | At least 90% of the planted faults found, with quotes |
| Formats | Coverage from `frd.md`, `frd.docx` and `frd.pdf` within 2 percentage points of each other |
| No dependencies | No reference to another plugin's skills, and no read of another plugin's state, in any transcript |

### 10.4 Pilot checks (need ADO and a published page)

- Ticket creation in a sandbox ADO area: the tree matches the approved preview; a second run creates nothing;
  a run stopped halfway resumes without duplicates; every created story maps back to model nodes.
- The board: a probe flag written through the artifact-data tool is read by `concerns`, answered after
  approval, shown on the page, and the probe is deleted afterwards.
- Page checks inherited from feature-explainer at desktop and phone widths, in light and dark themes.

## 11. Phase 1 deliverables and acceptance

| Deliverable | Accepted when |
|---|---|
| `fi` engine (plan 1) | All phase-1 commands pass their tests; zero dependencies; Node 20+ |
| Bundled ADO server | Signs in interactively with `ADO_ORG`; the operations in 4.4 verified against the pinned version |
| Orchestrator, playbooks, subagents (plan 2) | The trigger, over-trigger, evidence, coverage, findings and format evals pass on the fixture |
| Forks (plans 1–2) | Each forked file stamped; `fi forks` lists them; the no-dependency eval passes |
| Reference page (plan 3) | Sections A–K and the product, development, QA and design lenses render from the model; the trace drawer works; page checks pass; under 3 MB for the fixture |
| Questions board (plan 3) | Contributors can flag; owner-only answers; the snapshot shows in standalone HTML; the probe check passes |
| Tickets (plan 4) | The sandbox pilot checks in 10.4 pass |
| Docs and release | README, install notes, evals; registered in `marketplace.json`; version 0.1.0; pull request into `dev` |

## 12. Roadmap

| Phase | Name | Scope |
|---|---|---|
| 1 | Understand and plan (MVP) | Everything in section 11 |
| 2 | Keep it true, reach sales | Change sync for sources and created tickets, snapshots and the change view, readiness gates per story, the sales lens with three release-note drafts from the forked releaser, PDF (print-ready page), Word, CSV and JSON exports, BRD, FRD and SRS outlines, ask-the-feature in the session |
| 3 | Feature Atlas | Structural index with incremental refresh, module knowledge written by the cartographer with commit-pinned freshness, technical impact and documented-versus-implemented drift in section F, a knowledge-base format qa-engineering can still read |
| 4 | Organization intelligence | Portfolio view across features and their tickets, cross-feature dependencies and shared rules, readiness trends, trackers other than ADO |

Each phase gets its own plans. Plans run on branches into `dev`, never touch `main`, and hold for the owner to
ship.

## 13. Decisions

### Made

| ID | Decision | Outcome |
|---|---|---|
| D1 | Names | Plugin `feature-intelligence`; the artifact is the Feature Workspace; the code knowledge is the Feature Atlas |
| D2 | Where workspaces live | `knowledge-base/features/<slug>/`, committed; source cache and profile git-ignored under `.feature-intelligence/` |
| D3 | Atlas format | Forked from qa-engineering's knowledge-base format, readable by both plugins, no dependency either way |
| D4 | MVP scope | Ticket creation (plan 4) is in the MVP |
| D5 | Pilot | The synthetic CSV customer importer (section 10.1) |
| D6 | ADO server | The official `@azure-devops/mcp`, pinned to qa-engineering's version, interactive sign-in through `ADO_ORG` |
| D7 | Release-note drafts | Three lengths (short, standard, full announcement), written with the release-note skills forked from release-notes-suite |
| D8 | Tasks per story | Derived from what the story touches; no estimates unless asked; the profile can override the disciplines |
| (feedback) | Department scopes | QA: scenarios mapped to tickets only. Design: flows, labels, messages, content. Sales: three drafts. |
| (feedback) | The artifact | A read-only reference with a questions and concerns board; no discussion threads |
| (feedback) | Dependencies | None on any other plugin; borrowed parts are forked and stamped |

### Left to run time

- The lens and mode for each workspace, and which sections appear.
- The tree's shape (Epic or Feature at the top) for each feature, proposed by Claude and decided by the user.
- The task disciplines for each story.

### Open

| Item | Needed by |
|---|---|
| The sandbox ADO project or area path for creation tests | Plan 4 |
| The exact tool names in the pinned ADO server version | Plan 1 (verify and record) |
| How board answers are triggered beyond the `concerns` command, such as a scheduled review | Phase 2 |

## 14. References

- The proposal: private artifact "Feature Intelligence", revision 3.
- `plugins/feature-explainer/`: the shell, drawing kit, lint and page checks this fork inherits.
- `plugins/qa-engineering/`: `skills/story-intelligence/` (read sequence, concern taxonomy, review brief),
  `knowledge/standards/knowledge-base.md`, `skills/kb-builder/`, `skills/ado-publish/references/publish-gates.md`,
  `knowledge/orchestration/house-profile.md`, `template/scripts/scan-backend.ts`.
- `plugins/release-notes-suite/`: `skills/releaser/` (SKILL and exemplars), `skills/harvester/`.
- `docs/superpowers/specs/2026-09-29-design-studio-design.md`: evidence labels and the decision register.
- ISO/IEC/IEEE 29148 (requirement quality), ISO/IEC 25010 (quality model), INVEST, ISTQB test design techniques.

