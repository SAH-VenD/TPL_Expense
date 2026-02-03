# Vouchers Page QA Fixes

## Overview
This task file tracks the implementation of fixes for the Vouchers feature based on QA testing. Each section can be loaded progressively as needed. Based on the blueprint from `expenses-qa-fixes.md` and `approvals-qa-fixes.md`.

**STATUS: COMPLETE** (2026-02-03 - Phase 5 Complete)

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
| Status filter counts show only current page | Critical | Frontend | [x] Complete |
| No list/grid view toggle | Medium | Frontend | [x] Complete |

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

## Phase 5: List/Grid View & Status Count Fix (2026-02-03)

### 5.1 Fix Status Filter Badge Counts (CRITICAL BUG)

**Problem:** When clicking a status tab filter (e.g., "Pending"), all other tab badge counts change to zero.

**Root Cause:** `VoucherListPage.tsx` lines 208-216 calculate badge counts using:
```typescript
{vouchers.filter((v) => v.status === tab.id).length}  // BUG: only counts current page
```
This only counts vouchers from the current filtered page results, not total counts from the API.

**Solution:**
1. Backend already returns `statusCounts` in response (verify)
2. Frontend should use `vouchersResponse?.statusCounts?.[tab.id]` instead of client-side filtering

**Files to Modify:**

| File | Change |
|------|--------|
| `packages/api/src/modules/vouchers/vouchers.service.ts` | Verify/add statusCounts to findAll response |
| `packages/web/src/features/vouchers/services/vouchers.service.ts` | Add `statusCounts` to response type |
| `packages/web/src/pages/vouchers/VoucherListPage.tsx` | Use API statusCounts for tab badges |

**Backend Changes (if needed):**
```typescript
// In findAll() - add before return
const statusCounts = await this.prisma.voucher.groupBy({
  by: ['status'],
  _count: { status: true },
  where: { isActive: true },
});

return {
  data: vouchers,
  meta: { pagination: { page, pageSize, total, totalPages } },
  statusCounts: statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count.status;
    return acc;
  }, {} as Record<string, number>),
};
```

**Frontend Type Changes:**
```typescript
// vouchers.service.ts - Update VouchersResponse interface
export interface VouchersResponse {
  data: Voucher[];
  meta: { pagination: PaginationMeta };
  statusCounts?: Record<string, number>;  // Add this
}
```

**Frontend UI Changes:**
```typescript
// VoucherListPage.tsx - Replace line 208-216
const statusCount = tab.id === 'all'
  ? vouchersData?.meta?.pagination?.total ?? 0
  : vouchersData?.statusCounts?.[tab.id] ?? 0;

// In render:
<span>{statusCount}</span>
```

### 5.2 Add List/Grid View Toggle

**Reference Pattern:** `BudgetListPage.tsx` implementation

**Files to Create/Modify:**

| File | Change |
|------|--------|
| `packages/web/src/pages/vouchers/VoucherListPage.tsx` | Add ViewToggle, view state, conditional rendering |
| `packages/web/src/components/vouchers/VoucherTable.tsx` | **NEW** - Table component for list view |

**Implementation Steps:**

#### Step A: Create View Preference Hook
```typescript
// In VoucherListPage.tsx
const VOUCHERS_VIEW_KEY = 'vouchers_view';

const useVoucherViewPreference = (defaultView: ViewType = 'grid'): [ViewType, (view: ViewType) => void] => {
  const [view, setView] = React.useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VOUCHERS_VIEW_KEY);
      if (stored === 'list' || stored === 'grid') return stored;
    }
    return defaultView;
  });

  const handleViewChange = React.useCallback((newView: ViewType) => {
    setView(newView);
    localStorage.setItem(VOUCHERS_VIEW_KEY, newView);
  }, []);

  return [view, handleViewChange];
};
```

#### Step B: Create VoucherTable Component
```typescript
// packages/web/src/components/vouchers/VoucherTable.tsx
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Voucher } from '@/features/vouchers/types/vouchers.types';

interface VoucherTableProps {
  vouchers: Voucher[];
  isLoading: boolean;
  onRowClick: (voucher: Voucher) => void;
}

export function VoucherTable({ vouchers, isLoading, onRowClick }: VoucherTableProps) {
  const columns: Column<Voucher>[] = [
    { header: 'Voucher #', accessor: 'voucherNumber' },
    { header: 'Purpose', accessor: 'purpose' },
    { header: 'Requested', accessor: (v) => formatCurrency(v.requestedAmount) },
    { header: 'Disbursed', accessor: (v) => v.disbursedAmount ? formatCurrency(v.disbursedAmount) : '-' },
    { header: 'Status', accessor: (v) => <Badge variant={getStatusVariant(v.status)}>{v.status}</Badge> },
    { header: 'Requester', accessor: (v) => `${v.requester?.firstName} ${v.requester?.lastName}` },
    { header: 'Date', accessor: (v) => formatDate(v.createdAt) },
  ];

  return (
    <DataTable
      columns={columns}
      data={vouchers}
      isLoading={isLoading}
      onRowClick={onRowClick}
      emptyMessage="No vouchers found"
    />
  );
}
```

#### Step C: Integrate in VoucherListPage
```typescript
// Add imports
import { ViewToggle, type ViewType } from '@/components/expenses/ViewToggle';
import { VoucherTable } from '@/components/vouchers/VoucherTable';

// Add view state hook
const [view, setView] = useVoucherViewPreference('grid');

// Add ViewToggle next to "Request Voucher" button
<div className="flex items-center gap-4">
  <ViewToggle view={view} onChange={setView} />
  <Link to="/vouchers/request" className="btn-primary">Request Voucher</Link>
</div>

// Conditional rendering
{view === 'grid' ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {vouchers.map((voucher) => (
      <VoucherCard key={voucher.id} voucher={voucher} />
    ))}
  </div>
) : (
  <VoucherTable
    vouchers={vouchers}
    isLoading={isLoading}
    onRowClick={(v) => navigate(`/vouchers/${v.id}`)}
  />
)}
```

### 5.3 Agent Assignments

| Agent | Tasks |
|-------|-------|
| **Backend Engineer** | Verify/implement statusCounts in vouchers.service.ts |
| **Frontend Engineer** | Fix status counts UI, create VoucherTable, integrate ViewToggle |
| **QA Engineer** | Test status filter counts, test view toggle, verify persistence |

### 5.4 Verification Steps

1. **Status Counts Fix:**
   - Navigate to Vouchers page
   - Note the counts on each status tab
   - Click "Pending" tab
   - Verify other tab counts remain unchanged (not zero)
   - Click "Approved" tab, verify counts still correct
   - Refresh page, verify counts persist

2. **View Toggle:**
   - Navigate to Vouchers page
   - Default should be grid view (cards)
   - Click "List" toggle
   - Verify table view displays with columns: Voucher #, Purpose, Requested, Disbursed, Status, Requester, Date
   - Click a row → navigates to detail page
   - Refresh page → list view persists (localStorage)
   - Click "Cards" → returns to grid view

---

## Verification Checklist

- [x] DisburseVoucherDto sends `amount` not `disbursedAmount`
- [x] linkExpenseToVoucher calls `/vouchers/:id/link-expense`
- [x] VoucherRequestPage route exists at /vouchers/request
- [x] VoucherDetailPage fetches voucher from API (no mock data)
- [x] Settlement flow works with underspend/overspend handling
- [x] All E2E tests pass (24 total)
- [x] No console errors in browser
- [x] Status tab badges show total counts (not filtered page counts)
- [x] List/grid view toggle works on vouchers page
- [x] View preference persists in localStorage

---

## Commits

- `fix(vouchers): remove unsupported currency and notes fields from CreateVoucherDto`
- `fix(api): add pagination support to vouchers findAll endpoint`
- `fix(vouchers): complete QA fixes for vouchers feature (#8)`
- `feat(vouchers): add list/grid view toggle and fix status count bug`

---

## Reference: Working Components

**VoucherListPage** - Uses `useGetVouchersQuery()` correctly
**VoucherDetailPage** - Connected to API with settlement modal
**VoucherRequestPage** - Uses VoucherForm + useCreateVoucherMutation
**VoucherActions** - approve/reject/disburse with correct DTOs
**VoucherForm** - Ready for voucher requests
