# Journeys and flows

Part of stage 7 (derive), for section D. A flow shows the order in which an actor does things, where it
branches, and what state the data is in. Flows are derived from the requirements, rules, stories and acceptance
criteria already in the model; they are the backbone the scenarios walk.

## Build each workflow

Start from `fi query <slug> --type ACT,UC,STORY,FR,RULE,AC --limit 500`. For each goal an actor reaches (a use
case, or a group of stories along one journey):

1. **A `WF` node**: the journey in one sentence ("An admin imports customers from a CSV file"), `derivedFrom` the
   stories or use case it comes from.
2. **`STEP` nodes in order**: one per thing the actor does or the system does in reply ("The admin chooses a
   file", "The importer checks the file size"), each `part-of` the workflow, linked by `next`.
3. **`DP` nodes** where the path splits ("Is every row valid?"), with a `next` link to the first step of each
   branch. Every rule that can reject or redirect is a decision point.
4. **Error and cancel branches**: for each decision point, the path when the check fails. When the sources
   describe it, model it; when they do not, the gap belongs to discovery: add a `blocks` link from the `Q` that
   asks about it (or add one) to the step instead of inventing the branch.
5. **`governs` links** from each `RULE` to the steps it applies to, and **`calls`/`reads`/`writes`** links to `API`
   and `ENT` nodes when the model has them.

## States

For the main thing the flow changes (an import, an order, a customer record):

- a `STATE` node for each status it can have ("uploaded", "validated", "importing", "finished", "failed");
- a `TRANS` node for each allowed change, with the event that causes it ("the admin confirms the preview"), and
  `derivedFrom` the steps or rules that imply it;
- a transition the sources never mention but the flow needs (what happens to a half-finished import) is a gap:
  ask, do not assume.

## Statuses

Steps, decision points, states and transitions are `inferred` with `confidence` and `derivedFrom` the nodes they
come from, unless the sources state the flow outright (then they arrived as confirmed claims and you only add
links). A step that exists only because of an assumption is `assumed`, `derivedFrom` the question it fills.

Example step:

```json
{"type": "STEP", "title": "Check the file size", "statement": "The importer rejects a file over the size limit before uploading it.", "status": "inferred", "confidence": "high", "derivedFrom": ["RULE-002"]}
```

## Check the result

- Every `STEP` is `part-of` exactly one `WF`, and every workflow has a first step (no incoming `next`).
- Every `DP` has at least two outgoing `next` links, or a `Q` that blocks it.
- `fi validate <slug>` reports no problems; `fi trace <slug> <WF id> --depth 3` reads as the journey.
