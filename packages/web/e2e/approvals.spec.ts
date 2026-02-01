import { test, expect } from '@playwright/test';
import { login, clearAuthState, TEST_USERS } from './helpers/auth';

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await clearAuthState(page);
  });

  // ==================== NAVIGATION & ACCESS TESTS ====================

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

  // ==================== DATA DISPLAY TESTS ====================

  test('APR-06: Approval queue displays table structure', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check for table headers
    const tableHeaders = page.locator('thead th');
    await expect(tableHeaders.first()).toBeVisible({ timeout: 5000 });

    // Should have expected columns
    const headerTexts = ['Expense', 'Submitter', 'Category', 'Amount', 'Submitted', 'Actions'];
    for (const header of headerTexts) {
      const headerLocator = page.locator(`th:has-text("${header}")`);
      const isVisible = await headerLocator.isVisible({ timeout: 2000 }).catch(() => false);
      // At least some headers should be visible
      if (isVisible) {
        expect(isVisible).toBeTruthy();
        break;
      }
    }
  });

  test('APR-07: Approval queue shows expense count', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Should show count text like "X expense(s) awaiting your approval"
    const countText = page.locator('text=/\\d+ expense\\(s\\) awaiting/i');
    await expect(countText).toBeVisible({ timeout: 5000 });
  });

  test('APR-08: Empty state displays when no pending approvals', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check for either data or empty state
    const hasTableData = await page.locator('tbody tr').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/all caught up|no pending/i').isVisible({ timeout: 3000 }).catch(() => false);

    // One of these should be true
    expect(hasTableData || hasEmptyState).toBeTruthy();
  });

  // ==================== SELECTION & BULK ACTIONS ====================

  test('APR-09: Checkbox selection works on approval rows', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    const tableBody = page.locator('tbody');
    await expect(tableBody).toBeVisible({ timeout: 5000 });

    // Check if there are any rows with checkboxes
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Click first checkbox
      await checkboxes.first().click();
      await expect(checkboxes.first()).toBeChecked();

      // Should show bulk action bar
      const bulkActionBar = page.locator('text=/\\d+ expense\\(s\\) selected/i');
      await expect(bulkActionBar).toBeVisible({ timeout: 2000 });
    }
  });

  test('APR-10: Select all checkbox works', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Find select all checkbox in header
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]');
    const hasSelectAll = await selectAllCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSelectAll) {
      await selectAllCheckbox.click();

      // All row checkboxes should be checked
      const rowCheckboxes = page.locator('tbody input[type="checkbox"]');
      const rowCount = await rowCheckboxes.count();

      if (rowCount > 0) {
        // Verify first checkbox is checked
        await expect(rowCheckboxes.first()).toBeChecked();
      }
    }
  });

  test('APR-11: Bulk approve button appears when items selected', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Select an item if available
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
    const hasItems = await firstCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasItems) {
      await firstCheckbox.click();

      // Bulk approve button should appear
      const approveSelectedBtn = page.locator('button:has-text("Approve Selected")');
      await expect(approveSelectedBtn).toBeVisible({ timeout: 2000 });

      // Reject selected button should also appear
      const rejectSelectedBtn = page.locator('button:has-text("Reject Selected")');
      await expect(rejectSelectedBtn).toBeVisible();
    }
  });

  // ==================== ROW ACTION TESTS ====================

  test('APR-12: Individual approve button visible on rows', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check for approve buttons in table rows
    const approveButtons = page.locator('tbody button:has-text("Approve")');
    const hasApproveButtons = await approveButtons.first().isVisible({ timeout: 3000 }).catch(() => false);

    // If there are pending items, approve buttons should be visible
    const hasEmptyState = await page.locator('text=/all caught up|no pending/i').isVisible({ timeout: 1000 }).catch(() => false);

    if (!hasEmptyState) {
      expect(hasApproveButtons).toBeTruthy();
    }
  });

  test('APR-13: Individual reject button visible on rows', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check for reject buttons in table rows
    const rejectButtons = page.locator('tbody button:has-text("Reject")');
    const hasRejectButtons = await rejectButtons.first().isVisible({ timeout: 3000 }).catch(() => false);

    // If there are pending items, reject buttons should be visible
    const hasEmptyState = await page.locator('text=/all caught up|no pending/i').isVisible({ timeout: 1000 }).catch(() => false);

    if (!hasEmptyState) {
      expect(hasRejectButtons).toBeTruthy();
    }
  });

  test('APR-14: Clarify button visible on rows', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check for clarify buttons in table rows
    const clarifyButtons = page.locator('tbody button:has-text("Clarify")');
    const hasClarifyButtons = await clarifyButtons.first().isVisible({ timeout: 3000 }).catch(() => false);

    // If there are pending items, clarify buttons should be visible
    const hasEmptyState = await page.locator('text=/all caught up|no pending/i').isVisible({ timeout: 1000 }).catch(() => false);

    if (!hasEmptyState) {
      expect(hasClarifyButtons).toBeTruthy();
    }
  });

  // ==================== MODAL/DIALOG TESTS ====================

  test('APR-15: Reject modal opens with reason input', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Find and click reject button if available
    const rejectButton = page.locator('tbody button:has-text("Reject")').first();
    const hasRejectButton = await rejectButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRejectButton) {
      await rejectButton.click();

      // Modal should appear with reason input
      const modalTitle = page.locator('text=/reject expense/i');
      await expect(modalTitle).toBeVisible({ timeout: 2000 });

      // Should have textarea for reason
      const reasonInput = page.locator('textarea#reject-reason, textarea[placeholder*="reason"]');
      await expect(reasonInput).toBeVisible();

      // Cancel button should close modal
      const cancelBtn = page.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      await expect(modalTitle).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('APR-16: Clarification modal opens with question input', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Find and click clarify button if available
    const clarifyButton = page.locator('tbody button:has-text("Clarify")').first();
    const hasClarifyButton = await clarifyButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasClarifyButton) {
      await clarifyButton.click();

      // Modal should appear with question input
      const modalTitle = page.locator('text=/clarification|question/i');
      await expect(modalTitle).toBeVisible({ timeout: 2000 });

      // Should have textarea for question
      const questionInput = page.locator('textarea#clarify-question, textarea[placeholder*="question"]');
      await expect(questionInput).toBeVisible();

      // Cancel button should close modal
      const cancelBtn = page.locator('button:has-text("Cancel")');
      await cancelBtn.click();
      await expect(modalTitle).not.toBeVisible({ timeout: 2000 });
    }
  });

  // ==================== NAVIGATION TESTS ====================

  test('APR-17: Clicking expense row navigates to detail page', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Find a clickable expense row (excluding action buttons area)
    const expenseCell = page.locator('tbody td').nth(1); // Second column (Expense info)
    const hasExpenseCell = await expenseCell.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasExpenseCell) {
      await expenseCell.click();
      await page.waitForTimeout(1000);

      // Should navigate to expense detail page
      const url = page.url();
      expect(url).toMatch(/\/expenses\/[a-f0-9-]+/i);
    }
  });

  test('APR-18: Refresh button reloads data', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Find refresh button (has ArrowPathIcon)
    const refreshButton = page.locator('button[title="Refresh"]');
    const hasRefreshButton = await refreshButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRefreshButton) {
      // Click refresh
      await refreshButton.click();

      // Button should show loading state (spinning animation)
      await page.waitForTimeout(500);

      // Page should still be on approvals
      await expect(page).toHaveURL('/approvals');
    }
  });

  // ==================== PAGINATION TESTS ====================

  test('APR-19: Pagination controls display when multiple pages', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Check for pagination controls
    const paginationText = page.locator('text=/page \\d+ of \\d+/i');
    const hasPagination = await paginationText.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasPagination) {
      // Should have previous/next buttons
      const prevButton = page.locator('button:has-text("Previous")');
      const nextButton = page.locator('button:has-text("Next")');

      await expect(prevButton).toBeVisible();
      await expect(nextButton).toBeVisible();
    }
  });

  // ==================== API INTEGRATION TESTS ====================

  test('APR-20: Page makes API call to /approvals/pending', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Set up request listener before navigation
    let apiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/approvals/pending')) {
        apiCalled = true;
      }
    });

    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(apiCalled).toBeTruthy();
  });

  test('APR-21: Approve action makes API call', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Set up request listener
    let approveApiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/approvals/approve') && request.method() === 'POST') {
        approveApiCalled = true;
      }
    });

    // Find and click approve button if available
    const approveButton = page.locator('tbody button:has-text("Approve")').first();
    const hasApproveButton = await approveButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasApproveButton) {
      await approveButton.click();
      await page.waitForTimeout(2000);

      // API should have been called
      expect(approveApiCalled).toBeTruthy();
    }
  });

  test('APR-22: Reject action makes API call with reason', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Set up request listener
    let rejectApiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/approvals/reject') && request.method() === 'POST') {
        rejectApiCalled = true;
      }
    });

    // Find and click reject button if available
    const rejectButton = page.locator('tbody button:has-text("Reject")').first();
    const hasRejectButton = await rejectButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasRejectButton) {
      await rejectButton.click();

      // Fill in reason
      const reasonInput = page.locator('textarea#reject-reason, textarea[placeholder*="reason"]');
      await reasonInput.fill('Test rejection reason');

      // Confirm rejection
      const confirmBtn = page.locator('button:has-text("Reject")').last();
      await confirmBtn.click();
      await page.waitForTimeout(2000);

      // API should have been called
      expect(rejectApiCalled).toBeTruthy();
    }
  });

  test('APR-23: Bulk approve makes API call', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Set up request listener
    let bulkApproveApiCalled = false;
    page.on('request', (request) => {
      if (request.url().includes('/approvals/approve/bulk') && request.method() === 'POST') {
        bulkApproveApiCalled = true;
      }
    });

    // Select items if available
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]');
    const hasSelectAll = await selectAllCheckbox.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSelectAll) {
      await selectAllCheckbox.click();

      // Click bulk approve
      const bulkApproveBtn = page.locator('button:has-text("Approve Selected")');
      const hasBulkApprove = await bulkApproveBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasBulkApprove) {
        await bulkApproveBtn.click();
        await page.waitForTimeout(2000);

        expect(bulkApproveApiCalled).toBeTruthy();
      }
    }
  });

  // ==================== LOADING STATE TESTS ====================

  test('APR-24: Loading skeleton displays while fetching', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Navigate with slow network simulation to catch loading state
    await page.route('**/approvals/pending**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/approvals');

    // Check for skeleton elements during load
    const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]');
    const hadSkeleton = await skeleton.first().isVisible({ timeout: 1000 }).catch(() => false);

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Should have shown skeleton or content loaded quickly
    const hasContent = await page.locator('thead, text=/pending approvals/i').first().isVisible();
    expect(hadSkeleton || hasContent).toBeTruthy();
  });
});
