# Test scenarios

Part of stage 7 (derive), for section G and the QA lens. A test scenario is one line that names a situation to
test and the outcome to expect. The QA lens stops at scenarios mapped to requirements and, in plan 4, to
tickets: no test cases, no click-by-click steps, no scripts, no test plans.

## Pick the techniques

For each story or requirement group, choose the techniques that fit, using the test strategy in
`references/forks/qa-engineering/review-brief-format.md` to decide which test types apply and why:

| Technique (`category`) | Use it for | One scenario per |
|---|---|---|
| `equivalence` | inputs with classes of valid and invalid values | class |
| `boundary` | limits, sizes, counts, lengths, dates | value at, just under and just over each limit |
| `decision-table` | rules that combine conditions | combination that changes the outcome |
| `state-transition` | `STATE` and `TRANS` nodes | allowed transition, plus one illegal transition per state |
| `flow` | `WF` paths | path through the decision points, including each error branch |
| `permission` | each role and action in the permission matrix | role allowed, role denied |
| `error-guessing` | the concern taxonomy's failure modes | failure the sources leave open (as an assumed scenario) |
| `pairwise` | many independent options | pair of option values |

## Write each scenario

A `TS` node:

- `title`: the situation in a few words ("One row over the limit").
- `statement`: given, when, then, in one sentence: "Given a file with 10,001 rows, when the admin uploads it,
  then it is rejected and the message names the 10,000-row limit."
- `category`: the technique.
- `status`: `inferred` with `confidence` when it follows from confirmed nodes; `assumed` when it rests on an
  open question or an assumption (`derivedFrom` that `Q` or `ASM`). A scenario never makes a conflict look
  settled: for a `conflict` node, write one scenario per value, each `assumed` and `derivedFrom` the question.
- `derivedFrom`: the nodes it tests.

Give each scenario a temporary id (`"id": "+t1"`), and add a `covers` link in the same file from that id to each
`AC`, `FR` or `RULE` it tests.

```json
{"id": "+t1", "type": "TS", "title": "One row over the limit", "statement": "Given a file with 10,001 rows, when the admin uploads it, then it is rejected and the message names the 10,000-row limit.", "status": "inferred", "confidence": "high", "category": "boundary", "derivedFrom": ["RULE-001"]}
```

## Coverage of the requirements

When the scenarios are written, check that every `AC`, `FR` and `RULE` has at least one scenario covering it:
`fi query <slug> --type AC,FR,RULE --limit 500` lists the ids, and `fi trace <slug> <id>` on each one shows its
incoming `covers` links (`fi query` does not). A node that cannot be covered (it is ambiguous or blocked) is listed with the question that blocks it;
that is the QA lens's open list.

Tickets come later: plan 4's tickets flow adds `maps-to` links from scenarios to the stories and tasks that
carry them.
