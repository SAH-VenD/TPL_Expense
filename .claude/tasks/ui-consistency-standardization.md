# Task: UI Consistency Standardization

**Created**: 2026-02-04
**Status**: Complete
**Branch**: feat/ui-consistency
**Completed**: 2026-02-04

---

## Problem

Based on screenshot review and codebase analysis, several UI inconsistencies exist across pages:

### 1. Breadcrumb Inconsistency
| Page | Has Breadcrumbs | Notes |
|------|-----------------|-------|
| ExpenseListPage | YES | `Home > Expenses` |
| VoucherListPage | YES | `Home > Dashboard > Petty Cash Vouchers` |
| ApprovalQueuePage | NO | Missing completely |
| BudgetListPage | NO | Missing completely |
| ReportsPage | NO | Missing completely |

### 2. View Toggle Terminology
| Page | Label Used |
|------|------------|
| ExpenseListPage | "List" / "Grid" |
| VoucherListPage | "List" / "Cards" |
| BudgetListPage | "List" / "Cards" |

### 3. Page Header Structure Varies
- Some pages have subtitles, others don't
- Button placement and styling inconsistent
- No shared PageHeader component exists

### 4. Font Sizes and Spacing
- Title font sizes consistent (`text-2xl font-bold`)
- But header layout structure varies significantly

---

## Solution

Create a standardized `PageHeader` component and apply consistent patterns across all pages.

### Standardized Pattern
```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Home  >  Page Name                          (breadcrumbs)│
│                                                             │
│ Page Title                    [Toggle] [+ Action Button]   │
│ Optional subtitle text                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. New Component: PageHeader
**File**: `packages/web/src/components/ui/PageHeader.tsx`

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}
```

Features:
- Consistent breadcrumb placement (always at top)
- Responsive layout for title + actions
- Optional subtitle with consistent styling
- Slot for action buttons/toggles

---

## Files to Modify

### 1. Update ViewToggle Component
**File**: `packages/web/src/components/expenses/ViewToggle.tsx`

- Change default `gridLabel` from "Grid" to "Cards" for consistency
- All pages will use "List" / "Cards" terminology

### 2. Update ExpenseListPage
**File**: `packages/web/src/pages/expenses/ExpenseListPage.tsx`

- Use new PageHeader component
- Change view toggle to use "Cards" label

### 3. Update ApprovalQueuePage
**File**: `packages/web/src/pages/approvals/ApprovalQueuePage.tsx`

- Add breadcrumbs: `Home > Approvals`
- Use new PageHeader component
- Add subtitle for context

### 4. Update BudgetListPage
**File**: `packages/web/src/pages/budgets/BudgetListPage.tsx`

- Add breadcrumbs: `Home > Budgets`
- Use new PageHeader component

### 5. Update VoucherListPage
**File**: `packages/web/src/pages/vouchers/VoucherListPage.tsx`

- Use new PageHeader component
- Simplify breadcrumbs to: `Home > Vouchers`

### 6. Update ReportsPage
**File**: `packages/web/src/pages/reports/ReportsPage.tsx`

- Add breadcrumbs: `Home > Reports`
- Use new PageHeader component

### 7. Export PageHeader
**File**: `packages/web/src/components/ui/index.ts`

- Add PageHeader to exports

---

## Implementation Details

### PageHeader Component Design

```tsx
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={className}>
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbs} className="mb-4" />

      {/* Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Example Usage

```tsx
// ApprovalQueuePage
<PageHeader
  title="Pending Approvals"
  subtitle={`${totalItems} expense(s) ${canApprove ? 'awaiting your approval' : 'pending approval'}`}
  breadcrumbs={[{ label: 'Approvals' }]}
  actions={
    <button onClick={refetch} className="...">
      <ArrowPathIcon />
    </button>
  }
/>

// BudgetListPage
<PageHeader
  title="Budgets"
  subtitle="Manage and track your budgets"
  breadcrumbs={[{ label: 'Budgets' }]}
  actions={
    <>
      <ViewToggle value={view} onChange={setView} />
      <Link to="/budgets/new" className="btn btn-primary">
        <PlusIcon /> Create Budget
      </Link>
    </>
  }
/>
```

---

## Standardization Decisions

| Aspect | Standard |
|--------|----------|
| View Toggle Labels | "List" / "Cards" |
| Title Font | `text-2xl font-bold text-gray-900` |
| Subtitle Font | `text-sm text-gray-500` |
| Breadcrumb Spacing | `mb-4` below breadcrumbs |
| Action Button Style | `btn btn-primary` with icon |
| Layout | Responsive flex with `sm:` breakpoint |

---

## Progress

- [x] Create git branch `feat/ui-consistency`
- [x] Create PageHeader component
- [x] Update ViewToggle default gridLabel to "Cards"
- [x] Update ExpenseListPage
- [x] Update ApprovalQueuePage (add breadcrumbs)
- [x] Update BudgetListPage (add breadcrumbs)
- [x] Update VoucherListPage
- [x] Update ReportsPage (add breadcrumbs)
- [x] Export PageHeader from ui/index.ts
- [x] Update Admin pages (Users, Categories, Settings, AuditLogs)
- [x] Update NotificationListPage
- [x] Update detail/create pages (ExpenseDetailPage, ExpenseCreatePage, ExpenseEditPage, VoucherDetailPage, VoucherRequestPage, BudgetDetailPage, BudgetCreatePage)
- [x] Build verification passed
- [ ] Manual testing for visual consistency (recommended)
- [ ] Commit and push changes

---

## Verification

1. Navigate to each page and verify:
   - Breadcrumbs appear consistently
   - Title and subtitle styling matches
   - Action buttons are right-aligned
   - View toggles say "List" / "Cards"
2. Test responsive behavior on mobile
3. Verify no regressions in functionality
