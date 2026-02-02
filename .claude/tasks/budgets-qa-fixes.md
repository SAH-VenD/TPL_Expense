# Budgets Page QA Fixes

## Overview
This task file tracks the implementation of fixes for the Budgets feature based on QA testing. Each section can be loaded progressively as needed. Based on the blueprint from `approvals-qa-fixes.md`.

---

## Critical Issues Summary

| Issue | Severity | Component | Status |
|-------|----------|-----------|--------|
| **Seed data mismatch - 0% budget utilization** | Critical | Seed Data | [ ] Not Started |
| No pagination on GET /budgets | Critical | Backend | [ ] Not Started |
| Missing 8 frontend mutations/queries | Critical | Frontend Service | [ ] Not Started |
| BudgetUtilization type mismatch | High | Frontend Types | [ ] Not Started |
| Budget.usedAmount field doesn't exist | High | Frontend Pages | [ ] Not Started |
| E2E tests only check routing (25 tests) | Medium | Tests | [ ] Not Started |

---

## Phase 0: Seed Data Fix (Budget Utilization Shows 0%)

### Problem Summary
The Budgets page shows 0% utilization for all budgets despite having [TEST] expenses and [TEST] budgets in the database. The root cause is a **data mismatch** in the seed-test-data.ts file.

### 0.1 Root Cause Analysis
**File:** `packages/api/prisma/seed-test-data.ts`
**Status:** [ ] Not Started

```
Finding 1: Department ID Mismatch
- Expenses use child departments (indices 5-9):
  - departments[5] = [TEST] Frontend Team
  - departments[7] = [TEST] Accounts Payable
  - departments[8] = [TEST] Digital Marketing
- Budgets use parent departments (indices 0-4):
  - departments[0] = [TEST] Engineering
  - departments[1] = [TEST] Finance
  - departments[2] = [TEST] Marketing

Finding 2: Budget Matching Logic
The buildExpenseWhereClause() in budgets.service.ts:873 uses direct ID matching:
- DEPARTMENT: expense.departmentId = budget.departmentId (no child traversal)
- PROJECT: expense.projectId = budget.projectId
- CATEGORY: expense.categoryId = budget.categoryId
- EMPLOYEE: expense.submitterId = budget.employeeId

Child departments (Frontend Team) don't match parent departments (Engineering), so expenses aren't counted.

Finding 3: Only 2/10 Expenses Have Explicit budgetId
- TEST-EXP-2026-001 → Travel Category Budget
- TEST-EXP-2026-010 → Engineering Annual Budget

All other expenses rely on implicit matching which fails due to the department mismatch.
```

### 0.2 Fix Expense Department IDs
**File:** `packages/api/prisma/seed-test-data.ts`
**Status:** [ ] Not Started

```
Changes to seedExpenses function (starting line 627):

| Expense | Change Required |
|---------|----------------|
| TEST-EXP-2026-001 | Keep as-is (has budgetId) |
| TEST-EXP-2026-002 | Change departmentId: departments[5] → departments[0] |
| TEST-EXP-2026-003 | DRAFT status - won't count anyway |
| TEST-EXP-2026-004 | REJECTED status - won't count anyway |
| TEST-EXP-2026-005 | Change departmentId: departments[5] → departments[0] |
| TEST-EXP-2026-006 | Change departmentId: departments[5] → departments[0] |
| TEST-EXP-2026-007 | Change departmentId: departments[8] → departments[2] |
| TEST-EXP-2026-008 | Change departmentId: departments[7] → departments[1] |
| TEST-EXP-2026-009 | Change departmentId: departments[5] → departments[0] |
| TEST-EXP-2026-010 | Keep as-is (has budgetId) |
```

### 0.3 Add Budget Matching Variety
**File:** `packages/api/prisma/seed-test-data.ts`
**Status:** [ ] Not Started

```
Update some expenses to also match:
- Project budgets (via projectId matching a budget with that project)
- Category budgets (via categoryId matching category budgets)
- Employee budgets (via submitterId matching employee budget's employeeId)
```

### 0.4 Expected Results After Fix
```
With proper matching:
- Engineering Annual Budget (departments[0]): ~5 expenses should match → non-zero utilization
- Finance Quarterly Budget (departments[1]): ~1 expense should match
- Marketing Monthly Budget (departments[2]): ~1 expense should match
```

### 0.5 Verification Steps
```bash
# Reset and re-seed the database:
npm run db:migrate:reset -w @tpl-expense/api
npm run db:seed -w @tpl-expense/api

# Start the application and check:
# - Navigate to /budgets page
# - Verify utilization percentages are non-zero
# - Verify "X expenses" counts are non-zero

# Test API directly:
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/budgets/summary
# Should return budgets with utilizationPercentage > 0 and expenseCount > 0
```

---

## Phase 1: Backend Pagination Support

### 1.1 Add Pagination to findAll Method
**File:** `packages/api/src/modules/budgets/budgets.service.ts`
**Status:** [ ] Not Started

```
Current Issue: findAll() returns raw array without pagination (lines 73-93)
Fix: Add page/pageSize parameters and return paginated response

Changes:
- Add page: number = 1 and pageSize: number = 10 parameters
- Use Promise.all with findMany and count
- Add skip: (page - 1) * pageSize and take: pageSize
- Return { data, meta: { pagination: { page, pageSize, total, totalPages } } }
```

### 1.2 Update Controller to Accept Pagination Params
**File:** `packages/api/src/modules/budgets/budgets.controller.ts`
**Status:** [ ] Not Started

```
Current Issue: Controller doesn't pass pagination params (lines 58-71)
Fix: Add @Query decorators for page and pageSize

Changes:
- Add @ApiQuery({ name: 'page', type: Number, required: false })
- Add @ApiQuery({ name: 'pageSize', type: Number, required: false })
- Parse and pass page/pageSize to service method
```

---

## Phase 2: Frontend Type Alignment

### 2.1 Fix BudgetUtilization Interface
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Current Frontend Type (lines 32-38):
- utilizationPercent
- remainingAmount
- isWarning
- isExceeded
- budget: Budget (nested)

Backend Returns (BudgetUtilizationDto):
- budgetId, budgetName, type, period
- allocated, committed, spent, available
- utilizationPercentage
- isOverBudget, isAtWarningThreshold
- warningThreshold, expenseCount, pendingCount
- startDate, endDate, enforcement

Fix: Update frontend interface to match backend response exactly
```

### 2.2 Remove usedAmount from Budget Interface
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Current Issue: Budget interface has usedAmount (line 20) but backend doesn't provide it
Backend: Utilization data comes from separate /budgets/:id/utilization endpoint

Fix: Remove usedAmount field from Budget interface
- Pages should use useGetBudgetUtilizationQuery for utilization data
- Or use getBudgetSummary for bulk utilization data
```

### 2.3 Add Missing Type Definitions
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Types to Add:
- BudgetStatus: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
- EnforcementAction: 'HARD_BLOCK' | 'SOFT_WARNING' | 'ESCALATE' | 'NONE'
- BudgetCheckResult (for check-expense response)
- ExpenseBudgetCheck (for check-expense response)
- BudgetSummary (for summary endpoint)
- BudgetTransferResult (for transfer response)
- TransferBudgetDto (for transfer request)
- CheckExpenseDto (for check-expense request)
- BudgetPeriodDates (for period-dates response)
- CurrentPeriod (for current-period response)
- BudgetSummaryQueryParams (for summary request)
- PeriodDatesParams (for period-dates request)
```

---

## Phase 3: Frontend Service Endpoint Additions

### 3.1 Add Status Management Mutations
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Backend endpoints exist but frontend service missing:
- POST /budgets/:id/activate → activateBudget mutation
- POST /budgets/:id/close → closeBudget mutation
- POST /budgets/:id/archive → archiveBudget mutation

Implementation:
activateBudget: builder.mutation<Budget, string>({
  query: (id) => ({ url: `/budgets/${id}/activate`, method: 'POST' }),
  invalidatesTags: ['Budget'],
}),
// Similar for closeBudget and archiveBudget
```

### 3.2 Add Budget Transfer Mutation
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Backend: POST /budgets/transfer
Request body: { fromBudgetId, toBudgetId, amount, reason, notes? }
Response: BudgetTransferResult

Implementation:
transferBudget: builder.mutation<BudgetTransferResult, TransferBudgetDto>({
  query: (body) => ({ url: '/budgets/transfer', method: 'POST', body }),
  invalidatesTags: ['Budget'],
}),
```

### 3.3 Add Check Expense Mutation
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Backend: POST /budgets/check-expense
Request body: { amount, departmentId?, projectId?, categoryId?, costCenterId?, employeeId?, budgetId?, expenseDate? }
Response: ExpenseBudgetCheck

Implementation:
checkExpense: builder.mutation<ExpenseBudgetCheck, CheckExpenseDto>({
  query: (body) => ({ url: '/budgets/check-expense', method: 'POST', body }),
}),
```

### 3.4 Add Budget Summary Query
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Backend: GET /budgets/summary
Query params: { type?, periodType?, departmentId?, projectId?, fiscalYear?, quarter?, activeOnly? }
Response: BudgetSummary

Implementation:
getBudgetSummary: builder.query<BudgetSummary, BudgetSummaryQueryParams>({
  query: (params) => ({ url: '/budgets/summary', params }),
  providesTags: ['Budget'],
}),
```

### 3.5 Add Period Utility Queries
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Backend endpoints:
- GET /budgets/period-dates → getPeriodDates query
- GET /budgets/current-period → getCurrentPeriod query

Implementation:
getPeriodDates: builder.query<BudgetPeriodDates, PeriodDatesParams>({
  query: ({ periodType, fiscalYear, quarter, month }) => ({
    url: '/budgets/period-dates',
    params: { periodType, fiscalYear, quarter, month },
  }),
}),

getCurrentPeriod: builder.query<CurrentPeriod, BudgetPeriod>({
  query: (periodType) => ({
    url: '/budgets/current-period',
    params: { periodType },
  }),
}),
```

### 3.6 Export New Hooks
**File:** `packages/web/src/features/budgets/services/budgets.service.ts`
**Status:** [ ] Not Started

```
Add to exports:
- useActivateBudgetMutation
- useCloseBudgetMutation
- useArchiveBudgetMutation
- useTransferBudgetMutation
- useCheckExpenseMutation
- useGetBudgetSummaryQuery
- useGetPeriodDatesQuery
- useGetCurrentPeriodQuery
```

---

## Phase 4: Frontend Page Fixes

### 4.1 Update BudgetListPage Utilization Display
**File:** `packages/web/src/pages/budgets/BudgetListPage.tsx`
**Status:** [ ] Not Started

```
Current Issue: Uses budget.usedAmount which doesn't exist in API response
Location: Lines using usedAmount for utilization calculation

Fix Options:
A) Use getBudgetSummary query which includes utilization for all budgets
B) Compute from utilization endpoint for each budget

Recommended: Option A - Use summary query for bulk data

Changes:
- Import useGetBudgetSummaryQuery
- Replace useGetBudgetsQuery with summary query (or combine both)
- Update utilization calculation to use committed + spent
- Handle new pagination response format
```

### 4.2 Update BudgetDetailPage Utilization Display
**File:** `packages/web/src/pages/budgets/BudgetDetailPage.tsx`
**Status:** [ ] Not Started

```
Current Issue: Uses budget.usedAmount which doesn't exist
Location: Lines 160-163, 299 using usedAmount

Fix:
- Already uses useGetBudgetUtilizationQuery - ensure it's being used
- Replace usedAmount references with utilization.committed + utilization.spent
- Update field names to match backend (utilizationPercentage, available, etc.)
```

### 4.3 Add Status Management Actions
**File:** `packages/web/src/pages/budgets/BudgetDetailPage.tsx`
**Status:** [ ] Not Started

```
Enhancement: Add buttons for status management based on current status

Changes:
- Import useActivateBudgetMutation, useCloseBudgetMutation, useArchiveBudgetMutation
- Add handlers for activate, close, archive with toast notifications
- Add conditional buttons:
  - Show "Activate" if budget is inactive (isActive: false)
  - Show "Close" if budget is active
  - Show "Archive" if budget is closed and past end date
- Add confirmation dialogs for destructive actions
```

### 4.4 Handle Pagination Response Format
**File:** `packages/web/src/pages/budgets/BudgetListPage.tsx`
**Status:** [ ] Not Started

```
Current Issue: Frontend expects { data: [], meta: { pagination: {...} } }
After Phase 1: Backend will return this format

Changes:
- Update data access from data.budgets to data.data
- Update pagination from data.meta?.pagination to data.meta.pagination
- Ensure totalPages calculation uses response metadata
```

---

## Phase 5: Playwright E2E Tests

### 5.1 Expand Budgets E2E Test Suite
**File:** `packages/web/e2e/budgets.spec.ts`
**Status:** [ ] Not Started

```typescript
// Existing tests (25 basic tests):
- Navigation tests
- Budget list display
- Budget create form
- Budget detail page
- Role-based access
- Pagination controls
- Empty state
- Error handling

// Tests to add:

// Budget Utilization Tests
- BUD-26: Detail page shows correct utilization breakdown (allocated, committed, spent, available)
- BUD-27: Warning threshold alert appears when utilization exceeds threshold
- BUD-28: Over budget alert appears when exceeded

// Status Management Tests
- BUD-29: Activate budget from inactive state
- BUD-30: Close budget from active state
- BUD-31: Archive budget from closed state
- BUD-32: Cannot activate budget with past end date (error message)

// Budget Transfer Tests
- BUD-33: Transfer dialog opens and displays form
- BUD-34: Transfer validation - insufficient funds error
- BUD-35: Successful budget transfer updates balances

// Filter Tests
- BUD-36: Filter by budget type
- BUD-37: Filter active/inactive budgets
- BUD-38: Clear filters resets view

// Summary Tests
- BUD-39: Summary displays aggregate metrics
- BUD-40: Summary shows budgets over threshold count

// Error Handling Tests
- BUD-41: Network error shows retry option
- BUD-42: Permission denied shows appropriate message
```

---

## Implementation Order

0. **Phase 0** - Seed data fix (required for testing all other phases)
   - 0.2 Fix expense department IDs in seed-test-data.ts
   - 0.3 Add project/category/employee budget matching variety
   - 0.5 Verify utilization shows in UI

1. **Phase 1** - Backend pagination (required for Phase 4)
   - 1.1 Update service findAll method
   - 1.2 Update controller with query params

2. **Phase 2** - Type alignment (required for Phase 3 & 4)
   - 2.1 Fix BudgetUtilization interface
   - 2.2 Remove usedAmount from Budget interface
   - 2.3 Add missing type definitions

3. **Phase 3** - Frontend service endpoints
   - 3.1 Status management mutations
   - 3.2 Budget transfer mutation
   - 3.3 Check expense mutation
   - 3.4 Budget summary query
   - 3.5 Period utility queries
   - 3.6 Export new hooks

4. **Phase 4** - Frontend page fixes
   - 4.1 BudgetListPage utilization
   - 4.2 BudgetDetailPage utilization
   - 4.3 Status management actions
   - 4.4 Pagination response format

5. **Phase 5** - E2E tests
   - 5.1 Add 17 new tests (25 → 42 tests)

---

## Files to Modify

### Seed Data
| File | Changes |
|------|---------|
| `packages/api/prisma/seed-test-data.ts` | Fix expense departmentId values to match budget departments |

### Backend
| File | Changes |
|------|---------|
| `packages/api/src/modules/budgets/budgets.service.ts` | Add pagination to findAll |
| `packages/api/src/modules/budgets/budgets.controller.ts` | Add page/pageSize query params |

### Frontend Types & Services
| File | Changes |
|------|---------|
| `packages/web/src/features/budgets/services/budgets.service.ts` | Add 8 endpoints, fix types, add 12 new interfaces |

### Frontend Pages
| File | Changes |
|------|---------|
| `packages/web/src/pages/budgets/BudgetListPage.tsx` | Fix utilization display, handle pagination |
| `packages/web/src/pages/budgets/BudgetDetailPage.tsx` | Fix utilization display, add status actions |

### Tests
| File | Changes |
|------|---------|
| `packages/web/e2e/budgets.spec.ts` | Add 17 new E2E tests |

---

## Testing Commands

```bash
# Run backend budgets tests
npm run test -w @tpl-expense/api -- budgets

# Run backend E2E tests
npm run test:e2e -w @tpl-expense/api

# Run frontend type check (catches type errors)
npm run build:web

# Run Playwright E2E tests (budgets only)
npx playwright test budgets.spec.ts --project=chromium

# Run all Playwright tests
npm run test:e2e -w @tpl-expense/web

# Start dev servers for manual testing
npm run dev
```

---

## Verification Checklist

After each phase, verify:
- [ ] Backend GET /budgets returns `{ data: [], meta: { pagination: {...} } }`
- [ ] Frontend BudgetUtilization interface matches backend DTO
- [ ] Budget interface no longer has usedAmount field
- [ ] All 8 new frontend endpoints are implemented
- [ ] BudgetListPage displays budgets with correct utilization
- [ ] BudgetDetailPage shows committed/spent/available breakdown
- [ ] Status management buttons work (activate/close/archive)
- [ ] Budget transfer flow works end-to-end
- [ ] All new E2E tests pass
- [ ] Existing backend tests still pass
- [ ] TypeScript compilation succeeds
- [ ] No console errors in browser

---

## Reference: Working Component

The `PendingApprovals.tsx` dashboard widget can serve as reference for proper RTK Query integration:
- Location: `packages/web/src/components/dashboard/PendingApprovals.tsx`
- Shows proper loading/error/empty states
- Implements mutations with toast notifications

For budget utilization display, reference:
- Location: `packages/web/src/components/budgets/BudgetUtilizationChart.tsx`
- Shows pie chart visualization of utilization
