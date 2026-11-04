# Lenses and sections

A lens is a department's way into the same model: product, development, QA or design. The lens never limits what
is understood; it sets which derivations run first, how deep each section goes, and what the run summary leads
with. Several lenses deepen several sections of the same workspace.

## Sections

`fi query <slug> --section <letter>` lists the nodes a section is built from. A few types belong to two sections
(a dependency is a requirement and a risk); the page in plan 3 shows each node once and links to it from the other.

| Section | Built from | Present when |
|---|---|---|
| A Executive overview | GOAL, PRB, SCOPE, ACT, MET | always |
| B Requirements | BR, FR, NFR, RULE, CON, ASM, DEP | always |
| C Story analysis | EPIC, FEATURE, STORY, AC | stories are among the sources |
| D Journeys and flows | WF, STEP, DP, STATE, TRANS, UC | any behaviour found |
| E Design content | SCR, MSG, CNT | screens or messages found, or the design lens is on |
| F Technical | API, ENT, INT, MOD, FLAG | technical content found, or a repository is a source |
| G QA scenarios | TS | testable requirements exist |
| H Dependencies, risks and assumptions | DEP, RISK, ASM | always |
| I Questions and concerns | Q, FND, and board flags (plan 3) | always |
| J Recommendations | REC | any recommendation exists |
| K Ticket tree | EPIC, FEATURE, STORY, TASK with ticket ids | mode is `new` (plan 4 creates the tickets) |

## Lenses

| Lens | Leads with | Deep by default | Derives on its first run | Leaves out |
|---|---|---|---|---|
| `all` (default) | A | A, B, D, I | flows, scenarios | nothing; technical detail stays brief |
| `product` | A | A, B, C, I, K | discovery, story map, readiness | code, scenario detail |
| `development` | F | F, B, D, H, K | flows, and section F nodes that an `fi-extractor` takes from a repository source as claims (technical impact comes in a later release) | release-note drafts |
| `qa` | G | G, B, D | scenarios by technique | test cases, scripts, automation |
| `design` | D | D, E | flows, design content | APIs, storage, code, scenarios |

The sales lens and its release-note drafts come in phase 2.

## Running a lens

1. The analysis (quality and discovery) runs for every lens: it is what every department reads in section I.
2. Then the derivations the lens needs, in the order of the table, each by an `fi-analyst` (`flows`,
   `design-content`) or the `fi-scenario-designer` (`scenarios`). Independent derivations go out in parallel.
3. A derivation that already ran is not repeated; switching lens later runs only what the new lens adds.
4. The lens is recorded for the session; the workspace's default lens comes from the profile's `lenses.default`.

## The run summary

Until the reference page arrives (plan 3), a run ends with a summary in the session, written from `fi status`,
`fi coverage`, `fi query` and `fi questions` output and checked by the reviewer first. In this order:

1. **Sources and coverage**: each source with its chunk count, and the coverage figure; every unaccounted chunk
   and every set-aside with its reason.
2. **What the model holds**: node counts by section and by status.
3. **The lens's lead sections**: their nodes, one line each, with the id and the status.
4. **Findings**: every `FND` by category, each with its id, one line, and the quote or quotes that show it
   (from `fi trace`).
5. **Questions**: the top five from `fi questions`, each with options and a recommended answer, then how many
   others are waiting for the board.
6. **Next**: what the lens would derive next, or the command that does it.

Every `assumed` node is written with `[assumed]` and every `recommended` node with `[recommended]` beside it,
wherever it appears; a conflict shows both values with their sources. Nothing appears in the summary that is not
in the model.
