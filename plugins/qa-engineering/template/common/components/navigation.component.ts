/**
 * NavigationComponent — the app shell's primary navigation.
 *
 * ADAPT to your app's nav. Component objects wrap widgets that appear on more
 * than one page; page objects compose them rather than re-declaring the locators.
 *
 * Extract a component when: the widget appears on ≥2 pages, OR it has internal
 * behaviour (a dropdown, a paginator, a modal). Do not extract a lone locator.
 */
import { type Locator, type Page } from '@playwright/test';

export class NavigationComponent {
  readonly homeLink: Locator;
  readonly settingsLink: Locator;

  constructor(private readonly page: Page) {
    this.homeLink = page.getByRole('link', { name: /home|dashboard/i });
    this.settingsLink = page.getByRole('link', { name: /settings/i });
  }

  /** Navigate by the visible link text — one method per destination. */
  async goTo(linkName: string | RegExp): Promise<void> {
    await this.page.getByRole('link', { name: linkName }).click();
  }

  async goHome(): Promise<void> {
    await this.homeLink.click();
  }

  async goToSettings(): Promise<void> {
    await this.settingsLink.click();
  }
}
