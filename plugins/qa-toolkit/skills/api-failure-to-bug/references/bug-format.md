# Rendered Bug Anatomy and Field Mapping

The draft has a fixed logical shape: `title`, `severity`, `preconditions` (always empty), `reproSteps[]`, `expected`, `observations[]`, `suggestedFix`. How those land in a tracker depends on the tracker. Render the review preview to match the target so "review == the real thing".

## Common repro-body layout

Whatever the tracker, the repro body reads env-first steps, then the observation block:

```
Steps:
- <repro step 1 (environment-first)>
- <repro step 2>
- ...

OBSERVATION:
- <observation 1>
- <observation 2>

[Attach screenshot/GIF here]
```

`expected` becomes an acceptance line: **I know this bug is resolved when:** `<expected>`.
`suggestedFix` (if any) and the "how this was found" provenance go in a system-info / comment area.

---

## Azure DevOps ($Bug)

Field order that reviewers expect:

1. `System.Title` = title
2. `Microsoft.VSTS.TCM.ReproSteps` = repro HTML — env-first steps as `<ul><li>...</li></ul>`, then `<div><b>OBSERVATION:</b></div><ul><li>...</li></ul>` (one `<li>` per observation), then `<div><i>[Attach screenshot/GIF here]</i></div>`. (`preconditions` is empty, so no preconditions line.)
3. `Microsoft.VSTS.Common.Severity` = one of the exact strings below
4. `System.AreaPath` = the configured bug area path
5. `Microsoft.VSTS.Common.Priority` = a number (commonly `2`)
6. `Microsoft.VSTS.Common.ValueArea` = `Business`
7. *(optional)* `Microsoft.VSTS.Common.AcceptanceCriteria` = `I know this bug is resolved when:` + `<ul><li>expected</li></ul>`
8. *(optional)* `Microsoft.VSTS.TCM.SystemInfo` = `Suggested fix:` (if any) + a **"How this bug was found"** block: from a failed API test, the test/case name, the source test-case id if known, the triage verdict + confidence + reason, and the exact failing assertion message.

Severity string mapping is exact:
`Critical -> "1 - Critical"`, `High -> "2 - High"`, `Medium -> "3 - Medium"`, `Low -> "4 - Low"`.

Any custom required fields (e.g. a QA owner, a "found with" picklist) are org-specific — ask the user for their required-field values rather than guessing; picklists reject arbitrary values.

Link the bug **Related** to the source test case if its id is known.

---

## Jira

- `summary` = title
- `description` (wiki markup or ADF) = the common repro-body layout above: a "Steps" bulleted list, an "OBSERVATION" bulleted list, then the attach line. Put "I know this bug is resolved when: <expected>" as its own line or in the Acceptance Criteria field if the project has one.
- `priority` / a severity custom field = map Critical/High/Medium/Low to the project's scheme (many Jira projects use Priority: Highest/High/Medium/Low — confirm with the user).
- `issuetype` = Bug
- Suggested fix + provenance (test name, triage verdict/confidence/reason, failing assertion) go in the description footer or a comment.
- Link to the source test issue with "relates to" (or "is caused by" if modelled).

---

## Generic tracker

- Title = title.
- Description = the common repro-body layout (Steps list, OBSERVATION list, attach line) + "Resolved when: <expected>" + a provenance footer.
- Severity/priority = closest available field; state the mapping used.
- Link to the source case with whatever relation exists.

This always works — prefer a tracker's native fields where they exist, fall back to putting everything in the description on any error, and tell the user what was used.
