---
description: Pasted acceptance criteria, asks for UI test cases → author-ui-cases
tags: [trigger, authoring]
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Write UI test cases for these acceptance criteria:

1. A dispatcher can open the Deals list from the left navigation.
2. Clicking "New Deal" opens a blank deal form.
3. Saving a deal with no customer shows "Customer is required" and does not save the deal.
