# Verify (phase 9) and gate 3

Each brand's film is rendered with the Motion type's own renderer, measured at every cut, every beat and the frame
before every camera move, and judged by the film reviewer (spec 5.13). The renderer drives the user's own Chrome, Edge
or Chromium on this machine, with no network; the app never runs.

## 1. The renderer, once

`sp check <slug> --film <film>` says when the renderer is not installed. Install it once:

1. Tell the user what it takes, and ask before going on: the Motion player's three files, read from one of their
   films, and playwright-core from npm, about 14 MB installed, both in the workspace's `tools` folder; their own
   browser does the rendering. Without their yes, stop: the films stay unchecked.
2. With the Artifact tool, read `index.html`, `artifact-type/app.js` and `artifact-type/app.css` from one brand's film
   (`action: "read"`, the film's url, `paths`), with `out_dir` a new folder in the inbox, `<inbox>/player`.
3. Run `sp render --install <inbox>/player`. When it finds no browser, ask the user to install Chrome or Edge, or to
   set CHROMIUM_PATH to theirs.
4. Prove it: `sp render <slug> --film <film> --brand <brand> --at 1`, and read the still it wrote. It shows the film's
   first scene.

## 2. The checks

Run `sp check <slug> --film <film> --json`. It checks every brand's film as the build composes it, and writes, for
each brand, its frames, a contact sheet a scene, `check.json` and `report.md` in the film's `verify` folder.

- Exit 0: every check passes. Go on to the reviewer.
- Exit 1 lists each brand's problems. Fix the film's source, never a frame:
  - a target that is not shown when its beat acts, has no size, or lies outside the window: the screen marks it in
    the wrong place, or in a tab state or layer that is hidden then. Rebuild that screen (`references/screens.md`),
    giving the UI builder the problem;
  - the page showing through a drawer, dialog or toast: that layer's CSS has no opaque background; rebuild the
    screen;
  - the story's or the screens' own problems (a caption's truth, a name that must not show): fix the story
    (`references/story.md`, then gate 2 again) or the screen;
  - a logo that is not the brand's, or at another height: the brand profile (the brand-profile skill);
  - a frame that differs cold and warm: an animated image in a screen or a logo; draw it still;
  - anything else (a sound off its frame, a callout outside the safe area or still showing while the camera moves, an
    error the player reports): the kit made it, not the film. Tell the user which problem, and stop.

  Then build again (`references/build.md`), which writes only what changed, and run `sp check` again. After two
  rounds, tell the user what is left, and stop.

## 3. The film reviewer

1. Run `sp check <slug> --film <film> --brief --json`. It writes the reviewer's brief and gives its path.
2. Dispatch the film reviewer with the Agent tool, subagent type `screenplay:sp-film-reviewer`, with the brief's path.
   It returns JSON: write it into the inbox, as `<inbox>/<slug>.<film>.review.json`.
3. Record it: `sp check <slug> --film <film> --review <file>`.
   - `PASS`: go on to gate 3.
   - `BLOCKED`: fix each finding in the film's source, as for the checks; build again, check again, and dispatch the
     reviewer again with a new brief. After two rounds, show the user the findings left, and stop.

## 4. Gate 3: the first cut

Give the user each brand's film url (`sp check --json` lists them as `url`), say what was checked, and say what could
not be verified offline: each report's "Not verified here", such as a web font the renderer could not load, where the
live player is the reference for type. Say that the films start muted. Then record the hand-over:
`sp confirm gate-3 --subject <slug> --film <film>`.

From here, the user's comments on the films are the comment loop (`references/review.md`, `/screenplay:review`).
