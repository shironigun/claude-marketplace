---
description: Derive or refresh one-line test scenarios for a feature workspace's stories, by test design technique, each linked to the requirements it covers.
argument-hint: [story ids] [workspace slug]
---

Use the **feature-intelligence** skill to derive test scenarios.

The stories in scope (all stories if none are named), and the workspace if named: $ARGUMENTS

Start with `fi status <slug> --json`. Dispatch the `fi-scenario-designer` subagent with the scope, as the
scenarios playbook describes, then report the scenarios per story and technique and every requirement left
uncovered with the question that blocks it. Scenarios only: no test cases, steps or scripts.
