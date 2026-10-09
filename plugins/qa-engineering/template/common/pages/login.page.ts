/**
 * LoginPage — the one page object every UI suite needs.
 *
 * ADAPT THE LOCATORS to your app. Everything else here is reusable as-is.
 *
 * Locator priority (highest first): getByRole → getByLabel → getByPlaceholder →
 * getByText → getByTestId → `#id` → CSS → XPath. A role-based locator survives a
 * CSS refactor and a component-library upgrade; a class-based one does not.
 *
 * If your login form renders inside an iframe, scope the locators:
 *   const frame = page.frameLocator('iframe');
 *   this.usernameInput = frame.getByRole('textbox', { name: /username/i });
 */
import { type Locator, type Page } from '@playwright/test';

export class LoginPage {
  /** Optional tenant/account field — some apps ask for it before credentials. */
  readonly tenantInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  /** Error shown for invalid credentials. */
  readonly errorMessage: Locator;

  constructor(readonly page: Page) {
    this.tenantInput = page.getByRole('textbox', { name: /account|tenant|company|organization/i });
    this.usernameInput = page.getByRole('textbox', { name: /user ?name|email/i });
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /log ?in|sign ?in/i });
    this.errorMessage = page.getByRole('alert').filter({ hasText: /invalid|incorrect|error|failed/i });
  }

  async goto(url: string): Promise<void> {
    // networkidle: an SPA renders its login form only after the JS bundle loads.
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Fill and submit. Deliberately asserts nothing — the assertion belongs in the
   * test, so a failure reads as "login did not succeed" rather than as a page-object
   * internal error.
   */
  async login(username: string, password: string, tenantId?: string): Promise<void> {
    if (tenantId && (await this.tenantInput.count()) > 0) {
      await this.tenantInput.fill(tenantId);
    }
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
