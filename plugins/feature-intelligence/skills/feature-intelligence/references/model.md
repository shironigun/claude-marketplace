# The Feature Model

What a node, a link and a decision are, which evidence status to give a node, and how to write them through
`fi add`. Read this before writing anything to the model, and pass the relevant parts to every subagent that
writes nodes.

## Nodes

A node is one atomic, testable statement with a type, an evidence status and what it rests on.

| Family | Types |
|---|---|
| Business | `GOAL`, `PRB` problem, `ACT` actor or role, `SCOPE` (in or out), `BR` business requirement, `MET` success metric |
| Requirements | `FR`, `NFR`, `RULE`, `CON` constraint, `ASM` assumption, `DEP` dependency |
| Delivery | `EPIC`, `FEATURE`, `STORY`, `TASK`, `AC` acceptance criterion, `UC` use case |
| Behavior | `WF` workflow, `STEP`, `DP` decision point, `STATE`, `TRANS` transition |
| Experience | `SCR` screen, `MSG` message (label, error, validation, success, empty-state copy), `CNT` content block |
| Technical | `API`, `ENT` entity, `INT` integration, `MOD` code module, `FLAG` feature flag |
| Quality | `TS` test scenario |
| Governance | `Q` question, `FND` finding, `RISK`, `REC` recommendation, `TERM` glossary term; `EXC` excerpt |

Fields: `type`, `title` (short, as users would say it), `statement` (one sentence), `status`, and then
`provenance`, `derivedFrom`, `confidence`, `category`, `lenses` as the status needs. The engine sets `id`, `rev`
and `updated`; `ado` is set by the tickets flow (plan 4).

- `category`: an optional sub-kind. For `FND`: `ambiguity`, `conflict`, `duplicate`, `gap`, `terminology`,
  `permission`, `readiness`, `drift`. For `NFR`: the quality characteristic (`performance`, `security`,
  `usability`, `compatibility`, `reliability`, `maintainability`). For `TS`: the technique. For `TASK`: the
  discipline. For `RISK`: `regression` when it names a flow to re-check.
- `lenses`: hints for ordering (`product`, `development`, `qa`, `design`); never a filter of truth.

## Evidence statuses

| Status | Use when | Needs |
|---|---|---|
| `confirmed` | a source states it, or a named person decided it | `provenance`: at least one `{src, anchor, quote}` |
| `conflict` | sources disagree; every side is kept | `provenance` with at least two quotes |
| `inferred` | it follows from confirmed nodes | `derivedFrom` and `confidence`: `high`, `medium` or `low` |
| `assumed` | it fills a gap so work can continue, until someone confirms it | `derivedFrom`: the `Q` or `FND` it fills |
| `recommended` | your suggestion; never presented as a requirement | `derivedFrom` |
| `open` | an unanswered point | `provenance` (a source states the open point) or `derivedFrom` |

- A quote is at most 40 words, copied exactly from the chunk it cites.
- Never promote a convenient guess. If no source says it and nobody decided it, it is `assumed` or an `open` `Q`.
- An `assumed` or `recommended` node is always shown with its status beside it, in every answer and summary.

## Links

`{"from": "<id>", "type": "<link type>", "to": "<id>"}`

| Type | From → to | Meaning |
|---|---|---|
| `derives-from` | any → any | built from these nodes |
| `refines` | FR → BR, AC → FR, RULE → FR | a more specific form of |
| `implements` | STORY → FR | the story delivers the requirement |
| `part-of` | STEP → WF, AC → STORY, STORY → FEATURE, FEATURE → EPIC, TASK → STORY | containment and hierarchy |
| `next` | STEP → STEP, DP → STEP | order and branches in a flow |
| `governs` | RULE → STEP, RULE → SCR | a rule applies here |
| `shows` | SCR → MSG, SCR → CNT | words on a screen |
| `calls`, `reads`, `writes` | STEP → API, API → ENT | technical touchpoints |
| `realized-by` | FR, RULE → MOD | where the code lives |
| `covers` | TS → AC, FR, RULE | a scenario tests this; only `TS` nodes cover |
| `maps-to` | any → STORY, TASK | the ticket that carries this item |
| `depends-on` | any → DEP, STORY → STORY | ordering and external needs |
| `conflicts-with`, `duplicates` | any → any | findings between nodes |
| `blocks` | Q → any | the question holds this node up; only `Q` nodes block |
| `answers` | DL → Q | a decision settles a question |
| `defines` | TERM → any | terminology |

`blocks` links decide a question's blast radius: link a `Q` to every node whose truth depends on its answer.

## Decisions

A decision is a logged answer: `{"question", "answer", "decidedBy", "via"}`, where `via` is `"session"` or a
board flag id such as `"F-12"`. `decidedBy` is a role or the name the user gave ("Product owner"), never an
email address. The engine sets `id` (`DL-001`) and `decidedAt`. A node confirmed by a decision cites it:
`"provenance": [{"src": "DL-001", "anchor": "answer", "quote": "<words from the answer>"}]`.

## Writing through fi add

One JSON file with any of four lists: `decisions`, `nodes`, `links` and `removeLinks` (links to delete, same
shape as `links`). New nodes and decisions take temporary ids (`+r1`, `+d1`) that the engine replaces with real
ones; links, `derivedFrom` and provenance `src` may use either kind. This example answers an open question, adds
the rule the answer states, and an acceptance criterion inferred from it:

```json
{
  "decisions": [{"id": "+d1", "question": "Which date formats does the importer accept?", "answer": "ISO 8601 dates such as 2026-10-30, and day/month/year dates such as 30/10/2026.", "decidedBy": "Product owner", "via": "session"}],
  "nodes": [
    {"id": "+r1", "type": "RULE", "title": "Accepted date formats", "statement": "The importer accepts ISO 8601 dates and day/month/year dates.", "status": "confirmed", "provenance": [{"src": "+d1", "anchor": "answer", "quote": "ISO 8601 dates such as 2026-10-30, and day/month/year dates such as 30/10/2026."}]},
    {"id": "+ac1", "type": "AC", "title": "Month first is rejected", "statement": "A date written month first, such as 10/30/2026, is rejected with the row number.", "status": "inferred", "confidence": "medium", "derivedFrom": ["+r1"]}
  ],
  "links": [{"from": "+d1", "type": "answers", "to": "Q-001"}, {"from": "+ac1", "type": "refines", "to": "+r1"}]
}
```

- A node with a real id is a **patch**: only the fields you give change, `null` removes a field, and the type
  never changes. A patch replaces a whole field, so to add a quote to `provenance`, give the full list: the
  entries `fi trace` shows plus the new one. A patch that changes nothing makes no new revision.
- To retire a node, patch `supersededBy` to the node that replaces it. Nothing is ever deleted.
- The whole file is validated against the whole model and written all or nothing. On a refusal, the message
  lists every problem; fix them all and run it again.
- `fi add <slug> <file> --json` returns `ids` (temporary to real), `changed`, `linksAdded`, `linksRemoved` and
  `decisions`. Use the real ids from then on.
