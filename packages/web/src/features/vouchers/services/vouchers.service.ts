import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';
import type {
  Voucher,
  VoucherFilters,
  CreateVoucherDto,
  UpdateVoucherDto,
  ApproveVoucherDto,
  RejectVoucherDto,
  DisburseVoucherDto,
  SettleVoucherDto,
  LinkedExpense,
  VoucherStatus,
} from '../types/vouchers.types';

// Re-export types for convenience
export type {
  Voucher,
  VoucherFilters,
  CreateVoucherDto,
  VoucherStatus,
} from '../types/vouchers.types';

export interface VouchersResponse extends PaginatedResponse<Voucher> {
  statusCounts?: Record<VoucherStatus | 'ALL', number>;
}

export interface VoucherDetailResponse extends Voucher {
  expenses?: LinkedExpense[];
}

export const vouchersApi = createApi({
  reducerPath: 'vouchersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Voucher', 'VoucherList'],
  endpoints: (builder) => ({
    // Get paginated list of vouchers
    getVouchers: builder.query<VouchersResponse, VoucherFilters>({
      query: (filters) => ({
        url: '/vouchers',
        params: {
          ...filters,
          // Clean up undefined values
          ...(filters.status && { status: filters.status }),
          ...(filters.page && { page: filters.page }),
          ...(filters.pageSize && { pageSize: filters.pageSize }),
          ...(filters.requesterId && { requesterId: filters.requesterId }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
          ...(filters.minAmount !== undefined && { minAmount: filters.minAmount }),
          ...(filters.maxAmount !== undefined && { maxAmount: filters.maxAmount }),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Voucher' as const, id })),
              { type: 'VoucherList', id: 'LIST' },
            ]
          : [{ type: 'VoucherList', id: 'LIST' }],
    }),

    // Get single voucher by ID
    getVoucher: builder.query<VoucherDetailResponse, string>({
      query: (id) => `/vouchers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Voucher', id }],
    }),

    // Get voucher linked expenses
    getVoucherExpenses: builder.query<LinkedExpense[], string>({
      query: (voucherId) => `/vouchers/${voucherId}/expenses`,
      providesTags: (_result, _error, id) => [{ type: 'Voucher', id }],
    }),

    // Create new voucher request
    createVoucher: builder.mutation<Voucher, CreateVoucherDto>({
      query: (body) => ({
        url: '/vouchers',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'VoucherList', id: 'LIST' }],
    }),

    // Update draft voucher
    updateVoucher: builder.mutation<Voucher, { id: string; data: UpdateVoucherDto }>({
      query: ({ id, data }) => ({
        url: `/vouchers/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Voucher', id },
        { type: 'VoucherList', id: 'LIST' },
      ],
    }),

    // Delete/cancel voucher
    deleteVoucher: builder.mutation<void, string>({
      query: (id) => ({
        url: `/vouchers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'VoucherList', id: 'LIST' }],
    }),

    // Approve voucher
    approveVoucher: builder.mutation<Voucher, { id: string; data?: ApproveVoucherDto }>({
      query: ({ id, data }) => ({
        url: `/vouchers/${id}/approve`,
        method: 'POST',
        body: data || {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Voucher', id },
        { type: 'VoucherList', id: 'LIST' },
      ],
    }),

    // Reject voucher
    rejectVoucher: builder.mutation<Voucher, { id: string; data: RejectVoucherDto }>({
      query: ({ id, data }) => ({
        url: `/vouchers/${id}/reject`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Voucher', id },
        { type: 'VoucherList', id: 'LIST' },
      ],
    }),

    // Disburse voucher
    disburseVoucher: builder.mutation<Voucher, { id: string; data: DisburseVoucherDto }>({
      query: ({ id, data }) => ({
        url: `/vouchers/${id}/disburse`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Voucher', id },
        { type: 'VoucherList', id: 'LIST' },
      ],
    }),

    // Settle voucher
    settleVoucher: builder.mutation<Voucher, { id: string; data: SettleVoucherDto }>({
      query: ({ id, data }) => ({
        url: `/vouchers/${id}/settle`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Voucher', id },
        { type: 'VoucherList', id: 'LIST' },
      ],
    }),

    // Link expense to voucher
    linkExpenseToVoucher: builder.mutation<Voucher, { voucherId: string; expenseId: string }>({
      query: ({ voucherId, expenseId }) => ({
        url: `/vouchers/${voucherId}/link-expense`,
        method: 'POST',
        body: { expenseId },
      }),
      invalidatesTags: (_result, _error, { voucherId }) => [
        { type: 'Voucher', id: voucherId },
      ],
    }),

    // Get user's open vouchers (for warning messages)
    getUserOpenVouchers: builder.query<Voucher[], void>({
      query: () => ({
        url: '/vouchers',
        params: {
          status: 'REQUESTED,APPROVED,DISBURSED',
          pageSize: 10,
        },
      }),
      transformResponse: (response: PaginatedResponse<Voucher>) => response.data,
      providesTags: [{ type: 'VoucherList', id: 'OPEN' }],
    }),
  }),
});

export const {
  useGetVouchersQuery,
  useGetVoucherQuery,
  useGetVoucherExpensesQuery,
  useCreateVoucherMutation,
  useUpdateVoucherMutation,
  useDeleteVoucherMutation,
  useApproveVoucherMutation,
  useRejectVoucherMutation,
  useDisburseVoucherMutation,
  useSettleVoucherMutation,
  useLinkExpenseToVoucherMutation,
  useGetUserOpenVouchersQuery,
} = vouchersApi;
