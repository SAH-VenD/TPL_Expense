# Vouchers Page QA Fixes

## Overview
This task file tracks the implementation of fixes for the Vouchers feature based on QA testing. Each section can be loaded progressively as needed. Based on the blueprint from `expenses-qa-fixes.md` and `approvals-qa-fixes.md`.

**STATUS: COMPLETE** (2026-02-02)

---

## Critical Issues Summary

| Issue | Severity | Component | Status |
|-------|----------|-----------|--------|
| VoucherDetailPage uses mock data | Critical | Frontend | [x] Complete |
| No VoucherRequestPage route | High | Frontend Router | [x] Complete |
| Disburse DTO field mismatch (`disbursedAmount` vs `amount`) | Critical | Frontend Service | [x] Complete |
| Link expense endpoint path mismatch | Critical | Frontend Service | [x] Complete |
| SettleVoucherDto has unsupported fields | High | Frontend Types | [x] Complete |
| Settlement form not implemented | High | Component | [x] Complete |
| E2E tests only check routing (7 tests) | High | Tests | [x] Complete (24 tests) |

---

## Phase 1: Frontend Service Endpoint Fixes

### 1.1 Fix Disburse Voucher DTO Field Name
**File:** `packages/web/src/features/vouchers/types/vouchers.types.ts`
**File:** `packages/web/src/features/vouchers/components/VoucherActions.tsx`
**Status:** [x] Complete

DisburseVoucherDto now uses `amount` field (types:100-104).
VoucherActions sends `{ amount: disbursedAmount }` (line 113).

### 1.2 Fix Link Expense Endpoint Path
**File:** `packages/web/src/features/vouchers/services/vouchers.service.ts`
**Status:** [x] Complete

Uses `/vouchers/${voucherId}/link-expense` (service:163).

### 1.3 Remove Unsupported Unlink Expense Endpoint
**File:** `packages/web/src/features/vouchers/services/vouchers.service.ts`
**Status:** [x] Complete

No unlinkExpenseFromVoucher mutation exists in the service.

### 1.4 Fix SettleVoucherDto - Remove Unsupported Fields
**File:** `packages/web/src/features/vouchers/types/vouchers.types.ts`
**Status:** [x] Complete

SettleVoucherDto has correct fields (types:106-110):
```typescript
export interface SettleVoucherDto {
  notes?: string;
  overspendJustification?: string;
  cashReturnConfirmed?: boolean;
}
```

---

## Phase 2: Frontend API Integration

### 2.1 Connect VoucherDetailPage to RTK Query
**File:** `packages/web/src/pages/vouchers/VoucherDetailPage.tsx`
**Status:** [x] Complete

- Uses `useGetVoucherQuery(id!)` for fetching voucher data
- Loading state with skeleton
- Error state with retry button
- VoucherActions component for action buttons
- Real linked expenses from API

### 2.2 Create VoucherRequestPage
**File:** `packages/web/src/pages/vouchers/VoucherRequestPage.tsx`
**File:** `packages/web/src/App.tsx`
**Status:** [x] Complete

- VoucherRequestPage exists and uses VoucherForm component
- Route added in App.tsx at `/vouchers/request`
- useCreateVoucherMutation for submission
- Navigates to detail page on success

### 2.3 Implement Settlement Flow
**File:** `packages/web/src/pages/vouchers/VoucherDetailPage.tsx`
**Status:** [x] Complete

Settlement implemented as modal in VoucherDetailPage:
- Detects `?action=settle` URL param
- Shows balance calculation (disbursed vs expenses)
- cashReturnConfirmed checkbox for underspend
- overspendJustification textarea for overspend
- notes field
- useSettleVoucherMutation for submission

### 2.4 Use API Status Counts for Badges
**File:** `packages/web/src/pages/vouchers/VoucherListPage.tsx`
**Status:** [~] Deferred (minor enhancement)

Currently uses client-side filtering. Backend statusCounts enhancement deferred.

---

## Phase 3: Playwright E2E Tests

### 3.1 Expand Vouchers E2E Test Suite
**File:** `packages/web/e2e/vouchers.spec.ts`
**Status:** [x] Complete (24 tests)

Tests implemented:
- VCH-01 to VCH-07: List page and filtering
- VCH-08 to VCH-14: Request flow and validation
- VCH-15 to VCH-18: Detail page content
- VCH-19 to VCH-24: Actions and settlement

### 3.2 Fix Broken Test VCH-04
**File:** `packages/web/e2e/vouchers.spec.ts`
**Status:** [x] Complete

Test now expects navigation to `/vouchers/request` instead of modal.

---

## Phase 4: Backend Enhancements

### 4.1 Add Status Counts to findAll Response
**File:** `packages/api/src/modules/vouchers/vouchers.service.ts`
**Status:** [ ] Deferred

### 4.2 Add Pagination Support
**File:** `packages/api/src/modules/vouchers/vouchers.service.ts`
**Status:** [x] Complete

Backend findAll now returns paginated response with page/pageSize support.

---

## Verification Checklist

- [x] DisburseVoucherDto sends `amount` not `disbursedAmount`
- [x] linkExpenseToVoucher calls `/vouchers/:id/link-expense`
- [x] VoucherRequestPage route exists at /vouchers/request
- [x] VoucherDetailPage fetches voucher from API (no mock data)
- [x] Settlement flow works with underspend/overspend handling
- [x] All E2E tests pass (24 total)
- [x] No console errors in browser

---

## Commits

- `fix(vouchers): remove unsupported currency and notes fields from CreateVoucherDto`
- `fix(api): add pagination support to vouchers findAll endpoint`
- `fix(vouchers): complete QA fixes for vouchers feature (#8)`

---

## Reference: Working Components

**VoucherListPage** - Uses `useGetVouchersQuery()` correctly
**VoucherDetailPage** - Connected to API with settlement modal
**VoucherRequestPage** - Uses VoucherForm + useCreateVoucherMutation
**VoucherActions** - approve/reject/disburse with correct DTOs
**VoucherForm** - Ready for voucher requests
