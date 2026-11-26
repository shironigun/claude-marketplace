# Gate 1: dossier check

The user checks the analysis on one screen and makes the decision a film needs (spec 5.7). app-map ends here.

## 1. Make it ready

Run `sp dossier <slug> --json`. When `ready` is false:

- `missing` names a file a step has not made yet: run that step (`sp status <slug> --json` names it);
- `problems` lists what is still wrong. A call id that `api-calls.json` does not list goes back to the screen
  scout. A citation that no longer holds, because the code moved after the save, goes back to the subagent that
  wrote it. Save the fixed result and run the dossier again.

## 2. Show it

One screen, in this order:

- the subject in two sentences (`purpose`);
- its screens (`screens`), each with its feature in a module;
- the must-not-show list (`mustNotShow`), and each `open` entry with where it stops;
- the brands found (`brand`): their ids and whether the profile is confirmed, or that there is no profile yet;
- the names no film may show (`names`), from the brief's must-not-show list.

## 3. Decide

Then the one decision, with its recommended answer: **Name**, the subject's display name when the UI's differs from
the code's; recommend the UI's. Record it: `sp state <slug> --decision "Name: <answer>"`. A changed answer replaces
the one recorded before. Films show demo data only and the app never runs, so there is nothing else to decide.

A correction to the analysis goes back to the step that made it; saving again reopens gate 1, so show the dossier
again.

## 4. Pass it

When the user accepts, run `sp confirm gate-1 --subject <slug>`. On its own, app-map ends here and hands the user
the dossier.
