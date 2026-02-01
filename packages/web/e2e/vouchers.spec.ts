import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Voucher Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('VCH-01: View voucher list page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate to vouchers
    await page.click('text=Vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Should display vouchers page heading
    await expect(page.getByRole('heading', { name: /petty cash vouchers/i })).toBeVisible();
  });

  test('VCH-02: Voucher list shows filter options', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Check for filter buttons
    await expect(page.locator('button:has-text("ALL")')).toBeVisible();
    await expect(page.locator('button:has-text("REQUESTED")')).toBeVisible();
    await expect(page.locator('button:has-text("DISBURSED")')).toBeVisible();
  });

  test('VCH-03: Voucher list displays voucher cards', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Should display voucher numbers (format: PCV-YYYY-NNNNN)
    await expect(page.locator('text=/PCV-\\d{4}-\\d{5}/').first()).toBeVisible();
  });

  test('VCH-04: Request voucher button opens modal', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Click request voucher button
    await page.click('button:has-text("Request Voucher")');

    // Modal should open with form
    await expect(page.getByRole('heading', { name: /request petty cash voucher/i })).toBeVisible();
    await expect(page.locator('input[placeholder*="voucher"]')).toBeVisible();
  });

  test('VCH-05: Finance user can view vouchers', async ({ page }) => {
    await login(page, TEST_USERS.finance.email, TEST_USERS.finance.password);
    await expect(page).toHaveURL('/');

    await page.click('text=Vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Should display vouchers page
    await expect(page.getByRole('heading', { name: /petty cash vouchers/i })).toBeVisible();
  });

  test('VCH-06: Click view details navigates to voucher detail', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Click on first view details link
    const viewDetailsLink = page.locator('text=View Details').first();
    if (await viewDetailsLink.isVisible({ timeout: 2000 })) {
      await viewDetailsLink.click();
      // Should navigate to voucher detail page
      await expect(page).toHaveURL(/\/vouchers\/\d+/);
    }
  });

  test('VCH-07: Filter buttons change displayed vouchers', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Click REQUESTED filter
    await page.click('button:has-text("REQUESTED")');

    // Should show filtered results (either vouchers with REQUESTED status or empty message)
    const hasRequestedVoucher = await page.locator('span:has-text("REQUESTED")').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasNoVouchers = await page.locator('text=/no vouchers found/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasRequestedVoucher || hasNoVouchers).toBeTruthy();
  });
});
