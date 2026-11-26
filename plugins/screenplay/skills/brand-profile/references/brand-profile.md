# Brand profile (phase 1)

Once per repository (spec 5.3). Every later film reuses the profile until the user asks for a new one.

## 1. Scout

Dispatch one `sp-brand-scout` subagent (subagent type `screenplay:sp-brand-scout`). Its brief, written out in
full:

- the repository folder, as an absolute path, and for a monorepo the package the user chose at the bootstrap;
- the stack line, and the `theming`, `fonts` and `frameworks` findings of `sp detect --json` with their evidence;
- the schema and its example as absolute paths: `<plugin root>/engine/schemas/brands.schema.json` and
  `<plugin root>/engine/fixtures/valid/brands.json`.

## 2. Save

Write the scout's JSON (without a code fence, if it added one) to `brands.json` in the inbox that
`sp detect --json` named, with the Write tool. Then run `sp save brands <inbox>/brands.json`.

- Exit 0: saved. When the output says the theme rebuilt from the old profile is removed, tell the user: app-film
  rebuilds it from the new profile before a film's screens.
- Exit 1: the profile has problems, and the output lists each one. Send the list back to the scout (SendMessage),
  or to a new scout with the first brief, the problems and the path of its last answer in the inbox, and save its
  new answer. After two rounds, show the user what is still wrong and stop.
- Exit 2: the command was used wrongly. Read the message and fix the call.

## 3. Board

Show one brand board: the brand rule, then one block per brand. It follows the pattern of the mods form (spec 5.8):

- In a host with an inline visualizer, draw the board there: swatches for the palette, the logo files, a line set
  in the UI font, and the brand rule.
- Otherwise, show it in the conversation as this text block:

```text
Brand rule: <rule.summary> (<path>:<line> of its first evidence)

<name> (<id>): <when>
  Logos    full <path, "drawn in code at <path>:<line>" or "your file"> (<width>x<height>), mark …, and the others
  Palette  primary <hex>, secondary <hex>, error <hex>, warning <hex>, info <hex>, success <hex>,
           background <hex>, text <hex>
  Type     <family>, weights <weights>, titles <titleWeight>, from <source>
  Names    <product>; modules <name>, <name>
  Chrome   <place>: the <logo> logo, <height> px high, <inset> px in; and each other place
```

Leave out what the profile does not hold. No questionnaire: the board is the whole question.

## 4. Confirm

Ask once whether the board is right, and invite corrections.

- On a yes, run `sp confirm brands`.
- On a correction, find the line in the code that holds the value the user names and cite it; change the value
  and its evidence in `<inbox>/brands.json`, save it again, show the changed blocks, and ask again before running
  `sp confirm brands`. A new save clears an earlier confirmation, so confirm after the last save.
- Never save a value without a citation. When the code holds no such value, say so and keep the profile as the
  code shows it: the profile records what the app shows.
- **A logo the repository does not hold** (a CDN image, a tenant's upload): when a brand has no `full` logo, a place
  shows a logo the brand has not, or the user names a better file for one, ask for the file (a still image) and run
  `sp logo <brand> <variant> <file>`. It copies the file into the profile, and a later save keeps it. Show the
  changed block and ask again before `sp confirm brands`, which waits until every place has its logo. Ask now, too,
  whether a film on a deep ground will want a `dark` logo: a logo supplied after a film's gate 2 confirms the board
  again and passes gate 2 again.
