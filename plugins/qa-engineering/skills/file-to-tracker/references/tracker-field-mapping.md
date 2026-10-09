# Rendering the House Step Table per Tracker — non-ADO

The house test case is a title + Preconditions + a numbered Action/Expected table + a blank Actual Result. How that lands in a tracker depends on the tracker. Use the section for the one in use. When in doubt, the generic fallback always works.

> **Azure DevOps lives elsewhere.** The ADO Test Case field mapping — the `Microsoft.VSTS.TCM.Steps` XML
> shape, the create/add-to-suite/link ops, and the correct link relation — is owned by `ado-publish`:
> `skills/ado-publish/references/test-case-field-mapping.md`. This reference covers only the trackers
> `ado-publish` does not implement.

---

## Jira

Jira has no native step grid on the base issue; teams use an add-on:

- **Xray** — Test issue type with a "Steps" section. Via the Xray REST API, add steps as objects with `action`, `data`, and `result` fields. Map the house Action -> `action`, Expected -> `result`, leave `data` empty (or move Preconditions there).
- **Zephyr Scale/Squad** — similar test-step API with `description`/`expectedResult` per step.
- **No add-on** — create a Test (or Task) issue and put the step table in the description using Jira wiki markup or ADF: a table with `|| # || Action || Expected Result ||` header and one row per step, Preconditions as a line above it, and a blank "Actual Result:" line below.

Link to the source ticket with the "Tests"/"is tested by" issue-link type if present; otherwise "Relates to".

---

## Generic fallback (any tracker)

Create an issue of the closest available type. Put the whole case in the description:

```
Preconditions: <...>

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | ... | ... |
...

Actual Result:
```

Render as a Markdown or HTML table depending on what the tracker accepts. Carry over labels, link to the source ticket with whatever relation exists, and report the new ID. This is always safe — prefer a native step field when the tracker has one, fall back to this on any error.
