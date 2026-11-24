# Build (phase 8)

The film is built once, from its story, its mods and its screens, and written as one Motion film per brand
(spec 5.12). The engine builds the source and plans every write; you create each brand's film and make the writes
with the Artifact tools. Nothing is written in the app's repository, and the app never runs.

## 1. Build the source

Run `sp build <slug> --film <film> --json`.

- Exit 0: it gives `modules` (the shared source), `brands` and `length`.
- Exit 1 lists what stops the build:
  - the screens are not ready: run `references/screens.md` from its start, then build again;
  - the film is longer than 300 s or has more than 24 scenes, the Motion type's limits, or has a beat the kit cannot
    play (typing longer than its beat, a scroll): change the story (`references/story.md`) and show the storyboard
    again, since gate 2 needs it;
  - a brand has no logo for the film's cards (on a deep ground, a `dark` one), or a place shows a logo the brand has
    not: say what a new logo costs first. It changes the brand profile, so the user confirms the brand board again
    and passes gate 2 again before the build. On a deep ground, offer the light ground instead (`references/mods.md`),
    which needs no new logo. With the user's yes, ask for the file as the brand-profile skill's playbook says
    (`sp logo`);
  - a logo file the repository no longer holds: run the brand-profile skill's playbook again;
  - a theme value the film's CSS refuses (in a theme saved before `sp save theme` checked it): rebuild the theme as
    `references/screens.md` does, then build again;
  - a module or the film would be too big: tell the user which, and stop.
- Exit 2: the command was used wrongly. Read the message and fix the call.

The Motion type must be on the account (the bootstrap noted it). When it is not, tell the user the build needs it,
and stop.

## 2. Each brand's film

For each brand in `brands`, in order:

1. Run `sp stage <slug> --film <film> --brand <brand> --json`. It gives `url`, `create` and `batches`. When it
   exits 1 because a module or the film would be too big with the brand's own colours and overlay, tell the user
   which, and stop.
2. When `create` is set, the brand has no film yet:
   - Find the Motion type with the Artifact tool (`action: "list"`, `scope: "types"`), and create the film once:
     publish with its `type_url`, the `title` from `create`, no files, and `auto_open: "after_first_write"`.
   - The reply carries the Motion type's steps for a film written by hand: a form of questions, a rough cut, its
     reference pages, every document typed inline. They are not this film's steps. Its look and story were chosen
     with the user before the build, and the stage's batches below are its only writes, each from the file the stage
     wrote.
   - Record its url: `sp record <slug> --film <film> --brand <brand> --url <url>`.
   - A new film may hold documents of its own. List its `film` and `modules` collections (ArtifactData `list`). For
     each document, write `"<collection>/<doc_id>": { "version": <its version> }` into a JSON file in the inbox, and
     record them all with `sp record <slug> --film <film> --brand <brand> --versions <file>`. Then run `sp stage`
     again: its writes to those documents are pinned to their versions, and no stage deletes a document no build
     wrote.
3. Write each batch in order: ArtifactData with `action: "batch"`, the film's `url`, and the batch's `writes`
   exactly as the stage gives them. Each write sends a file the stage wrote (`file_path`), so no document passes
   through the conversation; never retype one inline.
4. After each batch, write the version its result gives for each document it wrote into a JSON file in the inbox,
   keyed as `"<collection>/<doc_id>"` (`"modules/scene-s-02.js": 3`), with `null` for a delete, and run
   `sp record <slug> --film <film> --brand <brand> --versions <file>`. Record only what the result says was written:
   a batch the store applies one write at a time can stop part-way.

**A refused batch.** The store refuses a whole batch, writing nothing, when a document changed since its version was
recorded: someone changed the film by hand, on its page or in another session. Never write over that change unasked:
- Read the document into the inbox (ArtifactData `get` with `out_dir`) and compare it with the file the stage wrote
  for it.
- Tell the user which document changed and how, in a sentence or two, and ask whether to write the build over it.
- Only with their yes, record its version as `{ "version": <its version> }` under its key, run `sp stage` again, and
  write from its first batch.
- Otherwise stop, and tell the user the film is part-synced: it plays its last build's scenes with the new modules
  written so far, until a later `/screenplay:build` finishes it. A change the user wants to keep belongs in the film's
  source (the story, the mods or a screen), so the next build carries it.

When the store refuses a batch because a document it already holds has no pin, the film holds documents no stage
recorded. For a film you created in this run, list and record them as in step 2, and stage again. For any other film
(one whose url the user gave), treat each as a changed document: read it, tell the user, and ask before recording it.

Never write the Motion page's own records (the stage never names them), `film/` documents other than the two it
stages, or anything the stage did not give. The films are private until the user shares them.

## 3. Done

Run `sp status <slug> --film <film> --json`. When every brand's film holds the build, `next` is `verify`. Give the
user each brand's film url. Say that the films start muted, that each brand's film comes from the one source, and
that checking the films arrives in the next release of screenplay.

A later `/screenplay:build` runs this playbook again: the build is made afresh, and only the documents that changed
are written. The batch that switches the film to the new build comes after every module it names, and the deletes
after it, so a stage that stops part-way never leaves the film naming a module that is gone.
