import { NavigationMenu } from '../../src/components/navigation.menu';
import { HomePage } from '../../src/pages/home.page';
import { expect, test } from '../fixtures/accessibility.fixture';

test.describe('Navigation Accessibility', () => {
  let homePage: HomePage;
  let navigationMenu: NavigationMenu;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    navigationMenu = new NavigationMenu(page);
    await homePage.goto();
  });

  test('should meet WCAG 2.1 AA standards for navigation', async ({ a11yUtils }) => {
    // Check navigation against WCAG AA standards
    const results = await a11yUtils.checkAccessibility('nav');

    // Generate accessibility report
    await a11yUtils.generateReport([results], 'test-results/accessibility/navigation');

    // Get violations by impact
    const violationsByImpact = a11yUtils.getViolationsByImpact(results.violations);

    // Verify no high-impact violations
    expect(violationsByImpact.critical || []).toHaveLength(0);
    expect(violationsByImpact.serious || []).toHaveLength(0);
  });

  test('should have accessible menu structure', async ({ a11yUtils }) => {
    // Check menu accessibility
    const menuResults = await a11yUtils.checkAccessibility('#main-menu');

    // Filter menu-specific violations
    const menuViolations = a11yUtils.filterViolations(menuResults.violations, {
      rules: ['aria-menu', 'aria-menuitem', 'role-supported', 'nested-interactive'],
    });

    // Verify menu accessibility
    expect(menuViolations).toHaveLength(0);

    // Check menu structure
    const menu = await navigationMenu.getMenu();
    await expect(menu).toHaveAttribute('role', 'menubar');
    await expect(menu.locator('li')).toHaveAttribute('role', 'none');
    await expect(menu.locator('a')).toHaveAttribute('role', 'menuitem');
  });

  test('should support keyboard navigation in menu', async ({ page }) => {
    // Focus the menu
    await page.focus('#main-menu');

    // Navigate through menu items
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('a[role="menuitem"]').nth(0)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('a[role="menuitem"]').nth(1)).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('a[role="menuitem"]').nth(0)).toBeFocused();

    // Open submenu
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('a[role="menuitem"][aria-expanded="true"]')).toBeFocused();
  });

  test('should have accessible breadcrumb navigation', async ({ a11yUtils }) => {
    // Navigate to nested page
    await navigationMenu.navigateTo(['Projects', 'Active']);

    // Check breadcrumb accessibility
    const breadcrumbResults = await a11yUtils.checkAccessibility('.breadcrumb');

    // Filter breadcrumb-specific violations
    const breadcrumbViolations = a11yUtils.filterViolations(breadcrumbResults.violations, {
      rules: ['aria-allowed-attr', 'list', 'listitem', 'link-name'],
    });

    // Verify breadcrumb accessibility
    expect(breadcrumbViolations).toHaveLength(0);

    // Check breadcrumb structure
    const breadcrumb = page.locator('.breadcrumb');
    await expect(breadcrumb).toHaveAttribute('aria-label', 'Breadcrumb');
    await expect(breadcrumb.locator('ol')).toHaveAttribute('role', 'list');
    await expect(breadcrumb.locator('li')).toHaveAttribute('role', 'listitem');
  });

  test('should handle mobile navigation accessibility', async ({ page, a11yUtils }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile menu button
    const menuButton = page.locator('button[aria-label="Menu"]');
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    // Open mobile menu
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    // Check mobile menu accessibility
    const mobileResults = await a11yUtils.checkAccessibility('#mobile-menu');

    // Filter mobile-specific violations
    const mobileViolations = a11yUtils.filterViolations(mobileResults.violations, {
      rules: ['aria-hidden-focus', 'focus-trap', 'scrollable-region-focusable'],
    });

    // Verify mobile menu accessibility
    expect(mobileViolations).toHaveLength(0);
  });
});
