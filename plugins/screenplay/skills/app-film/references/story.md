# Story and demo data (phase 6), and gate 2

You write the film's story and the demo data it shows, from the subject's analysis and the chosen mods (spec 5.9).
The engine checks both and renders the storyboard the user approves at gate 2 (spec 5.10).

Read first: `map/screens.json`, `map/api-calls.json`, `map/truth.json` and `map/brief.md` in the subject's
`workspace` (from `sp init --json`), the film's mods (`current` in `sp mods <slug> --film <film> --json`), and
`references/film-rules.md`.

## 1. The arc

Shape it by the format (spec 9). At most one title card, first; one end card, last.

- **Walkthrough:** every screen of the subject, in the order of `screens.json`. A module's walkthrough opens each
  feature with an act card that names the feature as `screens.json` does. Its length follows the content.
- **Promo:** the problem, the subject in action, the outcome; 30–60 s.
- **Trailer:** highlights across a module or flow, in acts, each opened by an act card; 60–90 s.
- **Teaser:** one hook; 10–20 s.
- **Release highlight:** what is new; 45–60 s.
- **Store preview:** 30 s or less, with an end card of 2 s or less.
- **How-to:** one task, in numbered steps, at calm pacing.

## 2. Personas

Made-up names and roles. Never use a name from the app's seed data, fixtures or tracker (the brief's must-not-show
list names them). Each screen scene is on one persona's screen.

## 3. Scenes and beats

- **A card** (`title`, `act` or `end`) has its `text`, an optional `line`, and `ms`. A title or end card names the
  subject as the storyboard's heading does: by its `Name:` decision when gate 1 recorded one.
- **A screen scene** names its `screen` (an id from `screens.json`), the `state` it starts in (one of that screen's
  states), its `persona`, and optionally a `pattern` the mods put on that screen. Its `beats` play in order. The kit
  draws a column sweep, a row pop-in and a timeline build on the first beat whose target fits them; the other patterns
  are the beats you write: a section tour holds on each section in turn, a tab tour clicks each tab and holds about
  4 s on it, a dialog step-through opens the dialog and holds on each of its parts, focused typing gives each field
  of the form a `type` beat of its own, a hand-off does the action on one screen and opens the next scene on the
  screen where its result shows, and before and after counters hold on a number, do the action that changes it, and
  hold on it again where the next scene's screen shows it. The changed number is one the next scene's demo data
  holds.
- **A beat** is `hold` (a still shot), `point`, `click` or `type` (with the `text` it types), at a
  `target` named as a user sees it ("the Send button", "Reminders in the side rail"), for `ms` milliseconds. Point
  at the control a user would touch (rule 5). A beat that opens or shows one of the screen's actions names it in
  `action`, with its label from `screens.json`. A layer stays open for the rest of its scene, as the app keeps it
  open until its own control closes it: show what is under a panel before you open it, or open it last. A film does
  not play `scroll` yet: hold on what the scroll shows. A typed beat runs at least its words' time at 22 characters a second, and 1.2 s more for the camera
  and the pointer; the build says when one is short.
- **A new screen scene** starts when an action changes what the app shows, such as after a send: the screens and
  the demo data go scene by scene.
- **A caption** is plain "label: value" in the product's own words (rule 6). It sits on a beat that holds at least
  the pacing's callout time (1.4 s standard, 1.6 s calm, 1.2 s brisk), and its `truth` names the ledger entry it
  rests on: a `does`, `manual-only` or `limit` entry that is not `open`. One caption shows at a time (rule 4).
- **Nothing on the must-not-show list appears** in any scene (rule 10): not in a caption, a card's text or line, or
  a typed text.

Write the story to `<inbox>/<slug>.<film>.beats.json` in the shape of `<plugin root>/engine/schemas/beats.schema.json`
(an example: `<plugin root>/engine/fixtures/valid/beats.json`), and save it:
`sp save beats <inbox>/<slug>.<film>.beats.json --subject <slug> --film <film>`.

## 4. Demo data

- Answer, by call id, every call that the story's screens and their actions make, whatever `api-calls.json` marks
  it: a sign-in or session call too, since the screens show demo data only and the signed-in user is a persona.
- Shape each answer like the call's `responseType` (a list when it ends in `[]`), following the code's own types.
- Keep it consistent with the story: the names, times and counts it shows. An answer for some requests only says
  which in `when` (`params` for the path's `:parameters`, `query` for query values). An answer that changes as the
  story goes on (a sent reminder leaves the Open list, a count goes up) names the scene it takes over at in `from`.

Write it to `<inbox>/<slug>.<film>.demo-data.json`, in the shape of
`<plugin root>/engine/schemas/demo-data.schema.json` (an example: `<plugin root>/engine/fixtures/valid/demo-data.json`),
and save it: `sp save demo-data <inbox>/<slug>.<film>.demo-data.json --subject <slug> --film <film>`.

For either save, exit 1 lists each problem: fix them and save again. Exit 2 means the command was used wrongly: read
the message and fix the call. A new save asks for gate 2 again.

## Gate 2: storyboard

1. Run `sp storyboard <slug> --film <film> --json`. Exit 1 lists what is still wrong: go back to the step that owns
   it. Exit 0 saves `story/storyboard.md` (its path is `saved`).
2. Show the storyboard as it is saved: the mods it is shown against, the personas, each scene with its beats,
   captions, truth links and timings, the demo data, and what must not show.
3. Ask the user to approve it, or to say what to change. A change goes back to the step that owns it (the mods, the
   story or the demo data): save again, run `sp storyboard` again, and show it again.
4. When the user approves, run `sp confirm gate-2 --subject <slug> --film <film>`.
