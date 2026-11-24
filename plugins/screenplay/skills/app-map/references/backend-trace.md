# Backend trace (phase 3)

Every API call of the screen map, traced into the backend, as a truth ledger (spec 5.5).

1. **The commit to cite.** In a git repository, `git rev-parse --short HEAD`, or `git rev-parse --short <branch>`
   when the screen map names a branch. When a file the trace cites has changes that are not committed, tell the
   user: the ledger can only cite committed lines. In a plain folder there is no commit.
2. **Trace.** Dispatch `sp-backend-tracer` (subagent type `screenplay:sp-backend-tracer`). Its brief, written out
   in full:
   - the repository folder as an absolute path, and the commit;
   - the absolute paths of the subject's saved `map/screens.json` and `map/api-calls.json` in its workspace;
   - the `backend` findings of `sp detect --json` with their evidence;
   - the first entry id, `T-01`;
   - the schema and its example as absolute paths: `<plugin root>/engine/schemas/truth.schema.json` and
     `<plugin root>/engine/fixtures/valid/truth.json`.

   A subject with more than ten calls: split the calls into groups of up to ten and dispatch one tracer per group,
   all in one message so they run in parallel. Give each group its calls and its own first id (`T-01`, `T-41`,
   `T-81` and on), then join their entries into one ledger, renumbered `T-01`, `T-02` and on in order, so ids stay
   unique whatever each group returned.
3. **Save.** Write the ledger to `<inbox>/<slug>.truth.json` and run
   `sp save truth <inbox>/<slug>.truth.json --subject <slug>`. On exit 1, send each problem back to the tracer that
   wrote the entry, or to a new tracer with the first brief, the problems and the path of its last answer in the
   inbox, and save the new answer; after two rounds, tell the user what is still wrong and stop.
4. **Open entries.** An `open` entry stops at a boundary: another repository or an external service. Ask the user
   for the second repository only when a film depends on that entry; when answering a question, say where the
   trace stops.
