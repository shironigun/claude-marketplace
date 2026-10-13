---
description: Asks for API test cases incl. negatives → author-api-cases
tags: [trigger, authoring]
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill]
---

Write API test cases for `POST /orders` — cover the happy path and the full negative matrix (missing auth, wrong
role, a missing required field, a nonexistent customer id, and a duplicate).
