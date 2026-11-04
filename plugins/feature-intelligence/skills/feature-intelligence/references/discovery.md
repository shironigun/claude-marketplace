# Discovery: gaps, conflicts and permissions

Part of stage 5 (analyse). Where the quality playbook judges nodes one at a time, discovery looks across the
model for what is missing or does not fit together. It uses `fi query`, `fi trace` and `fi questions`, never the
raw sources, and writes through `fi add`.

## 1. Walk the concern taxonomy

Go through every category in `references/forks/qa-engineering/concern-taxonomy.md` for this feature: ambiguities,
missing requirements and error handling, permissions, integration, regression, mobile, edge cases, data and
state, backward compatibility, and new risks. Each category ends as findings and questions, or as one line
saying why it does not apply.

## 2. Conflicts across node types

Consolidation only compares claims of one type. Compare across types yourself:

- every `AC` and `RULE` with the `FR` or `RULE` it refines or shares words with;
- every story's statement and acceptance criteria with the document's rules;
- values that must agree: numbers and units, limits, roles, outcomes (rejected, skipped, updated), formats,
  durations, names of screens and messages.

Two nodes that cannot both be true are a conflict: add a `FND` node (`category: "conflict"`), a `conflicts-with`
link between them, and a `Q` that asks which one holds, with both values as options and `blocks` links to both.

## 3. Missing behaviour

For every input, step and outcome in the model, ask what the sources say happens when it goes wrong. A
behaviour with no node is a gap.

| Look at | Ask |
|---|---|
| Each input (file, form, field, parameter) | Invalid format or encoding? Too large, empty, extra or missing fields? Duplicate? |
| Each long or multi-step operation | Failure halfway: what is kept, what is rolled back, what the user sees? Interrupted connection? Retry? Cancel? |
| Each outcome the user sees | Is there a message for success, partial success, nothing done (zero results) and failure? |
| Each limit | What happens at, just under and just over it? |
| Each external call or integration | Slow, down, or returning an error? |
| Each state | Which transitions are allowed; what happens on an illegal one? |

For each gap: a `FND` node (`category: "gap"`) that names the missing behaviour, and a `Q` that asks for it,
with `blocks` links to the nodes that cannot be complete without the answer.

## 4. Roles and permissions

Build the matrix of every `ACT` against every action in the model (`FR`, `STORY`, `STEP`):

- an actor who appears in a source doing something no rule allows or denies is a gap;
- two sources that grant an action to different roles is a conflict;
- an action with no stated role is a gap.

Write a `FND` node (`category: "permission"`) and a `Q` for each.

## 5. Terminology

Two words used for one thing ("customer" and "contact"), or one word used for two things, confuse every reader.
Search `fi query <slug> --text <word>` for each `TERM` and each domain noun in the profile. For each clash: a
`FND` node (`category: "terminology"`) and a `Q` asking which word is the right one.

## 6. Stories, dependencies and readiness

- **Story map:** order the `STORY` nodes along the workflow; an `FR` that no story implements, or a story that
  implements nothing, is a gap.
- **Dependencies:** a `DEP` node for every outside need the sources state (another team, a service, a data
  migration), with `depends-on` links.
- **Risks:** a `RISK` node for each risk the taxonomy surfaced, most serious first; `category: "regression"` for an
  existing flow to re-check.
- **Readiness:** for each story, the verdict from `references/forks/qa-engineering/review-brief-format.md`
  (`testable`, `testable-with-assumptions`, `blocked`); a story that is not `testable` gets a `FND` node
  (`category: "readiness"`) listing the questions that block it.

## Writing it

Use one `fi add` file per section, so a refusal points at one area. Every `FND` is `status: "inferred"` with a
`confidence` and `derivedFrom` the nodes it is about; every `Q` is `status: "open"` with `derivedFrom` the finding
and `blocks` links. Never resolve a question yourself: a likely answer becomes an `ASM` node (`status:
"assumed"`, `derivedFrom` the question) only if the user asks to proceed on assumptions.

Finish with `fi validate <slug>` and `fi questions <slug>`.
