# Context (phase 4)

You write the subject's brief yourself, from the analysis and what the repository says about the subject (spec
5.6). Read, when they exist:

- documents in the repository about the subject (a README, a docs folder, decision records): search for its name
  and its routes;
- its git history: `git log --oneline -20 -- <its files>`, the branch it is on, and the tags that hold it
  (`git tag --contains <commit>`), which give its release status;
- tracker items, only through a tracker server the user already has connected, and only after the user agrees.

Write `<inbox>/<slug>.brief.md` with the Write tool, in exactly this shape; the engine refuses any other:

```markdown
# <subject name>

## Purpose
What the subject is for, in one or two sentences.

## Users
Who uses it.

## Payoff
The moment it pays off for them: what a film builds up to.

## Release status
Released, on a branch, or behind a flag, from the history and the tags.

## Must not show
- Each does-not, never-populated and hidden entry of the ledger, by id.
- The names in the repository's seed and fixture data (people, companies, e-mail addresses), each as a code span,
  such as `Jane Doe` or `Acme Supplies`: no story, demo data or screen may contain one (spec 13.3). Code spans in
  this section are for those names only: write ids and labels as plain text.
```

Then save it: `sp save brief <inbox>/<slug>.brief.md --subject <slug>`.

Last, record the release status as one value, which preselects a film's status chip (spec 9):
`sp state <slug> --decision "Release: <value>"`, where the value is

- `released`: in a release its users have had for a while;
- `new`: in the latest release, or in the one going out now;
- `beta`: behind a flag, or out to some users only;
- `unreleased`: on a branch, or in no release yet.

When the history and the tags do not settle it, ask the user. A changed answer replaces the one recorded before.
