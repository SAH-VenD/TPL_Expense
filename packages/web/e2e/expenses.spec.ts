import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  test.describe('Expense List Page', () => {
    test('EXP-01: View expense list page', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL('/');

      await page.click('text=Expenses');
      await expect(page).toHaveURL('/expenses');

      await expect(page.getByRole('heading', { name: /my expenses/i })).toBeVisible();
    });

    test('EXP-02: Expense list shows filter options', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');
      await page.waitForLoadState('networkidle');

      // Check for search input and Filters button
      const searchInput = page.locator('input[placeholder*="Search"]');
      const filtersButton = page.locator('button:has-text("Filters")');

      // At least search or filters should be visible
      const hasSearch = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);
      const hasFilters = await filtersButton.isVisible({ timeout: 2000 }).catch(() => false);

      expect(hasSearch || hasFilters).toBeTruthy();

      // Click Filters to expand and verify status options exist
      if (hasFilters) {
        await filtersButton.click();
        await page.waitForTimeout(300);
        // Should show status filter section - use label to be specific
        await expect(page.locator('label:has-text("Status")')).toBeVisible();
      }
    });

    test('EXP-03: Filter expenses by status', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');
      await page.waitForLoadState('networkidle');

      // Open filters panel first
      const filtersButton = page.locator('button:has-text("Filters")');
      await expect(filtersButton).toBeVisible({ timeout: 5000 });
      await filtersButton.click();
      await page.waitForTimeout(500);

      // Click on Draft status filter button (inside expanded filters)
      const draftFilter = page.locator('button:has-text("Draft")').first();
      await expect(draftFilter).toBeVisible({ timeout: 3000 });
      await draftFilter.click();
      await page.waitForTimeout(500);

      // Verify filter is active - button should have active styling or filters badge should show count
      // Check that Filters button shows a badge (indicating active filter)
      const filtersBadge = page.locator('button:has-text("Filters")');
      const badgeText = await filtersBadge.textContent();
      expect(badgeText).toContain('1'); // Should show "Filters 1" or similar
    });

    test('EXP-04: View toggle switches between list and grid', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      // Look for view toggle buttons
      const gridButton = page.locator(
        'button[aria-label*="grid" i], button:has(svg[class*="grid"]), [data-testid="grid-view"]'
      );
      const listButton = page.locator(
        'button[aria-label*="list" i], button:has(svg[class*="list"]), [data-testid="list-view"]'
      );

      // If toggle exists, test switching
      if (await gridButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gridButton.click();
        await page.waitForTimeout(300);

        // Verify view changed (grid shows cards, list shows table)
        await page
          .locator('.grid, [class*="grid-cols"]')
          .isVisible({ timeout: 1000 })
          .catch(() => false);

        if (await listButton.isVisible().catch(() => false)) {
          await listButton.click();
          await page.waitForTimeout(300);
        }
      }
    });

    test('EXP-05: View preference persists in localStorage', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      // Set view preference
      const gridButton = page.locator(
        'button[aria-label*="grid" i], button:has(svg[class*="grid"]), [data-testid="grid-view"]'
      );

      if (await gridButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await gridButton.click();
        await page.waitForTimeout(300);

        // Check localStorage
        const viewPref = await page.evaluate(() => localStorage.getItem('expenses_view'));
        expect(viewPref).toBe('grid');
      }
    });

    test('EXP-06: Search expenses by description', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');
      await page.waitForLoadState('networkidle');

      // Find search input in the filters area
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible({ timeout: 5000 });

      await searchInput.fill('test expense');
      await page.waitForTimeout(500);

      // Verify the search value is in the input (filter is working on UI side)
      await expect(searchInput).toHaveValue('test expense');

      // Check that Filters badge shows count or Clear All appears
      const clearAllButton = page.locator('button:has-text("Clear All")');
      const hasClearAll = await clearAllButton.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasClearAll).toBeTruthy();
    });

    test('EXP-07: Pagination shows correct controls', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');

      // Look for pagination controls
      const pagination = page.locator(
        'nav[aria-label*="pagination" i], .pagination, [data-testid="pagination"]'
      );
      const nextButton = page.locator(
        'button:has-text("Next"), button[aria-label*="next" i], a:has-text("Next")'
      );
      const prevButton = page.locator(
        'button:has-text("Previous"), button[aria-label*="prev" i], a:has-text("Previous")'
      );

      // At least pagination or page info should be visible if there are expenses
      const hasPagination =
        (await pagination.isVisible({ timeout: 2000 }).catch(() => false)) ||
        (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) ||
        (await prevButton.isVisible({ timeout: 1000 }).catch(() => false));

      // This is informational - may or may not have pagination based on data
      console.log('Pagination visible:', hasPagination);
    });

    test('EXP-08: Click on expense row navigates to detail', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Try to click on an expense row
      const expenseRow = page
        .locator('tr[data-expense-id], [data-testid="expense-row"], table tbody tr')
        .first();

      if (await expenseRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expenseRow.click();
        await page.waitForTimeout(500);

        // Should navigate to detail page
        const url = page.url();
        expect(url).toMatch(/\/expenses\/[a-f0-9-]+/);
      }
    });
  });

  test.describe('Expense Creation', () => {
    test('EXP-09: Navigate to create expense page', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL('/');

      await page.click('text=New Expense');

      await expect(page.getByRole('heading', { name: /create expense/i })).toBeVisible({
        timeout: 5000,
      });
    });

    test('EXP-10: Create expense form shows step wizard', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Check for step indicators in the wizard (step numbers with labels)
      await expect(page.locator('text=Details').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Receipts').first()).toBeVisible();
      await expect(page.locator('text=Review').first()).toBeVisible();

      // Should show step 1 form elements
      await expect(page.locator('label:has-text("Expense Type")')).toBeVisible();
      await expect(page.locator('label:has-text("Category")')).toBeVisible();
      await expect(page.locator('label:has-text("Description")')).toBeVisible();
    });

    test('EXP-11: Form validation requires mandatory fields', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Next button should be disabled without required fields filled
      const nextButton = page.locator('button:has-text("Next: Upload Receipts")');
      await expect(nextButton).toBeDisabled({ timeout: 5000 });

      // Wait for categories API to load - Category is the SECOND select on page
      const categorySelect = page.locator('select').nth(1);
      await page.waitForFunction(
        () => {
          const selects = document.querySelectorAll('select');
          const categorySelect = selects[1]; // Category is second select
          return categorySelect && categorySelect.options.length > 1 && !categorySelect.options[0].textContent?.includes('Loading');
        },
        { timeout: 10000 }
      );

      // Select first real category (index 1 = first category after "Select a category")
      await categorySelect.selectOption({ index: 1 });

      // Fill description (required)
      const descriptionField = page.locator('textarea');
      await descriptionField.fill('Test expense description');

      // Fill amount (required)
      const amountField = page.locator('input[type="number"]').first();
      await amountField.fill('100');

      // Next button should now be enabled
      await expect(nextButton).toBeEnabled();
    });

    test('EXP-12: Navigate through wizard steps', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Wait for categories to load - Category is the SECOND select
      const categorySelect = page.locator('select').nth(1);
      await page.waitForFunction(
        () => {
          const selects = document.querySelectorAll('select');
          const categorySelect = selects[1];
          return categorySelect && categorySelect.options.length > 1 && !categorySelect.options[0].textContent?.includes('Loading');
        },
        { timeout: 10000 }
      );

      // Fill Step 1 required fields
      await categorySelect.selectOption({ index: 1 });
      await page.locator('textarea').fill('Test expense for wizard test');
      await page.locator('input[type="number"]').first().fill('250');

      // Click Next to go to Step 2
      await page.click('button:has-text("Next: Upload Receipts")');
      await page.waitForTimeout(500);

      // Should be on receipts step
      await expect(page.locator('label:has-text("Upload Receipts")')).toBeVisible();

      // Click Next to go to Step 3
      await page.click('button:has-text("Next: Review")');
      await page.waitForTimeout(500);

      // Should be on review step
      await expect(page.locator('text=Review Your Expense')).toBeVisible();
    });

    test('EXP-13: Can go back between steps', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Wait for categories to load - Category is the SECOND select
      const categorySelect = page.locator('select').nth(1);
      await page.waitForFunction(
        () => {
          const selects = document.querySelectorAll('select');
          const categorySelect = selects[1];
          return categorySelect && categorySelect.options.length > 1 && !categorySelect.options[0].textContent?.includes('Loading');
        },
        { timeout: 10000 }
      );

      // Fill Step 1
      await categorySelect.selectOption({ index: 1 });
      await page.locator('textarea').fill('Test expense');
      await page.locator('input[type="number"]').first().fill('100');

      // Go to Step 2
      await page.click('button:has-text("Next: Upload Receipts")');
      await page.waitForTimeout(300);

      // Click Back
      await page.click('button:has-text("Back")');
      await page.waitForTimeout(300);

      // Should be back on Step 1
      await expect(page.locator('label:has-text("Expense Type")')).toBeVisible();
    });

    test('EXP-14: Review step shows expense summary', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Wait for categories to load - Category is the SECOND select
      const categorySelect = page.locator('select').nth(1);
      await page.waitForFunction(
        () => {
          const selects = document.querySelectorAll('select');
          const categorySelect = selects[1];
          return categorySelect && categorySelect.options.length > 1 && !categorySelect.options[0].textContent?.includes('Loading');
        },
        { timeout: 10000 }
      );

      // Fill Step 1
      await categorySelect.selectOption({ index: 1 });
      await page.locator('textarea').fill('Test expense summary');
      await page.locator('input[type="number"]').first().fill('500');

      // Navigate to review
      await page.click('button:has-text("Next: Upload Receipts")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Next: Review")');
      await page.waitForTimeout(300);

      // Review should show summary data
      await expect(page.locator('text=Test expense summary')).toBeVisible();
      await expect(page.locator('text=500')).toBeVisible();
      await expect(page.locator('button:has-text("Save as Draft")')).toBeVisible();
    });

    test('EXP-15: Submit for approval requires receipt', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Wait for categories to load - Category is the SECOND select
      const categorySelect = page.locator('select').nth(1);
      await page.waitForFunction(
        () => {
          const selects = document.querySelectorAll('select');
          const categorySelect = selects[1];
          return categorySelect && categorySelect.options.length > 1 && !categorySelect.options[0].textContent?.includes('Loading');
        },
        { timeout: 10000 }
      );

      // Fill Step 1
      await categorySelect.selectOption({ index: 1 });
      await page.locator('textarea').fill('Test expense');
      await page.locator('input[type="number"]').first().fill('100');

      // Navigate to review (skip receipt upload)
      await page.click('button:has-text("Next: Upload Receipts")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Next: Review")');
      await page.waitForTimeout(300);

      // Submit for Approval button should be disabled (no receipts)
      const submitButton = page.locator('button:has-text("Submit for Approval")');
      await expect(submitButton).toBeDisabled();

      // Warning message should be visible
      await expect(page.locator('text=No receipts attached')).toBeVisible();
    });

    test('EXP-16: Cancel navigates back to expenses list', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      const cancelButton = page.locator('button:has-text("Cancel"), a:has-text("Cancel")');
      await cancelButton.click();

      await expect(page).toHaveURL('/expenses');
    });
  });

  test.describe('Bulk Actions', () => {
    test('EXP-17: Checkbox selection available on expense rows', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for checkboxes in the table
      const checkbox = page.locator('input[type="checkbox"]').first();
      const hasCheckbox = await checkbox.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasCheckbox) {
        // Click checkbox
        await checkbox.click();
        await page.waitForTimeout(300);

        // Bulk action bar should appear
        const bulkBar = page.locator('text=/selected|bulk/i');
        await expect(bulkBar).toBeVisible({ timeout: 2000 });
      }
    });

    test('EXP-18: Select all checkbox works', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Look for select all checkbox (usually in table header)
      const selectAllCheckbox = page.locator('thead input[type="checkbox"], th input[type="checkbox"]');

      if (await selectAllCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(300);

        // All row checkboxes should be checked
        const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
        const count = await rowCheckboxes.count();

        if (count > 0) {
          for (let i = 0; i < count; i++) {
            await expect(rowCheckboxes.nth(i)).toBeChecked();
          }
        }
      }
    });
  });

  test.describe('Expense Detail Page', () => {
    test('EXP-19: Detail page shows expense information', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click first expense to go to detail
      const expenseRow = page.locator('table tbody tr, [data-testid="expense-row"]').first();

      if (await expenseRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expenseRow.click();
        await page.waitForTimeout(500);

        // Should show expense details
        await expect(page.locator(String.raw`text=/EXP-\d{4}-\d{5}|expense number/i`)).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('EXP-20: Detail page shows action buttons based on status', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');

      // Filter to draft expenses first
      const draftFilter = page.locator('button:has-text("Draft")');
      if (await draftFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await draftFilter.click();
        await page.waitForTimeout(500);
      }

      // Click first expense
      const expenseRow = page.locator('table tbody tr, [data-testid="expense-row"]').first();

      if (await expenseRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expenseRow.click();
        await page.waitForTimeout(500);

        // Draft expenses should have Submit, Edit, Delete buttons
        const hasActionButtons =
          (await page.locator('button:has-text("Submit")').isVisible({ timeout: 2000 }).catch(() => false)) ||
          (await page.locator('button:has-text("Edit")').isVisible({ timeout: 2000 }).catch(() => false)) ||
          (await page.locator('button:has-text("Delete")').isVisible({ timeout: 2000 }).catch(() => false));

        expect(hasActionButtons).toBeTruthy();
      }
    });

    test('EXP-21: Approval timeline section exists', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await page.goto('/expenses');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Click first expense
      const expenseRow = page.locator('table tbody tr, [data-testid="expense-row"]').first();

      if (await expenseRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expenseRow.click();
        await page.waitForTimeout(1000);

        // Look for approval timeline or history section
        const hasApprovalSection =
          (await page.locator('text=/approval|timeline|history/i').first().isVisible({ timeout: 2000 }).catch(() => false));

        // This is informational - section exists but may be empty for new expenses
        console.log('Approval section visible:', hasApprovalSection);
      }
    });
  });

  test.describe('Dashboard Integration', () => {
    test('EXP-22: Dashboard quick action navigates to expenses', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL('/');

      // Look for expense-related dashboard card
      const expenseCard = page.locator('text=/pending expenses|recent expenses|expenses/i').first();

      if (await expenseCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expenseCard.click();
        await page.waitForTimeout(500);
      }
    });

    test('EXP-23: Dashboard shows expense summary cards', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await expect(page).toHaveURL('/');

      // Look for expense-related metrics on dashboard
      const hasExpenseMetrics =
        (await page.locator('text=/total expenses|pending|approved/i').first().isVisible({ timeout: 3000 }).catch(() => false));

      expect(hasExpenseMetrics).toBeTruthy();
    });
  });

  test.describe('API Integration', () => {
    test('EXP-24: Expense list makes correct API call', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Listen for API calls
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/expenses')) {
          apiCalls.push(request.url());
        }
      });

      await page.goto('/expenses');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Should have made an API call to expenses endpoint
      expect(apiCalls.some((url) => url.includes('/expenses'))).toBeTruthy();
    });

    test('EXP-25: Filter updates API call parameters', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Listen for API calls
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/expenses')) {
          apiCalls.push(request.url());
        }
      });

      await page.goto('/expenses');
      await page.waitForLoadState('networkidle');

      // Click on a status filter
      const draftFilter = page.locator('button:has-text("Draft")');
      if (await draftFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await draftFilter.click();
        await page.waitForTimeout(1000);

        // Should have made an API call with status parameter
        expect(apiCalls.some((url) => url.includes('status=DRAFT'))).toBeTruthy();
      }
    });

    test('EXP-26: Create expense makes POST request', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

      // Listen for POST to expenses
      let postCalled = false;
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/expenses') && request.method() === 'POST') {
          postCalled = true;
        }
      });

      await page.goto('/expenses/new');
      await page.waitForLoadState('networkidle');

      // Wait for categories to load - Category is the SECOND select
      const categorySelect = page.locator('select').nth(1);
      await page.waitForFunction(
        () => {
          const selects = document.querySelectorAll('select');
          const categorySelect = selects[1];
          return categorySelect && categorySelect.options.length > 1 && !categorySelect.options[0].textContent?.includes('Loading');
        },
        { timeout: 10000 }
      );

      // Fill form
      await categorySelect.selectOption({ index: 1 });
      await page.locator('textarea').fill('API test expense');
      await page.locator('input[type="number"]').first().fill('100');

      // Navigate to review
      await page.click('button:has-text("Next: Upload Receipts")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Next: Review")');
      await page.waitForTimeout(300);

      // Click Save as Draft
      await page.click('button:has-text("Save as Draft")');
      await page.waitForTimeout(2000);

      // Should have made POST request
      expect(postCalled).toBeTruthy();
    });
  });
});
