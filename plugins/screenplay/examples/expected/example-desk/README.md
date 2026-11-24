# example-desk: expected outputs

What screenplay should produce for `../../example-desk`: the Reminders feature, and the whole desk as a module. This folder sits outside the
app on purpose: the scouts read the app, never these answers.

- `stack.json`: what `sp detect` finds. The engine tests compare it field by field.
- `brands.json`: the brand profile, with the two brands and the brand rule below.
- `reminders/` (the Reminders feature) and `the-desk/` (the whole desk as a module): each subject's
  `screens.json`, `api-calls.json`, `truth.json` and `brief.md`, and one film of it (see Films below).

These files cite no commits, because a commit belongs to the copy that was analysed. The engine tests check every
citation in them against the fixture's files, then save each subject through `sp save` in a fresh committed copy,
with that copy's commit, and run its dossier.

## Analysing example-desk

Never point screenplay at `examples/example-desk` inside the marketplace repository: screenplay reads the whole git
repository, so it would read these answers and the whole marketplace. Copy the folder outside any git repository,
make the copy a repository of its own, and run screenplay from the copy:

    git init
    git add -A
    git commit -m "example-desk"

The engine tests analyse it the same way (`fixtureRepo` in `engine/test/helpers.js`).

## Films

`reminders/promo/` is a promo of the feature, and `the-desk/walkthrough/` a walkthrough of the module. Each holds
a film's `mods.json`, `beats.json` and `demo-data.json`, and the `storyboard.md` the engine renders from them. Both
subjects record the release status `new` and demo data. The films' names and data are made up: none comes from the
seed data in `data/`. The engine tests save each film through `sp save` on its subject's expected analysis, render
its storyboard, compare it with the one here, and pass gate 2.

## Truths planted in the code

The backend trace (Plan 2) must find each one with its `path:line`:

| Kind | Truth | Where |
|---|---|---|
| manual-only | A reminder goes out only when a user presses Send; nothing is scheduled. | `server.js`, the send route; no timer anywhere |
| does-not | A snoozed reminder never comes back by itself. | `server.js`, the snooze route sets the status and nothing resets it |
| does-not | Sending does not email or text the customer, whatever the channel says; it marks the reminder sent and adds a notification. | `server.js`, the send route |
| never-populated | The dashboard's average response time is always empty (shown as "—"). | `server.js`, `avgResponseHours: null` |
| hidden | The drawer's History tab is hidden. | `public/reminders.html`, the tab with `hidden` |
| limit | A note holds at most 280 characters. | `server.js`, `NOTE_LIMIT` |
| limit | Only an open reminder can be sent or snoozed. | `server.js`, the send and snooze routes |

## The brand rule

Partner workspaces (`config.json` `workspace.partner`) and every path under `/partner` show Lumen; everyone else
sees Harbor (`public/brand.js`, `brandFor`). The side rail shows Lumen's collapsed mark at 25 px with a 10 px inset,
and Harbor's full logo at 32 px (`railLogo`).
