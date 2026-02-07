import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('RPT-01: Reports page loads', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate to reports
    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL('/reports');

    // Should display reports page heading
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();
  });

  test('RPT-02: Reports page shows report type options', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL('/reports');

    // Should display report types
    await expect(page.locator('text=Spend by Department').first()).toBeVisible();
    await expect(page.locator('text=Spend by Category').first()).toBeVisible();
    await expect(page.locator('text=Budget vs Actual').first()).toBeVisible();
  });

  test('RPT-03: Reports page has date range filters after selecting report', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL('/reports');

    // Select a report type to show date filters
    await page.locator('text=Spend by Department').first().click();

    // Should have date inputs or date labels
    const hasDateInput = await page
      .locator('input[type="date"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const hasDateLabel = await page
      .locator('text=/start date|end date|from|to/i')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(hasDateInput || hasDateLabel).toBeTruthy();
  });

  test('RPT-04: Selecting report type enables generation', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL('/reports');

    // Click on a report type card
    await page.locator('text=Spend by Department').first().click();

    // Generate button should be visible
    await expect(page.locator('button:has-text("Generate Report")').first()).toBeVisible();
  });

  test('RPT-05: Finance user can access reports', async ({ page }) => {
    await login(page, TEST_USERS.finance.email, TEST_USERS.finance.password);
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL('/reports');

    // Should display reports page
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();
  });

  test('RPT-06: Reports page shows export options', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    await page.getByRole('link', { name: 'Reports' }).click();
    await expect(page).toHaveURL('/reports');

    // Select a report type
    await page.locator('text=Spend by Department').first().click();

    // Should show export options
    const hasExport = await page
      .locator('text=/export|xlsx|csv|pdf/i')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const hasExportButton = await page
      .locator('button:has-text("Export")')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(hasExport || hasExportButton).toBeTruthy();
  });
});
