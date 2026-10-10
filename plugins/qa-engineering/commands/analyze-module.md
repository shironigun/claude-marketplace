---
description: Understand existing code to test it — reads the module and raises what to test (and what code can't confirm). Read-only.
argument-hint: <module path or name>
---

Route this through the **qa-engineering orchestrator**, which reads the house-profile + `qa-context` and
keeps the gates.

**Intent:** analyze a module from its code, to test it (codebase → QA). **Module:** $ARGUMENTS

Hand it to `code-intelligence` (read-only): read the module (reuse a confirmed `flow-map.json` if one
exists), produce the understanding + gaps + QA review with every claim labeled Confirmed / Inferred /
Assumption / Gap-or-Question — surfacing especially **what the code can't confirm** (intended rules,
expected errors) rather than inventing it — write/extend the `module` + `review` slices of `qa-context`, and
**stop at the gaps gate**. Do not author cases and do not write to code or the tracker. Then tell me, in plain
language, what you found and that `/make-cases` is next once the gaps are settled.
