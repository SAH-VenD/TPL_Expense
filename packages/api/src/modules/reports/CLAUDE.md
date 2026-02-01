# Reports Module

## Overview
Comprehensive expense analytics and reporting with spend breakdowns, trends, approval metrics, and executive dashboard.

## Status: COMPLETE
- Completed: 2026-02-01
- Tests: 52 unit tests, 70+ E2E tests

## Key Files
- `reports.service.ts` - Report generation and data aggregation
- `reports.controller.ts` - REST endpoints (14 total)
- `dto/report-query.dto.ts` - Query parameter DTOs
- `dto/report-responses.dto.ts` - Response DTOs
- `dto/export-report.dto.ts` - Export configuration DTO
- `reports.service.spec.ts` - Unit tests
- `test/reports.e2e-spec.ts` - E2E tests

## Architecture

### Report Categories

#### Spend Analysis
- **By Department** - Expense breakdown by submitter's department
- **By Category** - Expense breakdown by expense category
- **By Vendor** - Expense breakdown by vendor
- **By Employee** - Individual employee expense totals
- **By Project** - Project-based expense tracking with budget utilization
- **By Cost Center** - Cost center expense aggregation

#### Financial Reports
- **Budget vs Actual** - Compare budgeted amounts to actual spend
- **Outstanding Advances** - Disbursed vouchers not yet settled
- **Tax Summary** - FBR compliance tax breakdown by year
- **Reimbursement Status** - Paid vs pending expense summary

#### Operational Reports
- **Monthly Trend** - 12-month expense trend with MoM and YoY comparisons
- **Approval Turnaround** - Time metrics from submission to approval
- **Dashboard Summary** - Executive metrics aggregation

### Data Filtering
All reports support:
- Date range filtering (`startDate`, `endDate`)
- Department filtering (`departmentId`)
- Project filtering (`projectId`)
- Category filtering (`categoryId`)
- Cost center filtering (`costCenterId`)

### Approved Statuses
Reports include expenses with statuses: `APPROVED`, `PAID`

## Business Rules

1. **Access Control**: Only FINANCE and ADMIN roles can access reports
2. **Date Filtering**: ISO date strings converted to Date objects
3. **Financial Precision**: Decimal amounts converted to Number for display
4. **Monthly Trend**: Returns all 12 months, including zeros for months without data
5. **Approval Turnaround**: Calculated from `submittedAt` to first `APPROVED` action
6. **Dashboard Period**: Configurable days (default 30, max 365)

## API Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | /reports/spend-by-department | Spend by department | FINANCE, ADMIN |
| GET | /reports/spend-by-category | Spend by category | FINANCE, ADMIN |
| GET | /reports/spend-by-vendor | Spend by vendor | FINANCE, ADMIN |
| GET | /reports/spend-by-employee | Spend by employee | FINANCE, ADMIN |
| GET | /reports/spend-by-project | Spend by project | FINANCE, ADMIN |
| GET | /reports/spend-by-cost-center | Spend by cost center | FINANCE, ADMIN |
| GET | /reports/budget-vs-actual | Budget comparison | FINANCE, ADMIN |
| GET | /reports/outstanding-advances | Outstanding vouchers | FINANCE, ADMIN |
| GET | /reports/tax-summary | Tax summary by year | FINANCE, ADMIN |
| GET | /reports/monthly-trend | Monthly expense trend | FINANCE, ADMIN |
| GET | /reports/approval-turnaround | Approval time metrics | FINANCE, ADMIN |
| GET | /reports/reimbursement-status | Payment status summary | FINANCE, ADMIN |
| GET | /reports/dashboard-summary | Executive dashboard | FINANCE, ADMIN |
| POST | /reports/export | Export to XLSX/CSV/PDF | FINANCE, ADMIN |

## Key Methods

### `getSpendByEmployee(query)`
1. Build date and department filters
2. Group expenses by submitterId
3. Calculate totals, counts, averages per employee
4. Sort by totalAmount descending

### `getMonthlyTrend(query)`
1. Initialize all 12 months with zeros
2. Query expenses for the specified year
3. Aggregate by month
4. Calculate MoM change percentages
5. Compare with previous year for YoY metrics

### `getApprovalTurnaround(query)`
1. Query approved expenses with approval history
2. Calculate days from submittedAt to first approval
3. Compute statistics (avg, min, max, median)
4. Optionally group by department

### `getDashboardSummary(query)`
1. Calculate expense metrics (total, approved, pending, rejected)
2. Compare with previous period for trends
3. Aggregate voucher metrics
4. Calculate budget utilization
5. Get top categories and departments
6. Build recent daily trend

### `exportReport(dto)`
1. Determine report type and fetch data
2. Generate XLSX using exceljs library
3. Generate CSV with proper escaping
4. Return buffer with content-type headers

## Response DTOs

### SpendByEmployeeReportDto
```typescript
{
  items: [{
    employeeId, employeeName, email, department,
    totalAmount, expenseCount, averageAmount
  }],
  grandTotal, totalExpenses
}
```

### MonthlyTrendReportDto
```typescript
{
  year, months: [{
    month, monthName, year, totalAmount,
    expenseCount, averageAmount, changePercentage
  }],
  ytdTotal, ytdExpenseCount, monthlyAverage,
  previousYearTotal, yoyChangePercentage
}
```

### DashboardSummaryReportDto
```typescript
{
  period: { startDate, endDate, days },
  expenses: { total, approved, pending, rejected },
  approvals: { pendingCount, oldestPendingDays, avgPendingDays },
  vouchers: { outstandingCount, outstandingAmount, overdueCount, overdueAmount },
  budgetUtilization: { overallUtilization, budgetsAtWarning, budgetsExceeded },
  topCategories, topDepartments, recentTrend
}
```

## Dependencies
- `expenses` module - Expense data and statuses
- `approvals` module - Approval history for turnaround calculation
- `vouchers` module - Outstanding advances
- `budgets` module - Budget utilization
- `users`, `departments`, `projects`, `categories`, `costCenters` - Reference data
- `exceljs` - Excel file generation

## Configuration
```bash
# No specific configuration required
# Uses existing module configurations
```

## Testing
```bash
# Unit tests
npm run test -w @tpl-expense/api -- reports.service

# E2E tests (requires database)
npm run test:e2e -w @tpl-expense/api -- reports.e2e-spec
```

## Export Formats

### XLSX
- Uses ExcelJS library
- Auto-generates column headers from data keys
- Fixed column width (20 chars)

### CSV
- Comma-separated values
- Proper escaping for strings with commas/quotes
- UTF-8 encoding

### PDF
- Not yet implemented (placeholder)
- TODO: Implement with pdfkit library
