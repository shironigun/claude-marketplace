---
description: The same FRD in Markdown, Word and PDF reaches the same coverage
tags: [pipeline]
max_turns: 200
timeout_seconds: 5400
allowed_tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, Agent]
---

Use feature-intelligence on the CSV importer example that ships inside this plugin's skill folder, in examples/csv-importer. Make three workspaces, csv-md, csv-docx and csv-pdf, each from one copy of the same FRD only: frd.md, frd.docx and frd.pdf. Take each through extraction, consolidation and coverage; no analysis is needed. Do not ask me anything. Finish with a table of the three coverage figures as fi coverage reports them, and the chunks left unaccounted in each.
