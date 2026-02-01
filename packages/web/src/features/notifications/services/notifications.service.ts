import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { PaginatedResponse } from '@/types/api.types';

// Notification types
export type NotificationType =
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'EXPENSE_PENDING_APPROVAL'
  | 'APPROVAL_REQUESTED'
  | 'COMMENT_ADDED'
  | 'VOUCHER_APPROVED'
  | 'VOUCHER_DISBURSED'
  | 'BUDGET_THRESHOLD_EXCEEDED'
  | 'CLARIFICATION_REQUESTED'
  | 'SYSTEM_MESSAGE'
  | 'DELEGATION_STARTED'
  | 'DELEGATION_ENDED';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export interface NotificationRelatedEntity {
  type: 'EXPENSE' | 'APPROVAL' | 'COMMENT' | 'VOUCHER' | 'BUDGET';
  id: string;
  label?: string;
}

export interface NotificationMetadata {
  expenseAmount?: number;
  expenseCurrency?: string;
  expenseDescription?: string;
  approverName?: string;
  vendorName?: string;
  categoryName?: string;
  voucherAmount?: number;
  budgetPercentage?: number;
  commentText?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  relatedEntity?: NotificationRelatedEntity;
  metadata?: NotificationMetadata;
  action?: {
    label: string;
    href: string;
  };
}

export interface NotificationFilters {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus;
  type?: NotificationType;
  isRead?: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAsReadResponse {
  id: string;
  isRead: boolean;
  readAt: string;
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification', 'NotificationCount'],
  endpoints: (builder) => ({
    // Get all notifications with pagination
    getNotifications: builder.query<PaginatedResponse<Notification>, NotificationFilters>({
      query: (filters) => ({
        url: '/notifications',
        params: filters,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    // Get single notification
    getNotification: builder.query<Notification, string>({
      query: (id) => `/notifications/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Notification', id }],
    }),

    // Get unread count
    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['NotificationCount'],
    }),

    // Mark single notification as read
    markAsRead: builder.mutation<MarkAsReadResponse, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        'NotificationCount',
      ],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification', 'NotificationCount'],
    }),

    // Delete a notification
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification', 'NotificationCount'],
    }),

    // Clear all notifications
    clearAllNotifications: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications',
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification', 'NotificationCount'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
} = notificationsApi;

// Utility function to get notification icon based on type
export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    EXPENSE_APPROVED: 'check-circle',
    EXPENSE_REJECTED: 'x-circle',
    EXPENSE_PENDING_APPROVAL: 'clock',
    APPROVAL_REQUESTED: 'users',
    COMMENT_ADDED: 'message-square',
    VOUCHER_APPROVED: 'check-circle',
    VOUCHER_DISBURSED: 'credit-card',
    BUDGET_THRESHOLD_EXCEEDED: 'alert-triangle',
    CLARIFICATION_REQUESTED: 'help-circle',
    SYSTEM_MESSAGE: 'info',
    DELEGATION_STARTED: 'user-plus',
    DELEGATION_ENDED: 'user-minus',
  };
  return iconMap[type] || 'bell';
};

// Utility function to format notification time
export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
};
