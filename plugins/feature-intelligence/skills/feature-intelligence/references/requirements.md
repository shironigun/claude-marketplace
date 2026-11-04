# Consolidate, account and structure

Stages 3 and 4 of the pipeline: claims become model nodes with stable ids, coverage proves nothing was dropped,
and the links that make the model traceable are added. Read `references/model.md` first.

## 1. Consolidate the claims

Run `fi consolidate <slug> --propose`. It groups pending claims of the same type into clusters (`K-001`, ...)
and prints only the clusters that need a decision, each with its claims' statements and anchors. The rest are
applied by default: `new` (one claim, a new node), `same` (it restates node X: the quote is added to X) and
`merge` (the same statement more than once).

Decide each cluster that needs it:

| Suggestion | Decide `merge` or `existing` when | Decide otherwise when |
|---|---|---|
| `merge?` | the claims say the same thing in other words | they are different facts that only look alike ("email is required" and "name is required"): `separate` |
| `conflict?` | they cannot both be true (different numbers, must and may, skipped and updated): `conflict` | they apply to different cases: `separate`; or one restates the existing node: `existing` |
| `update?` | the claim is the same fact as the named node, newly worded: `existing` | it is a different fact: `separate` |

- `drop` is only for a claim that is not a fact about this feature, with a `reason`. Its chunk then needs a
  set-aside with the same reason.
- Give a `statement` (and a `title` if useful) when the default wording is not the best plain sentence. For a
  conflict, name every value and where it comes from: "An import file may contain at most 10,000 rows (FRD) or
  5,000 rows (story 2104)."
- `separate` on a cluster of several claims makes one node per claim, so it takes no `title` or `statement`.
- `type` changes the node type when the extractor chose wrongly.

Write the decisions to the inbox and apply them:

```json
{"K-002": {"action": "conflict", "statement": "An import file may contain at most 10,000 rows (FRD) or 5,000 rows (story 2104)."},
 "K-004": {"action": "separate"}}
```

`fi consolidate <slug> --apply <file> --json` returns `created`, `updated`, `dropped` and `clusterCount`. If
claims were added after the proposal, it refuses: run `--propose` again.

## 2. Turn every conflict into a question

A conflict is a question someone must answer. A `conflict` decision on a cluster that already has a node updates
that node, so it shows in `updated`, not `created`: find the conflict nodes with `fi query <slug> --status conflict`.
For each node that became `conflict`, add through `fi add` a
`Q` node that asks it plainly, with the options ("Which row limit applies: 10,000 rows (FRD) or 5,000 rows
(story 2104)?"), `status: "open"`, `derivedFrom` the conflict node, and a `blocks` link to the conflict node.
Section 4 adds `blocks` links to what rests on it.

## 3. Account for every chunk

Run `fi coverage <slug> --json`. Every chunk must end up cited by a node or set aside with a reason.

1. **Unaccounted chunks go back to an extractor once.** Give one `fi-extractor` the list, with the note: "these
   chunks were not cited; extract every fact they state, or say there is nothing to model". Consolidate its
   claims as in section 1.
2. **Set aside what carries nothing**: greetings, sign-offs, a table of contents, a heading with no text, a
   chunk that only repeats a quoted fact word for word. Group chunks by reason:
   `fi set-aside <slug> <chunk ids...> --reason "greeting and sign-off, no requirement content"`.
   Never set aside a chunk that states something about the feature, whatever the coverage figure.
3. **Report the rest.** Chunks of an unreadable source, and chunks no one could read, are listed for the user.

The target is at least 95%: `fi coverage <slug> --min 0.95` exits 1 below it. Below the target after one
retry, tell the user which chunks remain and why, rather than setting aside to reach the number.

## 4. Add the structure

Consolidation makes nodes, not the links between them. Use `fi query <slug> --type <types>` and `fi trace` to
see what exists, then add the links in one `fi add` file (`links` only):

| Link | Add it when |
|---|---|
| `AC part-of STORY` | the acceptance criterion comes from that story's work item (its anchor is `AC-n` in the same source) |
| `STORY implements FR` (or `RULE`) | the story delivers that requirement |
| `RULE refines FR`, `FR refines BR`, `AC refines FR` | it is a more specific form of the other |
| `STORY part-of FEATURE`, `FEATURE part-of EPIC` | the sources state the hierarchy (a parent link in Azure DevOps) |
| `depends-on` | the sources state an order or an outside need |
| `blocks` (from a `Q`) | the node's truth depends on the question's answer: a conflict node and everything resting on it |
| `defines` (from a `TERM`) | the term names the thing the node is about |

Add a `TERM` node for each domain word the sources define or use as a name ("customer", "error report"), with
the quote that uses it. Two words used for one thing are not merged here: the analyst reports them.

Finish with `fi validate <slug>`: it must report no problems before analysis starts.

Next: analysis, in the quality and discovery playbooks.
