# Mods (phase 5)

The user chooses how the film looks and moves, in one form (spec 5.8). The mods come before the story, because
the format and the pacing decide how long the story can be.

## 1. Read what the form needs

Run `sp mods <slug> --film <film> --json`. It gives:

- `preselected`: an option for every mod. Each is the catalog's default, then the format's own (calm pacing and
  numbered steps for a how-to, brisk pacing for a teaser and a trailer), the status chip the release status calls
  for, and every brand;
- `current`: the saved mods, when the film has them. Start from these instead;
- `catalog`: every option with its `label` and a one-line `preview`. An option marked `r2` arrives in release 2:
  show it, but it cannot be chosen;
- `screens`: the subject's screens, with the kinds of their actions;
- `release`: the subject's release status.

When `release` is null, ask the user which it is (`released`, `new`, `beta` or `unreleased`, as
`skills/app-map/references/context.md` defines them) and record it: `sp state <slug> --decision "Release: <value>"`.
It is a decision of the subject, so record it without `--film`: every film of the subject reads it there.

## 2. Propose a pattern for each screen

From each screen's title and actions, propose the walkthrough patterns that fit it; `catalog.patterns` says what
each `fits`. A tab strip gets a tab tour; a dialog or a drawer, a dialog step-through; a form, focused typing; a
table, a column sweep; a dashboard, a section tour; a list that grows, row pop-in; a number an action changes,
before and after counters; a history, a timeline build. An action on one screen that shows up on another is a
hand-off. A screen can have no pattern or several.

## 3. Show the form

One form with every mod preselected, so one answer can accept it all:

- In a host with an inline visualizer, draw it there: each mod with its options side by side, each option's
  preview under it, the preselected one marked, and release-2 options greyed out.
- Otherwise ask through `AskUserQuestion`, a few mods per question: each option with its preview, the preselected
  one first and marked "(preselected)".

The format is the film's. When the user wants another, start a film in that format (`sp film <slug> <format>`) and
go on with it. The end card's chip cannot be "None" for unreleased work.

## 4. Save

Write the mods to `<inbox>/<slug>.<film>.mods.json` with the Write tool, in the shape of
`<plugin root>/engine/schemas/mods.schema.json` (an example: `<plugin root>/engine/fixtures/valid/mods.json`).
Then run `sp save mods <inbox>/<slug>.<film>.mods.json --subject <slug> --film <film>`.

- Exit 0: saved. A new save asks for gate 2 again.
- Exit 1: the output lists each problem. Settle each with the user and save again.
- Exit 2: the command was used wrongly. Read the message and fix the call.
