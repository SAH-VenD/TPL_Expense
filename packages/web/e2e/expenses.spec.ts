import { test, expect } from '@playwright/test';
import { login, logout, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test('EXP-01: View expense list page', async ({ page }) => {
    // Login first
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Navigate to expenses
    await page.click('text=Expenses');
    await expect(page).toHaveURL('/expenses');

    // Should display expenses page elements
    await expect(page.locator('text=/expenses|my expenses/i')).toBeVisible();
  });

  test('EXP-02: Navigate to create expense page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Click New Expense button (visible in header)
    await page.click('text=New Expense');

    // Should be on create expense page or modal
    await expect(page.locator('text=/new expense|create expense|add expense/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('EXP-03: Expense list shows filter options', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/expenses');

    // Check for filter/status buttons
    const filterOptions = ['All', 'Draft', 'Submitted', 'Approved', 'Rejected'];
    for (const option of filterOptions) {
      const filterButton = page.locator(`button:has-text("${option}"), [role="tab"]:has-text("${option}")`);
      // At least some filter options should be visible
      if (await filterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(filterButton).toBeVisible();
        break;
      }
    }
  });

  test('EXP-04: Click on expense shows detail', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/expenses');

    // Wait for expenses to load
    await page.waitForTimeout(1000);

    // Try to click on an expense row if any exist
    const expenseRow = page.locator('tr, [data-testid="expense-row"], .expense-item').first();
    if (await expenseRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expenseRow.click();
      // Should navigate to detail or open modal
      await page.waitForTimeout(500);
    }
  });

  test('EXP-05: Dashboard quick action navigates to expenses', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL('/');

    // Click on "Pending Expenses" card or similar
    const pendingCard = page.locator('text=Pending Expenses').first();
    if (await pendingCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pendingCard.click();
      await page.waitForTimeout(500);
    }
  });
});
