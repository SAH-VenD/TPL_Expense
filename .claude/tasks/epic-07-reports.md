# Epic 7: Reports & Analytics

**Priority:** P2 (Important)
**Branch:** `feature/epic-07-reports`
**Estimated Complexity:** High
**Agent:** frontend-engineer

---

## Overview

Implement comprehensive reports and analytics features for the TPL Expense system. This epic enables users to view advanced analytics dashboards with charts and detailed reports, export data in multiple formats, and track approval metrics, budget utilization, and outstanding expenses across the organization.

### Dependencies
- **Depends On:** Epic 1 (Stories 1.2, 1.3) - Requires Card, Badge, Skeleton, Spinner, DataTable, Modal components
- **Depends On:** Epic 2 (Dashboard APIs) - Uses existing dashboard summary reports
- **Blocks:** None (can be developed in parallel with other P2 epics)

### Backend API Integration
Uses `reportsApi` from `packages/web/src/features/reports/services/reports.service.ts`:
- Endpoint: `GET /reports/spend-by-category` - Spend breakdown by category
- Endpoint: `GET /reports/spend-by-department` - Spend breakdown by department with budget comparison
- Endpoint: `GET /reports/monthly-trend` - Monthly spending trends with YoY comparison
- Endpoint: `GET /reports/budget-vs-actual` - Budget utilization detailed report
- Endpoint: `GET /reports/approval-metrics` - Approval workflow metrics and statistics
- Endpoint: `GET /reports/outstanding-advances` - Outstanding vouchers and overdue items
- Endpoint: `GET /reports/export` - Export reports as XLSX or CSV

### Files to Create/Update
```
packages/web/src/
├── pages/reports/
│   ├── ReportsDashboardPage.tsx
│   ├── BudgetVsActualReportPage.tsx
│   ├── ApprovalMetricsReportPage.tsx
│   └── OutstandingAdvancesReportPage.tsx
├── components/reports/
│   ├── ReportsDashboard/
│   │   ├── ReportsDashboard.tsx
│   │   ├── DateRangeSelector.tsx
│   │   ├── SummaryStatsRow.tsx
│   │   └── index.ts
│   ├── Charts/
│   │   ├── SpendByCategoryChart.tsx
│   │   ├── SpendByDepartmentChart.tsx
│   │   ├── MonthlyTrendChart.tsx
│   │   └── index.ts
│   ├── Reports/
│   │   ├── BudgetVsActualReport.tsx
│   │   ├── ApprovalMetricsReport.tsx
│   │   ├── OutstandingAdvancesReport.tsx
│   │   └── index.ts
│   ├── Export/
│   │   ├── ExportButton.tsx
│   │   ├── useExportReport.ts (hook)
│   │   └── index.ts
│   └── index.ts (barrel export)
├── features/reports/
│   ├── services/
│   │   └── reports.service.ts (UPDATE - add new endpoints)
│   └── hooks/
│       ├── useDateRange.ts
│       └── useReportExport.ts
```

---

## Story 7.1: Reports Dashboard

Implement the main reports dashboard with global date range selection, summary statistics, and multiple chart sections organized in a responsive grid.

### Context to Load
```
packages/web/src/features/reports/services/reports.service.ts (existing RTK Query service)
packages/api/src/modules/reports/dto/report-responses.dto.ts (backend DTO types)
packages/web/src/store/hooks.ts (useAppSelector)
packages/web/src/components/ui/ (Card, Badge, Skeleton, Spinner)
```

### Tasks

#### Task 7.1.1: ReportsDashboardPage Component
**File:** `packages/web/src/pages/reports/ReportsDashboardPage.tsx`

**Acceptance Criteria:**
- [ ] Page header with "Reports & Analytics" title
- [ ] Global date range selector (Task 7.1.2) at the top
- [ ] Summary statistics row showing key metrics (Task 7.1.3)
- [ ] Grid layout with chart sections:
  - Spend by Category (Task 7.1.2)
  - Spend by Department (Task 7.1.3)
  - Monthly Trend (Task 7.1.4)
- [ ] Each section has title and info icon with tooltip
- [ ] All charts refresh when date range changes
- [ ] Show loading skeleton for entire dashboard on initial load
- [ ] Show loading state for individual chart sections
- [ ] Error state with retry button for each section
- [ ] Empty state when no data available
- [ ] Responsive grid: 2 columns on desktop, 1 column on tablet/mobile
- [ ] Chart sections have consistent card styling
- [ ] Export button visible (connects to Story 7.3)

**Interfaces:**
```typescript
interface ReportsDashboardPageState {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  viewMode?: 'summary' | 'detailed'; // for future expansion
}

interface DashboardChartSection {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
}
```

**Visual Design:**
```
+-------------------------------------------+
| Reports & Analytics                  [↻] |
+-------------------------------------------+
| [From: Jan 1, 2024]  [To: Dec 31, 2024] |
+-------------------------------------------+
|
| ┌──────────────────┐ ┌──────────────────┐
| │ Total Spend      │ │ Approved Amount  │
| │ PKR 500,000      │ │ PKR 480,000      │
| │                  │ │                  │
| │ Avg Per Day      │ │ Pending Approval │
| │ PKR 1,370        │ │ PKR 20,000       │
| └──────────────────┘ └──────────────────┘
|
| ┌──────────────────────────────────────┐
| │ Spend by Category                    │
| │ [Pie/Donut Chart]                    │
| └──────────────────────────────────────┘
|
| ┌──────────────────────────────────────┐
| │ Spend by Department                  │
| │ [Horizontal Bar Chart]               │
| └──────────────────────────────────────┘
|
| ┌──────────────────────────────────────┐
| │ Monthly Trend                        │
| │ [Line Chart with YoY]                │
| └──────────────────────────────────────┘
+-------------------------------------------+
```

**RTK Query Updates:**
```typescript
// Add to reportsApi in packages/web/src/features/reports/services/reports.service.ts
getDashboardSummary: builder.query<DashboardMetricsResponse, DateRangeParams>({
  query: ({ startDate, endDate }) => ({
    url: '/reports/dashboard-summary',
    params: { startDate, endDate },
  }),
  providesTags: ['Reports'],
}),
```

---

#### Task 7.1.2: DateRangeSelector Component
**File:** `packages/web/src/components/reports/ReportsDashboard/DateRangeSelector.tsx`

**Acceptance Criteria:**
- [ ] Two date input fields: "From Date" and "To Date"
- [ ] Optional preset buttons: "This Month", "Last Month", "Last Quarter", "This Year", "Last Year", "Custom"
- [ ] Date picker opens on input click (use native HTML5 date input or date library)
- [ ] Validate: startDate must be before endDate
- [ ] Show error message if validation fails
- [ ] "Apply" button to apply selected range
- [ ] "Clear" button to reset to default (current year)
- [ ] Debounce API calls after date selection (500ms delay)
- [ ] Selected date range highlighted in button state
- [ ] Format dates as "MMM DD, YYYY" in display
- [ ] Accessible: proper labels, ARIA attributes, keyboard navigation
- [ ] Mobile responsive: stack vertically on small screens

**Interfaces:**
```typescript
interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  className?: string;
}

interface DateRangePreset {
  label: string;
  value: 'this_month' | 'last_month' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';
  getDateRange: () => { startDate: Date; endDate: Date };
}
```

**Visual Design:**
```
┌─────────────────────────────────────────┐
| [This Month] [Last Month] [This Year] ▼ |
|                                         |
| From: [01/01/2024]    To: [12/31/2024] |
|       [📅]                    [📅]      |
|                                         |
|                [Apply] [Clear]          |
└─────────────────────────────────────────┘
```

---

#### Task 7.1.3: SummaryStatsRow Component
**File:** `packages/web/src/components/reports/ReportsDashboard/SummaryStatsRow.tsx`

**Acceptance Criteria:**
- [ ] Display 4 key metrics in a horizontal row:
  1. Total Spend (sum of all expenses)
  2. Approved Amount (sum of approved expenses)
  3. Pending Approval (sum of pending expenses)
  4. Approval Rate (percentage of approved)
- [ ] Each metric in a StatCard (from Epic 2)
- [ ] Format currency values with locale (PKR, 2 decimals)
- [ ] Format percentage with % symbol
- [ ] Show loading skeleton for each card while fetching
- [ ] Optional: show trend indicators (compared to previous period)
- [ ] Large, readable typography
- [ ] Responsive: 2 columns on tablet, 1 column on mobile

**Interfaces:**
```typescript
interface SummaryStatsRowProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  className?: string;
}

interface DashboardMetrics {
  totalSpend: number;
  approvedAmount: number;
  pendingAmount: number;
  approvalRate: number; // percentage 0-100
  currency: string; // default 'PKR'
}
```

---

#### Task 7.1.4: Dashboard Summary API Endpoint
**File:** `packages/web/src/features/reports/services/reports.service.ts` (UPDATE)

**Acceptance Criteria:**
- [ ] Add `getDashboardMetrics` endpoint to reportsApi
- [ ] Call `/reports/dashboard-summary` with dateRange query params
- [ ] Handle date formatting for API call (ISO 8601 format)
- [ ] Cache results with appropriate tag invalidation
- [ ] Type response data as `DashboardMetricsResponse`

**API Contract:**
```typescript
// GET /reports/dashboard-summary?startDate=2024-01-01&endDate=2024-12-31
interface DashboardMetricsResponse {
  totalSpend: number;
  approvedAmount: number;
  pendingAmount: number;
  rejectedAmount: number;
  approvalRate: number; // percentage
  expenseCount: number;
  approvalCount: number;
  averageExpenseAmount: number;
  averageApprovalDays: number;
  topCategory?: string;
  topDepartment?: string;
  currency: string;
}
```

---

## Story 7.2: Spend Charts

Implement interactive charts showing spend patterns across different dimensions: category, department, and monthly trends with comparison capabilities.

### Context to Load
```
packages/web/src/features/reports/services/reports.service.ts
packages/api/src/modules/reports/dto/report-responses.dto.ts
packages/web/package.json (verify recharts installed)
packages/web/src/components/ui/ (Card, Skeleton)
```

### Tasks

#### Task 7.2.1: SpendByCategoryChart Component
**File:** `packages/web/src/components/reports/Charts/SpendByCategoryChart.tsx`

**Acceptance Criteria:**
- [ ] Pie or donut chart using Recharts
- [ ] Display top 6 categories by spend amount
- [ ] Group remaining categories as "Other"
- [ ] Legend showing category names and amounts (PKR formatted)
- [ ] Each category has distinct color (use predefined palette)
- [ ] Click on chart segment to drill down (optional: navigate to filtered expenses)
- [ ] Hover tooltip showing category name, amount, percentage
- [ ] Responsive sizing (fills container width)
- [ ] Center text for donut showing total amount
- [ ] Loading skeleton while fetching
- [ ] Empty state if no category data
- [ ] Period comparison toggle: show distribution for different periods side-by-side
- [ ] Animate on initial render

**Interfaces:**
```typescript
interface SpendByCategoryChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  variant?: 'pie' | 'donut'; // default 'donut'
  height?: number; // default 300
  onCategoryClick?: (categoryId: string, categoryName: string) => void;
  className?: string;
}

interface CategoryChartData {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  expenseCount: number;
  color: string;
}

interface CategoryChartResponse {
  categories: Array<{
    id: string;
    name: string;
    amount: number;
    percentage: number;
    expenseCount: number;
  }>;
  total: number;
  currency: string;
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
      outerRadius={90}
      paddingAngle={2}
      dataKey="amount"
      nameKey="categoryName"
      label={renderLabel}
      onClick={handleCategoryClick}
      isAnimationActive
    >
      {chartData.map((entry) => (
        <Cell key={entry.categoryId} fill={entry.color} />
      ))}
    </Pie>
    <Tooltip content={<CategoryChartTooltip />} />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

---

#### Task 7.2.2: SpendByDepartmentChart Component
**File:** `packages/web/src/components/reports/Charts/SpendByDepartmentChart.tsx`

**Acceptance Criteria:**
- [ ] Horizontal bar chart using Recharts
- [ ] Display all departments sorted by total spend
- [ ] Each department shows two bars: Budget Allocated and Actual Spend
- [ ] Budget bar in light color, Spend bar in darker color
- [ ] Alternative: stacked bar showing remaining budget
- [ ] X-axis: amount in PKR (formatted with K/M suffixes for large numbers)
- [ ] Y-axis: department names
- [ ] Hover tooltip showing budget, spend, utilization %
- [ ] Sort options: "By Amount", "By Name", "By Utilization %"
- [ ] Show budget exceeded indicator (red) for departments over budget
- [ ] Loading skeleton while fetching
- [ ] Empty state if no department data
- [ ] Responsive height adjustment based on number of departments
- [ ] Legend: "Budget", "Spend"

**Interfaces:**
```typescript
interface SpendByDepartmentChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  sortBy?: 'amount' | 'name' | 'utilization';
  height?: number; // calculated based on data
  showBudget?: boolean; // default true
  className?: string;
}

interface DepartmentChartData {
  departmentId: string;
  departmentName: string;
  budgetAllocated: number;
  actualSpend: number;
  utilization: number; // percentage
  isOverBudget: boolean;
  color: string;
}

interface DepartmentChartResponse {
  departments: Array<{
    id: string;
    name: string;
    budgetAllocated: number;
    actualSpend: number;
    utilization: number;
  }>;
  total: {
    budgetAllocated: number;
    actualSpend: number;
  };
  currency: string;
}
```

**Recharts Configuration:**
```typescript
const BAR_HEIGHT = 50;
const height = Math.max(300, data.length * BAR_HEIGHT);

<ResponsiveContainer width="100%" height={height}>
  <BarChart
    data={chartData}
    layout="vertical"
    margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis type="number" tickFormatter={formatCurrency} />
    <YAxis dataKey="departmentName" type="category" width={190} />
    <Tooltip content={<DepartmentChartTooltip />} />
    <Legend />
    <Bar dataKey="budgetAllocated" fill="#D1D5DB" name="Budget" />
    <Bar dataKey="actualSpend" fill="#3B82F6" name="Spend" />
  </BarChart>
</ResponsiveContainer>
```

---

#### Task 7.2.3: MonthlyTrendChart Component
**File:** `packages/web/src/components/reports/Charts/MonthlyTrendChart.tsx`

**Acceptance Criteria:**
- [ ] Line chart using Recharts showing 12 months of data
- [ ] Display current year data by default
- [ ] Optional: year-over-year comparison with two lines (current year + previous year)
- [ ] Current year line in primary color (blue), previous year in muted color
- [ ] X-axis: month names (Jan, Feb, Mar, etc.)
- [ ] Y-axis: amount in PKR (formatted with K/M suffixes)
- [ ] Hover tooltip showing exact amount, month, and year
- [ ] Responsive sizing (fills container width)
- [ ] Legend showing current year vs previous year
- [ ] Animate on initial render
- [ ] Loading skeleton while fetching
- [ ] Empty state if no trend data
- [ ] Smooth curves (monotone) for aesthetic visualization
- [ ] Optional: show data points (dots) on line

**Interfaces:**
```typescript
interface MonthlyTrendChartProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  showComparison?: boolean; // show previous year
  height?: number; // default 300
  className?: string;
}

interface MonthlyTrendData {
  month: number; // 1-12
  monthName: string; // 'Jan', 'Feb', etc.
  year: number;
  currentYearAmount: number;
  previousYearAmount?: number;
  expenseCount: number;
  currency: string;
}

interface MonthlyTrendResponse {
  months: Array<{
    month: number;
    monthName: string;
    currentYearAmount: number;
    previousYearAmount?: number;
    expenseCount: number;
  }>;
  total: number;
  currency: string;
}
```

**Recharts Configuration:**
```typescript
<ResponsiveContainer width="100%" height={height}>
  <LineChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="monthName" />
    <YAxis tickFormatter={formatCurrency} />
    <Tooltip content={<TrendChartTooltip />} />
    <Legend />
    <Line
      type="monotone"
      dataKey="currentYearAmount"
      stroke="#3B82F6"
      strokeWidth={2}
      dot={{ fill: '#3B82F6' }}
      name="Current Year"
      isAnimationActive
    />
    {showComparison && (
      <Line
        type="monotone"
        dataKey="previousYearAmount"
        stroke="#9CA3AF"
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: '#9CA3AF' }}
        name="Previous Year"
        isAnimationActive
      />
    )}
  </LineChart>
</ResponsiveContainer>
```

**API Endpoints Updates:**
```typescript
// Add to reportsApi
getSpendByCategory: builder.query<CategoryChartResponse, DateRangeParams>({
  query: ({ startDate, endDate }) => ({
    url: '/reports/spend-by-category',
    params: { startDate, endDate },
  }),
  providesTags: ['Reports'],
}),

getSpendByDepartment: builder.query<DepartmentChartResponse, DateRangeParams>({
  query: ({ startDate, endDate }) => ({
    url: '/reports/spend-by-department',
    params: { startDate, endDate },
  }),
  providesTags: ['Reports'],
}),

getMonthlyTrend: builder.query<MonthlyTrendResponse, DateRangeParams>({
  query: ({ startDate, endDate }) => ({
    url: '/reports/monthly-trend',
    params: { startDate, endDate },
  }),
  providesTags: ['Reports'],
}),
```

---

## Story 7.3: Detailed Reports

Implement detailed report pages with tabular data layouts, sorting, filtering, and comprehensive breakdowns for budgets, approvals, and outstanding expenses.

### Context to Load
```
packages/web/src/features/reports/services/reports.service.ts
packages/api/src/modules/reports/dto/report-responses.dto.ts
packages/web/src/components/ui/DataTable.tsx
packages/web/src/components/ui/Badge.tsx
```

### Tasks

#### Task 7.3.1: BudgetVsActualReportPage Component
**File:** `packages/web/src/pages/reports/BudgetVsActualReportPage.tsx`

**Acceptance Criteria:**
- [ ] Page header with "Budget vs Actual Report" title
- [ ] Date range selector at top (reuse DateRangeSelector from Story 7.1)
- [ ] Budget type filter: All, DEPARTMENT, PROJECT, COST_CENTER, EMPLOYEE, CATEGORY
- [ ] Status filter: All, Under Budget, Near Limit, Over Budget
- [ ] DataTable with columns: Budget Name, Type, Allocated, Spent, Remaining, Variance %, Status
- [ ] Sortable columns (click header to sort)
- [ ] Pagination with page size selector
- [ ] Budget Allocated formatted as currency
- [ ] Spent formatted as currency
- [ ] Remaining calculated and formatted
- [ ] Variance % column shows +/- with color coding:
  - Green: under budget (negative variance)
  - Amber: 80-100% utilization
  - Red: over budget (positive variance)
- [ ] Status badge in Status column (Under Budget, At Limit, Over Budget)
- [ ] Click on row navigates to budget detail (if detail page exists)
- [ ] Loading state with skeleton table
- [ ] Empty state when no data
- [ ] Error state with retry
- [ ] Export button (connects to Story 7.4)

**Interfaces:**
```typescript
interface BudgetVsActualReportPageState {
  budgetType?: BudgetType;
  status?: 'under' | 'limit' | 'over';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface BudgetVsActualRow {
  budgetId: string;
  budgetName: string;
  budgetType: BudgetType;
  allocated: number;
  spent: number;
  remaining: number;
  variancePercentage: number;
  status: 'under' | 'limit' | 'over';
  currency: string;
  startDate: Date;
  endDate: Date;
}

interface BudgetVsActualReportResponse {
  rows: BudgetVsActualRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    totalAllocated: number;
    totalSpent: number;
    overallUtilization: number;
  };
  currency: string;
}
```

**Visual Design:**
```
+───────────────────────────────────────────────────+
| Budget vs Actual Report                     [⟳]  |
+───────────────────────────────────────────────────+
| [From: Jan 1, 2024] [To: Dec 31, 2024]          |
| Type: [All ▼]  Status: [All ▼]  [Export]        |
+───────────────────────────────────────────────────+
|
| Budget Name    | Type | Allocated | Spent | Var%|Status
| ──────────────────────────────────────────────────
| Dept Budget    | DEPT | 100,000   | 65,000| -35%|Under
| Travel Project | PROJ | 50,000    | 48,000| -4% |At Limit
| Office Supplies| CAT  | 30,000    | 31,000| +3% |Over
|
| [< 1 2 3 >] Showing 1-10 of 25
+───────────────────────────────────────────────────+
```

---

#### Task 7.3.2: ApprovalMetricsReport Component
**File:** `packages/web/src/pages/reports/ApprovalMetricsReportPage.tsx`

**Acceptance Criteria:**
- [ ] Page header with "Approval Metrics Report" title
- [ ] Date range selector at top
- [ ] Summary statistics section showing:
  - Average approval time (in days)
  - Approval rate (% approved out of submitted)
  - Rejection rate (% rejected)
  - Average by tier (if multi-tier approvals)
- [ ] Section 1: Breakdown by Tier table with columns:
  - Tier Number
  - Total Submissions
  - Approved Count
  - Rejected Count
  - Approval Rate %
  - Average Time (days)
- [ ] Section 2: Breakdown by Approver table with columns:
  - Approver Name
  - Department
  - Total Reviewed
  - Approved Count
  - Rejected Count
  - Approval Rate %
  - Average Time (days)
- [ ] Sort by columns: approver name, total reviewed, approval rate
- [ ] Pagination for each table
- [ ] Color coding: High approval rate = green, Low = red, Medium = amber
- [ ] Loading states with skeleton
- [ ] Empty state messaging
- [ ] Error state with retry
- [ ] Export button

**Interfaces:**
```typescript
interface ApprovalMetricsResponse {
  summary: {
    totalSubmissions: number;
    totalApproved: number;
    totalRejected: number;
    approvalRate: number; // percentage
    rejectionRate: number; // percentage
    averageApprovalDays: number;
    medianApprovalDays: number;
  };
  byTier: Array<{
    tierNumber: number;
    totalSubmissions: number;
    approvedCount: number;
    rejectedCount: number;
    approvalRate: number; // percentage
    averageApprovalDays: number;
  }>;
  byApprover: Array<{
    approverId: string;
    approverName: string;
    departmentName?: string;
    totalReviewed: number;
    approvedCount: number;
    rejectedCount: number;
    approvalRate: number; // percentage
    averageApprovalDays: number;
  }>;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}
```

---

#### Task 7.3.3: OutstandingAdvancesReport Component
**File:** `packages/web/src/pages/reports/OutstandingAdvancesReportPage.tsx`

**Acceptance Criteria:**
- [ ] Page header with "Outstanding Advances Report" title
- [ ] Date range selector at top
- [ ] Filter options: Show All, Show Overdue Only
- [ ] Summary statistics showing:
  - Total Outstanding Amount
  - Total Outstanding Count
  - Total Overdue Amount
  - Total Overdue Count
- [ ] DataTable with columns:
  - Voucher ID
  - Employee Name
  - Department
  - Amount (formatted as currency)
  - Status (badge: Outstanding, Overdue, Partially Settled)
  - Days Outstanding
  - Issue Date
  - Due Date
  - Contact Email (with mailto link)
- [ ] Rows with overdue items highlighted in red/amber
- [ ] Sortable columns
- [ ] Pagination with page size selector
- [ ] Quick action buttons:
  - "Email Employee" button (opens email compose in default email client)
  - "Mark Settled" button (admin only)
  - "View Voucher" link navigates to voucher detail
- [ ] Row color coding:
  - Gray: within terms
  - Amber: 1-7 days overdue
  - Red: 7+ days overdue
- [ ] Loading state with skeleton table
- [ ] Empty state: "No outstanding advances"
- [ ] Error state with retry
- [ ] Export button

**Interfaces:**
```typescript
interface OutstandingAdvancesResponse {
  items: Array<{
    voucherId: string;
    voucherNumber: string;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    department: string;
    amount: number;
    currency: string;
    status: 'OUTSTANDING' | 'OVERDUE' | 'PARTIALLY_SETTLED';
    issueDate: Date;
    dueDate: Date;
    daysOutstanding: number;
    settlementDate?: Date;
    settledAmount?: number;
  }>;
  summary: {
    totalOutstandingAmount: number;
    totalOutstandingCount: number;
    totalOverdueAmount: number;
    totalOverdueCount: number;
  };
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

**Visual Design:**
```
+────────────────────────────────────────────────────+
| Outstanding Advances Report                   [⟳] |
+────────────────────────────────────────────────────+
| [From: Jan 1, 2024] [To: Dec 31, 2024]           |
| [Show All] [Show Overdue Only]  [Export]         |
+────────────────────────────────────────────────────+
|
| Summary:
| Outstanding: PKR 500,000 (10 items) | Overdue: PKR 150,000 (3 items)
|
| Voucher ID | Employee    | Dept | Amount | Status  | Days Out | [Email]
| ─────────────────────────────────────────────────────────────────────
| VOC-001    | John Doe    | IT   | 50,000 | Overdue | 12 days  | [✉]
| VOC-002    | Jane Smith  | HR   | 30,000 | Outst.  | 5 days   | [✉]
|
| [< 1 2 3 >] Showing 1-10 of 25
+────────────────────────────────────────────────────+
```

**API Endpoint:**
```typescript
// Add to reportsApi
getOutstandingAdvances: builder.query<OutstandingAdvancesResponse, {
  startDate: Date;
  endDate: Date;
  includeOverdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}>({
  query: ({ startDate, endDate, includeOverdueOnly, page = 1, pageSize = 10 }) => ({
    url: '/reports/outstanding-advances',
    params: {
      startDate,
      endDate,
      overdueOnly: includeOverdueOnly,
      page,
      pageSize,
    },
  }),
  providesTags: ['Reports'],
}),
```

---

## Story 7.4: Export Functionality

Implement multi-format export capability for all reports with progress tracking and error handling.

### Context to Load
```
packages/web/src/features/reports/services/reports.service.ts
packages/web/src/components/ui/ (Button, Spinner, Toast)
```

### Tasks

#### Task 7.4.1: useExportReport Custom Hook
**File:** `packages/web/src/features/reports/hooks/useExportReport.ts`

**Acceptance Criteria:**
- [ ] Hook to handle report export with multiple formats (XLSX, CSV)
- [ ] Call `reportsApi.exportReport` endpoint with format parameter
- [ ] Show download progress (if backend provides it)
- [ ] Handle file download automatically in browser
- [ ] Generate filename with current date and report type: `{ReportType}-{Date}.{ext}`
  - Example: `Budget-Report-2024-01-15.xlsx`
- [ ] Handle network errors gracefully with error toast
- [ ] Handle unsupported browser (fallback message)
- [ ] Return loading state, error state, success callback
- [ ] TypeScript types for all parameters and return values

**Interfaces:**
```typescript
type ExportFormat = 'xlsx' | 'csv';

type ReportType =
  | 'budget-vs-actual'
  | 'approval-metrics'
  | 'outstanding-advances'
  | 'spend-summary';

interface ExportReportParams {
  reportType: ReportType;
  format: ExportFormat;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>; // optional filters applied to report
}

interface UseExportReportReturn {
  isLoading: boolean;
  error: string | null;
  exportReport: (params: ExportReportParams) => Promise<void>;
  clearError: () => void;
}

// Hook usage:
const { isLoading, error, exportReport } = useExportReport();

await exportReport({
  reportType: 'budget-vs-actual',
  format: 'xlsx',
  dateRange: { startDate, endDate },
  filters: { budgetType: 'DEPARTMENT' },
});
```

**Implementation Pattern:**
```typescript
export const useExportReport = (): UseExportReportReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast(); // toast notification hook

  const exportReport = async (params: ExportReportParams) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call API with blob response
      const blob = await reportsApi.exportReport({
        ...params,
        startDate: params.dateRange.startDate.toISOString(),
        endDate: params.dateRange.endDate.toISOString(),
      });

      // Generate filename
      const filename = generateFilename(params.reportType, params.format);

      // Trigger download
      downloadBlob(blob, filename);

      showToast({
        type: 'success',
        message: `${params.reportType} exported successfully`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      setError(errorMsg);
      showToast({ type: 'error', message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, exportReport, clearError: () => setError(null) };
};
```

---

#### Task 7.4.2: ExportButton Component
**File:** `packages/web/src/components/reports/Export/ExportButton.tsx`

**Acceptance Criteria:**
- [ ] Dropdown button with export format options
- [ ] Options: "Export as Excel (.xlsx)", "Export as CSV (.csv)"
- [ ] Show loading spinner while exporting
- [ ] Disabled state while loading
- [ ] Click handler triggers `useExportReport` hook
- [ ] Show success toast on download complete
- [ ] Show error toast if export fails
- [ ] Keyboard accessible: Enter/Space to open, Arrow keys to navigate, Enter to select
- [ ] Tooltip showing keyboard shortcuts
- [ ] Tooltip: "Download report in selected format"
- [ ] Responsive sizing on mobile
- [ ] Optional: show estimated file size

**Interfaces:**
```typescript
interface ExportButtonProps {
  reportType: ReportType;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: Record<string, any>;
  className?: string;
  variant?: 'primary' | 'secondary'; // styling variant
}

interface ExportOption {
  label: string;
  format: ExportFormat;
  icon?: React.ReactNode;
  estimatedSize?: string;
}
```

**Visual Design:**
```
┌─────────────────────┐
| [Export ▼]          |
| └─────────────────  |
|  📊 Excel (.xlsx)   |
|  📋 CSV (.csv)      |
└─────────────────────┘

During export:
┌─────────────────────┐
| [⏳ Exporting...] ✓ |
└─────────────────────┘
```

---

#### Task 7.4.3: Reports API Export Endpoint
**File:** `packages/web/src/features/reports/services/reports.service.ts` (UPDATE)

**Acceptance Criteria:**
- [ ] Add `exportReport` endpoint to reportsApi with blob response type
- [ ] Support both XLSX and CSV formats via format query parameter
- [ ] Support report type parameter: budget-vs-actual, approval-metrics, outstanding-advances
- [ ] Include date range filters in request
- [ ] Return binary blob data directly (for file download)
- [ ] Set appropriate Content-Disposition header for filename (from backend)

**API Endpoint Addition:**
```typescript
// Add to reportsApi
exportReport: builder.query<Blob, {
  reportType: ReportType;
  format: ExportFormat;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  filters?: Record<string, any>;
}>({
  query: ({ reportType, format, startDate, endDate, filters }) => ({
    url: `/reports/export`,
    params: {
      type: reportType,
      format,
      startDate,
      endDate,
      ...filters,
    },
    responseHandler: async (response) => response.blob(),
  }),
  providesTags: ['Reports'],
}),
```

---

## Testing Requirements

### Component Tests Required
Each component must have a test file in `__tests__/` folder:

```
packages/web/src/components/reports/__tests__/
├── ReportsDashboard.test.tsx
├── DateRangeSelector.test.tsx
├── SummaryStatsRow.test.tsx
├── SpendByCategoryChart.test.tsx
├── SpendByDepartmentChart.test.tsx
├── MonthlyTrendChart.test.tsx
├── BudgetVsActualReport.test.tsx
├── ApprovalMetricsReport.test.tsx
├── OutstandingAdvancesReport.test.tsx
└── ExportButton.test.tsx
```

### Test Cases per Component

#### ReportsDashboardPage Tests
- [ ] Renders page header and title
- [ ] DateRangeSelector is visible and functional
- [ ] All chart sections render with proper titles
- [ ] Loading state shows skeletons for all sections
- [ ] Error state shows retry button for each section
- [ ] Empty state shows appropriate messaging
- [ ] Date range change triggers API calls for all sections
- [ ] Responsive layout: 2 columns desktop, 1 column mobile

#### DateRangeSelector Tests
- [ ] Renders date inputs and preset buttons
- [ ] Preset buttons correctly set date ranges
- [ ] Date validation: start date < end date
- [ ] Apply button triggers onDateRangeChange
- [ ] Clear button resets to defaults
- [ ] Formatted dates display correctly
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] ARIA labels present

#### Chart Component Tests (All Charts)
- [ ] Renders chart with data
- [ ] Loading state shows skeleton
- [ ] Empty data shows empty state
- [ ] Tooltip appears on hover (integration test)
- [ ] Legend displays correctly
- [ ] Responsive sizing adjusts to container
- [ ] Click handlers work (if implemented)
- [ ] Animation plays on mount

#### DataTable Report Tests (Budget, Approval, Advances)
- [ ] Renders table with all columns
- [ ] Sortable columns work
- [ ] Pagination controls work
- [ ] Filters apply correctly
- [ ] Loading state shows skeleton table
- [ ] Empty state displays messaging
- [ ] Currency formatting correct
- [ ] Color coding/badges display correctly
- [ ] Action buttons work (email, navigate, etc.)

#### ExportButton Tests
- [ ] Renders dropdown button
- [ ] Dropdown opens on click
- [ ] Export format options visible
- [ ] Click on option triggers export
- [ ] Loading spinner shows during export
- [ ] Success toast on download
- [ ] Error toast on failure
- [ ] Keyboard navigation works
- [ ] Button disabled while loading

### Coverage Target
- Minimum 75% code coverage for components
- 80% coverage for hooks and utilities
- All user interactions tested
- All loading/error/empty states tested
- All API calls mocked with MSW

---

## Definition of Done

### Frontend Implementation
- [ ] All 3 stories completed with full feature implementation
- [ ] 10+ components created (dashboards, charts, reports, export)
- [ ] All components have TypeScript interfaces for props
- [ ] Tailwind CSS styling throughout (no inline styles or separate CSS files)
- [ ] RTK Query service endpoints added to reportsApi
- [ ] Custom hooks implemented (useDateRange, useExportReport)
- [ ] All components use existing UI library from Epic 1

### Responsiveness & Accessibility
- [ ] Responsive at mobile (375px), tablet (768px), desktop (1280px)
- [ ] Charts responsive and readable at all breakpoints
- [ ] Tables horizontal scroll on tablet
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels and roles present where needed
- [ ] Color not sole indicator (patterns, icons for accessibility)

### Data & State Management
- [ ] Loading skeletons for all data-fetching sections
- [ ] Error states with retry functionality
- [ ] Empty states with helpful messaging
- [ ] Cache invalidation working correctly
- [ ] Date range changes trigger appropriate refetches

### Charts & Visualizations
- [ ] All 3 charts render correctly with Recharts
- [ ] Charts are responsive and animated
- [ ] Hover tooltips show detailed information
- [ ] Legends display correctly
- [ ] Color schemes are accessible and consistent

### Reports & Tables
- [ ] All 3 detailed report pages functional
- [ ] Data tables sortable and paginated
- [ ] Filters working correctly
- [ ] Export buttons present and functional
- [ ] Currency formatting consistent
- [ ] Status indicators visible and accurate

### Testing
- [ ] Component tests written for all major components
- [ ] Tests passing (75%+ coverage)
- [ ] No TypeScript errors (`npm run build:web` passes)
- [ ] No ESLint errors (`npm run lint` passes)
- [ ] No Prettier formatting issues (`npm run format` passes)

### Documentation
- [ ] Component interfaces documented with JSDoc comments
- [ ] API contract documented in service file
- [ ] Export hook documented with usage examples
- [ ] Accessibility considerations noted in code comments

---

## Branch & Commit Strategy

### Branch
```bash
git checkout -b feature/epic-07-reports
```

### Commits (one per story)
```bash
# Story 7.1: Reports Dashboard
git commit -m "feat(reports): implement dashboard with charts and date selector

- Create ReportsDashboardPage with responsive grid layout
- Add DateRangeSelector component with presets
- Implement SummaryStatsRow with key metrics
- Add dashboard API endpoints to reportsApi
- Include loading skeletons and error handling
- Responsive: 2 columns desktop, 1 column mobile

Task: 7.1.1-7.1.4"

# Story 7.2: Spend Charts
git commit -m "feat(reports): add interactive spend charts

- Create SpendByCategoryChart using Recharts donut chart
- Create SpendByDepartmentChart with budget comparison
- Create MonthlyTrendChart with YoY comparison
- Add chart API endpoints to reportsApi
- Include hover tooltips and responsive sizing
- Add loading skeletons for all charts

Task: 7.2.1-7.2.3"

# Story 7.3: Detailed Reports
git commit -m "feat(reports): add detailed report pages

- Create BudgetVsActualReportPage with sortable table
- Create ApprovalMetricsReportPage with metrics breakdown
- Create OutstandingAdvancesReportPage with employee contact
- Add report API endpoints to reportsApi
- Include filters, pagination, and color coding
- Add quick action buttons (email, navigate, settle)

Task: 7.3.1-7.3.3"

# Story 7.4: Export Functionality
git commit -m "feat(reports): add export functionality for all reports

- Create useExportReport custom hook with format support
- Implement ExportButton component with dropdown menu
- Add export endpoint to reportsApi (XLSX and CSV)
- Generate filenames with date and report type
- Show loading spinner and success/error toasts
- Handle browser download automatically

Task: 7.4.1-7.4.3"
```

---

## Agent Input Contract

When spawning frontend-engineer for this epic:

```json
{
  "task_id": "epic-07-reports",
  "feature_name": "Reports & Analytics",
  "module_name": "reports",
  "priority": "P2",

  "context_files": [
    "packages/web/src/features/reports/services/reports.service.ts",
    "packages/api/src/modules/reports/dto/report-responses.dto.ts",
    "packages/web/src/components/ui/index.ts",
    "packages/web/src/store/hooks.ts",
    "packages/web/package.json"
  ],

  "api_contracts": {
    "base_url": "/api/v1",
    "endpoints": [
      {
        "method": "GET",
        "path": "/reports/dashboard-summary",
        "query": { "startDate": "string (ISO 8601)", "endDate": "string (ISO 8601)" },
        "response": "DashboardMetricsResponse"
      },
      {
        "method": "GET",
        "path": "/reports/spend-by-category",
        "query": { "startDate": "string", "endDate": "string" },
        "response": "CategoryChartResponse"
      },
      {
        "method": "GET",
        "path": "/reports/spend-by-department",
        "query": { "startDate": "string", "endDate": "string" },
        "response": "DepartmentChartResponse"
      },
      {
        "method": "GET",
        "path": "/reports/monthly-trend",
        "query": { "startDate": "string", "endDate": "string" },
        "response": "MonthlyTrendResponse"
      },
      {
        "method": "GET",
        "path": "/reports/budget-vs-actual",
        "query": { "startDate": "string", "endDate": "string", "type": "string", "status": "string", "page": "number", "pageSize": "number" },
        "response": "BudgetVsActualReportResponse"
      },
      {
        "method": "GET",
        "path": "/reports/approval-metrics",
        "query": { "startDate": "string", "endDate": "string" },
        "response": "ApprovalMetricsResponse"
      },
      {
        "method": "GET",
        "path": "/reports/outstanding-advances",
        "query": { "startDate": "string", "endDate": "string", "overdueOnly": "boolean", "page": "number", "pageSize": "number" },
        "response": "OutstandingAdvancesResponse"
      },
      {
        "method": "GET",
        "path": "/reports/export",
        "query": { "type": "string", "format": "xlsx|csv", "startDate": "string", "endDate": "string", "filters": "object" },
        "response": "Blob (file download)"
      }
    ]
  },

  "pages_required": [
    "ReportsDashboardPage.tsx",
    "BudgetVsActualReportPage.tsx",
    "ApprovalMetricsReportPage.tsx",
    "OutstandingAdvancesReportPage.tsx"
  ],

  "components_required": [
    "ReportsDashboard.tsx",
    "DateRangeSelector.tsx",
    "SummaryStatsRow.tsx",
    "SpendByCategoryChart.tsx",
    "SpendByDepartmentChart.tsx",
    "MonthlyTrendChart.tsx",
    "BudgetVsActualReport.tsx",
    "ApprovalMetricsReport.tsx",
    "OutstandingAdvancesReport.tsx",
    "ExportButton.tsx"
  ],

  "hooks_required": [
    "useDateRange.ts",
    "useExportReport.ts"
  ],

  "dependencies_to_use": [
    "recharts (pie, bar, line charts)",
    "@reduxjs/toolkit (RTK Query)",
    "react-router-dom (navigation)",
    "date-fns (date formatting and utilities)",
    "clsx (conditional classnames)"
  ],

  "ui_components_available": [
    "Card (from Epic 1)",
    "Badge (from Epic 1)",
    "Skeleton (from Epic 1)",
    "Spinner (from Epic 1)",
    "DataTable (from Epic 1)",
    "Button (from Epic 1)",
    "EmptyState (from Epic 1)",
    "Modal (from Epic 1)"
  ],

  "constraints": {
    "must_use": [
      "Tailwind CSS classes for all styling",
      "TypeScript interfaces for all component props",
      "RTK Query for all API calls",
      "Existing UI components from Epic 1",
      "date-fns for date operations",
      "Recharts for all chart visualizations"
    ],
    "must_not": [
      "Create custom CSS files (use Tailwind only)",
      "Use any types or skip TypeScript typing",
      "Use class components (functional + hooks only)",
      "Hardcode mock data (use RTK Query even if mocked)",
      "Create new UI primitives (use Epic 1 components)",
      "Import from node_modules without checking package.json",
      "Inline styles on elements"
    ],
    "testing_requirements": {
      "minimum_coverage": "75%",
      "test_framework": "Vitest + React Testing Library",
      "must_test": [
        "Component rendering and props",
        "User interactions (click, submit, filter)",
        "Loading states with skeletons",
        "Error states with retry",
        "Empty states",
        "API integration via RTK Query",
        "Date range selection and filtering",
        "Chart rendering",
        "Export functionality",
        "Accessibility (keyboard, ARIA)"
      ]
    }
  },

  "related_epics": [
    "Epic 1: UI Components (dependencies)",
    "Epic 2: Dashboard (similar chart patterns)",
    "Epic 6: Budget Management (for BudgetVsActual report)"
  ],

  "success_criteria": {
    "code_quality": [
      "TypeScript strict mode passes",
      "ESLint: 0 errors, 0 warnings",
      "Prettier: fully formatted",
      "Test coverage >= 75%"
    ],
    "functionality": [
      "All 4 report pages functional and navigable",
      "All 3 chart types rendering correctly",
      "Export to XLSX and CSV working",
      "Date range selector applies to all reports",
      "Filters working on detailed reports"
    ],
    "performance": [
      "Charts animate smoothly (60fps)",
      "Tables paginate properly",
      "API calls cached appropriately",
      "No console errors or warnings"
    ],
    "accessibility": [
      "WCAG 2.1 AA compliant",
      "Keyboard navigation works",
      "Screen reader friendly",
      "Color not sole indicator"
    ]
  }
}
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [Epic 1: UI Components](./epic-01-ui-components.md) | Required UI components |
| [Epic 2: Dashboard](./epic-02-dashboard.md) | Similar chart patterns |
| [Epic 6: Budgets](./epic-06-budgets.md) | Budget context for reports |
| [Phase 2 WBS](./phase2-frontend-wbs.md) | Overall frontend plan |
| [Frontend Engineer Agent](../agents/frontend-engineer.md) | Agent protocol |
| [Testing Patterns Skill](../skills/testing-patterns.md) | Testing best practices |
| [Backend Reports Module](../../packages/api/src/modules/reports/CLAUDE.md) | Backend API details |
