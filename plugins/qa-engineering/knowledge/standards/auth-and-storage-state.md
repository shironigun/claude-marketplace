# Auth and storage state

> Log in once: the API mints a token (reused, re-minted on 401); the UI saves `storageState` in a setup project so every UI test starts signed in.

## Purpose
Authentication is done once per run, not once per test. For API work, a token is minted from the
profile's credentials, cached, and re-minted only on an unexpected 401. For UI work, a dedicated
`setup` project logs in through the browser and saves cookies + localStorage to a `storageState` file
that every UI project loads, so each UI test begins already authenticated. This is Playwright's own
recommended pattern and it saves minutes of wall-clock per run.

## When to use it (and when NOT)
- **API:** let the client mint and attach the token; assert the 401 path only by deliberately omitting
  auth.
- **UI:** rely on the `auth-setup` project's saved state; the spec never logs in.
- **Shared account** (one account, saved once): use when tests do not modify server-side state and can
  all run with the same account without affecting each other.
- **One account per worker:** use when tests **do** modify server-side state — key the saved state by
  the worker's `parallelIndex` so workers do not collide.
- **Do NOT** commit a storage-state or saved-auth file — it can impersonate the account.
- **Do NOT** assume saved state never expires, or that `sessionStorage` is saved (it is not, by default).

## Official guidance
- Reuse signed-in state via a setup project "so you can log in only once" —
  https://playwright.dev/docs/best-practices
- Store state under `playwright/.auth` and gitignore it: the file "may contain sensitive cookies and
  headers that could be used to impersonate you or your test account. We strongly discourage checking
  them into private or public repositories." — https://playwright.dev/docs/auth
- Shared-account vs account-per-worker are the two documented strategies; pick by whether tests mutate
  server-side state — https://playwright.dev/docs/auth
- Authenticate via API, call `storageState()`, and reuse it in browser contexts — the state is
  interchangeable between `APIRequestContext` and `BrowserContext` — https://playwright.dev/docs/api-testing

## Code shape (product-neutral)
```ts
// tests setup — browser login saved ONCE per run.
import { test as setup, expect } from '@playwright/test';
const authFile = 'playwright/.auth/user.json';   // gitignored

setup('authenticate', async ({ page }) => {
  await page.goto(process.env.WEB_APP_LOGIN_URL!);
  await page.getByLabel('Username').fill(process.env.AUTH_USERNAME!);
  await page.getByLabel('Password').fill(process.env.AUTH_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Prove login worked before saving — an expired-password screen must NOT be saved as "authed".
  await expect(page.getByRole('heading', { name: process.env.POST_LOGIN_HEADING! })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```
```ts
// playwright.config.ts — UI projects depend on setup and load the saved state.
projects: [
  { name: 'auth-setup', testMatch: /.*\.setup\.ts/ },
  { name: 'ui-smoke', use: { storageState: 'playwright/.auth/user.json' }, dependencies: ['auth-setup'] },
];

// API token minting — cached, re-minted once on 401 (handled inside the api-client).
const token = await mintToken(profile);          // password | client-credentials | static | none
```

## Anti-patterns
- Logging in inside every test, or inside a UI spec at all — the setup project already did it.
- Committing `playwright/.auth/*` or a codegen `--save-storage` file — sensitive and impersonable.
- A shared account while tests mutate server state — they collide; switch to account-per-worker.
- Saving storage state without first asserting the login actually succeeded.
- Assuming `sessionStorage` persists, or that a saved token never expires (delete/refresh it when it does).

## Related standards
- `api-client.md` — attaches and re-mints the token on the 401 path.
- `config-and-profiles.md` — supplies the credentials and auth strategy per profile.
- `worker-seeds.md` · `isolation-and-parallelism.md` — why account-per-worker pairs with per-worker data.
- `ci.md` — provides `AUTH_*` to the agent by name, since `.env` is absent there.
