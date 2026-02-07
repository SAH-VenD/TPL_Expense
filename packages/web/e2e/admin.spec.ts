import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('ADM-01: Admin can view users page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate to admin users (directly in sidebar under ADMINISTRATION)
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL('/admin/users');

    // Should display users page heading
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
  });

  test('ADM-02: Users page shows user list', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL('/admin/users');

    // Should have a table or list of users
    await expect(
      page.locator('table, [class*="user-list"], [class*="card"]').first(),
    ).toBeVisible();
  });

  test('ADM-03: Users page has create user button', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL('/admin/users');

    // Should have add/create user button
    await expect(
      page
        .locator(
          'button:has-text("Add User"), button:has-text("Create User"), button:has-text("New User")',
        )
        .first(),
    ).toBeVisible();
  });

  test('ADM-04: Admin can view categories page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Categories' }).click();
    await expect(page).toHaveURL('/admin/categories');

    // Should display categories page heading
    await expect(page.getByRole('heading', { name: /expense categories/i })).toBeVisible();
  });

  test('ADM-05: Categories page shows category list', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Categories' }).click();
    await expect(page).toHaveURL('/admin/categories');

    // Should display category items
    await expect(page.locator('text=Travel').first()).toBeVisible();
    await expect(page.locator('text=Office Supplies').first()).toBeVisible();
  });

  test('ADM-06: Admin can view settings page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/admin/settings');

    // Should display settings page heading
    await expect(page.getByRole('heading', { name: /system settings/i })).toBeVisible();
  });

  test('ADM-07: Admin can view audit logs page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Audit Logs' }).click();
    await expect(page).toHaveURL('/admin/audit-logs');

    // Should display audit logs page heading
    await expect(page.getByRole('heading', { name: /audit logs/i })).toBeVisible();
  });

  test('ADM-08: Employee cannot access admin users page', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await expect(page).toHaveURL('/');

    // Try to access admin users page directly
    await page.goto('/admin/users');

    // Should be redirected or show unauthorized
    await page.waitForTimeout(1000);
    const url = page.url();
    const isRedirected = !url.includes('/admin/users');
    const hasUnauthorized = await page
      .locator('text=/unauthorized|forbidden|access denied/i')
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    expect(isRedirected || hasUnauthorized).toBeTruthy();
  });

  test('ADM-09: Users page has filter options', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate via sidebar
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL('/admin/users');

    // Should have filter buttons for user status (use exact matching)
    await expect(page.getByRole('button', { name: 'ALL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PENDING APPROVAL' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ACTIVE', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'INACTIVE' })).toBeVisible();
  });
});
