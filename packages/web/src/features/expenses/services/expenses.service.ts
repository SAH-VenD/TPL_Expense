import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

// Expense status types
export type ExpenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLARIFICATION_REQUESTED'
  | 'RESUBMITTED'
  | 'PAID';

export type ExpenseType = 'OUT_OF_POCKET' | 'PETTY_CASH';
export type Currency = 'PKR' | 'USD' | 'GBP' | 'SAR' | 'AED';

// Core expense interface
export interface Expense {
  id: string;
  expenseNumber: string;
  type: ExpenseType;
  status: ExpenseStatus;
  submitterId: string;
  submitter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  vendorId?: string;
  vendor?: {
    id: string;
    name: string;
  };
  vendorName?: string;
  expenseDate: string;
  currency: Currency;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  amountInPKR?: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  projectId?: string;
  project?: {
    id: string;
    name: string;
    code: string;
  };
  costCenterId?: string;
  costCenter?: {
    id: string;
    name: string;
    code: string;
  };
  description?: string;
  notes?: string;
  referenceNumber?: string;
  receipts?: Receipt[];
  splits?: ExpenseSplit[];
  approvalTier?: number;
  approvals?: ApprovalHistory[];
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface Receipt {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  url?: string;
  uploadedAt: string;
}

export interface ExpenseSplit {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  projectId?: string;
  project?: {
    id: string;
    name: string;
  };
  costCenterId?: string;
  costCenter?: {
    id: string;
    name: string;
  };
}

export interface ApprovalHistory {
  id: string;
  expenseId: string;
  tier: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED';
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approvedAt?: string;
  comment?: string;
  rejectionReason?: string;
  clarificationRequest?: string;
  createdAt: string;
}

// Filter interfaces
export interface ExpenseFilters {
  page?: number;
  pageSize?: number;
  status?: ExpenseStatus[];
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'amount:desc' | 'amount:asc' | 'expenseDate:desc' | 'expenseDate:asc';
}

// DTO interfaces
export interface CreateExpenseDto {
  type: ExpenseType;
  categoryId: string;
  expenseDate: string;
  currency: Currency;
  amount: number;
  taxType?: string;
  taxAmount?: number;
  vendorId?: string;
  vendorName?: string;
  description?: string;
  notes?: string;
  referenceNumber?: string;
  projectId?: string;
  costCenterId?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  receiptIds?: string[];
  splits?: CreateExpenseSplitDto[];
}

export interface UpdateExpenseDto {
  categoryId?: string;
  expenseDate?: string;
  currency?: Currency;
  amount?: number;
  taxType?: string;
  taxAmount?: number;
  vendorId?: string;
  vendorName?: string;
  description?: string;
  notes?: string;
  referenceNumber?: string;
  projectId?: string;
  costCenterId?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  receiptIds?: string[];
  splits?: CreateExpenseSplitDto[];
}

export interface CreateExpenseSplitDto {
  description: string;
  amount: number;
  categoryId: string;
  projectId?: string;
  costCenterId?: string;
}

export interface UploadReceiptResponse {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  url?: string;
}

export const expensesApi = createApi({
  reducerPath: 'expensesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Expense', 'Receipt'],
  endpoints: (builder) => ({
    // Get expenses with pagination and filtering
    getExpenses: builder.query<PaginatedResponse<Expense>, ExpenseFilters>({
      query: (filters) => {
        const params: Record<string, string | number | undefined> = {
          page: filters.page,
          limit: filters.pageSize,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          categoryId: filters.categoryId,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
          search: filters.search,
          sort: filters.sort,
        };
        // Handle status array
        if (filters.status && filters.status.length > 0) {
          params.status = filters.status.join(',');
        }
        return {
          url: '/expenses',
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Expense' as const, id })),
              { type: 'Expense', id: 'LIST' },
            ]
          : [{ type: 'Expense', id: 'LIST' }],
    }),

    // Get single expense by ID
    getExpense: builder.query<Expense, string>({
      query: (id) => `/expenses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Expense', id }],
    }),

    // Create new expense
    createExpense: builder.mutation<Expense, CreateExpenseDto>({
      query: (body) => ({
        url: '/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // Update expense
    updateExpense: builder.mutation<Expense, { id: string; data: UpdateExpenseDto }>({
      query: ({ id, data }) => ({
        url: `/expenses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Delete expense
    deleteExpense: builder.mutation<void, string>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // Submit expense for approval
    submitExpense: builder.mutation<Expense, string>({
      query: (id) => ({
        url: `/expenses/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Withdraw submitted expense
    withdrawExpense: builder.mutation<Expense, string>({
      query: (id) => ({
        url: `/expenses/${id}/withdraw`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Expense', id },
        { type: 'Expense', id: 'LIST' },
      ],
    }),

    // Upload receipt
    uploadReceipt: builder.mutation<UploadReceiptResponse, FormData>({
      query: (formData) => ({
        url: '/receipts/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Receipt'],
    }),

    // Delete receipt
    deleteReceipt: builder.mutation<void, string>({
      query: (id) => ({
        url: `/receipts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Receipt', 'Expense'],
    }),

    // Bulk submit expenses
    bulkSubmitExpenses: builder.mutation<{ submitted: number }, string[]>({
      query: (ids) => ({
        url: '/expenses/bulk-submit',
        method: 'POST',
        body: { ids },
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // Bulk delete expenses
    bulkDeleteExpenses: builder.mutation<{ deleted: number }, string[]>({
      query: (ids) => ({
        url: '/expenses/bulk-delete',
        method: 'POST',
        body: { ids },
      }),
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),

    // Get approval history for an expense
    getExpenseApprovals: builder.query<ApprovalHistory[], string>({
      query: (expenseId) => `/expenses/${expenseId}/approvals`,
      providesTags: (_result, _error, expenseId) => [{ type: 'Expense', id: expenseId }],
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useSubmitExpenseMutation,
  useWithdrawExpenseMutation,
  useUploadReceiptMutation,
  useDeleteReceiptMutation,
  useBulkSubmitExpensesMutation,
  useBulkDeleteExpensesMutation,
  useGetExpenseApprovalsQuery,
} = expensesApi;
