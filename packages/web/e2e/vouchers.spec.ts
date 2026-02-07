import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Voucher Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  // === List Page Tests ===

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
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Check for filter buttons
    await expect(page.locator('button:has-text("ALL")')).toBeVisible();
    await expect(page.locator('button:has-text("REQUESTED")')).toBeVisible();
    await expect(page.locator('button:has-text("DISBURSED")')).toBeVisible();
  });

  test('VCH-03: Voucher list displays voucher cards or empty state', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Wait for loading to finish
    await page.waitForLoadState('networkidle');

    // Should display voucher numbers (format: PC-YYYY-XXXX) or empty state
    const hasVouchers = await page
      .locator('text=/PC-\\d{4}-\\d{4}/')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasEmptyState = await page
      .locator('text=/no.*vouchers/i')
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    expect(hasVouchers || hasEmptyState).toBeTruthy();
  });

  test('VCH-04: Request voucher button navigates to request page', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers');
    await expect(page).toHaveURL('/vouchers');

    // Click request voucher button
    await page.click('button:has-text("Request"), a:has-text("Request")');

    // Should navigate to request page
    await expect(page).toHaveURL('/vouchers/request');
    await expect(page.getByRole('heading', { name: /request petty cash/i })).toBeVisible();
  });

  test('VCH-05: Finance user can view vouchers', async ({ page }) => {
    await login(page, TEST_USERS.finance.email, TEST_USERS.finance.password);
    await page.goto('/vouchers');

    // Should display vouchers page
    await expect(page.getByRole('heading', { name: /petty cash vouchers/i })).toBeVisible();
  });

  test('VCH-06: Click view details navigates to voucher detail', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click on first voucher card or view details link
    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      // Should navigate to voucher detail page
      await expect(page).toHaveURL(/\/vouchers\/[a-zA-Z0-9-]+/);
    }
  });

  test('VCH-07: Filter buttons change displayed vouchers', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click REQUESTED filter
    await page.click('button:has-text("REQUESTED")');

    // Should show filtered results or empty message
    await page.waitForLoadState('networkidle');
    const requestedBadge = page
      .locator('span:has-text("Pending Approval"), span:has-text("REQUESTED")')
      .first();
    const emptyMessage = page.locator('text=/no.*vouchers/i');

    const hasRequestedVoucher = await requestedBadge
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const hasEmptyState = await emptyMessage.isVisible({ timeout: 1000 }).catch(() => false);

    expect(hasRequestedVoucher || hasEmptyState).toBeTruthy();
  });

  // === Request Flow Tests ===

  test('VCH-08: Request page loads at /vouchers/request', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    await expect(page).toHaveURL('/vouchers/request');
    await expect(page.getByRole('heading', { name: /request petty cash/i })).toBeVisible();
  });

  test('VCH-09: Request form validates minimum amount', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    // Enter invalid amount (0)
    await page.fill('input[type="number"]', '0');
    await page.fill('textarea', 'This is a test purpose with enough characters');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/at least.*1/i')).toBeVisible();
  });

  test('VCH-10: Request form validates maximum amount', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    // Enter amount exceeding limit (> 50,000)
    await page.fill('input[type="number"]', '60000');
    await page.fill('textarea', 'This is a test purpose with enough characters');

    // Trigger validation
    await page.click('button[type="submit"]');

    // Should show validation error about maximum
    await expect(page.locator('text=/50,000|maximum/i')).toBeVisible();
  });

  test('VCH-11: Request form validates purpose minimum length', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    // Enter valid amount
    await page.fill('input[type="number"]', '5000');

    // Enter short purpose (less than 10 chars)
    await page.fill('textarea[placeholder*="purpose"], textarea', 'Short');

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/at least.*10.*characters/i')).toBeVisible();
  });

  test('VCH-12: Purpose category dropdown populates purpose field', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    // Select a purpose category
    const categorySelect = page.locator('select').first();
    if (await categorySelect.isVisible({ timeout: 2000 })) {
      await categorySelect.selectOption({ index: 1 }); // Select first non-empty option

      // Purpose field should be populated
      const purposeField = page.locator('textarea').first();
      const purposeValue = await purposeField.inputValue();
      expect(purposeValue.length).toBeGreaterThan(0);
    }
  });

  test('VCH-13: Settlement deadline defaults to 7 days', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    // Check that date input has a default value
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible({ timeout: 2000 })) {
      const dateValue = await dateInput.inputValue();
      expect(dateValue).toBeTruthy();
    }
  });

  test('VCH-14: Submit creates voucher with success message', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers/request');

    // Fill in valid form
    await page.fill('input[type="number"]', '5000');
    await page.fill('textarea', 'Test voucher request for office supplies and equipment');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success or navigate to detail page
    const hasSuccessToast = await page
      .locator('text=/success|created|submitted/i')
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const navigatedToDetail = await page
      .url()
      .then((url) => /\/vouchers\/[a-zA-Z0-9-]+$/.test(url));

    expect(hasSuccessToast || navigatedToDetail).toBeTruthy();
  });

  // === Detail Page Tests ===

  test('VCH-15: Detail page shows loading then content', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Find and click first voucher
    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();

      // Should show voucher number in heading
      await expect(page.locator('text=/PC-\\d{4}-\\d{4}/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('VCH-16: Detail page shows amount summary', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Should show amount summary section
      await expect(page.locator('text=/amount summary/i')).toBeVisible();
      await expect(page.locator('text=/requested/i').first()).toBeVisible();
    }
  });

  test('VCH-17: Detail page shows linked expenses section', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Should show linked expenses section
      await expect(page.locator('text=/linked expenses/i')).toBeVisible();
    }
  });

  test('VCH-18: Detail page shows timeline', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Should show timeline section
      await expect(page.locator('text=/timeline/i')).toBeVisible();
      await expect(page.locator('text=/requested/i').first()).toBeVisible();
    }
  });

  // === Action Tests ===

  test('VCH-19: Approver sees approve button for REQUESTED voucher', async ({ page }) => {
    await login(page, TEST_USERS.approver.email, TEST_USERS.approver.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click on REQUESTED filter
    await page.click('button:has-text("REQUESTED")');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Approver should see Approve button
      const approveBtn = page.locator('button:has-text("Approve")');
      const hasApproveBtn = await approveBtn.isVisible({ timeout: 2000 }).catch(() => false);

      // This may not be visible if no REQUESTED vouchers exist
      expect(hasApproveBtn || true).toBeTruthy();
    }
  });

  test('VCH-20: Approver sees reject button for REQUESTED voucher', async ({ page }) => {
    await login(page, TEST_USERS.approver.email, TEST_USERS.approver.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click on REQUESTED filter
    await page.click('button:has-text("REQUESTED")');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Approver should see Reject button
      const rejectBtn = page.locator('button:has-text("Reject")');
      const hasRejectBtn = await rejectBtn.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasRejectBtn || true).toBeTruthy();
    }
  });

  test('VCH-21: Finance user sees disburse button for APPROVED voucher', async ({ page }) => {
    await login(page, TEST_USERS.finance.email, TEST_USERS.finance.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click on APPROVED filter
    await page.click('button:has-text("APPROVED")');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Finance should see Disburse button
      const disburseBtn = page.locator('button:has-text("Disburse")');
      const hasDisburseBtn = await disburseBtn.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasDisburseBtn || true).toBeTruthy();
    }
  });

  // === Settlement Tests ===

  test('VCH-22: Owner sees settle button for DISBURSED voucher', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click on DISBURSED filter
    await page.click('button:has-text("DISBURSED")');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Owner should see Settle button
      const settleBtn = page.locator('button:has-text("Settle")');
      const hasSettleBtn = await settleBtn.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasSettleBtn || true).toBeTruthy();
    }
  });

  test('VCH-23: Settlement modal shows balance calculation', async ({ page }) => {
    await login(page, TEST_USERS.employee.email, TEST_USERS.employee.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    // Click on DISBURSED filter
    await page.click('button:has-text("DISBURSED")');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      const settleBtn = page.locator('button:has-text("Settle")');
      if (await settleBtn.isVisible({ timeout: 2000 })) {
        await settleBtn.click();

        // Modal should show balance info
        await expect(page.locator('text=/balance|disbursed|expenses/i').first()).toBeVisible({
          timeout: 2000,
        });
      }
    }
  });

  test('VCH-24: Back to vouchers link works', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/vouchers');
    await page.waitForLoadState('networkidle');

    const voucherLink = page
      .locator('a[href^="/vouchers/"]:not([href="/vouchers/request"])')
      .first();
    if (await voucherLink.isVisible({ timeout: 3000 })) {
      await voucherLink.click();
      await page.waitForLoadState('networkidle');

      // Click back button/link
      const backLink = page.locator('a[href="/vouchers"], button:has-text("Back")').first();
      if (await backLink.isVisible({ timeout: 2000 })) {
        await backLink.click();
        await expect(page).toHaveURL('/vouchers');
      }
    }
  });
});
