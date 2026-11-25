# House style

Rules learned from review rounds (spec 10), on top of the film rules, which hold whatever a house rule says.
- The repository's rules live in its profile: generic ("lifted cards keep 12 px padding") or about this product ("the
  dialog's Cancel is an outlined danger button").
- The user's own rules live beside the workspaces and hold in every repository. Only generic rules go there, and only
  when the user says so.

## Where the rules come from

The comment loop (`references/review.md`) saves a rule when a comment's fix holds film-wide: one sentence, in the
words a reviewer can check on a frame.

1. Save it in the repository: `sp house add --text "<the rule>" --scope <generic|product>`. When the rule picks a
   mod (a calmer pace, a look, a callout style), add `--mods <mod>=<option>`, so new films start from it; `sp mods`
   lists the mods and their options.
2. When the rule is generic, ask the user whether to keep it for every repository. Only with their yes:
   `sp house promote <id>`. A product rule never leaves its repository; never offer to promote one.

`sp house` lists every rule, its layer and the mods it sets; `sp house remove <id>` removes one the user no longer
wants.

## Where the rules go

- **New films** start from them: the mods form's preselection takes the user's mods, then the repository's, over the
  plugin's defaults (`sp mods`).
- **The UI builder** gets the product rules about the screens it rebuilds: add them to its dispatch from
  `sp house --json` (`references/screens.md`).
- **The film reviewer** judges each film against every rule: its brief carries them (`sp check --brief`).
