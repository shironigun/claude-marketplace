# Requirement quality

Part of stage 5 (analyse). The analyst checks each requirement, rule, story and acceptance criterion on its own:
is it clear, single, testable and stated once? It works on the model through `fi query` and `fi trace`, never on
the raw sources, and writes what it finds through `fi add`.

## What to check, node by node

Run `fi query <slug> --type BR,FR,NFR,RULE,CON,STORY,AC,MSG --limit 500` and walk every line.

### Requirement characteristics (ISO/IEC/IEEE 29148)

| Characteristic | A defect looks like |
|---|---|
| Unambiguous | a word from the lexicon below; a pronoun with no clear subject; "and/or" |
| Singular | two requirements in one sentence ("rejected and logged and reported") |
| Verifiable | no observable outcome ("works correctly", "handles errors") |
| Complete | a bound without a unit or a limit without the behaviour at the limit |
| Necessary and appropriate | a design choice stated as a requirement with no reason in the sources |
| Feasible and correct | contradicts another node (that is a conflict: see the discovery playbook) |

### The ambiguity lexicon

A statement or its quote using any of these words without a measure is ambiguous:

- **Speed and size:** quick, quickly, fast, slow, large, small, big, many, few, several, some, most, high, low,
  real-time, instant, immediately, soon, timely, efficient, performant, scalable.
- **Quality words:** user-friendly, easy, simple, intuitive, seamless, clear, nice, modern, robust, flexible,
  reliable, secure (with no standard), appropriate, adequate, sufficient, reasonable, normal, typical, common,
  standard (with no named standard).
- **Open-ended lists and conditions:** etc., and so on, such as (as the whole definition), including but not
  limited to, as appropriate, as needed, as required, if possible, where applicable, if necessary, and/or.
- **Unbounded words:** all, any, every, always, never, none (check each: are they really unbounded?).
- **Placeholders:** TBD, TBC, to be confirmed, to be decided, later, ?.

### Stories (INVEST) and acceptance criteria

- **Format:** the statement follows the profile's `story.format` (default "As a <role>, I want <goal>, so that
  <benefit>"); the role is an `ACT` in the model.
- **Independent, Negotiable, Valuable, Estimable, Small, Testable:** name the letter that fails and why.
- **Acceptance criteria:** each is one testable condition in the profile's `story.acStyle` (default
  given-when-then); a story with none, or with only untestable ones, is a finding.

### Duplicates

Two nodes that state the same requirement, in the same or other words, of the same or different types (a `RULE`
and an `AC`, a `RULE` in the document and a `RULE` in a story). Search with `fi query <slug> --text <key words>`.

## What to write

For each defect, through one `fi add` file per analysis:

1. A `FND` node: `category` (`ambiguity`, `duplicate`, `readiness`), a statement that says exactly what is wrong
   with which words ("'quickly' gives no time or file size for an import"), `status: "inferred"`, `confidence`,
   and `derivedFrom` the node or nodes at fault.
2. For an ambiguity or a missing value: a `Q` node that asks the answerable question, with options where they
   exist ("How long may an import of 10,000 rows take: 1 minute, 2 minutes or 5 minutes?"), `status: "open"`,
   `derivedFrom` the finding, and a `blocks` link to every node whose meaning depends on the answer.
3. For a duplicate: a `duplicates` link between the two nodes, and a `REC` node (`status: "recommended"`) naming
   which wording to keep.

Example finding, in a `fi add` file:

```json
{"type": "FND", "title": "Import speed is undefined", "statement": "'Large files should import quickly' gives no time limit and no file size, so it cannot be tested.", "status": "inferred", "confidence": "high", "category": "ambiguity", "derivedFrom": ["NFR-001"]}
```

Do not rewrite the node at fault and do not mark anything `confirmed`: findings point at problems; decisions fix
them.
