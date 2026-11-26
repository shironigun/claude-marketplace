# Screen map (phase 2)

The subject's screens, states, actions, navigation entries, API calls and neighbouring surfaces (spec 5.4).

1. **Scout.** Dispatch one `sp-screen-scout` subagent (subagent type `screenplay:sp-screen-scout`). Its brief,
   written out in full:
   - the repository folder as an absolute path, and for a monorepo the package the user chose at the bootstrap;
   - the subject's name and kind;
   - the stack line, and the `frameworks`, `routing`, `apiStyles`, `contracts` and `auth` findings of
     `sp detect --json` with their evidence;
   - the schemas as absolute paths, `<plugin root>/engine/schemas/screens.schema.json` and
     `<plugin root>/engine/schemas/api-calls.schema.json`, and the examples in `<plugin root>/engine/fixtures/valid/`.
2. **Write.** The scout returns `{ "screens": ..., "apiCalls": ... }`. With the Write tool, write each part to the
   inbox: `<inbox>/<slug>.screens.json` and `<inbox>/<slug>.api-calls.json`.
3. **Save** both: `sp save screens <inbox>/<slug>.screens.json --subject <slug>`, then
   `sp save api-calls <inbox>/<slug>.api-calls.json --subject <slug>`. On exit 1, send the listed problems back to
   the scout, or to a new scout with the first brief, the problems and the paths of its last answer in the inbox,
   and save its new answer; after two rounds, tell the user what is still wrong and stop.
4. **Branch.** When the map names a `branch`, record it: `sp state <slug> --decision "Branch: <branch>"`.
