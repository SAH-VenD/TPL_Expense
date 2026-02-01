# Epic 2: Dashboard Implementation

**Priority:** P1 (Critical)
**Branch:** `feature/epic-02-dashboard`
**Estimated Complexity:** Medium
**Agent:** frontend-engineer

---

## Overview

Implement a fully functional dashboard with real API integration, statistics cards, activity widgets, and analytics charts. This replaces the current mock data implementation with live data from the backend reports API.

### Dependencies
- **Depends On:** Epic 1 (Stories 1.2, 1.3) - Requires Card, Badge, Skeleton, Spinner components
- **Blocks:** None (can be developed in parallel with Epic 3+)

### Backend API Integration
Uses `reportsApi` from `packages/web/src/features/reports/services/reports.service.ts`:
- Endpoint: `GET /reports/dashboard-summary` - Main dashboard metrics
- Endpoint: `GET /reports/spend-by-category` - Category breakdown for chart
- Endpoint: `GET /reports/monthly-trend` - Monthly spending trend

Additional APIs needed:
- `expensesApi.getExpenses` - Recent expenses widget
- `approvalsApi.getPendingApprovals` - Pending approvals widget
- `budgetsApi.getBudgets` - Budget overview widget

### Files to Create/Update
```
packages/web/src/
├── pages/dashboard/
│   └── DashboardPage.tsx (UPDATE - replace mock data)
├── components/dashboard/
│   ├── StatCard.tsx
│   ├── RecentExpenses.tsx
│   ├── PendingApprovals.tsx
│   ├── BudgetOverview.tsx
│   ├── SpendTrendChart.tsx
│   ├── CategoryBreakdownChart.tsx
│   └── index.ts (barrel export)
├── features/reports/services/
│   └── reports.service.ts (UPDATE - add dashboard-summary endpoint)
```

---

## Story 2.1: Dashboard Statistics Cards

Replace mock statistics with real API data and create reusable StatCard component.

### Context to Load
```
packages/web/src/pages/dashboard/DashboardPage.tsx (existing implementation)
packages/web/src/features/reports/services/reports.service.ts (existing RTK Query service)
packages/api/src/modules/reports/dto/report-responses.dto.ts (DashboardSummaryReportDto)
packages/web/src/store/hooks.ts (useAppSelector)
```

### Tasks

#### Task 2.1.1: Integrate Dashboard Summary API
**Files:**
- `packages/web/src/features/reports/services/reports.service.ts` (UPDATE)
- `packages/web/src/pages/dashboard/DashboardPage.tsx` (UPDATE)

**Acceptance Criteria:**
- [ ] Add `getDashboardSummary` endpoint to reportsApi
- [ ] Call `/reports/dashboard-summary` on dashboard mount
- [ ] Display pending expenses count from `expenses.pending.value`
- [ ] Display approved this month amount from `expenses.approved.value`
- [ ] Display pending approvals count from `approvals.pendingCount`
- [ ] Display active vouchers count from `vouchers.outstandingCount`
- [ ] Show loading skeletons while fetching
- [ ] Show error state with retry button on failure
- [ ] Handle empty/zero values gracefully

**API Contract:**
```typescript
// GET /reports/dashboard-summary?days=30
interface DashboardSummaryResponse {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  expenses: {
    total: DashboardMetric;
    approved: DashboardMetric;
    pending: DashboardMetric;
    rejected: DashboardMetric;
  };
  approvals: {
    pendingCount: number;
    oldestPendingDays: number;
    avgPendingDays: number;
  };
  vouchers: {
    outstandingCount: number;
    outstandingAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
  budgetUtilization: {
    overallUtilization: number;
    budgetsAtWarning: number;
    budgetsExceeded: number;
    totalAllocated: number;
    totalSpent: number;
  };
  topCategories?: Array<{ name: string; amount: number; percentage: number }>;
  topDepartments?: Array<{ name: string; amount: number; percentage: number }>;
  recentTrend?: Array<{ date: string; amount: number; count: number }>;
}

interface DashboardMetric {
  label: string;
  value: number;
  previousValue?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
}
```

**RTK Query Endpoint:**
```typescript
getDashboardSummary: builder.query<DashboardSummaryResponse, { days?: number }>({
  query: ({ days = 30 } = {}) => ({
    url: '/reports/dashboard-summary',
    params: { days },
  }),
}),
```

---

#### Task 2.1.2: Create StatCard Component
**File:** `packages/web/src/components/dashboard/StatCard.tsx`

**Acceptance Criteria:**
- [ ] Display main value (formatted with locale)
- [ ] Display subtitle/label text
- [ ] Show trend indicator (up arrow green, down arrow red, stable gray)
- [ ] Display change percentage when available
- [ ] Support click to navigate (optional onClick/href prop)
- [ ] Compact mode (smaller padding, font sizes) for grid layouts
- [ ] Expanded mode (larger, with icon) for featured stats
- [ ] Loading skeleton state
- [ ] Currency formatting for monetary values
- [ ] Number formatting for counts

**Interface:**
```typescript
interface StatCardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
  format?: 'number' | 'currency' | 'percentage';
  currency?: string; // default 'PKR'
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'compact' | 'expanded';
  loading?: boolean;
  className?: string;
}
```

**Visual Design:**
```
+----------------------------------+
|  [Icon]                    [Trend]|
|                                   |
|  PKR 45,000        +12% vs last  |
|  Approved This Month             |
+----------------------------------+
```

---

#### Task 2.1.3: Fix Welcome Message User Name
**File:** `packages/web/src/pages/dashboard/DashboardPage.tsx`

**Acceptance Criteria:**
- [ ] Get user from Redux auth state via `useAppSelector`
- [ ] Display user's firstName in greeting: "Welcome back, {firstName}!"
- [ ] Handle case when firstName is not available (use "there" as fallback)
- [ ] Show skeleton while auth state is loading (if applicable)

**Implementation:**
```typescript
const { user } = useAppSelector((state) => state.auth);
const greeting = user?.firstName || 'there';

return (
  <h1>Welcome back, {greeting}!</h1>
);
```

---

## Story 2.2: Recent Activity Widgets

Implement real-time activity widgets showing recent expenses, pending approvals, and budget overview.

### Context to Load
```
packages/web/src/features/expenses/services/expenses.service.ts
packages/web/src/features/approvals/services/approvals.service.ts
packages/web/src/features/budgets/services/budgets.service.ts
packages/api/src/modules/expenses/dto/*.ts (Expense DTOs)
packages/api/src/modules/approvals/dto/*.ts (Approval DTOs)
packages/api/src/modules/budgets/dto/*.ts (Budget DTOs)
```

### Tasks

#### Task 2.2.1: Create RecentExpenses Widget
**File:** `packages/web/src/components/dashboard/RecentExpenses.tsx`

**Acceptance Criteria:**
- [ ] Fetch last 5 expenses for current user via `expensesApi.getExpenses({ limit: 5, sort: 'createdAt:desc' })`
- [ ] Display each expense with: amount (formatted), date (relative), status badge
- [ ] Use Badge component for status (color by status: draft=gray, pending=yellow, approved=green, rejected=red, paid=blue)
- [ ] Click on expense row navigates to expense detail page (`/expenses/{id}`)
- [ ] "View all" link at bottom navigates to `/expenses`
- [ ] Loading state with skeleton rows
- [ ] Empty state: "No expenses yet. Create your first expense!"
- [ ] Error state with retry button

**Interface:**
```typescript
interface RecentExpensesProps {
  limit?: number; // default 5
  className?: string;
}

// Internal expense item display
interface ExpenseDisplayItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  status: ExpenseStatus;
  categoryName?: string;
}
```

**Visual Design:**
```
+----------------------------------------+
| Recent Expenses                        |
+----------------------------------------+
| Office Supplies              PKR 3,000 |
| Jan 21, 2024            [Pending]      |
|----------------------------------------|
| Travel Expense              PKR 15,000 |
| Jan 20, 2024            [Approved]     |
|----------------------------------------|
| [View all expenses ->]                 |
+----------------------------------------+
```

---

#### Task 2.2.2: Create PendingApprovals Widget
**File:** `packages/web/src/components/dashboard/PendingApprovals.tsx`

**Acceptance Criteria:**
- [ ] Fetch pending approvals for current user via `approvalsApi.getPendingApprovals({ limit: 5 })`
- [ ] Display each item with: submitter name, amount, expense description truncated
- [ ] Quick approve button (green) - calls approve API with optional comment
- [ ] Quick reject button (red) - opens confirm dialog requiring reason
- [ ] Click on row navigates to approval detail page
- [ ] Empty state for non-approvers: "You don't have any pending approvals"
- [ ] Empty state for approvers with no pending: "All caught up! No pending approvals."
- [ ] Loading state with skeleton
- [ ] Show toast notification on approve/reject success
- [ ] Invalidate cache and refetch after action

**Interface:**
```typescript
interface PendingApprovalsProps {
  limit?: number; // default 5
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string, reason: string) => void;
  className?: string;
}

// Internal approval item display
interface ApprovalDisplayItem {
  id: string;
  expenseId: string;
  submitterName: string;
  submitterEmail: string;
  amount: number;
  currency: string;
  description: string;
  submittedAt: Date;
  tier: number;
}
```

**Visual Design:**
```
+----------------------------------------+
| Pending Approvals                      |
+----------------------------------------+
| Travel Expense - John Doe              |
| PKR 15,000                             |
| [Approve] [Reject]                     |
|----------------------------------------|
| Office Supplies - Jane Smith           |
| PKR 3,500                              |
| [Approve] [Reject]                     |
+----------------------------------------+
```

---

#### Task 2.2.3: Create BudgetOverview Widget
**File:** `packages/web/src/components/dashboard/BudgetOverview.tsx`

**Acceptance Criteria:**
- [ ] Display top 3 budgets by utilization percentage
- [ ] Progress bar for each budget showing used/total
- [ ] Color coding: green (<70%), yellow (70-90%), red (>90%)
- [ ] Format: "PKR 65,000 / 100,000 (65%)"
- [ ] Click on budget navigates to budget detail page
- [ ] "View all budgets" link at bottom
- [ ] Loading state with skeleton progress bars
- [ ] Empty state: "No budgets configured"
- [ ] Show warning icon for budgets over 90%

**Interface:**
```typescript
interface BudgetOverviewProps {
  limit?: number; // default 3
  className?: string;
}

interface BudgetDisplayItem {
  id: string;
  name: string;
  type: 'DEPARTMENT' | 'PROJECT' | 'CATEGORY';
  allocated: number;
  spent: number;
  utilization: number; // percentage 0-100+
  currency: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}
```

**Visual Design:**
```
+----------------------------------------+
| Budget Overview                        |
+----------------------------------------+
| Department Budget                      |
| PKR 65,000 / 100,000 (65%)            |
| [=========>          ] (green)         |
|----------------------------------------|
| Travel Budget                          |
| PKR 45,000 / 50,000 (90%)     [!]     |
| [==================> ] (red)           |
|----------------------------------------|
| [View all budgets ->]                  |
+----------------------------------------+
```

---

## Story 2.3: Dashboard Charts

Add visual analytics with spend trend and category breakdown charts.

### Context to Load
```
packages/web/src/features/reports/services/reports.service.ts
packages/api/src/modules/reports/dto/report-responses.dto.ts (MonthlyTrendReportDto, SpendByCategory)
packages/web/package.json (check for recharts dependency)
```

### Tasks

#### Task 2.3.1: Create SpendTrendChart
**File:** `packages/web/src/components/dashboard/SpendTrendChart.tsx`

**Acceptance Criteria:**
- [ ] Monthly spend line chart using Recharts
- [ ] Display 12 months of data (current year by default)
- [ ] Optional: show previous year comparison line (dashed)
- [ ] X-axis: month names (Jan, Feb, etc.)
- [ ] Y-axis: amount in PKR (formatted with K/M suffixes for large numbers)
- [ ] Hover tooltip showing exact amount and month
- [ ] Responsive sizing (fills container width)
- [ ] Loading state with chart skeleton
- [ ] Empty state if no data
- [ ] Legend showing current year vs previous year (if comparison enabled)
- [ ] Animate on initial render

**Interface:**
```typescript
interface SpendTrendChartProps {
  year?: number; // default current year
  showComparison?: boolean; // show previous year
  height?: number; // default 300
  className?: string;
}

// Data shape from API
interface MonthlyTrendData {
  month: number;
  monthName: string;
  year: number;
  totalAmount: number;
  expenseCount: number;
}
```

**Recharts Configuration:**
```typescript
<ResponsiveContainer width="100%" height={height}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="monthName" />
    <YAxis tickFormatter={formatCurrency} />
    <Tooltip content={<CustomTooltip />} />
    <Legend />
    <Line
      type="monotone"
      dataKey="currentYear"
      stroke="#3B82F6"
      strokeWidth={2}
      dot={{ fill: '#3B82F6' }}
    />
    {showComparison && (
      <Line
        type="monotone"
        dataKey="previousYear"
        stroke="#9CA3AF"
        strokeDasharray="5 5"
      />
    )}
  </LineChart>
</ResponsiveContainer>
```

---

#### Task 2.3.2: Create CategoryBreakdownChart
**File:** `packages/web/src/components/dashboard/CategoryBreakdownChart.tsx`

**Acceptance Criteria:**
- [ ] Pie or donut chart using Recharts
- [ ] Display top categories by spend amount
- [ ] Each category has a distinct color (use predefined color palette)
- [ ] Click on segment filters expenses by that category (optional navigation)
- [ ] Legend showing category name and percentage
- [ ] Center label showing total amount (for donut chart)
- [ ] Hover tooltip with category name, amount, percentage
- [ ] Responsive sizing
- [ ] Loading state with skeleton
- [ ] Empty state if no category data
- [ ] Limit to top 6 categories, group rest as "Other"

**Interface:**
```typescript
interface CategoryBreakdownChartProps {
  dateRange?: { start: Date; end: Date };
  limit?: number; // default 6
  variant?: 'pie' | 'donut'; // default 'donut'
  height?: number; // default 300
  onCategoryClick?: (categoryId: string) => void;
  className?: string;
}

interface CategoryChartData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}
```

**Color Palette:**
```typescript
const CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray (for "Other")
];
```

**Recharts Configuration:**
```typescript
<ResponsiveContainer width="100%" height={height}>
  <PieChart>
    <Pie
      data={chartData}
      cx="50%"
      cy="50%"
      innerRadius={variant === 'donut' ? 60 : 0}
      outerRadius={80}
      dataKey="amount"
      nameKey="categoryName"
      label={renderLabel}
      onClick={handleClick}
    >
      {chartData.map((entry, index) => (
        <Cell key={entry.categoryId} fill={entry.color} />
      ))}
    </Pie>
    <Tooltip content={<CustomTooltip />} />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file in `__tests__/` folder:

```
packages/web/src/components/dashboard/__tests__/
├── StatCard.test.tsx
├── RecentExpenses.test.tsx
├── PendingApprovals.test.tsx
├── BudgetOverview.test.tsx
├── SpendTrendChart.test.tsx
└── CategoryBreakdownChart.test.tsx
```

### Test Cases per Component

#### StatCard Tests
- [ ] Renders value and label correctly
- [ ] Formats currency values with locale
- [ ] Shows correct trend indicator (up/down/stable)
- [ ] Handles click/navigation
- [ ] Shows loading skeleton when loading=true
- [ ] Applies compact/expanded variants

#### RecentExpenses Tests
- [ ] Renders list of expenses
- [ ] Shows correct status badges
- [ ] Handles empty state
- [ ] Handles loading state
- [ ] Click navigates to expense detail
- [ ] "View all" link works

#### PendingApprovals Tests
- [ ] Renders pending approval items
- [ ] Approve button calls API
- [ ] Reject button opens confirm dialog
- [ ] Shows empty state for non-approvers
- [ ] Handles loading state
- [ ] Shows toast on success

#### BudgetOverview Tests
- [ ] Renders budget items with progress bars
- [ ] Correct color coding by utilization
- [ ] Shows warning icon for high utilization
- [ ] Handles empty state
- [ ] Click navigates to budget detail

#### Chart Tests
- [ ] Renders chart with data
- [ ] Handles loading state
- [ ] Handles empty data
- [ ] Tooltip shows on hover (integration test)
- [ ] Legend displays correctly

### Coverage Target
- Minimum 70% code coverage
- All user interactions tested
- All loading/error/empty states tested

---

## Definition of Done

- [ ] All 6 components implemented (StatCard, RecentExpenses, PendingApprovals, BudgetOverview, SpendTrendChart, CategoryBreakdownChart)
- [ ] DashboardPage updated to use real API data
- [ ] reportsApi updated with getDashboardSummary endpoint
- [ ] All components exported from `components/dashboard/index.ts`
- [ ] TypeScript interfaces for all props
- [ ] Tailwind styling (no inline styles)
- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)
- [ ] Loading skeletons for all data-fetching components
- [ ] Error states with retry functionality
- [ ] Empty states with helpful messages
- [ ] Component tests written and passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Manual testing completed

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-02-dashboard
```

### Commits (one per story)
```bash
# Story 2.1
git commit -m "feat(dashboard): add StatCard component and API integration

- Add getDashboardSummary endpoint to reportsApi
- Create StatCard component with trend indicators
- Fix welcome message to use user's first name
- Add loading skeletons and error handling

Task: 2.1.1-2.1.3"

# Story 2.2
git commit -m "feat(dashboard): add activity widgets

- Create RecentExpenses widget with expense list
- Create PendingApprovals widget with quick actions
- Create BudgetOverview widget with progress bars
- Add navigation and empty states

Task: 2.2.1-2.2.3"

# Story 2.3
git commit -m "feat(dashboard): add analytics charts

- Create SpendTrendChart with monthly line chart
- Create CategoryBreakdownChart with donut chart
- Integrate Recharts library
- Add chart skeletons and error states

Task: 2.3.1-2.3.2"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-02-dashboard",
  "feature_name": "Dashboard Implementation",
  "module_name": "dashboard",

  "context_files": [
    "packages/web/src/pages/dashboard/DashboardPage.tsx",
    "packages/web/src/features/reports/services/reports.service.ts",
    "packages/api/src/modules/reports/dto/report-responses.dto.ts",
    "packages/web/src/store/hooks.ts",
    "packages/web/src/components/ui/index.ts"
  ],

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [
      {
        "method": "GET",
        "path": "/reports/dashboard-summary",
        "query": { "days": "number (default 30)" },
        "response": "DashboardSummaryReportDto"
      },
      {
        "method": "GET",
        "path": "/reports/monthly-trend",
        "query": { "year": "number" },
        "response": "MonthlyTrendReportDto"
      },
      {
        "method": "GET",
        "path": "/reports/spend-by-category",
        "query": { "startDate": "string", "endDate": "string" },
        "response": "SpendByCategory[]"
      }
    ]
  },

  "dependencies_to_use": [
    "recharts (charts)",
    "@reduxjs/toolkit (RTK Query)",
    "react-router-dom (navigation)",
    "date-fns (date formatting)",
    "clsx (class names)"
  ],

  "ui_components_available": [
    "Card (from Epic 1)",
    "Badge (from Epic 1)",
    "Skeleton (from Epic 1)",
    "Spinner (from Epic 1)",
    "EmptyState (from Epic 1)"
  ],

  "constraints": {
    "must_use": [
      "Tailwind CSS classes",
      "TypeScript interfaces",
      "RTK Query for API calls",
      "Existing UI components from Epic 1"
    ],
    "must_not": [
      "Create custom CSS files",
      "Use any types",
      "Use class components",
      "Hardcode mock data (use API)"
    ]
  }
}
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Epic 1: UI Components](./epic-01-ui-components.md) | Required UI components |
| [Phase 2 WBS](./phase2-frontend-wbs.md) | Overall frontend plan |
| [Reports API CLAUDE.md](../../packages/api/src/modules/reports/CLAUDE.md) | Backend API details |
| [Frontend Engineer Agent](../.claude/agents/frontend-engineer.md) | Agent protocol |
