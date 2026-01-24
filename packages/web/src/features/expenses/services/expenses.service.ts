import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

export interface Expense {
  id: string;
  expenseNumber: string;
  type: 'OUT_OF_POCKET' | 'PETTY_CASH';
  status: string;
  submitterId: string;
  submitter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  vendorName?: string;
  expenseDate: string;
  currency: string;
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
  description?: string;
  receipts?: Array<{
    id: string;
    fileName: string;
    s3Key: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateExpenseDto {
  type: 'OUT_OF_POCKET' | 'PETTY_CASH';
  categoryId: string;
  expenseDate: string;
  currency: string;
  amount: number;
  taxType?: string;
  taxAmount?: number;
  vendorName?: string;
  description?: string;
  projectId?: string;
  costCenterId?: string;
}

export const expensesApi = createApi({
  reducerPath: 'expensesApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Expense'],
  endpoints: (builder) => ({
    getExpenses: builder.query<PaginatedResponse<Expense>, ExpenseFilters>({
      query: (filters) => ({
        url: '/expenses',
        params: filters,
      }),
      providesTags: ['Expense'],
    }),
    getExpense: builder.query<Expense, string>({
      query: (id) => `/expenses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Expense', id }],
    }),
    createExpense: builder.mutation<Expense, CreateExpenseDto>({
      query: (body) => ({
        url: '/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Expense'],
    }),
    updateExpense: builder.mutation<Expense, { id: string; data: Partial<CreateExpenseDto> }>({
      query: ({ id, data }) => ({
        url: `/expenses/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Expense', id }],
    }),
    deleteExpense: builder.mutation<void, string>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Expense'],
    }),
    submitExpense: builder.mutation<Expense, string>({
      query: (id) => ({
        url: `/expenses/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: ['Expense'],
    }),
    uploadReceipt: builder.mutation<
      { id: string; fileName: string; s3Key: string },
      { expenseId: string; file: FormData }
    >({
      query: ({ expenseId, file }) => ({
        url: `/receipts/upload`,
        method: 'POST',
        body: file,
        params: { expenseId },
      }),
      invalidatesTags: ['Expense'],
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
  useUploadReceiptMutation,
} = expensesApi;
