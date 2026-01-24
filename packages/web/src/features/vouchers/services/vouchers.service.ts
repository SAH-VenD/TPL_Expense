import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

export type VoucherStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'OVERDUE';

export interface Voucher {
  id: string;
  voucherNumber: string;
  status: VoucherStatus;
  requesterId: string;
  requester: {
    id: string;
    firstName: string;
    lastName: string;
  };
  currency: string;
  requestedAmount: number;
  approvedAmount?: number;
  disbursedAmount?: number;
  settledAmount?: number;
  purpose: string;
  notes?: string;
  requestedAt: string;
  approvedAt?: string;
  disbursedAt?: string;
  settlementDeadline?: string;
  settledAt?: string;
  underSpendAmount?: number;
  overSpendAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherFilters {
  page?: number;
  pageSize?: number;
  status?: VoucherStatus;
}

export interface CreateVoucherDto {
  requestedAmount: number;
  currency?: string;
  purpose: string;
  notes?: string;
}

export const vouchersApi = createApi({
  reducerPath: 'vouchersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Voucher'],
  endpoints: (builder) => ({
    getVouchers: builder.query<PaginatedResponse<Voucher>, VoucherFilters>({
      query: (filters) => ({
        url: '/vouchers',
        params: filters,
      }),
      providesTags: ['Voucher'],
    }),
    getVoucher: builder.query<Voucher, string>({
      query: (id) => `/vouchers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Voucher', id }],
    }),
    createVoucher: builder.mutation<Voucher, CreateVoucherDto>({
      query: (body) => ({
        url: '/vouchers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Voucher'],
    }),
    approveVoucher: builder.mutation<Voucher, { id: string; approvedAmount?: number }>({
      query: ({ id, approvedAmount }) => ({
        url: `/vouchers/${id}/approve`,
        method: 'POST',
        body: { approvedAmount },
      }),
      invalidatesTags: ['Voucher'],
    }),
    rejectVoucher: builder.mutation<Voucher, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/vouchers/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Voucher'],
    }),
    disburseVoucher: builder.mutation<Voucher, { id: string; disbursedAmount: number }>({
      query: ({ id, disbursedAmount }) => ({
        url: `/vouchers/${id}/disburse`,
        method: 'POST',
        body: { disbursedAmount },
      }),
      invalidatesTags: ['Voucher'],
    }),
    settleVoucher: builder.mutation<
      Voucher,
      { id: string; settledAmount: number; cashReturned?: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/vouchers/${id}/settle`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Voucher'],
    }),
  }),
});

export const {
  useGetVouchersQuery,
  useGetVoucherQuery,
  useCreateVoucherMutation,
  useApproveVoucherMutation,
  useRejectVoucherMutation,
  useDisburseVoucherMutation,
  useSettleVoucherMutation,
} = vouchersApi;
