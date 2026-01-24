import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  parent?: { id: string; name: string };
  children?: Category[];
  requiresReceipt: boolean;
  requiresPreApproval: boolean;
  maxAmount?: number;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface ApprovalTier {
  id: string;
  name: string;
  tierOrder: number;
  minAmount: number;
  maxAmount?: number;
  approverRole: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  departmentId?: string;
  department?: { id: string; name: string };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string };
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  category?: string;
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Category', 'Department', 'ApprovalTier', 'User', 'AuditLog', 'Setting'],
  endpoints: (builder) => ({
    // Categories
    getCategories: builder.query<Category[], void>({
      query: () => '/admin/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, Partial<Category>>({
      query: (body) => ({
        url: '/admin/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<Category, { id: string; data: Partial<Category> }>({
      query: ({ id, data }) => ({
        url: `/admin/categories/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Category'],
    }),

    // Departments
    getDepartments: builder.query<Department[], void>({
      query: () => '/admin/departments',
      providesTags: ['Department'],
    }),
    createDepartment: builder.mutation<Department, Partial<Department>>({
      query: (body) => ({
        url: '/admin/departments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Department'],
    }),

    // Approval Tiers
    getApprovalTiers: builder.query<ApprovalTier[], void>({
      query: () => '/admin/approval-tiers',
      providesTags: ['ApprovalTier'],
    }),
    createApprovalTier: builder.mutation<ApprovalTier, Partial<ApprovalTier>>({
      query: (body) => ({
        url: '/admin/approval-tiers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ApprovalTier'],
    }),

    // Users
    getUsers: builder.query<PaginatedResponse<User>, { page?: number; search?: string }>({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: ['User'],
    }),
    approveUser: builder.mutation<User, string>({
      query: (id) => ({
        url: `/users/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    bulkImportUsers: builder.mutation<{ imported: number; errors: string[] }, FormData>({
      query: (formData) => ({
        url: '/users/bulk-import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    // Audit Logs
    getAuditLogs: builder.query<
      PaginatedResponse<AuditLog>,
      { page?: number; action?: string; entityType?: string; userId?: string }
    >({
      query: (params) => ({
        url: '/admin/audit-logs',
        params,
      }),
      providesTags: ['AuditLog'],
    }),

    // Settings
    getSettings: builder.query<SystemSetting[], void>({
      query: () => '/admin/settings',
      providesTags: ['Setting'],
    }),
    updateSetting: builder.mutation<SystemSetting, { key: string; value: unknown }>({
      query: (body) => ({
        url: '/admin/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Setting'],
    }),

    // Test Data
    generateTestData: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/admin/generate-test-data',
        method: 'POST',
      }),
    }),
    cleanupTestData: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/admin/cleanup-test-data',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useGetApprovalTiersQuery,
  useCreateApprovalTierMutation,
  useGetUsersQuery,
  useApproveUserMutation,
  useBulkImportUsersMutation,
  useGetAuditLogsQuery,
  useGetSettingsQuery,
  useUpdateSettingMutation,
  useGenerateTestDataMutation,
  useCleanupTestDataMutation,
} = adminApi;
