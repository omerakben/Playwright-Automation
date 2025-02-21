import { NavigationMenu } from '../../src/components/navigation.menu';
import { HomePage } from '../../src/pages/home.page';
import { e2eUtils, expect, test } from '../fixtures/e2e.fixture';

test.describe('Navigation Functionality', () => {
  let homePage: HomePage;
  let navigationMenu: NavigationMenu;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    navigationMenu = new NavigationMenu(page);
    await homePage.goto();
  });

  test('should navigate through main menu items', async ({ components }) => {
    const menu = components.createMenu('#main-nav', [
      { text: 'Dashboard', path: '/dashboard' },
      { text: 'Projects', path: '/projects' },
      { text: 'Reports', path: '/reports' },
      { text: 'Settings', path: '/settings' },
    ]);

    // Navigate through each menu item
    await e2eUtils.navigateMenu(menu, ['Dashboard']);
    await expect(page).toHaveURL('/dashboard');

    await e2eUtils.navigateMenu(menu, ['Projects']);
    await expect(page).toHaveURL('/projects');

    await e2eUtils.navigateMenu(menu, ['Reports']);
    await expect(page).toHaveURL('/reports');

    await e2eUtils.navigateMenu(menu, ['Settings']);
    await expect(page).toHaveURL('/settings');
  });

  test('should handle nested menu navigation', async ({ components }) => {
    const menu = components.createMenu('#main-nav', [
      {
        text: 'Projects',
        path: '/projects',
        children: [
          { text: 'Active', path: '/projects/active' },
          { text: 'Archived', path: '/projects/archived' },
        ],
      },
    ]);

    // Navigate to nested menu item
    await e2eUtils.navigateMenu(menu, ['Projects', 'Active']);
    await expect(page).toHaveURL('/projects/active');

    await e2eUtils.navigateMenu(menu, ['Projects', 'Archived']);
    await expect(page).toHaveURL('/projects/archived');
  });

  test('should highlight active menu item', async ({ components }) => {
    const menu = components.createMenu('#main-nav', [
      { text: 'Dashboard', path: '/dashboard' },
      { text: 'Projects', path: '/projects' },
    ]);

    // Navigate and verify active state
    await e2eUtils.navigateMenu(menu, ['Dashboard']);
    await expect(menu.getActiveItem()).toBe('Dashboard');

    await e2eUtils.navigateMenu(menu, ['Projects']);
    await expect(menu.getActiveItem()).toBe('Projects');
  });

  test('should handle breadcrumb navigation', async ({ page }) => {
    // Navigate to nested page
    await navigationMenu.navigateTo(['Projects', 'Active', 'Details']);

    // Verify breadcrumb
    const breadcrumb = page.locator('.breadcrumb');
    await expect(breadcrumb).toContainText(['Projects', 'Active', 'Details']);

    // Navigate using breadcrumb
    await breadcrumb.getByText('Projects').click();
    await expect(page).toHaveURL('/projects');
  });

  test('should preserve navigation state after refresh', async ({ page }) => {
    // Navigate to a page
    await navigationMenu.navigateTo(['Projects', 'Active']);
    await expect(page).toHaveURL('/projects/active');

    // Refresh and verify state
    await page.reload();
    await expect(page).toHaveURL('/projects/active');
    await expect(navigationMenu.getActiveItem()).toBe('Active');
  });
});
