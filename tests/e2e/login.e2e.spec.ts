import { HomePage } from '../../src/pages/home.page';
import { LoginPage } from '../../src/pages/login.page';
import { expect, test } from '../fixtures/e2e.fixture';

test.describe('Login Functionality', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
    await loginPage.goto();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Fill login form
    const loginForm = await loginPage.getLoginForm();
    await loginForm.fill({
      username: 'testuser',
      password: 'testpass123',
    });

    // Submit form and wait for navigation
    await loginForm.submit();
    await page.waitForURL('/home');

    // Verify successful login
    await expect(homePage.getUserMenu()).toBeVisible();
    await expect(homePage.getWelcomeMessage()).toContainText('Welcome, testuser');
  });

  test('should show error message with invalid credentials', async () => {
    // Fill login form with invalid credentials
    const loginForm = await loginPage.getLoginForm();
    await loginForm.fill({
      username: 'invalid',
      password: 'wrong',
    });

    // Submit form
    await loginForm.submit();

    // Verify error message
    await expect(loginPage.getErrorMessage()).toBeVisible();
    await expect(loginPage.getErrorMessage()).toContainText('Invalid credentials');
  });

  test('should validate required fields', async () => {
    // Submit empty form
    const loginForm = await loginPage.getLoginForm();
    await loginForm.submit();

    // Verify validation messages
    await expect(loginPage.getUsernameError()).toContainText('Username is required');
    await expect(loginPage.getPasswordError()).toContainText('Password is required');
  });

  test('should remember login state', async ({ page }) => {
    // Fill login form with remember me
    const loginForm = await loginPage.getLoginForm();
    await loginForm.fill({
      username: 'testuser',
      password: 'testpass123',
      rememberMe: true,
    });

    // Submit and verify login
    await loginForm.submit();
    await page.waitForURL('/home');

    // Reload page and verify still logged in
    await page.reload();
    await expect(homePage.getUserMenu()).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    const loginForm = await loginPage.getLoginForm();
    await loginForm.fill({
      username: 'testuser',
      password: 'testpass123',
    });
    await loginForm.submit();
    await page.waitForURL('/home');

    // Perform logout
    await homePage.logout();

    // Verify redirect to login page
    await expect(page).toHaveURL('/login');
    await expect(loginPage.getLoginForm()).toBeVisible();
  });
});
