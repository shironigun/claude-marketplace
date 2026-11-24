# Detectors

`sp detect` reads the app's repository with the tables below and saves `stack.json` in the repository's profile
(spec 6). It skips dependency and build folders (`node_modules`, `dist`, `bin`, `obj` and the like). Each finding
carries up to three pieces of evidence: a package (`package.json: dependencies.react`), a file path, or a file and
the text that matched. Findings are listed in the order below.

It scans at most 20,000 files and skips symbolic links, so it never reads outside the repository. It reads the
text of files up to 256 KB; a larger file still counts by its name and path, but its text adds no evidence and it is
not listed. `skipped` lists what the scan could not use, and why: the path `.` with `stopped after 20000 files`
when the scan reaches the cap, `unreadable` for a folder or a file it cannot read, and `invalid JSON` or
`not a JSON object` for a `package.json` it cannot use.

| Group | Finding ids | What later phases use it for |
|---|---|---|
| frontend.frameworks | react, vue, angular, svelte, solid, next, nuxt, rails, django, laravel, aspnet-razor | where the screen scout looks for screens; with none of these, any HTML page gives static-html |
| frontend.routing | react-router, vue-router, angular-router, next-file-routes, nuxt-file-routes, sveltekit, remix, server-routes | how the screen scout finds the subject's routes |
| frontend.apiStyles | rest, graphql, trpc, websocket, sse | which calls the demo answers fill in the screens; release 1 reads rest and graphql |
| frontend.contracts | openapi, graphql-schema, typescript-types, backend-dtos | the best source for demo data shapes, in that order |
| frontend.auth | oauth-sso, bearer-token, cookie-session | how the app signs in; it never runs, so a sign-in screen is filmed like any other |
| frontend.theming | css-variables, tailwind, component-theme, design-tokens, scss, css-in-js | where the brand scout reads the palette |
| frontend.devServers | vite, webpack, next, nuxt, angular-cli | recorded only: the app never runs (spec 13.2) |
| frontend.i18n | i18next, vue-i18n, angular-i18n | where the app's own labels live, for captions |
| frontend.fonts | google-fonts, fontsource, self-hosted, system | where the brand font comes from: self-hosted is an `@font-face` that loads a font file (`url(`); system is one that only names fonts already on the machine (`local(`) |
| backend.languages | node, dotnet, java, python, go, ruby, php | where the backend tracer looks for routes |
| backend.frameworks | express, fastify, koa, nestjs, node-http, aspnet-core, spring, django, flask, fastapi, rails, laravel, gin | how route declarations look |

`layout` is `monorepo` when the root `package.json` has `workspaces` or the repository holds `pnpm-workspace.yaml`,
`lerna.json`, `nx.json` or `turbo.json`; `packages` then lists every folder with its own `package.json`.

## When the tables find nothing

An empty group is not an error: the app may not use that thing. When a group the next phase needs is empty (no
API style, no theming), the scout for that phase searches by hand and says what it found; the tables grow only
when the same gap shows up in more than one app.
