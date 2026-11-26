# Bootstrap (phase 0)

Every skill starts here. Silent: run these steps without asking, then say what you found in one line (spec 5.2).
A skill about one subject (app-map) runs every step. brand-profile belongs to the repository, not to a subject,
so it skips steps 2, 3 and 7.

The engine is `<plugin root>/engine/sp.js`, run with `node`; a skill's plugin root is two folders above the skill's
base directory. Below, `sp` means that command, run from the app's repository.

1. **Repository.** Work from the app's repository: the folder the user is in, or the one they name. The engine
   writes nothing in it.
2. **Subject.** Take the subject from the request and decide its kind: `feature` (one feature), `module` (an area
   with several features) or `flow` (a journey across modules). If the request names no subject, or its kind is
   unclear, ask once.
3. **Workspace.** Run `sp init "<subject name>" --kind <kind> --json`. If `created` is false, the subject already has
   a workspace: run `sp status <slug> --json`, read its `pending` items, and continue from its `next` step instead
   of starting over.
4. **Detect.** Run `sp detect --json` and keep its `summary`, `skipped`, `workspace` and `inbox`. The inbox is
   where you write a subagent's result, with the Write tool, for `sp save` to check and save: never write one
   inside the app's repository, which `sp save` refuses. A file an earlier run left in the inbox must be read
   before the Write tool will overwrite it.
5. **Prerequisites.** Check, without installing anything:
   - Node 20 or later (`node --version`), for every skill.
   - For a film only: the Motion artifact type (list the account's artifact types and look for Motion) and the
     artifact data and comment tools (load them if they are deferred), which the build needs; and a Chromium
     browser (Chrome or Edge) on this machine, which verify needs to render the film's stills. Planning and the
     screens need neither, so a missing one stops the film only at the phase that needs it (spec D22).
6. **Say it in one line:** the `summary`, then what is missing, and last, when `skipped` lists any files, how many
   and why. For example: "react on vite; API: rest; auth: bearer-token; theme: css-variables; backend: none;
   layout: single. Motion available. Skipped 2 files: 1 unreadable, 1 invalid JSON."
7. **Record it:** `sp state <slug> --decision "Stack: <summary>"` (a new answer replaces the one recorded before), and
   `sp state <slug> --pending "<item>"` for each missing prerequisite. Then return to the skill that called the
   bootstrap.

Ask only what is ambiguous. If `layout` is `monorepo`, ask which package holds the subject, and recommend the one
whose name or routes match it. brand-profile asks instead which app the brand profile is for, and recommends the
package that serves the pages, so two apps' themes never merge into one profile.
