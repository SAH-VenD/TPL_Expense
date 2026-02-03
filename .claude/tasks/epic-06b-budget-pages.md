# Epic 6B: Budget Pages Implementation

**Priority:** P1 (Critical - Blocks user functionality)
**Branch:** `feature/budget-pages`
**Estimated Complexity:** Low-Medium
**Agent:** frontend-engineer

---

## Overview

Implement the missing budget pages and routes to enable the "Create Budget" functionality from the dashboard. The BudgetForm and other components already exist but the routes and page wrappers are missing, causing the "Create Budget" button to redirect to the dashboard.

### Problem Statement
- The "Create Budget" button links to `/budgets/new` but this route doesn't exist
- Routes for `/budgets` and `/budgets/:id` are also missing from App.tsx
- `BudgetListPage` exists but is not routed
- `BudgetCreatePage` and `BudgetDetailPage` don't exist

### Dependencies
- **Depends On:** Epic 1 (UI Components) - Already complete
- **Blocks:** Full budget management user flows

### Existing Infrastructure
```
✅ ALREADY EXISTS:
├── packages/web/src/pages/budgets/BudgetListPage.tsx
├── packages/web/src/components/budgets/BudgetForm.tsx
├── packages/web/src/components/budgets/BudgetCard.tsx
├── packages/web/src/components/budgets/BudgetFilters.tsx
├── packages/web/src/components/budgets/BudgetDetailHeader.tsx
├── packages/web/src/components/budgets/BudgetTransferModal.tsx
└── packages/web/src/features/budgets/services/budgets.service.ts

❌ MISSING (to be created):
├── packages/web/src/pages/budgets/BudgetCreatePage.tsx
├── packages/web/src/pages/budgets/BudgetDetailPage.tsx
└── packages/web/src/App.tsx (routes need to be added)
```

### Files to Create/Modify
```
packages/web/src/
├── App.tsx                                    # MODIFY - add 3 routes
├── pages/budgets/
│   ├── BudgetCreatePage.tsx                   # CREATE
│   ├── BudgetDetailPage.tsx                   # CREATE
│   └── __tests__/
│       ├── BudgetCreatePage.test.tsx          # CREATE
│       └── BudgetDetailPage.test.tsx          # CREATE
└── e2e/
    └── budgets.spec.ts                        # CREATE
```

---

## Story 6B.1: Budget Routes Setup

Add the missing routes to App.tsx to enable budget page navigation.

### Context to Load
```
packages/web/src/App.tsx
packages/web/src/pages/budgets/BudgetListPage.tsx
packages/web/src/router/ProtectedRoute.tsx
```

### Tasks

#### Task 6B.1.1: Add Budget Routes to App.tsx
**File:** `packages/web/src/App.tsx`

**Acceptance Criteria:**
- [ ] Import BudgetListPage, BudgetCreatePage, BudgetDetailPage
- [ ] Add route `/budgets` for BudgetListPage
- [ ] Add route `/budgets/new` for BudgetCreatePage
- [ ] Add route `/budgets/:id` for BudgetDetailPage
- [ ] All routes are inside ProtectedRoute wrapper
- [ ] Routes placed after voucher routes in logical order

**Code Changes:**
```tsx
// Add imports at top
import { BudgetListPage } from './pages/budgets/BudgetListPage';
import { BudgetCreatePage } from './pages/budgets/BudgetCreatePage';
import { BudgetDetailPage } from './pages/budgets/BudgetDetailPage';

// Add routes after vouchers section (around line 67-68)
<Route path="/budgets" element={<BudgetListPage />} />
<Route path="/budgets/new" element={<BudgetCreatePage />} />
<Route path="/budgets/:id" element={<BudgetDetailPage />} />
```

---

## Story 6B.2: Budget Create Page

Implement the create budget page using the existing BudgetForm component.

### Context to Load
```
packages/web/src/components/budgets/BudgetForm.tsx
packages/web/src/features/budgets/services/budgets.service.ts
packages/web/src/pages/expenses/ExpenseCreatePage.tsx (pattern reference)
```

### Tasks

#### Task 6B.2.1: Create BudgetCreatePage Component
**File:** `packages/web/src/pages/budgets/BudgetCreatePage.tsx`

**Acceptance Criteria:**
- [ ] Page header with title "Create Budget"
- [ ] Back link/button to `/budgets`
- [ ] Uses existing `BudgetForm` component
- [ ] Uses `useCreateBudgetMutation` from budgets.service.ts
- [ ] Uses `useNavigate` for navigation
- [ ] On submit success: show toast, navigate to `/budgets`
- [ ] On submit error: show error toast, stay on page
- [ ] Loading state during form submission
- [ ] Cancel button navigates back to `/budgets`
- [ ] Breadcrumb: Budgets > Create Budget

**Interface:**
```typescript
// No props - standalone page component
export const BudgetCreatePage: React.FC = () => { ... }
```

**Visual Layout:**
```
┌──────────────────────────────────────────────────┐
│  ← Back to Budgets                               │
│                                                  │
│  Create Budget                                   │
│  ─────────────────────────────────────────────── │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         BudgetForm Component              │   │
│  │                                           │   │
│  │  [Basic Information]                      │   │
│  │  [Assign To]                              │   │
│  │  [Financial Details]                      │   │
│  │  [Budget Period]                          │   │
│  │  [Alert Settings]                         │   │
│  │                                           │   │
│  │  [Cancel]              [Create Budget]    │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Task 6B.2.2: Write BudgetCreatePage Tests
**File:** `packages/web/src/pages/budgets/__tests__/BudgetCreatePage.test.tsx`

**Test Cases:**
- [ ] Renders page header correctly
- [ ] Renders BudgetForm component
- [ ] Back link navigates to /budgets
- [ ] Form submission calls createBudget mutation
- [ ] Success shows toast and navigates
- [ ] Error shows error toast
- [ ] Cancel button navigates to /budgets
- [ ] Loading state displays during submission

---

## Story 6B.3: Budget Detail Page

Implement the budget detail page to view and manage individual budgets.

### Context to Load
```
packages/web/src/features/budgets/services/budgets.service.ts
packages/web/src/components/budgets/BudgetDetailHeader.tsx
packages/web/src/components/budgets/BudgetForm.tsx
packages/web/src/components/ui/Modal.tsx
packages/web/src/components/ui/ConfirmDialog.tsx
packages/web/src/pages/vouchers/VoucherDetailPage.tsx (pattern reference)
```

### Tasks

#### Task 6B.3.1: Create BudgetDetailPage Component
**File:** `packages/web/src/pages/budgets/BudgetDetailPage.tsx`

**Acceptance Criteria:**
- [ ] Uses `useParams` to get budget ID from URL
- [ ] Uses `useGetBudgetQuery` to fetch budget data
- [ ] Loading state while fetching
- [ ] Error state with retry button on failure
- [ ] 404 state if budget not found
- [ ] Page header with budget name
- [ ] Back link to `/budgets`
- [ ] Display budget details:
  - Name, type, period
  - Total amount, used amount, remaining
  - Start date, end date
  - Utilization percentage with progress bar
  - Enforcement level, warning threshold
  - Assigned entity (department, category, etc.)
- [ ] Edit button opens edit modal (uses BudgetForm)
- [ ] Delete button with confirmation dialog
- [ ] Uses `useUpdateBudgetMutation` for edit
- [ ] Uses `useDeleteBudgetMutation` for delete
- [ ] On delete success: navigate to `/budgets`
- [ ] Toast notifications for all actions
- [ ] Breadcrumb: Budgets > [Budget Name]

**Interface:**
```typescript
// No props - uses URL params
export const BudgetDetailPage: React.FC = () => { ... }
```

**Visual Layout:**
```
┌──────────────────────────────────────────────────┐
│  ← Back to Budgets                               │
│                                                  │
│  Budget Name                    [Edit] [Delete]  │
│  Department Budget • Annual                      │
│  ─────────────────────────────────────────────── │
│                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ Allocated  │ │   Used     │ │ Remaining  │   │
│  │ Rs 100,000 │ │ Rs 65,000  │ │ Rs 35,000  │   │
│  └────────────┘ └────────────┘ └────────────┘   │
│                                                  │
│  Utilization: 65%                                │
│  [████████████████░░░░░░░░░░] 65%               │
│                                                  │
│  Period: Jan 1, 2026 - Dec 31, 2026             │
│  Warning Threshold: 75%                          │
│  Enforcement: Soft Warning                       │
│  Status: Active                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

#### Task 6B.3.2: Create BudgetEditModal Component
**File:** Uses existing Modal + BudgetForm in BudgetDetailPage

**Acceptance Criteria:**
- [ ] Modal opens when Edit button clicked
- [ ] Modal title: "Edit Budget"
- [ ] BudgetForm pre-filled with current budget data
- [ ] Submit calls updateBudget mutation
- [ ] Success: close modal, refetch budget, show toast
- [ ] Error: show error toast, stay in modal
- [ ] Cancel closes modal without saving

#### Task 6B.3.3: Write BudgetDetailPage Tests
**File:** `packages/web/src/pages/budgets/__tests__/BudgetDetailPage.test.tsx`

**Test Cases:**
- [ ] Renders loading state while fetching
- [ ] Renders budget details when loaded
- [ ] Shows error state on fetch failure
- [ ] Shows 404 for non-existent budget
- [ ] Edit button opens edit modal
- [ ] Delete button shows confirmation
- [ ] Confirm delete calls mutation and navigates
- [ ] Cancel delete closes dialog
- [ ] Back link navigates to /budgets
- [ ] Utilization progress bar displays correctly
- [ ] All budget fields display correctly

---

## Story 6B.4: Integration Testing

Write E2E tests to verify the complete budget flow works end-to-end.

### Context to Load
```
packages/web/e2e/*.spec.ts (existing E2E test patterns)
```

### Tasks

#### Task 6B.4.1: Budget Flow E2E Tests
**File:** `packages/web/e2e/budgets.spec.ts`

**Test Scenarios:**
- [ ] Navigate to budgets list from dashboard
- [ ] Click "Create Budget" navigates to create page
- [ ] Fill form and submit creates budget
- [ ] New budget appears in list
- [ ] Click budget navigates to detail page
- [ ] Edit budget updates successfully
- [ ] Delete budget removes from list
- [ ] Form validation shows errors
- [ ] Navigation flows work correctly

---

## Story 6B.5: Budget Navigation

Add navigation menu item to the sidebar so users can easily access the budgets page.

### Context to Load
```
packages/web/src/components/layout/MainLayout.tsx
```

### Tasks

#### Task 6B.5.1: Add Budgets Menu Item to Sidebar
**File:** `packages/web/src/components/layout/MainLayout.tsx`

**Acceptance Criteria:**
- [x] Add BudgetIcon SVG component (banknotes/wallet style)
- [x] Add Budgets entry to navigation array
- [x] Position after Vouchers, before Reports
- [x] Visible to FINANCE and ADMIN roles only
- [x] Links to `/budgets` route
- [x] Active state highlighting works correctly

**Code Changes:**
```typescript
// Add BudgetIcon function
function BudgetIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07..." />
    </svg>
  );
}

// Add to navigation array (after Vouchers, before Reports)
{ name: 'Budgets', href: '/budgets', icon: BudgetIcon, roles: ['FINANCE', 'ADMIN'] },
```

---

## TypeScript Interfaces

### Page Components
```typescript
// BudgetCreatePage - no props
export const BudgetCreatePage: React.FC = () => { ... }

// BudgetDetailPage - no props, uses URL params
export const BudgetDetailPage: React.FC = () => { ... }
```

### Shared Types (from budgets.service.ts)
```typescript
type BudgetType = 'DEPARTMENT' | 'PROJECT' | 'COST_CENTER' | 'EMPLOYEE' | 'CATEGORY';
type BudgetPeriod = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'PROJECT_BASED';
type BudgetEnforcement = 'HARD_BLOCK' | 'SOFT_WARNING' | 'AUTO_ESCALATE';

interface Budget {
  id: string;
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  currency: string;
  totalAmount: number;
  usedAmount: number;
  startDate: string;
  endDate: string;
  warningThreshold: number;
  enforcement: BudgetEnforcement;
  departmentId?: string;
  department?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateBudgetDto {
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  totalAmount: number;
  currency?: string;
  startDate: string;
  endDate: string;
  warningThreshold?: number;
  enforcement?: BudgetEnforcement;
  departmentId?: string;
  // ... other entity IDs
}
```

---

## Testing Requirements

### Component Tests
| File | Coverage Target |
|------|----------------|
| BudgetCreatePage.test.tsx | 80% |
| BudgetDetailPage.test.tsx | 80% |

### Test Commands
```bash
# Run component tests
npm run test -w @tpl-expense/web -- BudgetCreatePage
npm run test -w @tpl-expense/web -- BudgetDetailPage

# Run E2E tests
npm run test:e2e -w @tpl-expense/web -- budgets
```

---

## Definition of Done

### Code Completion
- [ ] BudgetCreatePage implemented
- [ ] BudgetDetailPage implemented
- [ ] Routes added to App.tsx
- [ ] All components use TypeScript interfaces
- [ ] Tailwind CSS only (no inline styles)
- [ ] Loading states implemented
- [ ] Error states implemented
- [ ] Toast notifications working

### Quality Assurance
- [ ] Component tests written (80% coverage)
- [ ] E2E tests written and passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing verified in browser

### Integration
- [ ] RTK Query hooks working
- [ ] Form validation working
- [ ] Navigation flows correct
- [ ] Delete confirmation working

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/budget-pages
```

### Commits
```bash
# Story 6B.1
git commit -m "feat(budgets): add budget routes to App.tsx

- Add BudgetListPage, BudgetCreatePage, BudgetDetailPage routes
- Task 6B.1.1"

# Story 6B.2
git commit -m "feat(budgets): add BudgetCreatePage

- Create page using BudgetForm component
- Add toast notifications and navigation
- Task 6B.2.1"

# Story 6B.3
git commit -m "feat(budgets): add BudgetDetailPage

- Create detail page with edit modal and delete
- Show budget metrics and utilization
- Task 6B.3.1, 6B.3.2"

# Story 6B.4 (tests)
git commit -m "test(budgets): add component and E2E tests

- Add BudgetCreatePage tests
- Add BudgetDetailPage tests
- Add E2E flow tests
- Task 6B.2.2, 6B.3.3, 6B.4.1"

# Story 6B.5 (navigation)
git commit -m "feat(budgets): add Budgets menu item to sidebar navigation

- Add BudgetIcon SVG component
- Add Budgets entry to navigation array
- Visible to FINANCE and ADMIN roles
- Task 6B.5.1"
```

---

## Agent Input Contract

```json
{
  "task_id": "epic-06b-budget-pages",
  "feature_name": "Budget Pages",
  "module_name": "budgets",

  "context_files": [
    "packages/web/src/App.tsx",
    "packages/web/src/pages/budgets/BudgetListPage.tsx",
    "packages/web/src/components/budgets/BudgetForm.tsx",
    "packages/web/src/features/budgets/services/budgets.service.ts",
    "packages/web/src/components/ui/Modal.tsx",
    "packages/web/src/components/ui/ConfirmDialog.tsx"
  ],

  "pages_required": [
    "BudgetCreatePage",
    "BudgetDetailPage"
  ],

  "routes_to_add": [
    { "path": "/budgets", "element": "BudgetListPage" },
    { "path": "/budgets/new", "element": "BudgetCreatePage" },
    { "path": "/budgets/:id", "element": "BudgetDetailPage" }
  ],

  "constraints": {
    "must_use": [
      "Existing BudgetForm component",
      "RTK Query hooks from budgets.service.ts",
      "Tailwind CSS exclusively",
      "TypeScript interfaces",
      "react-hot-toast for notifications"
    ],
    "must_not": [
      "Duplicate BudgetForm logic",
      "Use inline styles",
      "Hardcode API endpoints"
    ]
  }
}
```

---

## Story 6B.6: Budget List View Toggle and Filters Integration

**Status:** 🔄 IN PROGRESS
**Priority:** P1 (User requested)
**Agent:** frontend-engineer

### User Request
User wants to see budgets in list view (table) as well as the existing card/grid view, with filters similar to the expenses page.

### Current State Analysis
**EXISTING COMPONENTS (not yet integrated):**
- `BudgetFilters.tsx` - Full filter component with search, type, period, status filters
- `BudgetListView.tsx` - Table view using DataTable (expects `Budget[]` type)
- `ViewToggle.tsx` - Reusable toggle component from expenses

**CURRENT BudgetListPage.tsx:**
- Only shows grid view (3-column cards using BudgetCard)
- NO filters
- Client-side pagination of summary results
- Uses `BudgetUtilization[]` type from summary endpoint

### Context to Load
```
packages/web/src/pages/budgets/BudgetListPage.tsx
packages/web/src/components/budgets/BudgetFilters.tsx
packages/web/src/components/budgets/BudgetListView.tsx
packages/web/src/components/expenses/ViewToggle.tsx
```

### Tasks

#### Task 6B.6.1: Add View Toggle Hook to BudgetListPage
**File:** `packages/web/src/pages/budgets/BudgetListPage.tsx`

**Acceptance Criteria:**
- [ ] Add budget-specific view preference hook (localStorage key: `budgets_view`)
- [ ] Import ViewToggle component from `@/components/expenses/ViewToggle`
- [ ] Default view should be `grid` to match current behavior
- [ ] View toggle positioned next to "Create Budget" button
- [ ] View preference persists across page refreshes

**Code Pattern:**
```typescript
import { ViewToggle, type ViewType } from '@/components/expenses/ViewToggle';

const BUDGETS_VIEW_KEY = 'budgets_view';

const useBudgetViewPreference = (defaultView: ViewType = 'grid'): [ViewType, (view: ViewType) => void] => {
  const [view, setView] = React.useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(BUDGETS_VIEW_KEY);
      if (stored === 'list' || stored === 'grid') return stored;
    }
    return defaultView;
  });

  const handleViewChange = React.useCallback((newView: ViewType) => {
    setView(newView);
    localStorage.setItem(BUDGETS_VIEW_KEY, newView);
  }, []);

  return [view, handleViewChange];
};
```

#### Task 6B.6.2: Integrate BudgetFilters Component
**File:** `packages/web/src/pages/budgets/BudgetListPage.tsx`

**Acceptance Criteria:**
- [ ] Import existing `BudgetFilters` component from `@/components/budgets/BudgetFilters`
- [ ] Add filter state management (type, period, status, searchQuery)
- [ ] Position filters below header, above content
- [ ] Client-side filtering of `data.budgets` based on filter values
- [ ] Reset to page 1 when filters change
- [ ] Show active filter count

**Filter Logic:**
```typescript
// Filter state
const [filterType, setFilterType] = useState<BudgetType | undefined>();
const [filterPeriod, setFilterPeriod] = useState<BudgetPeriod | undefined>();
const [filterStatus, setFilterStatus] = useState<'active' | 'exhausted' | undefined>();
const [searchQuery, setSearchQuery] = useState<string | undefined>();

// Client-side filtering
const filteredBudgets = React.useMemo(() => {
  if (!data?.budgets) return [];
  return data.budgets.filter((budget) => {
    if (filterType && budget.type !== filterType) return false;
    if (filterPeriod && budget.period !== filterPeriod) return false;
    if (filterStatus === 'active' && budget.isOverBudget) return false;
    if (filterStatus === 'exhausted' && !budget.isOverBudget) return false;
    if (searchQuery) {
      return budget.budgetName.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });
}, [data?.budgets, filterType, filterPeriod, filterStatus, searchQuery]);
```

#### Task 6B.6.3: Create BudgetUtilizationTable Component
**File:** `packages/web/src/components/budgets/BudgetUtilizationTable.tsx` (NEW)

**Acceptance Criteria:**
- [ ] Table component that accepts `BudgetUtilization[]` directly
- [ ] Columns: Name, Type, Period, Allocated, Used, Remaining, Progress, Expenses
- [ ] Progress bar with color coding (green < 70%, yellow 70-90%, red > 90%)
- [ ] Row click handler for navigation
- [ ] Loading state support
- [ ] Empty state message

**Component Interface:**
```typescript
interface BudgetUtilizationTableProps {
  budgets: BudgetUtilization[];
  isLoading: boolean;
  onRowClick: (budget: BudgetUtilization) => void;
}
```

#### Task 6B.6.4: Add Conditional Rendering
**File:** `packages/web/src/pages/budgets/BudgetListPage.tsx`

**Acceptance Criteria:**
- [ ] Render grid view when `view === 'grid'`
- [ ] Render table view when `view === 'list'`
- [ ] Pagination works in both views
- [ ] Selection state preserved when switching views

### Visual Layout
```
┌──────────────────────────────────────────────────────────────┐
│  Budgets                                    [List│Cards] [+] │
│  Manage and track your budgets                                │
├──────────────────────────────────────────────────────────────┤
│  [Total: 9] [Allocated: Rs 2.5M] [Util: 45%] [Over: 2]       │
├──────────────────────────────────────────────────────────────┤
│  🔍 Search...  [Type ▼] [Period ▼] [Status ▼] [Clear all]    │
├──────────────────────────────────────────────────────────────┤
│  LIST VIEW:                                                   │
│  ┌─────────┬──────┬────────┬─────────┬──────┬────────────┐   │
│  │ Name    │ Type │ Period │ Allocat │ Used │ Progress   │   │
│  │ IT Dept │ Dept │ Annual │ Rs 500K │ 250K │ ████ 50%   │   │
│  │ Travel  │ Cat  │ Monthly│ Rs 100K │ 80K  │ ██████ 80% │   │
│  └─────────┴──────┴────────┴─────────┴──────┴────────────┘   │
│                                                               │
│  GRID VIEW:                                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐                            │
│  │ Card 1 │ │ Card 2 │ │ Card 3 │                            │
│  └────────┘ └────────┘ └────────┘                            │
├──────────────────────────────────────────────────────────────┤
│  [Previous] Page 1 of 1 [Next]                               │
└──────────────────────────────────────────────────────────────┘
```

### Files to Modify/Create

| File | Change |
|------|--------|
| `packages/web/src/pages/budgets/BudgetListPage.tsx` | Add ViewToggle, filters, conditional rendering |
| `packages/web/src/components/budgets/BudgetUtilizationTable.tsx` | **NEW** - Table for BudgetUtilization data |

### Definition of Done
- [ ] View toggle shows List/Cards options
- [ ] View preference persists in localStorage
- [ ] Filters component renders below summary stats
- [ ] Search filters budgets by name
- [ ] Type dropdown filters by budget type
- [ ] Period dropdown filters by budget period
- [ ] Status dropdown filters by over/under budget
- [ ] Clear all filters button works
- [ ] List view shows table with all columns
- [ ] Grid view shows cards (existing behavior)
- [ ] Pagination works in both views
- [ ] Row click navigates to budget detail
- [ ] No TypeScript errors
- [ ] Responsive on mobile/tablet/desktop

### Verification Steps
1. Navigate to Budgets page
2. Verify toggle shows (List / Cards) next to Create Budget button
3. Click "List" → table view with all budget columns
4. Click "Cards" → original grid view
5. Refresh page → preference persisted in localStorage
6. Use search filter → budgets filter by name
7. Use type dropdown → budgets filter by type
8. Use period dropdown → budgets filter by period
9. Use status dropdown → filter active/exhausted
10. Click "Clear all filters" → resets all filters
11. Click row in list view → navigates to budget detail

### Commits
```bash
git commit -m "feat(budgets): add view toggle and filters to BudgetListPage

- Add list/grid view toggle with localStorage persistence
- Integrate existing BudgetFilters component
- Create BudgetUtilizationTable component for table view
- Add client-side filtering by type, period, status, search
- Story 6B.6"
```

---

## Related Documentation

- [Epic 6: Budget Management](./epic-06-budgets.md) - Full budget epic
- [Root CLAUDE.md](../../CLAUDE.md) - Project overview
- [Frontend CLAUDE.md](../../packages/web/CLAUDE.md) - Frontend conventions
