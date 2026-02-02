import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

// ==================== ENUMS ====================

export type BudgetType =
  | 'ORGANIZATION'
  | 'DEPARTMENT'
  | 'PROJECT'
  | 'COST_CENTER'
  | 'EMPLOYEE'
  | 'CATEGORY';
export type BudgetPeriod = 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'PROJECT_BASED';
export type BudgetEnforcement = 'HARD_BLOCK' | 'SOFT_WARNING' | 'AUTO_ESCALATE' | 'NONE';
export type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type EnforcementAction = 'HARD_BLOCK' | 'SOFT_WARNING' | 'ESCALATE' | 'NONE';

// ==================== CORE INTERFACES ====================

export interface Budget {
  id: string;
  name: string;
  type: BudgetType;
  period: BudgetPeriod;
  currency: string;
  totalAmount: number;
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
  costCenterId?: string;
  costCenter?: { id: string; name: string; code: string };
  employeeId?: string;
  employee?: { id: string; firstName: string; lastName: string };
  ownerId?: string;
  owner?: { id: string; firstName: string; lastName: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Updated to match backend BudgetUtilizationDto exactly
export interface BudgetUtilization {
  budgetId: string;
  budgetName: string;
  type: BudgetType;
  period: BudgetPeriod;
  allocated: number;
  committed: number;
  spent: number;
  available: number;
  utilizationPercentage: number;
  isOverBudget: boolean;
  isAtWarningThreshold: boolean;
  warningThreshold: number;
  expenseCount: number;
  pendingCount: number;
  startDate: string;
  endDate: string;
  enforcement: BudgetEnforcement;
}

// ==================== BUDGET CHECK INTERFACES ====================

export interface BudgetCheckResult {
  budgetId: string;
  budgetName: string;
  currentUtilization: number;
  projectedUtilization: number;
  expenseAmount: number;
  availableBefore: number;
  availableAfter: number;
  wouldExceed: boolean;
  wouldTriggerWarning: boolean;
  enforcementAction: EnforcementAction;
  canProceed: boolean;
  message?: string;
}

export interface ExpenseBudgetCheck {
  allowed: boolean;
  hasWarnings: boolean;
  requiresEscalation: boolean;
  message?: string;
  budgetResults: BudgetCheckResult[];
}

// ==================== BUDGET SUMMARY INTERFACES ====================

export interface BudgetSummary {
  generatedAt: string;
  summary: {
    totalBudgets: number;
    totalAllocated: number;
    totalCommitted: number;
    totalSpent: number;
    totalAvailable: number;
    overallUtilization: number;
    budgetsOverThreshold: number;
    budgetsExceeded: number;
    activeBudgets: number;
  };
  budgets: BudgetUtilization[];
}

// ==================== BUDGET TRANSFER INTERFACES ====================

export interface BudgetTransferResult {
  success: boolean;
  message: string;
  fromBudgetId: string;
  toBudgetId: string;
  amount: number;
  fromBudgetNewBalance?: number;
  toBudgetNewBalance?: number;
}

export interface TransferBudgetDto {
  fromBudgetId: string;
  toBudgetId: string;
  amount: number;
  reason: string;
  notes?: string;
}

// ==================== PERIOD INTERFACES ====================

export interface BudgetPeriodDates {
  startDate: string;
  endDate: string;
}

export interface CurrentPeriod {
  year: number;
  quarter?: number;
  month?: number;
}

// ==================== REQUEST/QUERY INTERFACES ====================

export interface BudgetFilters {
  page?: number;
  pageSize?: number;
  type?: BudgetType;
  activeOnly?: boolean;
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

export interface CheckExpenseDto {
  amount: number;
  departmentId?: string;
  projectId?: string;
  costCenterId?: string;
  categoryId?: string;
  employeeId?: string;
  budgetId?: string;
  expenseDate?: string;
}

export interface BudgetSummaryQueryParams {
  activeOnly?: boolean;
  type?: BudgetType;
  periodType?: BudgetPeriod;
  departmentId?: string;
  projectId?: string;
  fiscalYear?: number;
  quarter?: number;
}

export interface PeriodDatesParams {
  periodType: BudgetPeriod;
  fiscalYear: number;
  quarter?: number;
  month?: number;
}

// ==================== API SERVICE ====================

export const budgetsApi = createApi({
  reducerPath: 'budgetsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Budget'],
  endpoints: (builder) => ({
    // ==================== CRUD OPERATIONS ====================

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

    // ==================== STATUS MANAGEMENT ====================

    activateBudget: builder.mutation<Budget, string>({
      query: (id) => ({
        url: `/budgets/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['Budget'],
    }),

    closeBudget: builder.mutation<Budget, string>({
      query: (id) => ({
        url: `/budgets/${id}/close`,
        method: 'POST',
      }),
      invalidatesTags: ['Budget'],
    }),

    archiveBudget: builder.mutation<Budget, string>({
      query: (id) => ({
        url: `/budgets/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: ['Budget'],
    }),

    // ==================== BUDGET TRANSFERS ====================

    transferBudget: builder.mutation<BudgetTransferResult, TransferBudgetDto>({
      query: (body) => ({
        url: '/budgets/transfer',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Budget'],
    }),

    // ==================== EXPENSE BUDGET CHECK ====================

    checkExpense: builder.mutation<ExpenseBudgetCheck, CheckExpenseDto>({
      query: (body) => ({
        url: '/budgets/check-expense',
        method: 'POST',
        body,
      }),
    }),

    // ==================== SUMMARY & REPORTING ====================

    getBudgetSummary: builder.query<BudgetSummary, BudgetSummaryQueryParams>({
      query: (params) => ({
        url: '/budgets/summary',
        params,
      }),
      providesTags: ['Budget'],
    }),

    // ==================== PERIOD UTILITIES ====================

    getPeriodDates: builder.query<BudgetPeriodDates, PeriodDatesParams>({
      query: ({ periodType, fiscalYear, quarter, month }) => ({
        url: '/budgets/period-dates',
        params: { periodType, fiscalYear, quarter, month },
      }),
    }),

    getCurrentPeriod: builder.query<CurrentPeriod, BudgetPeriod>({
      query: (periodType) => ({
        url: '/budgets/current-period',
        params: { periodType },
      }),
    }),
  }),
});

export const {
  // CRUD
  useGetBudgetsQuery,
  useGetBudgetQuery,
  useGetBudgetUtilizationQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
  // Status Management
  useActivateBudgetMutation,
  useCloseBudgetMutation,
  useArchiveBudgetMutation,
  // Transfers
  useTransferBudgetMutation,
  // Expense Check
  useCheckExpenseMutation,
  // Summary & Reporting
  useGetBudgetSummaryQuery,
  // Period Utilities
  useGetPeriodDatesQuery,
  useGetCurrentPeriodQuery,
} = budgetsApi;
