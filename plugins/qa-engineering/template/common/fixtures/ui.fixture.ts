/**
 * UI fixture — the base fixture plus the shared, cross-module page objects.
 *
 *   import { test, expect } from '<...>/common/fixtures/ui.fixture';
 *   test('...', async ({ page, dashboardPage }) => { ... });
 *
 * `page` arrives already authenticated: the `auth-setup` project logs in once per run
 * and saves the storage state, which the UI projects load via `storageState`.
 *
 * Only CROSS-MODULE pages are fixtures (login, dashboard). A module page object is
 * instantiated in the test — `const orders = new OrdersPage(page);` — so the fixture
 * never pays setup cost for a page the test does not touch.
 */
import { type Page } from '@playwright/test';
import { test as base } from './base';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

type UiFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<UiFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from './base';
export type { Page };
