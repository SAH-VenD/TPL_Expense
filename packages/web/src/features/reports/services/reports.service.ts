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

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getSpendByCategory: builder.query<SpendByCategory[], ReportFilters>({
      query: (filters) => ({
        url: '/reports/spend-by-category',
        params: filters,
      }),
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
  useGetSpendByCategoryQuery,
  useGetSpendByDepartmentQuery,
  useGetBudgetVsActualQuery,
  useGetOutstandingAdvancesQuery,
  useExportReportMutation,
} = reportsApi;
