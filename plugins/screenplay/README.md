# screenplay (in development)

> **In development, not yet registered in the marketplace.** Plans 1 to 5 of the first release are in: the
> shared `sp` engine, the two analysis skills (brand-profile and app-map) with their three scouts, and the film
> skill from the mods to an approved storyboard, the film's screens rebuilt from the code by the UI builder, and one
> Motion film per brand. The checks and the comment loop arrive in plan 6.

Turn any part of a web app (one feature, a whole module, or a flow across modules) into polished films: a promo, a
walkthrough, a trailer, a teaser, a release highlight, a store preview or a how-to. screenplay reads the repository
to learn the app's branding, maps the screens and traces them to the backend, and writes down what they really do.
You choose how the film looks and moves; it rebuilds the screens from the code, fills them with demo data only, and
builds one Motion film per brand. Every frame is checked against fixed film rules, and the film improves from your
comments on it.

It needs only the app's code. It never runs the app, never reads the app's data, and never changes the app's
repository: everything it learns lives under `$SCREENPLAY_HOME` (default `~/.screenplay`).

## Skills

| Skill | Answers | Arrives |
|---|---|---|
| brand-profile | "what are this app's logos, colours and fonts?" | plan 2 |
| app-map | "what does this feature or module really do?" | plan 2 |
| app-film | "make a promo, a walkthrough or a trailer of it" | plan 3 to the storyboard; plan 4 the screens; plan 5 the films |

A subject is analysed once; every film of it, in any format, reuses that analysis.

## Commands

| Command | Does |
|---|---|
| `/screenplay:brand` | Builds or refreshes the brand profile and shows it as a brand board to confirm |
| `/screenplay:map <subject>` | Maps a feature, a module or a flow, traces it to the backend, and ends at the gate-1 dossier |
| `/screenplay:new <subject> [format]` | Starts a film of a subject in a format (a walkthrough by default), runs the analysis it still needs, and ends with one Motion film per brand, built from the screens rebuilt from the code after an approved storyboard |
| `/screenplay:mods <subject> [film]` | Changes a film's mods, then checks its story against them and asks for the storyboard's approval again |
| `/screenplay:screens <subject> [film]` | Rebuilds a film's screens from the code, after a change in the code or for a new state, and checks them again |
| `/screenplay:build <subject> [film]` | Builds a film as one Motion film per brand, or brings every brand's film back in line with its source after a change |
| `/screenplay:status` | Shows where each subject and film stands and the state of the brand profile; changes nothing |

## In this release

- **brand-profile**: every brand's logos (a file in the repository, a logo drawn in code, or a file you supply
  with `sp logo`), brand rule, palette, fonts, names, and the places it shows a logo in with their sizes, each cited
  to its line, confirmed once per repository on one brand board.
- **app-map**: a subject's screens, states, actions and API calls, its neighbouring surfaces, a truth ledger of
  what it does and does not do (every entry cited `path:line@commit`), a brief, and the gate-1 dossier.
- **app-film**, to the screens: a film of a subject in any of the seven formats; the mods form, with every
  option's preview; a story whose every caption traces to the truth ledger; demo data that follows the story; a
  storyboard the user approves at gate 2; and the film's screens, rebuilt from the code: the brands' theme as CSS
  variables, and each screen's markup filled with the scene's demo answers and checked film-ready.
- **app-film**, the build: one timing table that the scenes and the score both read; the kit, written fresh, that
  plays the screens in a window on a calm ground, with a still camera between moves, callouts in four styles, a
  pinned cursor, typing, the walkthrough patterns, title, act and end cards, and an original score; each brand's
  overlay of theme, logos and colours over one shared source; and one Motion film per brand, written through pinned,
  staged writes so a re-sync sends only what changed.
- Three read-only scouts (`sp-brand-scout`, `sp-screen-scout`, `sp-backend-tracer`) and the read-only UI builder
  (`sp-ui-builder`), which return JSON; only the engine writes the workspace.
- The engine: `sp init`, `sp status`, `sp state`, `sp detect`, `sp save` (which checks every citation against the
  repository, every film result against the subject, and every screen against the film), `sp dossier`, `sp film`,
  `sp mods`, `sp storyboard`, `sp confirm`, `sp answers`, `sp screens`, `sp logo`, `sp build`, `sp stage` and
  `sp record`.
- `examples/example-desk`: a dependency-free two-brand app with a reminders queue, and in `examples/expected/` what
  screenplay should find in it, plan from it and rebuild from its code: the theme, and a promo of the feature and a
  walkthrough of the module with their screens.

## Layout

```text
.claude-plugin/plugin.json
skills/            brand-profile/, app-map/, app-film/ (SKILL.md, references/, and the film kit in kit/)
agents/            sp-brand-scout, sp-screen-scout, sp-backend-tracer, sp-ui-builder
commands/          brand, map, new, mods, screens, build, status
shared/            bootstrap, detectors (used by every skill)
engine/            sp.js, lib/, schemas/, catalog/ (the mods), fixtures/, test/
examples/          example-desk/ (the fixture app), expected/ (what screenplay should find)
evals/             trigger and guard cases for claude plugin eval
```

## Engine

`node engine/sp.js help` lists the commands. Node 20 or later, no dependencies. Tests, from the repository root:

```bash
node --test plugins/screenplay/engine/test/*.test.js
```

The glob needs Git Bash or another POSIX shell to expand it, or Node 21 or later, which expands it itself.
