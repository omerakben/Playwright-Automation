import { LoginPage } from '../../src/pages/auth/login.page';
import { expect, test } from '../fixtures/accessibility.fixture';

test.describe('Login Page Accessibility', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should meet WCAG 2.1 AA standards', async ({ a11yUtils }) => {
    // Check entire page against WCAG AA standards
    const results = await a11yUtils.checkWCAG('AA');

    // Generate accessibility report
    await a11yUtils.generateReport([results], 'test-results/accessibility/login');

    // Get violation summary
    const summary = a11yUtils.getViolationSummary(results.violations);

    // Verify no critical or serious violations
    expect(summary.critical || 0).toBe(0);
    expect(summary.serious || 0).toBe(0);
  });

  test('should have accessible login form', async ({ a11yUtils }) => {
    // Check login form accessibility
    const formResults = await a11yUtils.checkAccessibility('#login-form');

    // Filter form-specific violations
    const formViolations = a11yUtils.filterViolations(formResults.violations, {
      rules: [
        'label',
        'aria-required-attr',
        'aria-valid-attr',
        'autocomplete-valid',
        'form-field-multiple-labels',
      ],
    });

    // Verify form accessibility
    expect(formViolations).toHaveLength(0);
  });

  test('should have proper focus management', async ({ page, a11yUtils }) => {
    // Get login form elements
    const form = await loginPage.getLoginForm();
    const username = form.getByLabel('Username');
    const password = form.getByLabel('Password');
    const submit = form.getByRole('button', { name: 'Login' });

    // Check initial focus
    await expect(page).toBeFocused();

    // Tab through form
    await page.keyboard.press('Tab');
    await expect(username).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();

    // Check focus trap
    await page.keyboard.press('Tab');
    await expect(username).toBeFocused();
  });

  test('should have proper error handling', async ({ page, a11yUtils }) => {
    // Submit empty form to trigger errors
    const form = await loginPage.getLoginForm();
    await form.submit();

    // Check error message accessibility
    const errorResults = await a11yUtils.checkAccessibility('.error-message');

    // Filter error-related violations
    const errorViolations = a11yUtils.filterViolations(errorResults.violations, {
      rules: ['aria-alert', 'aria-roles', 'color-contrast'],
    });

    // Verify error accessibility
    expect(errorViolations).toHaveLength(0);

    // Check if error is announced to screen readers
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
  });

  test('should support keyboard navigation', async ({ page, a11yUtils }) => {
    // Check keyboard navigation
    const results = await a11yUtils.checkAccessibility();

    // Filter keyboard navigation violations
    const keyboardViolations = a11yUtils.filterViolations(results.violations, {
      rules: ['keyboard', 'tabindex', 'focus-order-semantics'],
    });

    // Verify keyboard accessibility
    expect(keyboardViolations).toHaveLength(0);

    // Test keyboard interactions
    await page.keyboard.press('Enter');
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toBeFocused();
  });
});
