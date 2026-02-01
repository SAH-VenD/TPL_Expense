# Expenses Page QA Fixes

## Overview
This task file tracks the implementation of fixes for the Expenses feature based on QA testing. Each section can be loaded progressively as needed.

---

## Phase 1: Backend Endpoint Implementations

### 1.1 Implement Withdraw Endpoint
**File:** `packages/api/src/modules/expenses/expenses.controller.ts`
**Status:** [x] Completed

```
Endpoint: POST /expenses/:id/withdraw
Purpose: Allow user to withdraw a submitted expense
Business Rules:
- Only SUBMITTED or PENDING_APPROVAL status can be withdrawn
- Only the expense owner can withdraw
- Sets status back to DRAFT
```

### 1.2 Implement Bulk Submit Endpoint
**File:** `packages/api/src/modules/expenses/expenses.controller.ts`
**Status:** [x] Completed

```
Endpoint: POST /expenses/bulk-submit
Body: { expenseIds: string[] }
Purpose: Submit multiple draft expenses at once
Business Rules:
- All expenses must be in DRAFT status
- All expenses must belong to current user
- Each expense must have at least one receipt
```

### 1.3 Implement Bulk Delete Endpoint
**File:** `packages/api/src/modules/expenses/expenses.controller.ts`
**Status:** [x] Completed

```
Endpoint: POST /expenses/bulk-delete
Body: { expenseIds: string[] }
Purpose: Delete multiple draft expenses at once
Business Rules:
- All expenses must be in DRAFT status
- All expenses must belong to current user
```

### 1.4 Implement Expense Approvals Endpoint
**File:** `packages/api/src/modules/expenses/expenses.controller.ts`
**Status:** [x] Completed

```
Endpoint: GET /expenses/:expenseId/approvals
Purpose: Get approval history/timeline for an expense
Returns: Array of approval actions with timestamps
```

---

## Phase 2: Backend Filter Support

### 2.1 Add Date Range Filtering
**File:** `packages/api/src/modules/expenses/expenses.service.ts`
**Status:** [x] Completed

```
Parameters: dateFrom, dateTo
Filter expenses by expenseDate within range
```

### 2.2 Add Category Filtering
**File:** `packages/api/src/modules/expenses/expenses.service.ts`
**Status:** [x] Completed

```
Parameter: categoryId
Filter expenses by category
```

### 2.3 Add Amount Range Filtering
**File:** `packages/api/src/modules/expenses/expenses.service.ts`
**Status:** [x] Completed

```
Parameters: amountMin, amountMax
Filter expenses by totalAmount within range
```

### 2.4 Add Search Filtering
**File:** `packages/api/src/modules/expenses/expenses.service.ts`
**Status:** [x] Completed

```
Parameter: search
Search in description, expenseNumber
```

### 2.5 Add Sort Support
**File:** `packages/api/src/modules/expenses/expenses.service.ts`
**Status:** [x] Completed

```
Parameter: sort (e.g., 'createdAt:desc', 'totalAmount:asc')
Support sorting by: createdAt, totalAmount, expenseDate, amount
```

### 2.6 Add Multiple Status Filter
**File:** `packages/api/src/modules/expenses/expenses.service.ts`
**Status:** [x] Completed

```
Parameter: status (comma-separated)
Filter by multiple statuses at once (e.g., status=DRAFT,SUBMITTED)
```

---

## Phase 3: Frontend API Integration

### 3.1 Integrate ExpenseCreatePage with API
**File:** `packages/web/src/pages/expenses/ExpenseCreatePage.tsx`
**Status:** [x] Completed

```
Current: Uses mock delay, form not connected to API
Fix: Connected form submission to createExpense, uploadReceipt, submitExpense mutations
- Added useGetCategoriesQuery for dynamic category loading
- Added proper error handling with toast notifications
- Added receipt upload flow (create expense first, then upload receipts)
```

### 3.2 Replace Mock Comments with API
**File:** `packages/web/src/pages/expenses/ExpenseDetailPage.tsx`
**Status:** [ ] Not Started (Lower priority - comments still use mock data)

```
Current: Uses hardcoded mock comments
Fix: Create comments endpoint and integrate
```

---

## Phase 4: Playwright E2E Tests

### 4.1 Create Expenses E2E Test Suite
**File:** `packages/web/e2e/expenses.spec.ts`
**Status:** [x] Completed

```typescript
// Test cases implemented:
- EXP-01: View expense list page
- EXP-02: Expense list shows filter options
- EXP-03: Filter expenses by status
- EXP-04: View toggle switches between list and grid
- EXP-05: View preference persists in localStorage
- EXP-06: Search expenses by description
- EXP-07: Pagination shows correct controls
- EXP-08: Click on expense row navigates to detail
- EXP-09: Navigate to create expense page
- EXP-10: Create expense form shows step wizard
- EXP-11: Form validation requires mandatory fields
- EXP-12: Navigate through wizard steps
- EXP-13: Can go back between steps
- EXP-14: Review step shows expense summary
- EXP-15: Submit for approval requires receipt
- EXP-16: Cancel navigates back to expenses list
- EXP-17: Checkbox selection available on expense rows
- EXP-18: Select all checkbox works
- EXP-19: Detail page shows expense information
- EXP-20: Detail page shows action buttons based on status
- EXP-21: Approval timeline section exists
- EXP-22: Dashboard quick action navigates to expenses
- EXP-23: Dashboard shows expense summary cards
- EXP-24: Expense list makes correct API call
- EXP-25: Filter updates API call parameters
- EXP-26: Create expense makes POST request
```

### 4.2 Create Test Fixtures
**File:** `packages/web/e2e/fixtures/expenses.ts`
**Status:** [ ] Not Started (Uses existing seed data and test users)

```
- Create test user with expenses
- Create expenses in various statuses
- Set up test data for filters
```

---

## Implementation Order

1. **Phase 1** - Backend endpoints (required for frontend to work) ✅
   - 1.1 Withdraw endpoint ✅
   - 1.2 Bulk submit endpoint ✅
   - 1.3 Bulk delete endpoint ✅
   - 1.4 Approvals endpoint ✅

2. **Phase 2** - Backend filters (improves UX) ✅
   - 2.1-2.6 Filter implementations ✅

3. **Phase 3** - Frontend integration
   - 3.1 Create page integration ✅
   - 3.2 Comments integration (deferred)

4. **Phase 4** - E2E tests
   - 4.1 Playwright tests ✅
   - 4.2 Test fixtures (deferred - uses seed data)

---

## Files Modified

### Backend
- `packages/api/src/modules/expenses/expenses.controller.ts` - Added withdraw, bulk-submit, bulk-delete, approvals endpoints
- `packages/api/src/modules/expenses/expenses.service.ts` - Added methods and filter support
- `packages/api/src/modules/expenses/dto/bulk-expense.dto.ts` - New DTO for bulk operations
- `packages/api/src/modules/expenses/dto/expense-filters.dto.ts` - New DTO for query filters

### Frontend
- `packages/web/src/pages/expenses/ExpenseCreatePage.tsx` - Integrated with API
- `packages/web/src/features/expenses/services/expenses.service.ts` - Fixed upload and bulk mutation signatures

### Tests
- `packages/web/e2e/expenses.spec.ts` - Comprehensive E2E test suite (26 tests)

---

## Testing Commands

```bash
# Run backend tests
npm run test -w @tpl-expense/api -- expenses

# Run frontend tests
npm run test -w @tpl-expense/web -- Expense

# Run Playwright E2E tests
npm run test:e2e -w @tpl-expense/web

# Run specific expense tests
npx playwright test expenses.spec.ts --project=chromium

# Start dev servers for manual testing
npm run dev
```

---

## Verification Checklist

After each phase, verify:
- [x] All new endpoints return correct data
- [x] Error handling works properly
- [x] Frontend integrates without console errors
- [x] Existing functionality still works
- [x] Backend builds successfully
- [ ] Run full Playwright test suite (requires dev servers running)
