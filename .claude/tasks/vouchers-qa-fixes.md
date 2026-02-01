# Vouchers Page QA Fixes

## Overview
This task file tracks the implementation of fixes for the Vouchers feature based on QA testing. Each section can be loaded progressively as needed. Based on the blueprint from `expenses-qa-fixes.md` and `approvals-qa-fixes.md`.

---

## Critical Issues Summary

| Issue | Severity | Component | Status |
|-------|----------|-----------|--------|
| VoucherDetailPage uses mock data | Critical | Frontend | [ ] Not Started |
| No VoucherRequestPage route | High | Frontend Router | [ ] Not Started |
| Disburse DTO field mismatch (`disbursedAmount` vs `amount`) | Critical | Frontend Service | [ ] Not Started |
| Link expense endpoint path mismatch | Critical | Frontend Service | [ ] Not Started |
| SettleVoucherDto has unsupported fields | High | Frontend Types | [ ] Not Started |
| Settlement form not implemented | High | Component | [ ] Not Started |
| E2E tests only check routing (7 tests) | High | Tests | [ ] Not Started |

---

## Phase 1: Frontend Service Endpoint Fixes

### 1.1 Fix Disburse Voucher DTO Field Name
**File:** `packages/web/src/features/vouchers/types/vouchers.types.ts`
**File:** `packages/web/src/features/vouchers/components/VoucherActions.tsx`
**Status:** [ ] Not Started

```
Current Frontend DisburseVoucherDto:
{
  disbursedAmount: number;
  notes?: string;
}

Backend Expects:
{
  amount: number;          // <-- Field name mismatch!
  paymentMethod?: string;
  paymentReference?: string;
}

Fix:
1. Update DisburseVoucherDto interface to use `amount` instead of `disbursedAmount`
2. Add paymentMethod and paymentReference optional fields
3. Update VoucherActions.tsx to send correct field names
```

### 1.2 Fix Link Expense Endpoint Path
**File:** `packages/web/src/features/vouchers/services/vouchers.service.ts`
**Status:** [ ] Not Started

```
Current Frontend:
  url: `/vouchers/${voucherId}/expenses`
  method: 'POST'

Backend Expects:
  POST /vouchers/:id/link-expense

Fix: Change URL from `/vouchers/${voucherId}/expenses` to `/vouchers/${voucherId}/link-expense`
```

### 1.3 Remove Unsupported Unlink Expense Endpoint
**File:** `packages/web/src/features/vouchers/services/vouchers.service.ts`
**Status:** [ ] Not Started

```
Current Frontend has:
  unlinkExpenseFromVoucher mutation calling DELETE /vouchers/:id/expenses/:expenseId

Backend: No unlink endpoint exists

Fix: Remove unlinkExpenseFromVoucher mutation (or add backend endpoint later)
```

### 1.4 Fix SettleVoucherDto - Remove Unsupported Fields
**File:** `packages/web/src/features/vouchers/types/vouchers.types.ts`
**Status:** [ ] Not Started

```
Current Frontend SettleVoucherDto:
{
  settledAmount: number;        // NOT in backend
  cashReturned?: number;        // NOT in backend
  cashReturnConfirmed?: boolean;
  overspendJustification?: string;
  overspendApproved?: boolean;  // NOT in backend
  linkedExpenseIds?: string[];  // NOT in backend
}

Backend Expects:
{
  notes?: string;
  overspendJustification?: string;
  cashReturnConfirmed?: boolean;
}

Fix: Remove unsupported fields, add notes field
```

---

## Phase 2: Frontend API Integration

### 2.1 Connect VoucherDetailPage to RTK Query
**File:** `packages/web/src/pages/vouchers/VoucherDetailPage.tsx`
**Status:** [ ] Not Started

```
Current Issue: Entire page uses hardcoded mock data (lines 7-51)
- Mock voucher object with hardcoded values
- Mock expenses array
- No API calls
- Action buttons non-functional

Fix:
1. Import useGetVoucherQuery from vouchers.service
2. Call useGetVoucherQuery(id) with URL param
3. Handle loading state with skeleton
4. Handle error state with retry
5. Handle not-found state
6. Use VoucherActions component for action buttons
7. Display real linked expenses from API
```

### 2.2 Create VoucherRequestPage
**File:** `packages/web/src/pages/vouchers/VoucherRequestPage.tsx` (NEW)
**File:** `packages/web/src/App.tsx` (add route)
**Status:** [ ] Not Started

```
Current Issue:
- VoucherForm component exists but no dedicated request page
- VoucherListPage navigates to /vouchers/request but route doesn't exist

Fix:
1. Create VoucherRequestPage.tsx using VoucherForm component
2. Import useCreateVoucherMutation and useGetUserOpenVouchersQuery
3. Add route in App.tsx: <Route path="/vouchers/request" element={<VoucherRequestPage />} />
4. Handle success: navigate to new voucher detail page
```

### 2.3 Implement Settlement Flow
**File:** `packages/web/src/pages/vouchers/VoucherDetailPage.tsx`
**File:** `packages/web/src/features/vouchers/components/SettlementForm.tsx` (NEW)
**Status:** [ ] Not Started

```
Current Issue: Settlement button navigates to ?action=settle but no handler exists

Fix:
1. Create SettlementForm component with:
   - Amount summary (disbursed vs expenses)
   - Balance calculation (underspend/overspend)
   - cashReturnConfirmed checkbox (for underspend)
   - overspendJustification textarea (for overspend)
   - notes field
2. In VoucherDetailPage, detect ?action=settle and show SettlementForm
3. Use useSettleVoucherMutation for submission
```

### 2.4 Use API Status Counts for Badges
**File:** `packages/web/src/pages/vouchers/VoucherListPage.tsx`
**Status:** [ ] Not Started

```
Current Issue (line 215):
  Badge counts use client-side filtering: vouchers.filter((v) => v.status === tab.id).length
  Only counts vouchers on current page, not total

Fix:
  Use statusCounts from API response if available
  Fallback to client-side if not
```

---

## Phase 3: Playwright E2E Tests

### 3.1 Expand Vouchers E2E Test Suite
**File:** `packages/web/e2e/vouchers.spec.ts`
**Status:** [ ] Not Started

```typescript
// Existing tests (7 basic routing tests):
- VCH-01: View voucher list page
- VCH-02: Voucher list shows filter options
- VCH-03: Voucher list displays voucher cards
- VCH-04: Request voucher button opens modal (BROKEN - navigates to page)
- VCH-05: Finance user can view vouchers
- VCH-06: Click view details navigates to voucher detail
- VCH-07: Filter buttons change displayed vouchers

// Tests to add:
// === Request Flow ===
- VCH-08: Request page loads at /vouchers/request
- VCH-09: Form validates minimum amount (1 PKR)
- VCH-10: Form validates maximum amount (50,000 PKR)
- VCH-11: Form validates purpose minimum length (10 chars)
- VCH-12: Purpose category dropdown populates purpose field
- VCH-13: Submit creates voucher with REQUESTED status
- VCH-14: Open voucher warning displays

// === Detail Page ===
- VCH-15: Detail page loads voucher from API
- VCH-16: Detail page shows amount summary
- VCH-17: Detail page shows linked expenses

// === Approval Actions ===
- VCH-18: Approver can approve REQUESTED voucher
- VCH-19: Approver can reject with reason
- VCH-20: Finance can disburse APPROVED voucher

// === Settlement ===
- VCH-21: Owner can settle DISBURSED voucher
- VCH-22: Underspend requires cash return confirmation
- VCH-23: Overspend requires justification
- VCH-24: Settlement changes status to SETTLED
```

### 3.2 Fix Broken Test VCH-04
**File:** `packages/web/e2e/vouchers.spec.ts`
**Status:** [ ] Not Started

```
Current test expects modal but implementation navigates to /vouchers/request

Fix: Update test to expect navigation instead of modal
```

---

## Phase 4: Backend Enhancements (Optional)

### 4.1 Add Status Counts to findAll Response
**File:** `packages/api/src/modules/vouchers/vouchers.service.ts`
**Status:** [ ] Deferred

```
Enhancement: Return statusCounts in list response for accurate badge numbers
```

### 4.2 Add Pagination Support
**File:** `packages/api/src/modules/vouchers/vouchers.service.ts`
**Status:** [ ] Deferred

```
Enhancement: Add page/pageSize params to findAll
```

---

## Implementation Order

1. **Phase 1** - Fix frontend service endpoints (Critical - required for API calls)
   - 1.1 Fix disburse DTO field name
   - 1.2 Fix link expense endpoint path
   - 1.3 Remove unsupported unlink endpoint
   - 1.4 Fix SettleVoucherDto fields

2. **Phase 2** - Connect pages to API
   - 2.2 Create VoucherRequestPage + route
   - 2.1 Connect VoucherDetailPage to API
   - 2.3 Implement settlement flow
   - 2.4 Use API status counts

3. **Phase 3** - E2E tests
   - 3.2 Fix broken VCH-04 test
   - 3.1 Add 17 new tests (7 → 24)

4. **Phase 4** - Backend enhancements (deferred)

---

## Files to Modify

### Frontend - Types
| File | Changes |
|------|---------|
| `packages/web/src/features/vouchers/types/vouchers.types.ts` | Fix DisburseVoucherDto, SettleVoucherDto |

### Frontend - Services
| File | Changes |
|------|---------|
| `packages/web/src/features/vouchers/services/vouchers.service.ts` | Fix link-expense URL, remove unlinkExpense |

### Frontend - Components
| File | Changes |
|------|---------|
| `packages/web/src/features/vouchers/components/VoucherActions.tsx` | Fix disburse payload |
| `packages/web/src/features/vouchers/components/SettlementForm.tsx` | **NEW** |

### Frontend - Pages
| File | Changes |
|------|---------|
| `packages/web/src/pages/vouchers/VoucherDetailPage.tsx` | Replace mock data with API |
| `packages/web/src/pages/vouchers/VoucherRequestPage.tsx` | **NEW** |
| `packages/web/src/pages/vouchers/VoucherListPage.tsx` | Use API statusCounts |

### Frontend - Router
| File | Changes |
|------|---------|
| `packages/web/src/App.tsx` | Add /vouchers/request route |

### Tests
| File | Changes |
|------|---------|
| `packages/web/e2e/vouchers.spec.ts` | Fix VCH-04, add 17 new tests |

---

## Testing Commands

```bash
# Run backend vouchers tests
npm run test -w @tpl-expense/api -- vouchers

# Run Playwright E2E tests (vouchers only)
npx playwright test vouchers.spec.ts --project=chromium

# Start dev servers for manual testing
npm run dev
```

---

## Verification Checklist

- [ ] DisburseVoucherDto sends `amount` not `disbursedAmount`
- [ ] linkExpenseToVoucher calls `/vouchers/:id/link-expense`
- [ ] VoucherRequestPage route exists at /vouchers/request
- [ ] VoucherDetailPage fetches voucher from API (no mock data)
- [ ] Settlement flow works with underspend/overspend handling
- [ ] All E2E tests pass (24 total)
- [ ] No console errors in browser

---

## Reference: Working Components

**VoucherListPage** - Uses `useGetVouchersQuery()` correctly
**VoucherActions** - Has approve/reject/disburse (needs DTO fix)
**VoucherForm** - Ready to use in VoucherRequestPage
