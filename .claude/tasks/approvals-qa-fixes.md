# Approvals Page QA Fixes

## Overview
This task file tracks the implementation of fixes for the Approvals feature based on QA testing. Each section can be loaded progressively as needed. Based on the blueprint from `expenses-qa-fixes.md`.

---

## Critical Issues Summary

| Issue | Severity | Component | Status |
|-------|----------|-----------|--------|
| **Test tier data pollution** | **Critical** | **Database** | [ ] Not Started |
| ApprovalQueuePage uses mock data | Critical | Frontend | [x] Completed |
| Bulk approve endpoint mismatch | Critical | Frontend Service | [x] Completed |
| Revoke delegation endpoint mismatch | Critical | Frontend Service | [x] Completed |
| Clarification DTO field mismatch | High | Frontend Service | [x] Completed |
| ApprovalTimeline type mismatch | Medium | Component | [x] Completed |
| E2E tests only check routing | High | Tests | [x] Completed (5 → 24 tests)

---

## Phase 0: Database Data Cleanup (Critical)

### 0.1 Deactivate Test Approval Tiers
**Status:** [ ] Not Started

**Issue Discovered (2026-02-03):** The database contains **14 active approval tiers** instead of the expected 4 production tiers. Test tiers with `[TEST]` prefix are polluting the tier matching logic.

**Root Cause Analysis:**
- `[TEST] Self Approval` tier (Tier 0, 0-5000 PKR) requires **EMPLOYEE** role
- Small expenses (< 5000 PKR) match this tier first due to `tierOrder: 0`
- Managers with **APPROVER** role cannot approve these expenses
- Result: Pending approvals page shows empty for managers

**Affected Expenses:**
| Expense | Amount | Matched Tier | Required Role | Expected Tier |
|---------|--------|--------------|---------------|---------------|
| TEST-EXP-2026-007 | 3,500 PKR | [TEST] Self Approval | EMPLOYEE | Low Value (APPROVER) |
| EXP-2026-00001 | 25,000 PKR | [TEST] Team Lead | APPROVER | Low Value (APPROVER) |

**Fix - Deactivate test tiers:**
```sql
UPDATE "ApprovalTier"
SET "isActive" = false
WHERE "name" LIKE '[TEST]%';
```

**Verification:**
```bash
npx ts-node scripts/check-pending-approvals.ts
```
Should show only 4 production tiers after fix.

### 0.2 Backfill amountInPKR for Existing Expenses
**Status:** [ ] Not Started

**Issue:** Existing PKR expenses have NULL `amountInPKR` field, causing inconsistent tier matching.

**Fix:**
```sql
UPDATE "Expense"
SET "amountInPKR" = "totalAmount"
WHERE currency = 'PKR' AND "amountInPKR" IS NULL;
```

---

## Phase 1: Frontend API Integration

### 1.1 Connect ApprovalQueuePage to RTK Query
**File:** `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`
**Status:** [ ] Not Started

```
Current Issue: Page uses hardcoded mock data (lines 29-68) instead of calling API
Fix: Replace mock data with useGetPendingApprovalsQuery hook
- Remove MOCK_PENDING_EXPENSES array
- Call useGetPendingApprovalsQuery() with pagination params
- Handle loading, error, and empty states
- Map API response to table data format
```

### 1.2 Implement handleBulkApprove Handler
**File:** `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`
**Status:** [ ] Not Started

```
Current Issue: TODO comment at line 87, only logs to console
Fix: Implement actual bulk approve mutation
- Import useBulkApproveMutation from approvals service
- Get selected expense IDs from state
- Call mutation with expenseIds and comments
- Show toast notification on success/failure
- Refresh pending approvals list
- Clear selection after success
```

### 1.3 Implement confirmReject Handler (Bulk Reject)
**File:** `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`
**Status:** [ ] Not Started

```
Current Issue: TODO comment at line 97, only logs to console
Fix: Implement reject mutation (no bulk reject exists, iterate)
- Import useRejectExpenseMutation from approvals service
- Show confirmation dialog with reason input
- Call mutation for each selected expense
- Show toast notification on success/failure
- Refresh pending approvals list
- Clear selection after success
```

### 1.4 Implement Row Action Handlers
**File:** `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`
**Status:** [ ] Not Started

```
Current Issue: Action buttons in rows (Approve/Reject/Clarify) have no handlers
Fix: Add onClick handlers to action buttons
- Approve: Show quick approve dialog, call approveExpense mutation
- Reject: Show rejection dialog with reason, call rejectExpense mutation
- Clarify: Show clarification dialog, call requestClarification mutation
```

---

## Phase 2: Frontend Service Endpoint Fixes

### 2.1 Fix Bulk Approve Endpoint Path
**File:** `packages/web/src/features/approvals/services/approvals.service.ts`
**Status:** [ ] Not Started

```
Current: url: '/approvals/bulk-approve'
Backend: POST /approvals/approve/bulk
Fix: Change to url: '/approvals/approve/bulk'
```

### 2.2 Fix Revoke Delegation Endpoint
**File:** `packages/web/src/features/approvals/services/approvals.service.ts`
**Status:** [ ] Not Started

```
Current:
  method: 'DELETE'
  url: '/approvals/delegations/${delegationId}'

Backend expects:
  POST /approvals/delegations/revoke
  body: { delegationId }

Fix: Change method to POST, update URL, pass delegationId in body
```

### 2.3 Fix Clarification Request DTO
**File:** `packages/web/src/features/approvals/services/approvals.service.ts`
**Status:** [ ] Not Started

```
Current: sends { expenseId, note }
Backend expects: { expenseId, question }
Fix: Rename 'note' to 'question' in the RequestClarificationDto interface and mutation
```

---

## Phase 3: Type Alignment

### 3.1 Align ApprovalTimeline Component Types
**File:** `packages/web/src/components/expenses/ApprovalTimeline.tsx`
**Status:** [ ] Not Started

```
Current Frontend Type (ApprovalHistory):
- status, tier, approvedBy, approvedAt, comment, rejectionReason, clarificationRequest

Backend Returns (timeline):
- timestamp, action, actor, actorRole, tierLevel, comment, wasDelegated, wasEscalated

Fix Options:
A) Update frontend type to match backend response
B) Transform backend response in service layer
C) Update backend to return expected format

Recommended: Option A - Update frontend component to accept backend format
```

### 3.2 Update ApprovalHistory Interface
**File:** `packages/web/src/features/expenses/services/expenses.service.ts`
**Status:** [ ] Not Started

```
Update ApprovalHistory type to match backend:
{
  timestamp: string;
  action: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';
  actor: string;
  actorRole: string;
  tierLevel: number;
  comment: string | null;
  wasDelegated: boolean;
  wasEscalated: boolean;
}
```

---

## Phase 4: Playwright E2E Tests

### 4.1 Expand Approvals E2E Test Suite
**File:** `packages/web/e2e/approvals.spec.ts`
**Status:** [ ] Not Started

```typescript
// Existing tests (5 basic routing tests):
- APR-01: Approver can navigate to /approvals
- APR-02: Admin can navigate to /approvals
- APR-03: Finance can navigate to /approvals
- APR-04: Page loads with content
- APR-05: Employee cannot access admin routes

// Tests to add:
- APR-06: Pending approvals table displays data
- APR-07: Single expense approval workflow
- APR-08: Single expense rejection with reason
- APR-09: Request clarification workflow
- APR-10: Bulk selection checkbox works
- APR-11: Bulk approve multiple expenses
- APR-12: Expense detail link navigates correctly
- APR-13: Pagination controls work
- APR-14: Filter by date range
- APR-15: Filter by amount
- APR-16: Error handling displays toast
- APR-17: Loading state shows skeleton
- APR-18: Empty state shows message
- APR-19: Approval actions update expense status
- APR-20: Refresh button reloads data
```

### 4.2 Add Delegation E2E Tests
**File:** `packages/web/e2e/approvals.spec.ts`
**Status:** [ ] Not Started (Requires delegation UI first)

```typescript
// Delegation tests (if UI implemented):
- DEL-01: View existing delegations
- DEL-02: Create new delegation
- DEL-03: Revoke delegation
- DEL-04: Delegated user can approve
```

---

## Phase 5: Backend Enhancements (Optional)

### 5.1 Expose Resubmit Endpoint
**File:** `packages/api/src/modules/approvals/approvals.controller.ts`
**Status:** [ ] Not Started

```
Current: resubmitExpense() implemented in service but not in controller
Fix: Add POST /approvals/resubmit endpoint
- Use existing service method
- Add proper DTO and validation
- Add Swagger documentation
```

### 5.2 Optimize findExpensesRequiringApproval
**File:** `packages/api/src/modules/approvals/approvals.service.ts`
**Status:** [ ] Not Started (Performance improvement)

```
Current: Iterates ALL pending expenses and checks authorization one by one
Fix: Use database-level filtering where possible
- Move role-based filtering to Prisma query
- Reduce N+1 query pattern
```

---

## Implementation Order

0. **Phase 0** - Database data cleanup (CRITICAL - do this first!)
   - 0.1 Deactivate test approval tiers ✗
   - 0.2 Backfill amountInPKR for PKR expenses ✗

1. **Phase 2** - Fix frontend service endpoints first (required for Phase 1)
   - 2.1 Bulk approve path ✗
   - 2.2 Revoke delegation ✗
   - 2.3 Clarification DTO ✗

2. **Phase 1** - Connect ApprovalQueuePage to API
   - 1.1 Connect to RTK Query ✗
   - 1.2 Bulk approve handler ✗
   - 1.3 Bulk reject handler ✗
   - 1.4 Row action handlers ✗

3. **Phase 3** - Type alignments (if breaking)
   - 3.1 ApprovalTimeline types ✗
   - 3.2 ApprovalHistory interface ✗

4. **Phase 4** - E2E tests
   - 4.1 Expand test suite ✗
   - 4.2 Delegation tests (deferred)

5. **Phase 5** - Backend enhancements (optional)
   - 5.1 Resubmit endpoint (deferred)
   - 5.2 Performance optimization (deferred)

---

## Files to Modify

### Frontend
| File | Changes |
|------|---------|
| `packages/web/src/pages/approvals/ApprovalQueuePage.tsx` | Remove mock data, connect API, implement handlers |
| `packages/web/src/features/approvals/services/approvals.service.ts` | Fix 3 endpoint issues |
| `packages/web/src/components/expenses/ApprovalTimeline.tsx` | Update types |
| `packages/web/src/features/expenses/services/expenses.service.ts` | Update ApprovalHistory type |

### Tests
| File | Changes |
|------|---------|
| `packages/web/e2e/approvals.spec.ts` | Add 15+ new E2E tests |

### Backend (Optional)
| File | Changes |
|------|---------|
| `packages/api/src/modules/approvals/approvals.controller.ts` | Add resubmit endpoint |

---

## Testing Commands

```bash
# Run backend approvals tests
npm run test -w @tpl-expense/api -- approvals

# Run backend E2E tests
npm run test:e2e -w @tpl-expense/api

# Run Playwright E2E tests (approvals only)
npx playwright test approvals.spec.ts --project=chromium

# Run all Playwright tests
npm run test:e2e -w @tpl-expense/web

# Start dev servers for manual testing
npm run dev
```

---

## Verification Checklist

After each phase, verify:
- [ ] Frontend service endpoints match backend routes
- [ ] ApprovalQueuePage fetches real data from API
- [ ] Approve/Reject/Clarify actions work end-to-end
- [ ] Bulk actions work with multiple selections
- [ ] Toast notifications appear on success/failure
- [ ] Error states display properly
- [ ] Loading states show skeletons
- [ ] All new E2E tests pass
- [ ] Existing backend tests still pass
- [ ] No console errors in browser

---

## Reference: Working Component

The `PendingApprovals.tsx` dashboard widget is properly integrated and can serve as a reference:
- Location: `packages/web/src/components/dashboard/PendingApprovals.tsx`
- Uses `useGetPendingApprovalsQuery()` correctly
- Implements approve/reject mutations
- Shows toast notifications
- Handles loading/error/empty states
