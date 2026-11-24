# Screens from code (phase 7)

The film's screens are rebuilt from the repository's code, never captured from a running app (spec 5.11). The UI
builder, `sp-ui-builder`, reads the code and returns JSON; the engine checks every result and saves it. The app never
runs, and the screens show the film's demo data only. They are rebuilt from committed code: each brief names the commit
to read. When `git --no-optional-locks status --porcelain` shows the app's files changed, tell the user those changes
will not show until they are committed.

Start with `sp screens <slug> --film <film> --json`. Exit 1 says the screens come after gate 2, or that gate 2 no
longer holds and what changed: go back to the storyboard (`references/story.md`, its "Gate 2"). Otherwise it gives
`theme`, `screens`, `ready` and `next`. When this playbook runs for `/screenplay:screens`, it rebuilds the theme and
every screen, whatever `saved` and `problems` say.

## 1. The theme, once per repository

When `theme.saved` is false, or `theme.problems` lists anything:

1. Run `sp screens <slug> --film <film> --brief theme --json`. It writes the brief to the inbox and gives its path
   (`brief`) and the path its result goes to (`result`).
2. Dispatch the UI builder with the Agent tool, subagent type `screenplay:sp-ui-builder`, with both paths.
3. Write the JSON it returns to `result` with the Write tool, and save it: `sp save theme <result>`.

## 2. Each screen

When step 1 saved a theme, run `sp screens <slug> --film <film> --json` again first: a screen is checked against the
theme, so the new one changes which screens pass. Then, for each of `screens` that is not saved yet, or has
`problems`, in the order they come:

1. Run `sp screens <slug> --film <film> --brief <screen id> --json`.
2. Dispatch `screenplay:sp-ui-builder` with the brief's path and the result's path. The screens are independent, so
   their builders can run together.
3. Write each JSON it returns to its `result` with the Write tool, and save it:
   `sp save screen <result> --subject <slug> --film <film>`.

For every save: exit 0 saved it. Exit 1 lists each problem: send them to the builder (SendMessage), or to a new
builder with the brief, the problems and the path of its last answer, and save its new answer; after two rounds, tell
the user what is still wrong and stop. Exit 2 means the command was used wrongly: read the message and fix the call.
Never edit a saved theme or screen by hand.

## 3. Ready

Run `sp screens <slug> --film <film> --json` again. When `ready` is true, `next` is `build`. Tell the user the screens
are rebuilt from the code and saved, and, for each screen, the `guesses` its result records: the places where the code
left a value open. Then go on to the build, `references/build.md`.
