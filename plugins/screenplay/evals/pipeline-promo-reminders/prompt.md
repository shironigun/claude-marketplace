---
description: The whole workflow on example-desk, from the brand profile to the built promo, matches the expected analysis and story
tags: [pipeline]
max_turns: 300
timeout_seconds: 7200
allowed_tools: [Read, Write, Edit, Glob, Grep, Bash, Skill, Agent]
---

Copy the example app that ships inside the screenplay plugin, examples/example-desk, to a new folder outside any git
repository, make that copy a git repository of its own with one commit, and work from the copy. Then make a promo
video of its Reminders feature, through to the built films.

I am not available to answer questions: do not ask me anything. Confirm the brand profile, pass gate 1, accept the
preselected mods and approve the storyboard on my behalf, and list each decision you made for me. Do not create any
Motion film: stop once `sp build` has built the promo.

End with a summary: the brands and the rule that picks one, the truth ledger's entries for the feature with their
kinds, the storyboard's scenes with each caption and the ledger entry it rests on, and what `sp build` built.
