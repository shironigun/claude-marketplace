# Connectors

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool you connect in that
category. The skills are tool-agnostic — they describe the workflow in terms of a
category rather than a specific product, so the same skill works whether your team
tracks work in Azure DevOps, Jira, Linear, or anything else.

## Connectors for this plugin

| Category | Placeholder | Options |
| -------- | ----------- | ------- |
| Issue / work-item tracker | `~~tracker` | Azure DevOps, Jira, Linear, Asana, GitHub Issues, Monday, ClickUp |

Only two skills touch a tracker: **testcase-to-tracker** (creates Test Case work items)
and **api-failure-to-bug** (drafts a Bug you then file). **ui-test-cases** and
**api-test-cases** author human-readable cases only and need no connector.

Each tracker-writing skill ships a `references/` file that maps the house-style
step table / bug fields to the concrete field format of common trackers. Read it
for the tracker you actually use before creating work items.
