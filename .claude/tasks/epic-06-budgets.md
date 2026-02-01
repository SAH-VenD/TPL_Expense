# Epic 6: Budget Management

**Priority:** P2 (Important)
**Branch:** `feature/epic-06-budgets`
**Estimated Complexity:** Medium
**Agent:** frontend-engineer

---

## Overview

Implement comprehensive budget management features for the TPL Expense system. This epic enables users to view budget utilization, track spending against allocations, and administrators to create and manage budgets across different organizational units (departments, projects, cost centers, employees, and categories).

### Dependencies
- **Depends On:** Epic 1 (Stories 1.2, 1.3, 1.4) - Requires DataTable, Modal, Card, Badge, Tabs components
- **Blocks:** None (can be developed in parallel with other P2 epics)

### Backend API Integration
Uses `budgetsApi` from `packages/web/src/features/budgets/services/budgets.service.ts`:
- Endpoint: `GET /budgets` - List budgets with filters and pagination
- Endpoint: `GET /budgets/{id}` - Get single budget details
- Endpoint: `GET /budgets/{id}/utilization` - Get budget utilization metrics
- Endpoint: `POST /budgets` - Create new budget (admin only)
- Endpoint: `PATCH /budgets/{id}` - Update budget (admin only)
- Endpoint: `DELETE /budgets/{id}` - Delete budget (admin only)

### Files to Create/Update
```
packages/web/src/
├── pages/budgets/
│   ├── BudgetListPage.tsx
│   ├── BudgetDetailPage.tsx
│   ├── BudgetCreatePage.tsx
│   ├── BudgetEditPage.tsx
│   └── BudgetTransferPage.tsx
├── components/budgets/
│   ├── BudgetCard.tsx
│   ├── BudgetListGrid.tsx
│   ├── BudgetListView.tsx
│   ├── BudgetFilters.tsx
│   ├── BudgetDetailHeader.tsx
│   ├── BudgetUtilizationChart.tsx
│   ├── SpendBreakdown.tsx
│   ├── SpendTrendChart.tsx
│   ├── BudgetAlertsDisplay.tsx
│   ├── BudgetForm.tsx
│   ├── BudgetTransferModal.tsx
│   └── index.ts (barrel export)
├── features/budgets/
│   ├── services/
│   │   └── budgets.service.ts (ALREADY EXISTS - no changes needed)
│   └── hooks/
│       ├── useBudgetFilters.ts
│       └── useBudgetTransfer.ts
```

---

## Story 6.1: Budget List Page

Implement the main budget list page with multiple view options, filtering, and type selection. Users can see all budgets they have access to with key metrics at a glance.

### Context to Load
```
packages/web/src/features/budgets/services/budgets.service.ts (API contract)
packages/api/src/modules/budgets/dto/budget.dto.ts (backend types reference)
packages/web/src/components/ui/DataTable.tsx (table component)
packages/web/src/components/ui/Card.tsx (card component)
packages/web/src/store/hooks.ts (useAppSelector)
```

### Tasks

#### Task 6.1.1: BudgetListPage Component
**File:** `packages/web/src/pages/budgets/BudgetListPage.tsx`

**Acceptance Criteria:**
- [ ] Page header with "Budget Management" title and create button (admin only)
- [ ] Type tabs: DEPARTMENT, PROJECT, COST_CENTER, EMPLOYEE, CATEGORY
- [ ] Period filter dropdown (ANNUAL, QUARTERLY, MONTHLY, PROJECT_BASED)
- [ ] View mode toggle buttons: Grid view, List view
- [ ] Status filter: All, Active, Exhausted
- [ ] Search input for budget name
- [ ] Integrates `useGetBudgetsQuery` with filters
- [ ] Show loading skeleton while fetching
- [ ] Show error state with retry button on failure
- [ ] Show empty state when no budgets match filters
- [ ] Pagination controls with page size selector
- [ ] Filter state persists in URL query parameters
- [ ] Admin users see "Create Budget" and "Transfer" buttons
- [ ] Click on budget card navigates to detail page
- [ ] Responsive: grid becomes 2 columns on tablet, 1 column on mobile

**Interfaces:**
```typescript
interface BudgetListPageState {
  selectedType: BudgetType;
  selectedPeriod?: BudgetPeriod;
  status?: 'active' | 'exhausted';
  searchQuery?: string;
  viewMode: 'grid' | 'list';
  page: number;
  pageSize: number;
}

interface BudgetListPageProps {
  // no props - uses URL for state
}
```

**Sub-Components Used:**
- BudgetFilters (Task 6.1.3)
- BudgetCard (Task 6.1.2) - for grid view
- BudgetListView (Task 6.1.2) - for list view
- DataTable, Pagination, Spinner, EmptyState from UI library

---

#### Task 6.1.2: Budget Card & List View Components
**Files:**
- `packages/web/src/components/budgets/BudgetCard.tsx`
- `packages/web/src/components/budgets/BudgetListGrid.tsx`
- `packages/web/src/components/budgets/BudgetListView.tsx`

**Acceptance Criteria (BudgetCard):**
- [ ] Display budget name as heading
- [ ] Show budget type badge (DEPARTMENT, PROJECT, etc.)
- [ ] Display progress bar with utilization percentage
- [ ] Show "Used: X / Allocated: Y" amounts in clear format
- [ ] Display period (ANNUAL, QUARTERLY, etc.) with small badge
- [ ] Show warning color (amber) when utilization >= 75%
- [ ] Show danger color (red) when utilization > 100%
- [ ] Show start and end dates
- [ ] Show remaining budget amount with +/- indicator
- [ ] Click handler for navigation to detail page
- [ ] Optional: show assigned entity (department name, project name, etc.)
- [ ] Responsive sizing in grid layout

**Interfaces (BudgetCard):**
```typescript
interface BudgetCardProps {
  budget: Budget;
  utilization: BudgetUtilization;
  onClick: () => void;
}
```

**Acceptance Criteria (BudgetListView):**
- [ ] DataTable with columns: Name, Type, Period, Allocated, Used, Remaining, Progress, Actions
- [ ] Sortable columns (click header to sort)
- [ ] Pagination with page size selector
- [ ] Hover state on rows
- [ ] Right-click context menu (edit, delete, transfer)
- [ ] Progress bar in "Progress" column using color indicators
- [ ] Show utilization percentage in progress column
- [ ] Currency formatting for amount columns
- [ ] Edit and Delete buttons in actions column (admin only)
- [ ] Responsive: horizontal scroll on tablet

**Interfaces (BudgetListView):**
```typescript
interface BudgetListViewProps {
  budgets: Budget[];
  utilizations: BudgetUtilization[];
  isLoading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onTransfer: (budget: Budget) => void;
}
```

---

#### Task 6.1.3: Budget Filters Component
**File:** `packages/web/src/components/budgets/BudgetFilters.tsx`

**Acceptance Criteria:**
- [ ] Type filter dropdown with options: All, DEPARTMENT, PROJECT, COST_CENTER, EMPLOYEE, CATEGORY
- [ ] Period filter dropdown with options: All, ANNUAL, QUARTERLY, MONTHLY, PROJECT_BASED
- [ ] Status filter dropdown with options: All, Active, Exhausted
- [ ] Search input for budget name/entity name
- [ ] Clear all filters button
- [ ] Apply/Reset buttons (or auto-apply on change)
- [ ] Debounced search input (300ms)
- [ ] Accessible: proper labels and ARIA attributes
- [ ] Mobile responsive: stack vertically on small screens

**Interfaces:**
```typescript
interface BudgetFiltersProps {
  type?: BudgetType;
  period?: BudgetPeriod;
  status?: 'active' | 'exhausted';
  searchQuery?: string;
  onTypeChange: (type?: BudgetType) => void;
  onPeriodChange: (period?: BudgetPeriod) => void;
  onStatusChange: (status?: 'active' | 'exhausted') => void;
  onSearchChange: (query?: string) => void;
  onClearAll: () => void;
}
```

---

## Story 6.2: Budget Detail Page

Implement the detailed view for a single budget showing utilization charts, expense breakdown, trends, and alert configurations.

### Context to Load
```
packages/web/src/features/budgets/services/budgets.service.ts
packages/api/src/modules/budgets/dto/budget.dto.ts
packages/api/src/modules/expenses/dto/expense.dto.ts (for breakdown)
packages/web/src/components/ui/Chart.tsx (if exists, else use recharts)
packages/web/src/components/ui/Tabs.tsx (for tab navigation)
```

### Tasks

#### Task 6.2.1: BudgetDetailPage Component
**File:** `packages/web/src/pages/budgets/BudgetDetailPage.tsx`

**Acceptance Criteria:**
- [ ] Page header with budget name and breadcrumb navigation
- [ ] Budget detail header section (Task 6.2.2)
- [ ] Tabs for different views: Overview, Breakdown, Trends, Alerts
- [ ] Overview tab shows utilization chart and summary metrics
- [ ] Breakdown tab shows spend breakdown component
- [ ] Trends tab shows spend trend chart
- [ ] Alerts tab shows budget alerts display
- [ ] Integrates `useGetBudgetQuery` and `useGetBudgetUtilizationQuery`
- [ ] Show loading state for each section independently
- [ ] Show error state with retry button
- [ ] Back button to navigate to list page
- [ ] Edit button (admin only) - navigates to edit page
- [ ] Delete button (admin only) - shows confirm dialog
- [ ] Transfer button (admin only) - shows transfer modal
- [ ] Breadcrumb shows: Budgets > [Budget Name]
- [ ] Page title matches budget name

**Interfaces:**
```typescript
interface BudgetDetailPageProps {
  // no props - uses URL params
}

interface BudgetDetailTab {
  id: string;
  label: string;
  content: React.ReactNode;
}
```

---

#### Task 6.2.2: Budget Detail Header Component
**File:** `packages/web/src/components/budgets/BudgetDetailHeader.tsx`

**Acceptance Criteria:**
- [ ] Display budget name as main heading
- [ ] Show entity type and assigned entity name (department, project, etc.)
- [ ] Show period (ANNUAL, QUARTERLY, MONTHLY, PROJECT_BASED)
- [ ] Show period dates (start - end)
- [ ] Display total allocated amount in large format with currency
- [ ] Display used amount and percentage utilization
- [ ] Display remaining amount with +/- indicator
- [ ] Show warning/danger icon if utilization >= threshold
- [ ] Show enforcement level badge (HARD_BLOCK, SOFT_WARNING, AUTO_ESCALATE)
- [ ] Show active/inactive status badge
- [ ] Action buttons: Edit (admin), Delete (admin), Transfer (admin)
- [ ] Utilization progress bar with color coding
- [ ] Currency symbol from budget.currency
- [ ] Large, clear typography for key metrics

**Interfaces:**
```typescript
interface BudgetDetailHeaderProps {
  budget: Budget;
  utilization: BudgetUtilization;
  onEdit?: () => void;
  onDelete?: () => void;
  onTransfer?: () => void;
}
```

---

#### Task 6.2.3: Spend Breakdown Component
**File:** `packages/web/src/components/budgets/SpendBreakdown.tsx`

**Acceptance Criteria:**
- [ ] Two breakdowns in separate sections:
  - By Category (pie chart)
  - By User/Employee (horizontal bar chart)
- [ ] Pie chart shows categories with percentages
- [ ] Pie chart is interactive: hover shows percentage and amount
- [ ] Bar chart shows top 5-10 employees by spend
- [ ] Bar chart is sorted descending by amount
- [ ] Date range selector above charts (default: current period)
- [ ] Show "Top Expenses" list below charts
- [ ] List shows: expense description, category, user, amount, date
- [ ] List is sortable by amount or date
- [ ] List has pagination (limit 10 per page)
- [ ] Loading skeleton while fetching breakdown data
- [ ] Empty state if no expenses in budget
- [ ] Uses recharts or chart library for visualizations
- [ ] Responsive: charts stack vertically on mobile

**Interfaces:**
```typescript
interface SpendBreakdownProps {
  budgetId: string;
  budget: Budget;
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange?: (start: Date, end: Date) => void;
}

interface ExpenseBreakdown {
  byCategory: Array<{ category: string; amount: number; percentage: number }>;
  byUser: Array<{ userId: string; userName: string; amount: number }>;
  topExpenses: Array<{ id: string; description: string; amount: number; date: string }>;
}
```

---

#### Task 6.2.4: Budget Alerts Display Component
**File:** `packages/web/src/components/budgets/BudgetAlertsDisplay.tsx`

**Acceptance Criteria:**
- [ ] Show alert status cards:
  - Warning threshold: alert if used >= warningThreshold
  - Critical: alert if used >= 90%
  - Exceeded: alert if used > 100%
- [ ] Each alert shows current value and threshold value
- [ ] Show alert history (last 5 alerts with timestamps)
- [ ] Show notification preferences (email, in-app, etc.)
- [ ] Threshold configuration section (admin only):
  - Input for warning threshold percentage
  - Input for critical threshold percentage
  - Enforcement level dropdown (HARD_BLOCK, SOFT_WARNING, AUTO_ESCALATE)
  - Save button with loading state
- [ ] Alert color coding: amber for warning, red for danger
- [ ] Show which users are notified on alerts
- [ ] Acknowledge/dismiss alert functionality
- [ ] Show when alert was last triggered

**Interfaces:**
```typescript
interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'exceeded';
  threshold: number;
  currentValue: number;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

interface BudgetAlertsDisplayProps {
  budget: Budget;
  alerts: BudgetAlert[];
  isAdmin: boolean;
  onThresholdUpdate?: (warningThreshold: number, enforcement: BudgetEnforcement) => Promise<void>;
  onAcknowledge?: (alertId: string) => Promise<void>;
}
```

---

## Story 6.3: Budget Administration (Admin Only)

Implement admin-only budget creation, editing, and transfer functionality. These pages are protected and only accessible to admin and finance roles.

### Context to Load
```
packages/web/src/features/budgets/services/budgets.service.ts
packages/web/src/components/ui/Form components (Input, Select, DatePicker, etc.)
packages/api/src/modules/budgets/dto/budget.dto.ts
```

### Tasks

#### Task 6.3.1: BudgetForm Component
**File:** `packages/web/src/components/budgets/BudgetForm.tsx`

**Acceptance Criteria:**
- [ ] Budget name input (required, min 3 chars, max 100 chars)
- [ ] Budget type select dropdown (DEPARTMENT, PROJECT, COST_CENTER, EMPLOYEE, CATEGORY)
- [ ] Period select dropdown (ANNUAL, QUARTERLY, MONTHLY, PROJECT_BASED)
- [ ] Total amount input (required, number, > 0)
- [ ] Currency select (PKR, GBP, USD, SAR, AED)
- [ ] Start date picker (required)
- [ ] End date picker (required, must be after start date)
- [ ] Entity selector (changes based on type):
  - Department select for DEPARTMENT type
  - Project select for PROJECT type
  - Cost Center select for COST_CENTER type
  - Employee select for EMPLOYEE type
  - Category select for CATEGORY type
- [ ] Warning threshold input (percentage, 0-100, default 75%)
- [ ] Enforcement level select (HARD_BLOCK, SOFT_WARNING, AUTO_ESCALATE)
- [ ] Form validation with Zod or similar
- [ ] Display field-level errors inline
- [ ] Submit button with loading state
- [ ] Cancel button
- [ ] Integrates with React Hook Form
- [ ] Uses existing UI components (Input, Select, DatePicker, etc.)
- [ ] Accessible: proper labels and ARIA attributes
- [ ] Mobile responsive

**Interfaces:**
```typescript
interface BudgetFormProps {
  initialData?: Partial<CreateBudgetDto>;
  isLoading?: boolean;
  onSubmit: (data: CreateBudgetDto) => Promise<void>;
  onCancel: () => void;
}

interface BudgetFormValues extends CreateBudgetDto {
  // extends CreateBudgetDto from budgets.service.ts
}
```

**Validation Schema (Zod):**
```typescript
const budgetFormSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.enum(['DEPARTMENT', 'PROJECT', 'COST_CENTER', 'EMPLOYEE', 'CATEGORY']),
  period: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY', 'PROJECT_BASED']),
  totalAmount: z.number().min(0.01),
  currency: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  warningThreshold: z.number().min(0).max(100),
  enforcement: z.enum(['HARD_BLOCK', 'SOFT_WARNING', 'AUTO_ESCALATE']),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  costCenterId: z.string().optional(),
  employeeId: z.string().optional(),
  categoryId: z.string().optional(),
});
```

---

#### Task 6.3.2: Budget Create & Edit Pages
**Files:**
- `packages/web/src/pages/budgets/BudgetCreatePage.tsx`
- `packages/web/src/pages/budgets/BudgetEditPage.tsx`

**Acceptance Criteria (Create Page):**
- [ ] Page header: "Create Budget"
- [ ] BudgetForm component (Task 6.3.1)
- [ ] Form is empty (no initial data)
- [ ] Submit button label: "Create Budget"
- [ ] On submit success:
  - Show success toast notification
  - Navigate to detail page of created budget
- [ ] On submit error:
  - Show error toast with backend error message
  - Keep form visible for corrections
- [ ] Cancel button navigates back to list page
- [ ] Protected route: admin only
- [ ] Breadcrumb: Budgets > Create

**Acceptance Criteria (Edit Page):**
- [ ] Page header: "Edit Budget: [Budget Name]"
- [ ] Load budget data on page load using URL params (id)
- [ ] BudgetForm component with initial data
- [ ] Form is populated with current budget values
- [ ] Submit button label: "Update Budget"
- [ ] On submit success:
  - Show success toast notification
  - Navigate back to detail page
  - Refresh budget data
- [ ] On submit error:
  - Show error toast with backend error message
  - Keep form visible for corrections
- [ ] Cancel button navigates back to detail page
- [ ] Delete button with confirm dialog (calls delete mutation)
- [ ] Protected route: admin only
- [ ] Breadcrumb: Budgets > [Budget Name] > Edit
- [ ] Show loading state while fetching initial data

**Interfaces:**
```typescript
interface BudgetCreatePageProps {
  // no props
}

interface BudgetEditPageProps {
  // no props - uses URL params for budget id
}
```

---

#### Task 6.3.3: Budget Transfer Modal Component
**File:** `packages/web/src/components/budgets/BudgetTransferModal.tsx`

**Acceptance Criteria:**
- [ ] Modal title: "Transfer Budget"
- [ ] Source budget display (read-only):
  - Budget name
  - Current allocated amount
  - Current used amount
  - Available amount to transfer
- [ ] Target budget selector:
  - Dropdown showing eligible budgets of same type
  - Shows available amount for each target
  - Filter to same budget type only
  - Disable if only one budget of type exists
- [ ] Transfer amount input:
  - Number input
  - Minimum: 0.01
  - Maximum: source.remainingAmount
  - Validation: cannot exceed source remaining
  - Show error if invalid
- [ ] Reason textarea (optional, max 500 chars)
- [ ] Preview section:
  - Source after transfer (calculated)
  - Target after transfer (calculated)
  - Remaining in source
- [ ] Transfer button with loading state
- [ ] Cancel button
- [ ] Confirmation dialog after transfer:
  - Success message with amounts
  - Option to transfer again or close
- [ ] Protected: admin only
- [ ] Use React Hook Form for validation

**Interfaces:**
```typescript
interface BudgetTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBudget: Budget;
  onTransfer: (data: BudgetTransferData) => Promise<void>;
}

interface BudgetTransferData {
  sourceBudgetId: string;
  targetBudgetId: string;
  amount: number;
  reason?: string;
}
```

---

#### Task 6.3.4: Budget Transfer Page (Optional - Alternative to Modal)
**File:** `packages/web/src/pages/budgets/BudgetTransferPage.tsx`

**Note:** This task is an alternative to using BudgetTransferModal. If the transfer flow is complex and requires more space, use a full page instead of a modal.

**Acceptance Criteria:**
- [ ] Page header: "Transfer Budget Allocation"
- [ ] Budget selection section:
  - Source budget selector (dropdown or autocomplete)
  - Show available amount to transfer
- [ ] Target budget selector:
  - Shows budgets of same type as source
  - Filter updates when source changes
- [ ] Transfer amount input with validation
- [ ] Reason textarea
- [ ] Preview cards showing before/after state
- [ ] Transfer button with loading state
- [ ] Success state after transfer:
  - Show confirmation message
  - Option to perform another transfer
  - Option to return to list page
- [ ] Breadcrumb: Budgets > Transfer
- [ ] Protected: admin only

---

## TypeScript Interfaces Summary

### Core Types (from budgets.service.ts)
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
  projectId?: string;
  project?: { id: string; name: string };
  categoryId?: string;
  category?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BudgetUtilization {
  budget: Budget;
  utilizationPercent: number;
  remainingAmount: number;
  isWarning: boolean;
  isExceeded: boolean;
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
  projectId?: string;
  costCenterId?: string;
  employeeId?: string;
  categoryId?: string;
}
```

### Page-Specific Types
```typescript
// BudgetListPage
interface BudgetListFilters {
  type?: BudgetType;
  period?: BudgetPeriod;
  status?: 'active' | 'exhausted';
  searchQuery?: string;
  page: number;
  pageSize: number;
}

// SpendBreakdown
interface ExpenseBreakdownData {
  byCategory: Array<{ category: string; amount: number; percentage: number }>;
  byUser: Array<{ userId: string; userName: string; amount: number }>;
  topExpenses: Array<{ id: string; description: string; amount: number; date: string }>;
}

// BudgetTransfer
interface BudgetTransferData {
  sourceBudgetId: string;
  targetBudgetId: string;
  amount: number;
  reason?: string;
}
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file in `__tests__/` folder with:
- [ ] Renders without crashing
- [ ] All props work correctly
- [ ] Loading states render correctly
- [ ] Error states render correctly
- [ ] User interactions work correctly (clicks, form submissions)
- [ ] Accessibility: proper ARIA attributes and keyboard navigation

### Test File Locations
```
packages/web/src/components/budgets/__tests__/
├── BudgetCard.test.tsx
├── BudgetListGrid.test.tsx
├── BudgetListView.test.tsx
├── BudgetFilters.test.tsx
├── BudgetDetailHeader.test.tsx
├── SpendBreakdown.test.tsx
├── BudgetAlertsDisplay.test.tsx
├── BudgetForm.test.tsx
└── BudgetTransferModal.test.tsx

packages/web/src/pages/budgets/__tests__/
├── BudgetListPage.test.tsx
├── BudgetDetailPage.test.tsx
├── BudgetCreatePage.test.tsx
└── BudgetEditPage.test.tsx
```

### Test Categories
1. **Rendering Tests** - Component renders with given props
2. **Interaction Tests** - User clicks, types, submits forms
3. **API Integration Tests** - RTK Query hooks work correctly
4. **State Management Tests** - Filters, pagination, view modes work
5. **Accessibility Tests** - Keyboard navigation, ARIA labels
6. **Error Handling Tests** - Error states display correctly

### Coverage Target
- Minimum 70% code coverage
- All user interactions tested
- All error paths tested

### E2E Test Scenarios
```gherkin
Scenario: User views budget list with filters
  Given I am logged in as admin
  When I navigate to Budgets page
  Then I see list of budgets
  And I can filter by type, period, status
  And I can search by budget name

Scenario: User views budget details
  Given I am on Budgets list page
  When I click on a budget
  Then I see budget detail page
  And I see utilization metrics
  And I see expense breakdown

Scenario: Admin creates new budget
  Given I am logged in as admin
  When I click "Create Budget"
  And I fill in all required fields
  And I click "Create"
  Then budget is created successfully
  And I am redirected to detail page

Scenario: Admin transfers budget allocation
  Given I am on budget detail page
  When I click "Transfer"
  And I select target budget
  And I enter transfer amount
  And I click "Transfer"
  Then allocation is transferred
  And both budgets are updated
```

---

## Definition of Done

### Code Completion
- [ ] All 13 tasks implemented
- [ ] All components exported from index.ts
- [ ] TypeScript interfaces for all props
- [ ] Tailwind styling (no inline styles)
- [ ] Responsive at all breakpoints (mobile, tablet, desktop)
- [ ] All form validations work correctly
- [ ] Loading states implemented
- [ ] Error states implemented
- [ ] Empty states implemented

### Quality Assurance
- [ ] Component tests written with minimum 70% coverage
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All accessibility requirements met
- [ ] Keyboard navigation works
- [ ] Form submission handling works
- [ ] API integration tested

### Integration
- [ ] RTK Query hooks properly integrated
- [ ] Cache invalidation works correctly
- [ ] Auth guards applied to admin pages
- [ ] Error messages display user-friendly messages
- [ ] Toast notifications work for success/error
- [ ] URL query parameters persist filter state

### Documentation
- [ ] All component props documented with JSDoc
- [ ] README with usage examples
- [ ] API contract documentation

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-06-budgets
```

### Commits (one per story)
```bash
# Story 6.1
git commit -m "feat(budgets): add budget list page with filtering and views

- Implement BudgetListPage with grid/list view toggle
- Add BudgetCard component for grid display
- Add BudgetListView component with DataTable
- Add BudgetFilters for type, period, status, search

Task: 6.1.1, 6.1.2, 6.1.3"

# Story 6.2
git commit -m "feat(budgets): add budget detail page with analytics

- Implement BudgetDetailPage with tabs for Overview/Breakdown/Trends/Alerts
- Add BudgetDetailHeader with key metrics
- Add SpendBreakdown with category and user pie charts
- Add BudgetAlertsDisplay for threshold management

Task: 6.2.1, 6.2.2, 6.2.3, 6.2.4"

# Story 6.3
git commit -m "feat(budgets): add admin budget administration

- Implement BudgetForm for create/edit operations
- Add BudgetCreatePage and BudgetEditPage
- Add BudgetTransferModal for budget transfers
- Add validation and error handling

Task: 6.3.1, 6.3.2, 6.3.3"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-06-budgets",
  "feature_name": "Budget Management",
  "module_name": "budgets",

  "context_files": [
    "packages/web/src/features/budgets/services/budgets.service.ts",
    "packages/web/src/components/ui/DataTable.tsx",
    "packages/web/src/components/ui/Card.tsx",
    "packages/web/src/components/ui/Modal.tsx",
    "packages/web/src/components/ui/Tabs.tsx",
    "packages/web/src/store/hooks.ts",
    "packages/web/src/services/api.ts"
  ],

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [
      { "method": "GET", "path": "/budgets", "query": "filters" },
      { "method": "GET", "path": "/budgets/{id}", "description": "Get single budget" },
      { "method": "GET", "path": "/budgets/{id}/utilization", "description": "Get utilization metrics" },
      { "method": "POST", "path": "/budgets", "description": "Create budget (admin)" },
      { "method": "PATCH", "path": "/budgets/{id}", "description": "Update budget (admin)" },
      { "method": "DELETE", "path": "/budgets/{id}", "description": "Delete budget (admin)" }
    ]
  },

  "pages_required": [
    "BudgetListPage",
    "BudgetDetailPage",
    "BudgetCreatePage",
    "BudgetEditPage"
  ],

  "components_required": [
    "BudgetCard",
    "BudgetListGrid",
    "BudgetListView",
    "BudgetFilters",
    "BudgetDetailHeader",
    "SpendBreakdown",
    "BudgetAlertsDisplay",
    "BudgetForm",
    "BudgetTransferModal"
  ],

  "hooks_required": [
    "useBudgetFilters",
    "useBudgetTransfer"
  ],

  "dependencies_to_use": [
    "react-hook-form (form handling)",
    "zod (validation)",
    "recharts (data visualization)",
    "react-router-dom (navigation)",
    "@hookform/resolvers (form validation)",
    "clsx (class name utility)"
  ],

  "protected_routes": [
    "BudgetCreatePage (ADMIN, FINANCE)",
    "BudgetEditPage (ADMIN, FINANCE)",
    "BudgetTransferPage (ADMIN)"
  ],

  "constraints": {
    "must_use": [
      "RTK Query for API calls",
      "React Hook Form for forms",
      "Zod for validation",
      "Tailwind CSS exclusively",
      "TypeScript interfaces",
      "Functional components",
      "Existing UI components from Epic 1"
    ],
    "must_not": [
      "Create custom CSS or inline styles",
      "Use any types",
      "Use class components",
      "Hardcode mock data",
      "Create duplicate UI primitives"
    ],
    "accessibility_requirements": [
      "All form inputs have associated labels",
      "Keyboard navigation works throughout",
      "ARIA attributes for dynamic content",
      "Proper heading hierarchy",
      "Color is not sole conveyor of information",
      "Focus indicators visible"
    ],
    "performance_requirements": [
      "Pagination for large lists",
      "Lazy load components where possible",
      "Debounce search input",
      "Cache API responses with RTK Query"
    ]
  }
}
```

---

## Related Documentation

- [Epic 1: UI Components](./epic-01-ui-components.md) - Required UI primitives
- [Root CLAUDE.md](../../CLAUDE.md) - Project overview
- [Frontend CLAUDE.md](../../packages/web/CLAUDE.md) - Frontend conventions
- [budgets.service.ts](../../packages/web/src/features/budgets/services/budgets.service.ts) - API contract
