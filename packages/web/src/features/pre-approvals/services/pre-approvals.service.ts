import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';

export type PreApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'USED';

export interface PreApproval {
  id: string;
  preApprovalNumber: string;
  status: PreApprovalStatus;
  requesterId: string;
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approverId?: string;
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  categoryId: string;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  description: string;
  estimatedAmount: number;
  currency: string;
  expectedDate?: string;
  purpose?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  expiresAt: string;
  actualAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePreApprovalDto {
  categoryId: string;
  estimatedAmount: number;
  purpose: string;
  travelDetails?: {
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    purpose?: string;
  };
  expiresAt?: string;
}

export const preApprovalsApi = createApi({
  reducerPath: 'preApprovalsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['PreApproval'],
  endpoints: (builder) => ({
    getPreApprovals: builder.query<PreApproval[], { status?: PreApprovalStatus }>({
      query: (params) => ({
        url: '/pre-approvals',
        params: params.status ? { status: params.status } : undefined,
      }),
      providesTags: ['PreApproval'],
    }),

    getPreApproval: builder.query<PreApproval, string>({
      query: (id) => `/pre-approvals/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'PreApproval', id }],
    }),

    getPendingPreApprovals: builder.query<PreApproval[], void>({
      query: () => '/pre-approvals/pending',
      providesTags: ['PreApproval'],
    }),

    createPreApproval: builder.mutation<PreApproval, CreatePreApprovalDto>({
      query: (body) => ({
        url: '/pre-approvals',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PreApproval'],
    }),

    approvePreApproval: builder.mutation<PreApproval, { id: string; comments?: string }>({
      query: ({ id, comments }) => ({
        url: `/pre-approvals/${id}/approve`,
        method: 'POST',
        body: { comments },
      }),
      invalidatesTags: ['PreApproval'],
    }),

    rejectPreApproval: builder.mutation<PreApproval, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/pre-approvals/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['PreApproval'],
    }),
  }),
});

export const {
  useGetPreApprovalsQuery,
  useGetPreApprovalQuery,
  useGetPendingPreApprovalsQuery,
  useCreatePreApprovalMutation,
  useApprovePreApprovalMutation,
  useRejectPreApprovalMutation,
} = preApprovalsApi;
