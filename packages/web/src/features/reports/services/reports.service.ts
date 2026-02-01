import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  categoryId?: string;
  projectId?: string;
  employeeId?: string;
}

export interface SpendByCategory {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface SpendByDepartment {
  departmentId: string;
  departmentName: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface BudgetVsActual {
  budgetId: string;
  budgetName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
}

export interface OutstandingAdvance {
  voucherId: string;
  voucherNumber: string;
  employeeName: string;
  disbursedAmount: number;
  settledAmount: number;
  outstanding: number;
  daysOverdue: number;
}

// Dashboard Summary Types
export interface DashboardMetric {
  label: string;
  value: number;
  previousValue?: number;
  changePercentage?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface DashboardSummaryResponse {
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
  topCategories?: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  topDepartments?: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  recentTrend?: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}

// Monthly Trend Types
export interface MonthlyTrendItem {
  month: number;
  monthName: string;
  year: number;
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
  changePercentage?: number;
}

export interface MonthlyTrendResponse {
  year: number;
  months: MonthlyTrendItem[];
  ytdTotal: number;
  ytdExpenseCount: number;
  monthlyAverage: number;
  previousYearTotal?: number;
  yoyChangePercentage?: number;
}

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['DashboardSummary', 'MonthlyTrend', 'SpendByCategory'],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<DashboardSummaryResponse, { days?: number }>({
      query: ({ days = 30 } = {}) => ({
        url: '/reports/dashboard-summary',
        params: { periodDays: days },
      }),
      providesTags: ['DashboardSummary'],
    }),
    getMonthlyTrend: builder.query<MonthlyTrendResponse, { year?: number }>({
      query: ({ year } = {}) => ({
        url: '/reports/monthly-trend',
        params: year ? { year } : undefined,
      }),
      providesTags: ['MonthlyTrend'],
    }),
    getSpendByCategory: builder.query<SpendByCategory[], ReportFilters>({
      query: (filters) => ({
        url: '/reports/spend-by-category',
        params: filters,
      }),
      providesTags: ['SpendByCategory'],
    }),
    getSpendByDepartment: builder.query<SpendByDepartment[], ReportFilters>({
      query: (filters) => ({
        url: '/reports/spend-by-department',
        params: filters,
      }),
    }),
    getBudgetVsActual: builder.query<BudgetVsActual[], ReportFilters>({
      query: (filters) => ({
        url: '/reports/budget-vs-actual',
        params: filters,
      }),
    }),
    getOutstandingAdvances: builder.query<OutstandingAdvance[], void>({
      query: () => '/reports/outstanding-advances',
    }),
    exportReport: builder.mutation<
      Blob,
      { reportType: string; format: 'excel' | 'pdf' | 'csv'; filters: ReportFilters }
    >({
      query: ({ reportType, format, filters }) => ({
        url: '/reports/export',
        method: 'POST',
        body: { reportType, format, filters },
        responseHandler: async (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetMonthlyTrendQuery,
  useGetSpendByCategoryQuery,
  useGetSpendByDepartmentQuery,
  useGetBudgetVsActualQuery,
  useGetOutstandingAdvancesQuery,
  useExportReportMutation,
} = reportsApi;
