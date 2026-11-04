---
description: Switch a feature workspace to a department's lens (all, product, development, qa or design) and derive what that lens needs.
argument-hint: <all|product|development|qa|design> [workspace slug]
---

Use the **feature-intelligence** skill to change the lens of a feature workspace.

The lens, and the workspace if named: $ARGUMENTS

Start with `fi status <slug> --json`. Look the lens up in the lenses playbook, run only the derivations it adds
that have not run yet, and end with the reviewed run summary led by that lens's sections. The sales lens comes in
phase 2: if it is asked for, say so and offer another lens.
