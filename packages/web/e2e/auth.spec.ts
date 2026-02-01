import { test, expect } from '@playwright/test';
import { login, logout, clearAuthState, TEST_USERS, isLoggedIn } from './helpers/auth';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state before each test
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('AUTH-01: Valid login redirects to dashboard', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');

    // Should display welcome message
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('AUTH-02: Invalid login shows error message', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, 'WrongPassword123');

    // Should stay on login page
    await expect(page).toHaveURL('/login');

    // Should show error message
    await expect(
      page.locator('text=/invalid|incorrect|error/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('AUTH-03: Session persists after page reload', async ({ page }) => {
    // Login first
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Reload the page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('AUTH-04: Logout redirects to login and clears session', async ({ page }) => {
    // Login first
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Find and click logout
    await logout(page);

    // Should be on login page
    await expect(page).toHaveURL('/login');

    // Try to access protected route
    await page.goto('/expenses');

    // Should redirect back to login
    await expect(page).toHaveURL('/login');
  });

  test('AUTH-05: Protected routes redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected routes without logging in
    const protectedRoutes = ['/expenses', '/approvals', '/vouchers', '/admin/users'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should redirect to login
      await expect(page).toHaveURL('/login');
    }
  });

  test('AUTH-06: Login with non-existent user shows error', async ({ page }) => {
    await login(page, 'nonexistent@tekcellent.com', 'SomePassword123');

    // Should stay on login page
    await expect(page).toHaveURL('/login');

    // Should show error message
    await expect(
      page.locator('text=/invalid|not found|error/i')
    ).toBeVisible({ timeout: 5000 });
  });
});
