# Design content

Part of stage 7 (derive), for section E and the design lens. Design content is the words a user meets: screens,
labels, validation and error messages, success and empty-state messages, and help text. The design lens stops
there: no layouts, components or accessibility audits.

## Screens

From the flows (`fi query <slug> --type WF,STEP,SCR --limit 500`), list every screen or dialog the actor passes
through. A screen the sources name or show is already a `SCR` node; one the flow needs but no source names is
`inferred` from the steps that happen on it. Link each step that happens on a screen with `derivedFrom`, and
each `RULE` that applies to it with `governs`.

## Messages and content

For every screen, list what it must say, and link each screen to the `MSG` and `CNT` nodes it shows (`SCR` `shows` `MSG`):

| Kind | Where it comes from |
|---|---|
| Labels and field names | the fields in the rules and the field tables |
| Validation messages | one for each field rule (required, format, length, range) |
| Error messages | one for each way the step can fail: rejected input, a failure, a timeout, a lost connection |
| Outcome messages | one for each outcome: everything worked, part of it worked, nothing to do (zero results), it failed |
| Empty states | a list or report with nothing in it yet |
| Confirmations | before an action that cannot be undone |

- **Exact words the sources give** (a quoted message, a screenshot) are `confirmed` `MSG` nodes with the quote.
  Never reword them.
- **An outcome with no message in any source is a gap.** Add a `FND` (`category: "gap"`) and a `Q` that asks
  for the wording, linked by `blocks` to the screen. Do not write the copy yourself.
- **Draft copy only when the user asks for it**: then each draft is a `MSG` with `status: "recommended"`,
  `derivedFrom` the gap it fills, written to the rules below, and it is always shown as a recommendation.

## Writing rules for drafted copy

- Say what happened, then what the user can do next, in plain words ("70 rows could not be imported. Download the
  error report to see why.").
- Use the product's own nouns (the profile's `product.domainNouns`) and the same word for the same thing
  everywhere.
- Give the numbers the user needs (how many rows, which limit) and name the limit in a rejection.
- No blame, no jargon, no error codes on their own, no exclamation marks.

Example gap message, drafted at the user's request:

```json
{"type": "MSG", "title": "No valid rows", "statement": "None of the 1,250 rows could be imported. Download the error report to see why, fix the file and import it again.", "status": "recommended", "derivedFrom": ["Q-004"]}
```

## Check the result

- Every outcome in the flows has a message node or an open question.
- Every `MSG` is shown on at least one `SCR`.
- Two messages that say the same thing in different words are a duplicate finding.
