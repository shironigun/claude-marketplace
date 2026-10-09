# Rendering the House Step Table per Tracker

The house test case is a title + Preconditions + a numbered Action/Expected table + a blank Actual Result. How that lands in a tracker depends on the tracker. Use the section for the one in use. When in doubt, the generic fallback always works.

---

## Azure DevOps (native Test Case)

ADO has a first-class **Test Case** work item whose `Microsoft.VSTS.TCM.Steps` field renders the Action/Expected pairs as real, executable steps. This field does **not** accept plain text or Markdown — it expects a specific XML structure. Getting this right is what makes steps show up as proper test steps rather than a blob.

### Structure

```xml
<steps id="0" last="N">
  <step id="2" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;ACTION TEXT&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;EXPECTED RESULT TEXT&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <description/>
  </step>
  <step id="3" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;ACTION 2&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;EXPECTED 2&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <description/>
  </step>
</steps>
```

### Rules that matter

- **Step IDs start at 2** and increment by 1. The `<steps>` element's `last` attribute = the ID of the final step.
- **The inner HTML is escaped.** The action/expected content is HTML (`<DIV><P>...</P></DIV>`) living inside a text node, so angle brackets are entity-encoded (`&lt;`, `&gt;`). Escape the inner HTML when building the string.
- **First `parameterizedString` = Action**, second = **Expected Result**. Order is fixed.
- **`type="ActionStep"`** for normal steps.
- Put **preconditions** as the first step ("Log in with Environment/Role X | Dashboard loads") or in the work item description.

### Build it safely (helper)

```python
from xml.sax.saxutils import escape

def step(step_id, action, expected):
    a = escape(f"<DIV><P>{action}</P></DIV>")
    e = escape(f"<DIV><P>{expected}</P></DIV>")
    return (f'<step id="{step_id}" type="ActionStep">'
            f'<parameterizedString isformatted="true">{a}</parameterizedString>'
            f'<parameterizedString isformatted="true">{e}</parameterizedString>'
            f'<description/></step>')

def build_steps(pairs):  # pairs = [(action, expected), ...]
    steps = "".join(step(i + 2, a, e) for i, (a, e) in enumerate(pairs))
    return f'<steps id="0" last="{len(pairs) + 1}">{steps}</steps>'
```

Create the work item with `workItemType: "Test Case"`, set title, area path (matching the source ticket), assignee, tags, and `Microsoft.VSTS.TCM.Steps` = the XML above.

**Link to the source ticket:** use relation `Microsoft.VSTS.Common.TestedBy-Reverse` (the test case tests the ticket). If rejected, fall back to `System.LinkTypes.Related` and tell the user the link is "Related".

**If the Steps XML is rejected:** create the work item without Steps first (title + tags + area), then put the full step table into `System.Description` as an HTML `<table>` and tell the user native step rendering needs the Steps field.

**Test Suite/Plan membership** is often not exposed via the API — after creating, report the new IDs and tell the user to add them to the suite in the Test Plans UI (Add existing test cases by ID).

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
