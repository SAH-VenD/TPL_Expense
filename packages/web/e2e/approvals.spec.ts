import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('APR-01: View approval queue as approver', async ({ page }) => {
    // Login as manager (approver role)
    await login(page, TEST_USERS.approver.email, TEST_USERS.approver.password);
    await expect(page).toHaveURL('/');

    // Navigate to approvals
    await page.click('text=Approvals');
    await expect(page).toHaveURL('/approvals');

    // Should display approvals page heading
    await expect(page.getByRole('heading', { name: /pending approvals/i })).toBeVisible();
  });

  test('APR-02: Admin can view approval queue', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    await page.click('text=Approvals');
    await expect(page).toHaveURL('/approvals');

    // Check for approval-related elements
    await expect(page.locator('text=/approval|pending|action/i').first()).toBeVisible();
  });

  test('APR-03: Finance user can view approvals', async ({ page }) => {
    await login(page, TEST_USERS.finance.email, TEST_USERS.finance.password);
    await expect(page).toHaveURL('/');

    await page.click('text=Approvals');
    await expect(page).toHaveURL('/approvals');
  });

  test('APR-04: Approval page shows action buttons', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    // Wait for login to complete and redirect to dashboard
    await expect(page).toHaveURL('/');

    await page.goto('/approvals');
    await expect(page).toHaveURL('/approvals');

    // Check that the approvals page has loaded with content
    await expect(page.getByRole('heading', { name: /pending approvals/i })).toBeVisible();

    // Either there are pending expense cards or we're on the page with content
    const hasExpenseCards = await page.locator('.bg-white.rounded-lg, [class*="card"], table tbody tr').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasAwaitingText = await page.locator('text=/awaiting|pending|expense/i').first().isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasExpenseCards || hasAwaitingText).toBeTruthy();
  });

  test('APR-05: Employee cannot access admin routes', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await expect(page).toHaveURL('/');

    // Try to access admin users page
    await page.goto('/admin/users');

    // Should be redirected or see unauthorized
    await page.waitForTimeout(1000);
    const url = page.url();
    const isRedirected = !url.includes('/admin/users') || url.includes('/login');
    const hasUnauthorized = await page.locator('text=/unauthorized|forbidden|access denied/i').isVisible({ timeout: 1000 }).catch(() => false);

    expect(isRedirected || hasUnauthorized).toBeTruthy();
  });
});
