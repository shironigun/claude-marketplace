/**
 * Browser auth — the `auth-setup` project.
 *
 * Logs in ONCE per run and saves cookies + localStorage to
 * `playwright/.auth/<profile>.json`. Every UI project loads that file via
 * `storageState`, so each UI test starts already signed in.
 *
 * This is Playwright's recommended auth pattern and it is worth the ceremony: a
 * 12-second login in front of 80 UI tests is 16 minutes of wall clock per run.
 *
 * Refresh an expired session:   npm run auth:refresh
 * Skip it (state still valid):  npx playwright test --no-deps --project=ui-smoke
 *
 * A logged-OUT test opts out explicitly:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 */
import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getProfile } from '../../config/profiles.index';
import { LoginPage } from '../pages/login.page';

const authDir = path.resolve(__dirname, '../../playwright/.auth');

setup('authenticate browser session', async ({ page }) => {
  // Resolved INSIDE the test, not at module load: a config error should fail this
  // one project with a readable message, not blow up test collection for the
  // whole suite before anything has run.
  const profile = getProfile();
  const authFile = path.join(authDir, `${profile.name}.json`);

  // API-only workspace: no web app configured, so there is nothing to log into.
  // Skipping keeps `npm test` green instead of failing on a tier you have not built.
  setup.skip(!profile.webAppUrl, 'WEB_APP_URL is not set — the UI tier is not configured yet.');

  fs.mkdirSync(authDir, { recursive: true });

  const loginUrl = profile.webAppLoginUrl ?? profile.webAppUrl;
  const loginPage = new LoginPage(page);
  await loginPage.goto(loginUrl);

  // Preflight: confirm the login fields are actually found before filling. Without this,
  // an unadapted page object produces a cryptic 90s `locator.fill` timeout. The #1 cause
  // on a real app is a login form rendered INSIDE AN IFRAME (scope locators with
  // `page.frameLocator(...)` in login.page.ts); #2 is field labels that differ from the
  // generic defaults. Fail with the fix, not the symptom.
  try {
    await loginPage.usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    throw new Error(
      `Login fields not found at ${loginUrl} within 15s.\n` +
        `Adapt common/pages/login.page.ts to this app's real login form (field labels/roles).\n` +
        `Common cause: the form renders inside an <iframe> — scope the locators with ` +
        `page.frameLocator('iframe'). Then re-run \`npm run auth:refresh\`.`,
    );
  }

  await loginPage.login(
    profile.credentials.userName,
    profile.credentials.password,
    profile.credentials.tenantId,
  );

  // Proof that authentication actually succeeded. Without it, an expired-password
  // screen saves a storage state that fails every UI test with a useless error.
  // `exact` + `.first()`: a real app often repeats the landing word (a page <h1>, a nav
  // item, a "Loading <X>..." heading), and a loose name match trips Playwright strict mode.
  await expect(
    page.getByRole('heading', { name: profile.postLoginHeading, exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
  console.log(`[auth-setup] storage state saved → ${authFile}`);
});
