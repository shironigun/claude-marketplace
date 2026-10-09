# release-notes-suite

A two-stage pipeline for turning what engineering shipped into client-facing release notes for **Acme CRM / Acme Notify** (Acme).

```
harvester  ->  releaser  ->  Acme Notify note + Acme CRM note
(gather all)   (suppress + write)     (brand variants)
```

## Skills

- **harvester** — builds the *complete* engineering release inventory for a date window or an initiative (e.g. "DMS-A Two-Way Sync"). Pulls User Stories, Bugs and Defects across **both** the CRM Team and SWAT boards, plus the git layer (merged PRs / commits / deployments), and deliberately catches work that shipped with **no linked ticket**. Output is the internal, exhaustive, grouped inventory — the raw material for notes. This is the opposite discipline to `releaser`: completeness, not curation.
- **releaser** — turns an inventory or a technical draft into the short, benefit-led client note in the support lead / support-team house style, deciding what to announce vs. suppress. Emits **Acme Notify** (DMS-A-facing brand) and **Acme CRM** variants from one run; branding is a profile, not a separate skill.

## Install note

If you already have the standalone `releaser` skill installed, remove it after installing this suite so you don't run two copies. The suite's `releaser` is the maintained version (adds brand variants).
