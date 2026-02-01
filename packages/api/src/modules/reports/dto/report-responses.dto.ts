import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Generic report metadata
 */
export class ReportMetadataDto {
  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Start date of report period' })
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date of report period' })
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Total record count' })
  totalRecords?: number;
}

/**
 * Generic report response wrapper
 */
export class ReportResponseDto<T> {
  @ApiProperty({ description: 'Report data' })
  data: T;

  @ApiProperty({ description: 'Report metadata', type: ReportMetadataDto })
  meta: ReportMetadataDto;
}

/**
 * Spend by employee report item
 */
export class SpendByEmployeeItemDto {
  @ApiProperty({ description: 'Employee ID' })
  employeeId: string;

  @ApiProperty({ description: 'Employee full name' })
  employeeName: string;

  @ApiProperty({ description: 'Employee email' })
  email: string;

  @ApiPropertyOptional({ description: 'Department name' })
  department?: string;

  @ApiProperty({ description: 'Total expense amount (PKR)' })
  totalAmount: number;

  @ApiProperty({ description: 'Number of expenses' })
  expenseCount: number;

  @ApiProperty({ description: 'Average expense amount' })
  averageAmount: number;
}

/**
 * Spend by employee report response
 */
export class SpendByEmployeeReportDto {
  @ApiProperty({ type: [SpendByEmployeeItemDto] })
  items: SpendByEmployeeItemDto[];

  @ApiProperty({ description: 'Grand total amount' })
  grandTotal: number;

  @ApiProperty({ description: 'Total number of expenses across all employees' })
  totalExpenses: number;
}

/**
 * Spend by project report item
 */
export class SpendByProjectItemDto {
  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({ description: 'Project name' })
  projectName: string;

  @ApiProperty({ description: 'Project code' })
  projectCode: string;

  @ApiPropertyOptional({ description: 'Client name' })
  clientName?: string;

  @ApiProperty({ description: 'Total expense amount (PKR)' })
  totalAmount: number;

  @ApiProperty({ description: 'Number of expenses' })
  expenseCount: number;

  @ApiPropertyOptional({ description: 'Budget allocated for this project' })
  budgetAllocated?: number;

  @ApiPropertyOptional({ description: 'Budget utilization percentage' })
  budgetUtilization?: number;
}

/**
 * Spend by project report response
 */
export class SpendByProjectReportDto {
  @ApiProperty({ type: [SpendByProjectItemDto] })
  items: SpendByProjectItemDto[];

  @ApiProperty({ description: 'Grand total amount' })
  grandTotal: number;

  @ApiProperty({ description: 'Total number of expenses across all projects' })
  totalExpenses: number;

  @ApiPropertyOptional({ description: 'Unallocated expense amount (no project)' })
  unallocatedAmount?: number;
}

/**
 * Spend by cost center report item
 */
export class SpendByCostCenterItemDto {
  @ApiProperty({ description: 'Cost center ID' })
  costCenterId: string;

  @ApiProperty({ description: 'Cost center name' })
  costCenterName: string;

  @ApiProperty({ description: 'Cost center code' })
  costCenterCode: string;

  @ApiPropertyOptional({ description: 'Department name' })
  department?: string;

  @ApiProperty({ description: 'Total expense amount (PKR)' })
  totalAmount: number;

  @ApiProperty({ description: 'Number of expenses' })
  expenseCount: number;

  @ApiPropertyOptional({ description: 'Budget allocated for this cost center' })
  budgetAllocated?: number;

  @ApiPropertyOptional({ description: 'Budget utilization percentage' })
  budgetUtilization?: number;
}

/**
 * Spend by cost center report response
 */
export class SpendByCostCenterReportDto {
  @ApiProperty({ type: [SpendByCostCenterItemDto] })
  items: SpendByCostCenterItemDto[];

  @ApiProperty({ description: 'Grand total amount' })
  grandTotal: number;

  @ApiProperty({ description: 'Total number of expenses across all cost centers' })
  totalExpenses: number;

  @ApiPropertyOptional({ description: 'Unallocated expense amount (no cost center)' })
  unallocatedAmount?: number;
}

/**
 * Monthly trend report item
 */
export class MonthlyTrendItemDto {
  @ApiProperty({ description: 'Month number (1-12)' })
  month: number;

  @ApiProperty({ description: 'Month name' })
  monthName: string;

  @ApiProperty({ description: 'Year' })
  year: number;

  @ApiProperty({ description: 'Total expense amount for the month (PKR)' })
  totalAmount: number;

  @ApiProperty({ description: 'Number of expenses in the month' })
  expenseCount: number;

  @ApiProperty({ description: 'Average expense amount' })
  averageAmount: number;

  @ApiPropertyOptional({ description: 'Month-over-month change percentage' })
  changePercentage?: number;
}

/**
 * Monthly trend report response
 */
export class MonthlyTrendReportDto {
  @ApiProperty({ description: 'Year for the trend data' })
  year: number;

  @ApiProperty({ type: [MonthlyTrendItemDto] })
  months: MonthlyTrendItemDto[];

  @ApiProperty({ description: 'Year-to-date total' })
  ytdTotal: number;

  @ApiProperty({ description: 'Year-to-date expense count' })
  ytdExpenseCount: number;

  @ApiProperty({ description: 'Monthly average' })
  monthlyAverage: number;

  @ApiPropertyOptional({ description: 'Previous year total for comparison' })
  previousYearTotal?: number;

  @ApiPropertyOptional({ description: 'Year-over-year change percentage' })
  yoyChangePercentage?: number;
}

/**
 * Approval turnaround statistics
 */
export class ApprovalTurnaroundStatsDto {
  @ApiProperty({ description: 'Average turnaround time in days' })
  avgDays: number;

  @ApiProperty({ description: 'Minimum turnaround time in days' })
  minDays: number;

  @ApiProperty({ description: 'Maximum turnaround time in days' })
  maxDays: number;

  @ApiProperty({ description: 'Median turnaround time in days' })
  medianDays: number;

  @ApiProperty({ description: 'Total number of approvals analyzed' })
  totalApprovals: number;
}

/**
 * Department-level turnaround breakdown
 */
export class DepartmentTurnaroundDto {
  @ApiProperty({ description: 'Department ID' })
  departmentId: string;

  @ApiProperty({ description: 'Department name' })
  departmentName: string;

  @ApiProperty({ type: ApprovalTurnaroundStatsDto })
  stats: ApprovalTurnaroundStatsDto;
}

/**
 * Approval turnaround report response
 */
export class ApprovalTurnaroundReportDto {
  @ApiProperty({ type: ApprovalTurnaroundStatsDto, description: 'Overall statistics' })
  overall: ApprovalTurnaroundStatsDto;

  @ApiPropertyOptional({
    type: [DepartmentTurnaroundDto],
    description: 'Breakdown by department (if requested)',
  })
  byDepartment?: DepartmentTurnaroundDto[];

  @ApiPropertyOptional({ description: 'Number of expenses still pending approval' })
  pendingCount?: number;
}

/**
 * Reimbursement status breakdown item
 */
export class ReimbursementStatusItemDto {
  @ApiProperty({ description: 'Status label' })
  status: string;

  @ApiProperty({ description: 'Number of expenses' })
  count: number;

  @ApiProperty({ description: 'Total amount' })
  amount: number;

  @ApiProperty({ description: 'Percentage of total count' })
  percentageOfCount: number;

  @ApiProperty({ description: 'Percentage of total amount' })
  percentageOfAmount: number;
}

/**
 * Reimbursement status report response
 */
export class ReimbursementStatusReportDto {
  @ApiProperty({ type: [ReimbursementStatusItemDto], description: 'Status breakdown' })
  breakdown: ReimbursementStatusItemDto[];

  @ApiProperty({ description: 'Total approved expenses pending payment' })
  pendingReimbursement: {
    count: number;
    amount: number;
  };

  @ApiProperty({ description: 'Total paid/reimbursed expenses' })
  reimbursed: {
    count: number;
    amount: number;
  };

  @ApiProperty({ description: 'Overall totals' })
  totals: {
    totalCount: number;
    totalAmount: number;
  };

  @ApiPropertyOptional({ description: 'Average time to reimbursement in days' })
  avgReimbursementDays?: number;
}

/**
 * Dashboard metric item
 */
export class DashboardMetricDto {
  @ApiProperty({ description: 'Metric label' })
  label: string;

  @ApiProperty({ description: 'Metric value' })
  value: number;

  @ApiPropertyOptional({ description: 'Previous period value for comparison' })
  previousValue?: number;

  @ApiPropertyOptional({ description: 'Change percentage from previous period' })
  changePercentage?: number;

  @ApiPropertyOptional({ description: 'Trend direction: up, down, or stable' })
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Dashboard summary report response
 */
export class DashboardSummaryReportDto {
  @ApiProperty({ description: 'Period covered by the summary' })
  period: {
    startDate: Date;
    endDate: Date;
    days: number;
  };

  @ApiProperty({ description: 'Total expense metrics' })
  expenses: {
    total: DashboardMetricDto;
    approved: DashboardMetricDto;
    pending: DashboardMetricDto;
    rejected: DashboardMetricDto;
  };

  @ApiProperty({ description: 'Pending approval metrics' })
  approvals: {
    pendingCount: number;
    oldestPendingDays: number;
    avgPendingDays: number;
  };

  @ApiProperty({ description: 'Voucher metrics' })
  vouchers: {
    outstandingCount: number;
    outstandingAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };

  @ApiProperty({ description: 'Budget utilization metrics' })
  budgetUtilization: {
    overallUtilization: number;
    budgetsAtWarning: number;
    budgetsExceeded: number;
    totalAllocated: number;
    totalSpent: number;
  };

  @ApiPropertyOptional({ description: 'Top spending categories' })
  topCategories?: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;

  @ApiPropertyOptional({ description: 'Top spending departments' })
  topDepartments?: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;

  @ApiPropertyOptional({ description: 'Recent expense trend (daily amounts)' })
  recentTrend?: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}
