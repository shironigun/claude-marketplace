# Test-case field mapping — approved case → ADO Test Case

How an approved case from the `qa-context` `cases` slice maps onto a tracker Test Case's fields. Azure
DevOps is the implemented path (the plugin's ADO MCP); for another tracker the orchestrator supplies
the equivalent fields — the *shape* (title, steps, area/iteration, tags, assignee, link) is the same.

> Product-neutral: every name below (`Orders`, `widget`, `Plan Name`, `Suite Name`, `YOUR_ORG`) is a
> generic placeholder. The real title convention, tags, area/iteration, link kind and identity come
> from the house-profile slots, read at run time — never hard-coded. This mapping is **used in the
> dry-run (step 4) to show what will be written**; the write itself happens only after gate 2.

## The field map

| Case content (from `qa-context.cases`) | ADO Test Case field | Source slot / default |
|---|---|---|
| Title | `System.Title` | rendered per `caseAuthoring.titleConvention` (e.g. `<Module> - <Feature> - Verify that <behavior>`) |
| Action / Expected step pairs | `Microsoft.VSTS.TCM.Steps` (XML — below) | `caseAuthoring.stepFormat`; neutral default = Step/Expected pairs |
| Preconditions | first step of the Steps XML, or `System.Description` | neutral default |
| Tags | `System.Tags` (semicolon-separated) | `caseAuthoring.tags` + the case's own `tags[]` |
| Area path | `System.AreaPath` | `tracker.areaPath`; else the source story's area |
| Iteration path | `System.IterationPath` | `tracker.iterationPath`; else the source story's iteration |
| Assignee | `System.AssignedTo` | `identity.assignTo`; else left to tracker default (say so) |
| Story it traces (`tracesStory`) | a work-item link (below) | `tracker` link convention; default link = the case *tests* the story (`wit_work_items_link type: "tests"`, or `testplan_create_test_case testsWorkItemId`) |

## The `Microsoft.VSTS.TCM.Steps` XML shape

ADO's Test Case renders Action/Expected pairs as real, executable steps only when the `Steps` field
carries this exact XML. It does **not** accept plain text or Markdown.

```xml
<steps id="0" last="N">
  <step id="2" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;ACTION TEXT&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;EXPECTED RESULT&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <description/>
  </step>
  <step id="3" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;ACTION 2&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;P&gt;EXPECTED 2&lt;/P&gt;&lt;/DIV&gt;</parameterizedString>
    <description/>
  </step>
</steps>
```

Rules that matter:

- **Step ids start at 2** and increment by 1. The `<steps>` element's `last` attribute = the id of the
  final step (so N = number of steps + 1).
- **The inner HTML is entity-escaped.** The Action/Expected content is HTML (`<DIV><P>...</P></DIV>`)
  living inside a text node, so `<`/`>` become `&lt;`/`&gt;`. Escape the inner HTML when building the
  string.
- **First `parameterizedString` = Action, second = Expected Result.** The order is fixed.
- **`type="ActionStep"`** for normal steps.
- Put Preconditions as the first step ("Log in — Environment/Role — dashboard loads") or in
  `System.Description`.

### Build it safely (helper — illustrative, product-neutral)

```python
from xml.sax.saxutils import escape

def step(step_id, action, expected):
    a = escape(f"<DIV><P>{action}</P></DIV>")
    e = escape(f"<DIV><P>{expected}</P></DIV>")
    return (f'<step id="{step_id}" type="ActionStep">'
            f'<parameterizedString isformatted="true">{a}</parameterizedString>'
            f'<parameterizedString isformatted="true">{e}</parameterizedString>'
            f'<description/></step>')

def build_steps(pairs):            # pairs = [(action, expected), ...]
    body = "".join(step(i + 2, a, e) for i, (a, e) in enumerate(pairs))
    return f'<steps id="0" last="{len(pairs) + 1}">{body}</steps>'
```

## Create + link (the ops — all after gate 2 only)

The two create tools are **not interchangeable** — they take steps and links differently:

1. **Create** — choose the tool by what you need to carry:
   - **Raw `Microsoft.VSTS.TCM.Steps` XML (the shape above), `System.Tags`, or `System.AssignedTo` →
     `wit_create_work_item`** (`workItemType: "Test Case"`), with each of `System.Title`,
     `System.AreaPath`, `System.IterationPath`, `System.Tags`, `System.AssignedTo`,
     `Microsoft.VSTS.TCM.Steps` passed in `fields`. This is the only tool that accepts the raw Steps XML
     and arbitrary fields.
   - **`testplan_create_test_case`** takes `steps` only as a **pipe-delimited string**
     (`"1. action|expected\n2. action|expected"`), has **no** param for raw Steps XML, Tags or
     AssignedTo, but can set the case→story link at create via `testsWorkItemId`. Use it only when
     pipe-delimited steps suffice — never to carry the XML above.
2. **Add to suite** — `testplan_add_test_cases_to_suite` with the chosen plan + suite and the created
   ids. (This is the step the old filing skill left as a manual UI task; the shipped ADO MCP exposes
   it.)
3. **Link to story** — on `wit_work_items_link`, pass the friendly relation enum **`type: "tests"`**
   (the case *tests* the story), not a reference name. The token
   `Microsoft.VSTS.Common.TestedBy-Reverse` is what `testplan_create_test_case.testsWorkItemId` sets —
   so if the case was created with `testplan_create_test_case` + `testsWorkItemId`, the link is already
   in place and this step is a no-op.

## Fallbacks (stay honest, never drop a case)

- **Steps XML rejected** → create the work item with title + tags + area first, then put the full
  Action/Expected table into `System.Description` as an HTML `<table>`, and tell the QA native step
  rendering needs the Steps field.
- **The `tests` relation rejected** → fall back to `wit_work_items_link type: "related"` and tell the QA
  the link is "Related", not "Tested By".
- **A field the profile did not fill** (area, assignee) → leave it to the tracker default and **say
  so** in the summary; do not invent a value.

Every outcome above is reported from the **actual API response** — a create/add/link is claimed only
when the response proves it (honest-outcome rule).
