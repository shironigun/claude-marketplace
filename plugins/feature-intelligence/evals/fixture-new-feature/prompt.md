---
description: The whole pipeline on the CSV importer fixture finds the planted faults, accounts for coverage and keeps evidence honest
tags: [pipeline]
max_turns: 250
timeout_seconds: 5400
allowed_tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, Agent]
---

Run a full feature-intelligence analysis of the CSV importer example that ships inside this plugin's skill folder, in examples/csv-importer: the FRD (frd.md), the meeting notes (notes.md) and the six stories in the stories folder (they are Azure DevOps work items already saved as JSON). Treat it as a new feature, use the QA lens, and call the workspace csv-customer-import.

I am not available to answer questions: do not ask me anything. List the questions you would have asked, with your recommended answers, and proceed on those as assumptions. End with the run summary.
