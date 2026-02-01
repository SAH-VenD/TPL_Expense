import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('DASH-01: Dashboard loads with welcome message and stats', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Should display welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Should display stats cards (use .first() to avoid strict mode violation)
    await expect(page.locator('text=Pending Expenses').first()).toBeVisible();
    await expect(page.locator('text=Approved This Month').first()).toBeVisible();
    await expect(page.locator('text=Pending Approvals').first()).toBeVisible();
    await expect(page.locator('text=Active Vouchers').first()).toBeVisible();
  });

  test('DASH-02: Dashboard shows recent expenses section', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Should display recent expenses section
    await expect(page.getByRole('heading', { name: 'Recent Expenses' })).toBeVisible();
  });

  test('DASH-03: Dashboard shows pending approvals section', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Should display pending approvals section
    await expect(page.getByRole('heading', { name: 'Pending Approvals' })).toBeVisible();

    // Should have approve/reject buttons
    await expect(page.locator('button:has-text("Approve")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Reject")').first()).toBeVisible();
  });

  test('DASH-04: Dashboard shows budget overview', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Should display budget overview section
    await expect(page.getByRole('heading', { name: 'Budget Overview' })).toBeVisible();

    // Should show budget categories
    await expect(page.locator('text=Department Budget')).toBeVisible();
    await expect(page.locator('text=Travel Budget')).toBeVisible();
  });

  test('DASH-05: Employee user sees dashboard', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await expect(page).toHaveURL('/');

    // Employee should also see the welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });
});
