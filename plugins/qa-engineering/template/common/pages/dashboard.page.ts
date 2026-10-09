/**
 * DashboardPage — the post-login landing page.
 *
 * ADAPT THE LOCATORS to your app. Composes the shared navigation component, so
 * every module page object can reach navigation through its own dashboard/nav.
 */
import { type Locator, type Page } from '@playwright/test';
import { NavigationComponent } from '../components/navigation.component';

export class DashboardPage {
  readonly nav: NavigationComponent;

  /** Main heading — the cheapest proof that authentication succeeded. */
  readonly heading: Locator;
  /** The signed-in user's menu trigger. */
  readonly userMenuButton: Locator;
  readonly logoutMenuItem: Locator;

  constructor(readonly page: Page) {
    this.nav = new NavigationComponent(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.userMenuButton = page.getByRole('button', { name: /account|profile|user menu/i });
    this.logoutMenuItem = page.getByRole('menuitem', { name: /log ?out|sign ?out/i });
  }

  async logout(): Promise<void> {
    await this.userMenuButton.click();
    await this.logoutMenuItem.click();
  }
}
