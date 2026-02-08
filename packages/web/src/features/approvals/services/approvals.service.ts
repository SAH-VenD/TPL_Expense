import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';
import type { Expense } from '@/features/expenses/services/expenses.service';

export interface ApprovalFilters {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface ApproveDto {
  expenseId: string;
  comment?: string;
  isEmergencyApproval?: boolean;
  emergencyReason?: string;
}

export interface RejectDto {
  expenseId: string;
  reason: string;
}

export interface ClarificationDto {
  expenseId: string;
  question: string;
}

export interface Delegation {
  id: string;
  fromUserId: string;
  fromUser: { id: string; firstName: string; lastName: string };
  toUserId: string;
  toUser: { id: string; firstName: string; lastName: string };
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
}

export const approvalsApi = createApi({
  reducerPath: 'approvalsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Approval', 'Delegation'],
  endpoints: (builder) => ({
    getPendingApprovals: builder.query<PaginatedResponse<Expense>, ApprovalFilters>({
      query: (filters) => ({
        url: '/approvals/pending',
        params: {
          page: filters.page,
          limit: filters.pageSize,
        },
      }),
      providesTags: ['Approval'],
    }),
    approveExpense: builder.mutation<Expense, ApproveDto>({
      query: (data) => ({
        url: '/approvals/approve',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approval'],
    }),
    bulkApprove: builder.mutation<{ approved: number }, { expenseIds: string[]; comment?: string }>(
      {
        query: (data) => ({
          url: '/approvals/approve/bulk',
          method: 'POST',
          body: data,
        }),
        invalidatesTags: ['Approval'],
      },
    ),
    rejectExpense: builder.mutation<Expense, RejectDto>({
      query: (data) => ({
        url: '/approvals/reject',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approval'],
    }),
    requestClarification: builder.mutation<Expense, ClarificationDto>({
      query: (data) => ({
        url: '/approvals/clarify',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Approval'],
    }),
    getDelegations: builder.query<Delegation[], void>({
      query: () => '/approvals/delegations',
      providesTags: ['Delegation'],
    }),
    createDelegation: builder.mutation<
      Delegation,
      { toUserId: string; startDate: string; endDate: string; reason?: string }
    >({
      query: (data) => ({
        url: '/approvals/delegations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Delegation'],
    }),
    revokeDelegation: builder.mutation<void, string>({
      query: (delegationId) => ({
        url: '/approvals/delegations/revoke',
        method: 'POST',
        body: { delegationId },
      }),
      invalidatesTags: ['Delegation'],
    }),
  }),
});

export const {
  useGetPendingApprovalsQuery,
  useApproveExpenseMutation,
  useBulkApproveMutation,
  useRejectExpenseMutation,
  useRequestClarificationMutation,
  useGetDelegationsQuery,
  useCreateDelegationMutation,
  useRevokeDelegationMutation,
} = approvalsApi;
