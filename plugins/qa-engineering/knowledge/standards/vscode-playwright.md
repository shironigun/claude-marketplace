# VS Code (Playwright Test extension)

> Configure "Playwright Test for VS Code" so tests are discovered, runnable, and debuggable from the editor — including which config and the env file to load.

## Purpose
The official "Playwright Test for VS Code" extension makes the suite runnable without the terminal: it
discovers tests, runs them with play icons, debugs them with breakpoints and live locator highlighting,
and lets you pick which config and project to run against. For the kit it is the recommended local
debugging surface — pair a failing test with a breakpoint and the Trace Viewer instead of adding
console logs.

The template ships a committed `.vscode/` folder so the editor matches the toolkit out of the box:
- `extensions.json` — recommends `ms-playwright.playwright` and `dbaeumer.vscode-eslint`.
- `settings.json` — the `playwright.*` keys that shape how the editor runs the suite (the env/profile
  pointer, browser reuse, trace) — never projects/reporters, which live in `playwright.config.ts`.
- `launch.json` — a `node`-type debug config for the spec open in the editor (it drives the
  `@playwright/test` CLI, NOT the deprecated `"type": "playwright"`).

## When to use it (and when NOT)
- **Use it locally** to discover, run, and debug tests; to pick the config when there are several; and to
  generate/inspect locators (Record, Pick locator).
- **Point it at the right env file** so a run from the editor loads the same `.env` the terminal does
  (the extension's `playwright.env` setting).
- **Tick the projects** (levels/browsers) you want before running; toggle Show Browsers for headed.
- **Do NOT** rely on it to *configure* the framework — projects, auth setup, and reporters live in
  `playwright.config.ts`; the extension consumes that config.
- **Do NOT** commit editor-local settings that embed a secret or a machine path.

## Official guidance
- Install the Microsoft extension, then run "Test: Install Playwright" from the Command Palette and pick
  browsers; run via the play icons and tick the projects to run against —
  https://playwright.dev/docs/getting-started-vscode
- Debug with breakpoints and "Debug Test"; click a locator in code to highlight the element live; see
  expected-vs-received detail — https://playwright.dev/docs/getting-started-vscode
- Generate locators with Record new / Record at cursor / Pick locator; switch between multiple
  `playwright.config.ts` files from the extension — https://playwright.dev/docs/getting-started-vscode
- Best Practices also recommends the VS Code extension for local debugging and generating locators —
  https://playwright.dev/docs/best-practices
- The extension is published by Microsoft and works with Playwright v1.38+ —
  https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright

## Code shape (product-neutral)
```jsonc
// .vscode/extensions.json — offered on open; neither is needed for a terminal run.
{
  "recommendations": ["ms-playwright.playwright", "dbaeumer.vscode-eslint"]
}
```
```jsonc
// .vscode/settings.json — only shapes how the editor runs; no secrets (those stay
// in .env, which playwright.config.ts loads via dotenv). Real extension keys only.
{
  // Env vars set before an editor run so it matches a terminal run; the profile
  // selects which .env values win. Add only NON-SECRET overrides here.
  "playwright.env": { "AUTOMATION_PROFILE": "default" },
  "playwright.reuseBrowser": false,                  // fresh context per run (isolation)
  "playwright.showTrace": false,                     // trace is captured on-first-retry
  "testing.automaticallyOpenPeekView": "never"       // panel discovery is automatic
}
```
```jsonc
// .vscode/launch.json — debug the open spec via the CLI (NOT "type":"playwright").
{
  "version": "0.2.0",
  "configurations": [{
    "name": "PW: Debug current spec",
    "type": "node",
    "request": "launch",
    "cwd": "${workspaceFolder}",
    "program": "${workspaceFolder}/node_modules/@playwright/test/cli.js",
    "args": ["test", "${file}"],                     // add "--project=endpoints" to pin a level
    "env": { "AUTOMATION_PROFILE": "default" },
    "console": "integratedTerminal"
  }]
}
```
```text
Editor workflow (no terminal)

  Discover   tests appear in the Testing panel once the extension reads playwright.config.ts
  Run        click the play icon beside a test / describe / file
  Pick level tick the project(s) — contracts, endpoints, ui-smoke, … — before running
  Debug      set a breakpoint, "Debug Test"; click a locator in code to highlight it live
  Config     switch between multiple playwright.config.ts files from the extension
  Trace      open the Trace Viewer for a failed run from the editor
```

## Anti-patterns
- Running from the editor without `playwright.env`, so it misses the `.env` and fails with auth errors a
  terminal run would not show.
- Treating the extension as the place to define projects/auth/reporters — those belong in
  `playwright.config.ts`, which the extension reads.
- Committing `.vscode/settings.json` containing a secret value or an absolute machine path.
- Using Record to emit whole specs verbatim — codegen output is a draft to refactor into page objects and
  fixtures, not a finished test.

## Related standards
- `tooling-and-commands.md` — the terminal equivalents of run/debug/filter.
- `reporting-allure.md` — opening the Trace Viewer for a single failure.
- `config-and-profiles.md` — the `.env`/profile the extension must load.
- `page-objects.md` — where generated locators belong after refactoring.
