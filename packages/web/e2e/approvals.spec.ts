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

    // Should display approvals page
    await expect(page.locator('text=/approval|pending/i')).toBeVisible();
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
    await page.goto('/approvals');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Check for approve/reject buttons if there are pending items
    const approveBtn = page.locator('button:has-text("Approve")').first();
    const rejectBtn = page.locator('button:has-text("Reject")').first();

    // Either buttons should be visible or "no pending" message
    const hasApproveBtn = await approveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasRejectBtn = await rejectBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasNoPending = await page.locator('text=/no pending|no items|empty/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasApproveBtn || hasRejectBtn || hasNoPending).toBeTruthy();
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
