import { Page } from '@playwright/test';
import { logger } from '../../core/logger';
import { UserRole } from '../types/business.types';
import { LoginPage } from '../../pages/auth/login.page';

/**
 * Authentication helper for business flows
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Login as specific user role
   */
  async loginAs(
    role: UserRole,
    credentials?: { username: string; password: string },
  ): Promise<void> {
    try {
      const loginPage = new LoginPage(this.page);
      await loginPage.goto();

      // Use default credentials if not provided
      const defaultCredentials = this.getDefaultCredentials(role);
      const { username, password } = credentials || defaultCredentials;

      await loginPage.login(username, password);
      await this.verifyLoginSuccess(role);

      logger.info(`Successfully logged in as ${role}`, { username });
    } catch (error) {
      logger.logError(`Failed to login as ${role}`, error);
      throw error;
    }
  }

  /**
   * Switch between user roles
   */
  async switchRole(newRole: UserRole): Promise<void> {
    try {
      await this.logout();
      await this.loginAs(newRole);
      logger.info(`Successfully switched to role: ${newRole}`);
    } catch (error) {
      logger.logError(`Failed to switch to role: ${newRole}`, error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Click user menu
      await this.page.click('[data-testid="user-menu"]');
      // Click logout
      await this.page.click('[data-testid="logout-button"]');
      // Wait for redirect to login page
      await this.page.waitForURL(/\/login$/);

      logger.info('Successfully logged out');
    } catch (error) {
      logger.logError('Failed to logout', error);
      throw error;
    }
  }

  /**
   * Get default credentials for role
   */
  private getDefaultCredentials(role: UserRole): { username: string; password: string } {
    const credentials = {
      ADMIN: { username: 'admin@example.com', password: 'adminpass123' },
      MANAGER: { username: 'manager@example.com', password: 'managerpass123' },
      USER: { username: 'user@example.com', password: 'userpass123' },
      GUEST: { username: 'guest@example.com', password: 'guestpass123' },
    };
    return credentials[role];
  }

  /**
   * Verify successful login
   */
  private async verifyLoginSuccess(role: UserRole): Promise<void> {
    // Wait for dashboard page
    await this.page.waitForURL(/\/dashboard$/);

    // Verify user menu shows correct role
    const userMenu = await this.page.locator('[data-testid="user-menu"]');
    await userMenu.waitFor({ state: 'visible' });
    const roleText = await userMenu.textContent();
    if (!roleText?.includes(role)) {
      throw new Error(`Expected role ${role} but found ${roleText}`);
    }
  }
}
