import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

export type BudgetType = 'DEPARTMENT' | 'PROJECT' | 'COST_CENTER' | 'EMPLOYEE' | 'CATEGORY';
export type BudgetPeriod = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'PROJECT_BASED';
export type BudgetEnforcement = 'HARD_BLOCK' | 'SOFT_WARNING' | 'AUTO_ESCALATE';

export interface Budget {
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

export interface BudgetUtilization {
  budget: Budget;
  utilizationPercent: number;
  remainingAmount: number;
  isWarning: boolean;
  isExceeded: boolean;
}

export interface BudgetFilters {
  page?: number;
  pageSize?: number;
  type?: BudgetType;
  isActive?: boolean;
}

export interface CreateBudgetDto {
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

export const budgetsApi = createApi({
  reducerPath: 'budgetsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Budget'],
  endpoints: (builder) => ({
    getBudgets: builder.query<PaginatedResponse<Budget>, BudgetFilters>({
      query: (filters) => ({
        url: '/budgets',
        params: filters,
      }),
      providesTags: ['Budget'],
    }),
    getBudget: builder.query<Budget, string>({
      query: (id) => `/budgets/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Budget', id }],
    }),
    getBudgetUtilization: builder.query<BudgetUtilization, string>({
      query: (id) => `/budgets/${id}/utilization`,
      providesTags: (_result, _error, id) => [{ type: 'Budget', id }],
    }),
    createBudget: builder.mutation<Budget, CreateBudgetDto>({
      query: (body) => ({
        url: '/budgets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Budget'],
    }),
    updateBudget: builder.mutation<Budget, { id: string; data: Partial<CreateBudgetDto> }>({
      query: ({ id, data }) => ({
        url: `/budgets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Budget'],
    }),
    deleteBudget: builder.mutation<void, string>({
      query: (id) => ({
        url: `/budgets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Budget'],
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useGetBudgetQuery,
  useGetBudgetUtilizationQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetsApi;
